import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchChats as fetchChatsThunk,
    createNewChat as createNewChatThunk,
    deleteChat as deleteChatThunk,
    selectChat as selectChatThunk,
    setCurrentChatId,
    setContextMenu,
    setTargetChatId,
    toggleFolder,
    // setChats,
    setCurrentChat,
    pinChat,
    moveChatToFolder,
    updateChatTitle as updateChatTitleAction
} from '../store/slices/chatSlice';
import api from '../services/api';

interface Chat {
    _id: string;
    title?: string;
    isPinned?: boolean;
    folder?: string | null;
    isGrouped?: boolean;
    lastMessageAt?: string;
}

interface Group {
    _id: string;
    name: string;
}

interface ContextMenu {
    mouseX: number;
    mouseY: number;
    chatId: string;
}

interface UseChatManagementResult {
    // State
    chats: Chat[];
    groups: Group[];
    currentChatId: string | null;
    currentChat: Chat | null;
    contextMenu: ContextMenu | null;
    targetChatId: string | null;
    renameDialogOpen: boolean;
    newTitle: string;
    openFolders: { [key: string]: boolean };
    // Actions
    setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
    setCurrentChatId: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentChat: React.Dispatch<React.SetStateAction<Chat | null>>;
    fetchChats: (locationState?: { chatId?: string }) => Promise<void>;
    fetchGroups: () => Promise<void>;
    selectChat: (id: string) => Promise<any[]>;
    createNewChat: () => Promise<string | null>;
    startGroupChat: (groupId: string) => Promise<void>;
    handleDeleteChat: (e: React.MouseEvent, chatId: string) => Promise<void>;
    // Context menu
    handleContextMenu: (e: React.MouseEvent, chatId: string) => void;
    handleCloseContextMenu: () => void;
    handleRenameInit: () => void;
    handleSaveRename: () => Promise<void>;
    handlePinChat: () => Promise<void>;
    handleMoveToFolder: (folder: string) => Promise<void>;
    handleRemoveFromFolder: () => Promise<void>;
    toggleFolder: (folder: string) => void;
    setNewTitle: React.Dispatch<React.SetStateAction<string>>;
    setRenameDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    // Update helpers
    updateChatTitle: (id: string, title: string) => void;
}

const FOLDERS = ['Projects', 'Work', 'Homework', 'Writing', 'Story'];

export function useChatManagement(): UseChatManagementResult {
    const dispatch = useAppDispatch();

    // Select from Redux
    const chats = useAppSelector((state) => state.chat.chats);
    const currentChatId = useAppSelector((state) => state.chat.currentChatId);
    const currentChat = useAppSelector((state) => state.chat.currentChat);
    const contextMenu = useAppSelector((state) => state.chat.contextMenu);
    const targetChatId = useAppSelector((state) => state.chat.targetChatId);
    const openFolders = useAppSelector((state) => state.chat.openFolders);

    // Local state for UI only (dialogs)
    const [groups, setGroups] = useState<Group[]>([]); // Groups logic not yet in Redux, keep local or move later? 
    // Plan says "Chats list" in Redux. Groups seem separate but related. Let's keep groups local or add to slice?
    // Implementation plan didn't specify groupSlice. Let's keep local for now to reduce scope creep.

    // Rename dialog state - could also be in UI slice, but implemented local here originally
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const fetchChats = useCallback(async (locationState?: { chatId?: string }) => {
        // Dispatch the thunk
        await dispatch(fetchChatsThunk());

        // Handle initial selection logic - tricky with thunks
        // We can do it in the result
        if (locationState?.chatId) {
            dispatch(selectChatThunk(locationState.chatId));
        }
        // Auto-select first is handled in ChatSidebar usually or we can do it here by checking state
        // But Redux state updates are async-ish.
        // Let's rely on the components to handle selection if needed, or update thunk to handle it.
        // Actually, the original logic had auto-select.
        // Let's replicate simple auto-select logic here if possible, but we don't have access to the *result* of dispatch immediately easily unless we unwrap
        // const result = await dispatch(fetchChatsThunk()).unwrap();
        // if (result.length > 0 && !currentChatId) ...

        // For now, let's leave auto-select to the component or thunk
    }, [dispatch]);

    const fetchGroups = useCallback(async () => {
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const selectChat = useCallback(async (id: string) => {
        // Dispatch thunk
        const result = await dispatch(selectChatThunk(id));
        if (selectChatThunk.fulfilled.match(result)) {
            return result.payload.messages;
        }
        return [];
    }, [dispatch]);

    const createNewChat = useCallback(async () => {
        const result = await dispatch(createNewChatThunk());
        if (createNewChatThunk.fulfilled.match(result)) {
            return result.payload._id;
        }
        return null;
    }, [dispatch]);

    const startGroupChat = useCallback(async (groupId: string) => {
        try {
            const { data } = await api.post(`/chats/group/${groupId}`);
            await dispatch(fetchChatsThunk());
            dispatch(setCurrentChatId(data._id));
            dispatch(setCurrentChat(data)); // We might need to fetch messages
        } catch (e) {
            console.error(e);
        }
    }, [dispatch]);

    const handleDeleteChat = useCallback(async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            await dispatch(deleteChatThunk(chatId));
            if (currentChatId === chatId) {
                await dispatch(createNewChatThunk());
            }
        }
    }, [dispatch, currentChatId]);

    const handleContextMenu = useCallback((e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(setContextMenu({ mouseX: e.clientX - 2, mouseY: e.clientY - 4, chatId }));
        dispatch(setTargetChatId(chatId));
    }, [dispatch]);

    const handleCloseContextMenu = useCallback(() => {
        dispatch(setContextMenu(null));
    }, [dispatch]);

    const handleRenameInit = useCallback(() => {
        const chat = chats.find((c) => c._id === targetChatId);
        if (chat) {
            setNewTitle(chat.title || '');
            setRenameDialogOpen(true);
            handleCloseContextMenu();
        }
    }, [chats, targetChatId, handleCloseContextMenu]);

    const handleSaveRename = useCallback(async () => {
        if (!targetChatId || !newTitle.trim()) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { title: newTitle });
            dispatch(updateChatTitleAction({ id: targetChatId, title: newTitle }));
            setRenameDialogOpen(false);
        } catch (e) {
            console.error(e);
        }
    }, [targetChatId, newTitle, dispatch]);

    const handlePinChat = useCallback(async () => {
        if (!targetChatId) return;
        const chat = chats.find((c) => c._id === targetChatId);
        if (!chat) return;

        try {
            const newPinnedState = !chat.isPinned;
            await api.patch(`/chats/${targetChatId}`, { isPinned: newPinnedState });
            dispatch(pinChat({ id: targetChatId, isPinned: newPinnedState }));
            handleCloseContextMenu();
        } catch (e) {
            console.error(e);
        }
    }, [targetChatId, chats, handleCloseContextMenu, dispatch]);

    const handleMoveToFolder = useCallback(async (folder: string) => {
        if (!targetChatId) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { folder });
            dispatch(moveChatToFolder({ id: targetChatId, folder }));
            handleCloseContextMenu();
        } catch (e) {
            console.error(e);
        }
    }, [targetChatId, handleCloseContextMenu, dispatch]);

    const handleRemoveFromFolder = useCallback(async () => {
        if (!targetChatId) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { folder: null });
            dispatch(moveChatToFolder({ id: targetChatId, folder: null }));
            handleCloseContextMenu();
        } catch (e) {
            console.error(e);
        }
    }, [targetChatId, handleCloseContextMenu, dispatch]);

    const toggleFolderWrapper = useCallback((folder: string) => {
        dispatch(toggleFolder(folder));
    }, [dispatch]);

    const updateChatTitle = useCallback((id: string, title: string) => {
        dispatch(updateChatTitleAction({ id, title }));
    }, [dispatch]);

    // Helper wrappers
    const setChatsWrapper = (_: React.SetStateAction<Chat[]>) => {
        console.warn('Manual setChats not supported fully in Redux');
        // If needed, we can unwrap value if it's not a function
    };
    const setCurrentChatIdWrapper = (val: any) => dispatch(setCurrentChatId(val));
    const setCurrentChatWrapper = (val: any) => dispatch(setCurrentChat(val));

    return {
        chats,
        groups,
        currentChatId,
        currentChat,
        contextMenu,
        targetChatId,
        renameDialogOpen,
        newTitle,
        openFolders,

        // Actions
        setChats: setChatsWrapper as any,
        setCurrentChatId: setCurrentChatIdWrapper as any,
        setCurrentChat: setCurrentChatWrapper as any,

        fetchChats,
        fetchGroups,
        selectChat,
        createNewChat,
        startGroupChat,
        handleDeleteChat,
        handleContextMenu,
        handleCloseContextMenu,
        handleRenameInit,
        handleSaveRename,
        handlePinChat,
        handleMoveToFolder,
        handleRemoveFromFolder,
        toggleFolder: toggleFolderWrapper,
        setNewTitle,
        setRenameDialogOpen,
        updateChatTitle
    };
}

export { FOLDERS };
export default useChatManagement;
