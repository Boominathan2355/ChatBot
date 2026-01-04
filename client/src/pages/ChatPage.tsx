import React, { useState, useEffect, useRef } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemText, TextField, IconButton, Typography, Avatar, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, ListItemIcon, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { MessageRenderer, ImageMessage } from '../components';
import SettingsDialog from '../components/SettingsDialog';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useThemeMode } from '../context/ThemeContext';

const DRAWER_WIDTH = 260;

// Helper Component for Chat Items
const ChatListItem = ({ chat, selected, onSelect, onContextMenu, resolvedMode }: any) => (
    <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
            borderRadius: 1, py: 0.75, px: 1.5, mb: 0.25, position: 'relative',
            '&.Mui-selected': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            '&:hover': {
                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                '& .more-btn': { opacity: 1 }
            }
        }}
    >
        <ListItemText
            primary={chat.title || 'New Chat'}
            primaryTypographyProps={{ noWrap: true, fontSize: 14, sx: { pr: 3, fontWeight: selected ? 600 : 400 } }}
        />
        <IconButton
            className="more-btn"
            size="small"
            onClick={onContextMenu}
            sx={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                opacity: 0, transition: 'opacity 0.2s',
                color: resolvedMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                '&:hover': { color: resolvedMode === 'dark' ? '#fff' : '#000', bgcolor: 'transparent' }
            }}
        >
            <MoreHorizIcon sx={{ fontSize: 16 }} />
        </IconButton>
    </ListItemButton>
);

const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [chats, setChats] = useState<any[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [currentChat, setCurrentChat] = useState<any>(null);
    const [groups, setGroups] = useState<any[]>([]);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedFileUrl, setAttachedFileUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    // Sidebar always open
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [inviteMode, setInviteMode] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [targetChatId, setTargetChatId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Edit Message State
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState('');

    // Chat Management State
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; chatId: string } | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    // Folders State
    const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({
        'Projects': true,
        'Work': true,
        'Homework': true,
        'Writing': true,
        'Story': true
    });

    const FOLDERS = ['Projects', 'Work', 'Homework', 'Writing', 'Story'];
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const { resolvedMode } = useThemeMode();

    const isGroupChat = (chat: any) => chat?.isGrouped === true;
    const openMenu = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleSettingsOpen = () => {
        setSettingsTab('General');
        setSettingsOpen(true);
        handleMenuClose();
    };

    const handlePersonalizationOpen = () => {
        setSettingsTab('Personalization');
        setSettingsOpen(true);
        handleMenuClose();
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    useEffect(() => {
        fetchChats();
        fetchGroups();
    }, []);

    // Auto-scroll disabled per user request
    // useEffect(() => {
    //     if (scrollRef.current) {
    //         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    //     }
    // }, [messages]);

    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chats');
            // Sort: Pinned first, then by date
            data.sort((a: any, b: any) => {
                if (a.isPinned === b.isPinned) {
                    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                }
                return a.isPinned ? -1 : 1;
            });
            setChats(data);

            // Check for navigation state chatId
            if (location.state?.chatId) {
                const targetChat = data.find((c: any) => c._id === location.state.chatId);
                if (targetChat) {
                    selectChat(targetChat._id);
                    // Clear state to prevent sticking
                    window.history.replaceState({}, document.title);
                }
            } else if (data.length > 0 && !currentChatId) {
                selectChat(data[0]._id);
            }
        } catch (e) { console.error(e); }
    };

    // --- Chat Management Handlers ---

    const handleContextMenu = (event: React.MouseEvent, chatId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            chatId,
        });
        setTargetChatId(chatId);
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleRenameInit = () => {
        const chat = chats.find(c => c._id === targetChatId);
        if (chat) {
            setNewTitle(chat.title);
            setRenameDialogOpen(true);
            handleCloseContextMenu();
        }
    };

    const handleSaveRename = async () => {
        if (!targetChatId || !newTitle.trim()) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { title: newTitle });
            setChats(prev => prev.map(c => c._id === targetChatId ? { ...c, title: newTitle } : c));
            setRenameDialogOpen(false);
        } catch (e) { console.error(e); }
    };

    const handlePinChat = async () => {
        if (!targetChatId) return;
        const chat = chats.find(c => c._id === targetChatId);
        if (!chat) return;

        try {
            const newPinnedState = !chat.isPinned;
            await api.patch(`/chats/${targetChatId}`, { isPinned: newPinnedState });
            setChats(prev => {
                const updated = prev.map(c => c._id === targetChatId ? { ...c, isPinned: newPinnedState } : c);
                // Re-sort
                return updated.sort((a, b) => {
                    if (a.isPinned === b.isPinned) {
                        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                    }
                    return a.isPinned ? -1 : 1;
                });
            });
            handleCloseContextMenu();
        } catch (e) { console.error(e); }
    };

    const handleMoveToFolder = async (folder: string) => {
        if (!targetChatId) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { folder });
            setChats(prev => prev.map(c => c._id === targetChatId ? { ...c, folder } : c));
            handleCloseContextMenu();
        } catch (e) { console.error(e); }
    };

    const handleRemoveFromFolder = async () => {
        if (!targetChatId) return;
        try {
            await api.patch(`/chats/${targetChatId}`, { folder: null });
            setChats(prev => prev.map(c => c._id === targetChatId ? { ...c, folder: null } : c));
            handleCloseContextMenu();
        } catch (e) { console.error(e); }
    };

    const toggleFolder = (folder: string) => {
        setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
    };

    const fetchGroups = async () => {
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (e) { console.error(e); }
    };

    const startGroupChat = async (groupId: string) => {
        try {
            const { data } = await api.post(`/chats/group/${groupId}`);
            await fetchChats();
            selectChat(data._id);
        } catch (e) { console.error(e); }
    };

    const selectChat = async (id: string) => {
        // Reset loading states when switching chats
        setIsLoading(false);
        setIsSearching(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setCurrentChatId(id);
        const chat = chats.find(c => c._id === id);
        setCurrentChat(chat);
        const { data } = await api.get(`/chats/${id}/messages`);
        setMessages(data);
    };

    const createNewChat = async () => {
        const { data } = await api.post('/chats');
        setChats([data, ...chats]);
        setCurrentChatId(data._id);
        setCurrentChat(data);
        setMessages([]);
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            try {
                await api.delete(`/chats/${chatId}`);
                setChats(chats.filter(c => c._id !== chatId));
                if (currentChatId === chatId) {
                    createNewChat();
                }
            } catch (error) {
                console.error('Failed to delete chat:', error);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const isImage = file.type.startsWith('image/');
        const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.pdf') || file.name.endsWith('.txt');

        if (!isImage && !isDoc) {
            alert('Please upload an image or a document (PDF, DOCX, TXT)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File size too large (max 10MB)');
            return;
        }

        setAttachedFile(file);
        if (isImage) {
            setAttachedFileUrl(URL.createObjectURL(file));
        } else {
            setAttachedFileUrl(null); // No preview for docs yet
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) processFile(file);
            }
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !attachedFile) || !currentChatId || isLoading || isUploading) return;

        let messageContent = input;
        let imageObject = null;
        let fileObject = null;

        // Optimistic update
        setMessages(prev => [...prev, {
            role: 'user',
            content: messageContent,
            image: (attachedFile && attachedFile.type.startsWith('image/')) ? { url: attachedFileUrl || '', id: 'temp' } : undefined
        }]);

        setInput('');
        const currentFile = attachedFile;
        setAttachedFile(null);
        setAttachedFileUrl(null);
        setIsLoading(true);

        try {
            // Handle Attachment Upload
            if (currentFile) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', currentFile);
                formData.append('chatId', currentChatId);

                // Determine if it's a doc or an image
                if (currentFile.type.startsWith('image/')) {
                    // Convert image to base64 for vision models
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(currentFile);
                    });
                    imageObject = {
                        url: base64, // Actual image data
                        id: `img_${Date.now()}`,
                        width: 400, // Optional: Could get actual dims if needed
                        height: 300,
                        mimeType: currentFile.type || 'image/jpeg'
                    };
                } else {
                    // Real document upload for RAG
                    const { data } = await api.post('/docs/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    fileObject = data;
                }
                setIsUploading(false);
            }

            if (webSearchEnabled && !isGroupChat(currentChat)) setIsSearching(true);

            // Add AI placeholder immediately for responsiveness
            setMessages(prev => [...prev, { role: 'assistant', content: '', metadata: { senderName: 'Jarvis' } }]);

            // Unified streaming logic for both Direct and Group chats
            const endpoint = isGroupChat(currentChat)
                ? `/api/chats/${currentChatId}/group-message`
                : `/api/chats/${currentChatId}/send`;

            // Setup AbortController for stopping generation
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    content: messageContent || (imageObject ? 'Sent an image' : (fileObject ? `Uploaded ${currentFile?.name}` : '')),
                    image: imageObject,
                    webSearch: webSearchEnabled,
                    documentId: fileObject?._id
                })
            });

            setIsSearching(false);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            await executeAIStep(response);
        } catch (e: any) {
            handleAIError(e);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const executeAIStep = async (response: Response) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let buffer = '';

        if (!reader) return;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.replace('data: ', '');
                    if (dataStr === '[DONE]') break;
                    try {
                        const json = JSON.parse(dataStr);
                        if (json.title) {
                            const updatedTitle = json.title;
                            setChats(prev => prev.map(c => c._id === currentChatId ? { ...c, title: updatedTitle } : c));
                            if (currentChatId) {
                                setCurrentChat((prev: any) => prev ? { ...prev, title: updatedTitle } : null);
                            }
                        }
                        if (json.content) {
                            assistantContent += json.content;
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg.role === 'assistant') {
                                    lastMsg.content = assistantContent;
                                }
                                return newMessages;
                            });
                        }
                    } catch (e) { }
                }
            }
        }

        // Process any leftover content in buffer (e.g. final token that didn't end in \n\n)
        if (buffer.trim().startsWith('data: ')) {
            try {
                const dataStr = buffer.trim().replace('data: ', '');
                if (dataStr !== '[DONE]') {
                    const json = JSON.parse(dataStr);
                    if (json.title) {
                        const updatedTitle = json.title;
                        setChats(prev => prev.map(c => c._id === currentChatId ? { ...c, title: updatedTitle } : c));
                        if (currentChatId) {
                            setCurrentChat((prev: any) => prev ? { ...prev, title: updatedTitle } : null);
                        }
                    }
                    if (json.content) {
                        assistantContent += json.content;
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMsg = newMessages[newMessages.length - 1];
                            if (lastMsg.role === 'assistant') lastMsg.content = assistantContent;
                            return newMessages;
                        });
                    }
                }
            } catch (e) { }
        }
    };

    const handleAIError = (e: any) => {
        if (e.name === 'AbortError') {
            console.log('🛑 Generation stopped by user');
            return;
        }
        console.error(e);
        setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant' && !last.content) {
                return prev.slice(0, -1);
            }
            return [...prev, {
                role: 'system',
                content: `Error: ${e.message || 'Something went wrong.'}`
            }];
        });
    };

    const handleRegenerate = async (index?: number) => {
        if (isLoading || isUploading || !currentChatId || messages.length < 1) return;

        let targetUserMsg: any = null;
        let assistantMsgIndex = -1;

        if (index !== undefined) {
            const msg = messages[index];
            if (msg.role === 'user') {
                targetUserMsg = msg;
                // If the next message is assistant, we replace it.
                if (index + 1 < messages.length && messages[index + 1].role === 'assistant') {
                    assistantMsgIndex = index + 1;
                }
            } else if (msg.role === 'assistant') {
                assistantMsgIndex = index;
                // Find the user message before this one
                for (let i = index - 1; i >= 0; i--) {
                    if (messages[i].role === 'user') {
                        targetUserMsg = messages[i];
                        break;
                    }
                }
            }
        } else {
            // Default: find last user message
            targetUserMsg = [...messages].reverse().find(m => m.role === 'user');
            if (messages[messages.length - 1].role === 'assistant') {
                assistantMsgIndex = messages.length - 1;
            }
        }

        if (!targetUserMsg) return;

        // Optimistically clear/add the AI message placeholder
        setMessages(prev => {
            const newMsgs = [...prev];
            const placeholder = { role: 'assistant', content: '', metadata: { senderName: 'Jarvis' } };

            if (assistantMsgIndex !== -1) {
                newMsgs[assistantMsgIndex] = placeholder;
            } else {
                newMsgs.push(placeholder);
            }
            return newMsgs;
        });

        setIsLoading(true);
        try {
            const endpoint = isGroupChat(currentChat)
                ? `/api/chats/${currentChatId}/group-message`
                : `/api/chats/${currentChatId}/send`;

            const controller = new AbortController();
            abortControllerRef.current = controller;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    content: targetUserMsg.content,
                    image: targetUserMsg.image,
                    webSearch: webSearchEnabled,
                    documentId: targetUserMsg.metadata?.documentId
                })
            });

            if (!response.ok) throw new Error('Regeneration failed');
            await executeAIStep(response);
        } catch (e) {
            handleAIError(e);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            // You could add a toast notification here if you want
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEditMessage = (index: number, content: string) => {
        setEditingMessageIndex(index);
        setEditedContent(content);
    };

    const handleCancelEdit = () => {
        setEditingMessageIndex(null);
        setEditedContent('');
    };

    const handleSaveEdit = async (index: number) => {
        if (!editedContent.trim() || !currentChatId) return;

        // Update the message content locally
        const updatedMessages = [...messages];
        updatedMessages[index] = { ...updatedMessages[index], content: editedContent };

        // Remove any assistant messages after this one
        const messagesToKeep = updatedMessages.slice(0, index + 1);
        setMessages(messagesToKeep);

        // Clear edit state
        setEditingMessageIndex(null);
        setEditedContent('');

        // Trigger regeneration with the edited message
        await handleRegenerate(index);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: resolvedMode === 'dark' ? '#0a0a0a' : '#ffffff' }}>
            {/* Sidebar */}
            <Drawer
                variant="persistent"
                open={true}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: resolvedMode === 'dark' ? '#0a0a0a' : '#f5f5f5',
                        borderRight: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                    },
                }}
            >
                {/* Sidebar Header */}
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tooltip title="Manage Groups">
                        <IconButton onClick={() => navigate('/groups')} size="small">
                            <GroupsIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="New Chat">
                        <IconButton onClick={createNewChat} size="small">
                            <AddIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Chat List */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>

                    {/* 1. Pinned Chats */}
                    {chats.some((c: any) => c.isPinned) && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PushPinIcon sx={{ fontSize: 12 }} /> Pinned
                            </Typography>
                            <List disablePadding>
                                {chats.filter((c: any) => c.isPinned).map((chat: any) => (
                                    <ChatListItem
                                        key={chat._id}
                                        chat={chat}
                                        selected={currentChatId === chat._id}
                                        onSelect={() => selectChat(chat._id)}
                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, chat._id)}
                                        resolvedMode={resolvedMode}
                                    />
                                ))}
                            </List>
                        </>
                    )}

                    {/* 2. Folders */}
                    {FOLDERS.map(folder => {
                        const folderChats = chats.filter((c: any) => !c.isPinned && c.folder === folder);
                        if (folderChats.length === 0) return null;

                        return (
                            <Box key={folder}>
                                <ListItemButton
                                    onClick={() => toggleFolder(folder)}
                                    sx={{
                                        py: 0.5, px: 1.5, mt: 1,
                                        opacity: 0.8,
                                        '&:hover': { opacity: 1, bgcolor: 'transparent' }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                        {openFolders[folder] ? <FolderOpenIcon sx={{ fontSize: 14 }} /> : <FolderIcon sx={{ fontSize: 14 }} />}
                                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{folder}</Typography>
                                    </Box>
                                    <KeyboardArrowRightIcon sx={{ fontSize: 16, transform: openFolders[folder] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                </ListItemButton>

                                {openFolders[folder] && (
                                    <List disablePadding sx={{ pl: 1 }}>
                                        {folderChats.map((chat: any) => (
                                            <ChatListItem
                                                key={chat._id}
                                                chat={chat}
                                                selected={currentChatId === chat._id}
                                                onSelect={() => selectChat(chat._id)}
                                                onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, chat._id)}
                                                resolvedMode={resolvedMode}
                                            />
                                        ))}
                                    </List>
                                )}
                            </Box>
                        );
                    })}

                    {/* 3. Recent (Direct) */}
                    {chats.some((c: any) => !c.isPinned && !c.folder && !c.isGrouped) && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Recent
                            </Typography>
                            <List disablePadding>
                                {chats.filter((c: any) => !c.isPinned && !c.folder && !c.isGrouped).map((chat: any) => (
                                    <ChatListItem
                                        key={chat._id}
                                        chat={chat}
                                        selected={currentChatId === chat._id}
                                        onSelect={() => selectChat(chat._id)}
                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, chat._id)}
                                        resolvedMode={resolvedMode}
                                    />
                                ))}
                            </List>
                        </>
                    )}

                    {/* 4. Group Chats */}
                    {chats.some((c: any) => !c.isPinned && !c.folder && c.isGrouped) && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Group Chats
                            </Typography>
                            <List disablePadding>
                                {chats.filter((c: any) => !c.isPinned && !c.folder && c.isGrouped).map((chat: any) => (
                                    <ChatListItem
                                        key={chat._id}
                                        chat={chat}
                                        selected={currentChatId === chat._id}
                                        onSelect={() => selectChat(chat._id)}
                                        onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, chat._id)}
                                        resolvedMode={resolvedMode}
                                    />
                                ))}
                            </List>
                        </>
                    )}

                    {/* Available Groups to Start */}
                    {groups.length > 0 && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Start New Group Chat
                            </Typography>
                            <List disablePadding>
                                {groups.map((group: any) => (
                                    <ListItemButton
                                        key={group._id}
                                        onClick={() => startGroupChat(group._id)}
                                        sx={{
                                            borderRadius: 1, py: 0.75, px: 1.5, mb: 0.25,
                                            '&:hover': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }
                                        }}
                                    >
                                        <ListItemText primary={group.name} primaryTypographyProps={{ noWrap: true, fontSize: 14 }} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </>
                    )}
                </Box>

                {/* Sidebar Footer - User Profile */}
                <Box sx={{ p: 2, borderTop: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <Box
                        onClick={handleMenuClick}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1,
                            borderRadius: 2,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }
                        }}
                    >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                            {user?.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            <Typography variant="subtitle2" noWrap>{user?.username}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>Free Plan</Typography>
                        </Box>
                        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </Box>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleMenuClose}
                        PaperProps={{
                            sx: { width: 220, mt: 1, bgcolor: resolvedMode === 'dark' ? '#1a1a1a' : '#fff' }
                        }}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    >
                        <MenuItem onClick={handleSettingsOpen}>
                            <ListItemIcon><SmartToyIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Settings</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handlePersonalizationOpen}>
                            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Personalization</ListItemText>
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText>Log out</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', ml: 0 }}>
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderBottom: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Toggle button removed */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{currentChat?.title || 'Jarvis AI'}</Typography>
                            <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                        </Box>
                    </Box>

                    {/* Groups and Share buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            onClick={async () => {
                                if (!currentChatId) return;
                                try {
                                    const { data } = await api.post(`/chats/${currentChatId}/share`);
                                    const url = `${window.location.origin}/shared/${data.shareToken}?invite=true`;
                                    setShareUrl(url);
                                    setInviteMode(true);
                                    setShareDialogOpen(true);
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                            }}
                        >
                            <PersonAddIcon sx={{ fontSize: 16 }} />
                            <Typography sx={{ fontSize: 13 }}>Add People</Typography>
                        </Box>
                        <Box
                            onClick={async () => {
                                if (!currentChatId) return;
                                try {
                                    const { data } = await api.post(`/chats/${currentChatId}/share`);
                                    const url = `${window.location.origin}/shared/${data.shareToken}`;
                                    setShareUrl(url);
                                    setInviteMode(false);
                                    setShareDialogOpen(true);
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                cursor: 'pointer',
                                fontSize: 13,
                                '&:hover': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                            }}
                        >
                            <Typography sx={{ fontSize: 13 }}>↑ Share</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Messages */}
                <Box
                    ref={scrollRef}
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        px: 4,
                        py: 4,

                    }}
                >
                    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
                        {messages.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography variant="h4" sx={{ fontWeight: 500, opacity: 0.8, mb: 1 }}>How can I help you today?</Typography>
                            </Box>
                        )}
                        {messages.map((msg, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    mb: 3,
                                    alignItems: 'flex-start',
                                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        bgcolor: msg.role === 'user'
                                            ? (resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                                            : (resolvedMode === 'dark' ? '#fff' : '#0a0a0a'),
                                        color: msg.role === 'user' ? 'inherit' : (resolvedMode === 'dark' ? '#0a0a0a' : '#fff'),
                                        fontSize: 12,
                                    }}
                                >
                                    {msg.role === 'user' ? <PersonIcon sx={{ fontSize: 16 }} /> : <SmartToyIcon sx={{ fontSize: 16 }} />}
                                </Avatar>
                                <Box sx={{
                                    flex: 1,
                                    pt: 0.25,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    width: editingMessageIndex === i ? '100%' : 'auto'
                                }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5, opacity: 0.6 }}>
                                        {msg.role === 'user' ? 'You' : 'Jarvis'}
                                    </Typography>

                                    {/* Message Container/Bubble */}
                                    <Box
                                        sx={{
                                            minWidth: editingMessageIndex === i ? '350px' : 'auto',
                                            maxWidth: editingMessageIndex === i ? '95%' : '75%',
                                            width: editingMessageIndex === i ? '95%' : 'auto',
                                            bgcolor: msg.role === 'user'
                                                ? (resolvedMode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                                                : (resolvedMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                                            borderRadius: 1,
                                            px: 2,
                                            py: 1.5,
                                            border: resolvedMode === 'dark'
                                                ? '1px solid rgba(255, 255, 255, 0.08)'
                                                : '1px solid rgba(0, 0, 0, 0.06)',
                                            transition: 'max-width 0.2s ease-in-out',
                                        }}
                                    >
                                        {msg.image && (
                                            <ImageMessage
                                                src={msg.image.url}
                                                width={msg.image.width}
                                                height={msg.image.height}
                                                resolvedMode={resolvedMode}
                                            />
                                        )}
                                        {/* Show editable TextField if editing this message */}
                                        {editingMessageIndex === i ? (
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    value={editedContent}
                                                    onChange={(e) => setEditedContent(e.target.value)}
                                                    autoFocus
                                                    variant="standard"
                                                    sx={{
                                                        '& .MuiInput-root': {
                                                            fontSize: 14,
                                                        }
                                                    }}
                                                />
                                                <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    <Button
                                                        size="small"
                                                        onClick={handleCancelEdit}
                                                        sx={{ textTransform: 'none', fontSize: 11 }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => handleSaveEdit(i)}
                                                        sx={{ textTransform: 'none', fontSize: 10, py: 0.3, px: 1.2, minWidth: 'auto' }}
                                                    >
                                                        Resend
                                                    </Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <>
                                                {msg.content && <MessageRenderer content={msg.content} role={msg.role} />}
                                                {!msg.content && msg.role === 'assistant' && i === messages.length - 1 && isLoading && (
                                                    <Box sx={{ pt: 0.5 }}><CircularProgress size={14} /></Box>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Action Buttons */}
                                    {!isLoading && editingMessageIndex !== i && (
                                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                            {/* Copy Button - Show for all messages with content */}
                                            {msg.content && (
                                                <Tooltip title="Copy">
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleCopy(msg.content)}
                                                        startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                                                        sx={{
                                                            opacity: 0.5,
                                                            '&:hover': { opacity: 1, bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                                            textTransform: 'none',
                                                            fontSize: 11,
                                                            py: 0.2,
                                                            minWidth: 'auto',
                                                            color: 'inherit'
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </Tooltip>
                                            )}
                                            {/* Edit Button - Only for user messages */}
                                            {msg.role === 'user' && msg.content && (
                                                <Tooltip title="Edit">
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleEditMessage(i, msg.content)}
                                                        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                                                        sx={{
                                                            opacity: 0.5,
                                                            '&:hover': { opacity: 1, bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                                            textTransform: 'none',
                                                            fontSize: 11,
                                                            py: 0.2,
                                                            minWidth: 'auto',
                                                            color: 'inherit'
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </Tooltip>
                                            )}
                                            {/* Try Again Button - Only for user messages followed by errors */}
                                            {msg.role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'system' && (
                                                <Tooltip title="Try Again">
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleRegenerate(i)}
                                                        startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                                                        sx={{
                                                            opacity: 0.5,
                                                            '&:hover': { opacity: 1, bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                                            textTransform: 'none',
                                                            fontSize: 11,
                                                            py: 0.2,
                                                            minWidth: 'auto',
                                                            color: 'inherit'
                                                        }}
                                                    >
                                                        Try Again
                                                    </Button>
                                                </Tooltip>
                                            )}
                                            {/* Regenerate Button - Only for assistant messages */}
                                            {msg.role === 'assistant' && (
                                                <Tooltip title="Regenerate">
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleRegenerate(i)}
                                                        startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                                                        sx={{
                                                            opacity: 0.5,
                                                            '&:hover': { opacity: 1, bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                                                            textTransform: 'none',
                                                            fontSize: 11,
                                                            py: 0.2,
                                                            minWidth: 'auto',
                                                            color: 'inherit'
                                                        }}
                                                    >
                                                        Regenerate
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Input */}
                <Box sx={{ p: 2 }}>
                    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
                        {/* Attachment Preview */}
                        {attachedFile && (
                            <Box sx={{
                                mb: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                p: 1,
                                borderRadius: 1.5,
                                border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                width: 'fit-content'
                            }}>
                                {attachedFileUrl ? (
                                    <Box sx={{ position: 'relative' }}>
                                        <img
                                            src={attachedFileUrl}
                                            alt="preview"
                                            style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                                        />
                                    </Box>
                                ) : (
                                    <Box sx={{
                                        width: 40,
                                        height: 40,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        borderRadius: 1
                                    }}>
                                        <AttachFileIcon sx={{ fontSize: 20 }} />
                                    </Box>
                                )}
                                <Box sx={{ mr: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{attachedFile.name}</Typography>
                                    <Typography sx={{ fontSize: 11, opacity: 0.5 }}>
                                        {(attachedFile.size / 1024).toFixed(0)} KB • {attachedFile.type.split('/')[1] || 'document'}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => { setAttachedFile(null); setAttachedFileUrl(null); }}
                                    sx={{ ml: 'auto' }}
                                >
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        )}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 1,
                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                borderRadius: 3,
                                border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                p: 1,
                                '&:focus-within': {
                                    border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)',
                                }
                            }}
                        >
                            <Tooltip title={webSearchEnabled ? 'Web Search ON' : 'Web Search OFF'}>
                                <IconButton
                                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                    size="small"
                                    sx={{
                                        bgcolor: webSearchEnabled ? (resolvedMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
                                    }}
                                >
                                    {isSearching ? <CircularProgress size={18} /> : <LanguageIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>

                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*,.pdf,.docx,.txt"
                                onChange={handleFileSelect}
                            />
                            <Tooltip title="Attach File">
                                <IconButton
                                    onClick={() => fileInputRef.current?.click()}
                                    size="small"
                                    color={attachedFile ? 'primary' : 'default'}
                                >
                                    <AttachFileIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>

                            <TextField
                                fullWidth
                                multiline
                                maxRows={6}
                                placeholder="Message Jarvis..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                variant="standard"
                                InputProps={{ disableUnderline: true, sx: { fontSize: 14, py: 0.5 } }}
                            />
                            <IconButton
                                onClick={isLoading ? handleStop : handleSend}
                                disabled={(!input.trim() && !attachedFile && !isLoading) || isUploading}
                                size="small"
                                sx={{
                                    bgcolor: (input.trim() || attachedFile || isLoading) ? (resolvedMode === 'dark' ? '#fff' : '#0a0a0a') : 'transparent',
                                    color: (input.trim() || attachedFile || isLoading) ? (resolvedMode === 'dark' ? '#0a0a0a' : '#fff') : 'inherit',
                                    '&:hover': { bgcolor: (input.trim() || attachedFile || isLoading) ? (resolvedMode === 'dark' ? '#eee' : '#222') : 'transparent' },
                                    '&.Mui-disabled': { bgcolor: 'transparent' }
                                }}
                            >
                                {isUploading ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : isLoading ? (
                                    <StopCircleIcon sx={{ fontSize: 20 }} />
                                ) : (
                                    <SendIcon sx={{ fontSize: 18 }} />
                                )}
                            </IconButton>
                        </Box>
                        <Typography sx={{ fontSize: 11, textAlign: 'center', mt: 1, opacity: 0.35 }}>
                            Jarvis AI can make mistakes. Consider checking important information.
                        </Typography>
                    </Box>
                </Box>
            </Box>
            {/* Share Dialog */}
            <Dialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: resolvedMode === 'dark' ? '#1a1a1a' : '#fff',
                        color: resolvedMode === 'dark' ? '#fff' : '#0a0a0a',
                        borderRadius: 3,
                        minWidth: 440,
                        border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                    }
                }}
            >
                <DialogTitle sx={{
                    borderBottom: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                    fontSize: 16,
                    fontWeight: 600
                }}>
                    {inviteMode ? 'Invite People' : 'Share Chat'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography sx={{ fontSize: 13, opacity: 0.7, mb: 1.5, mt: 2 }}>
                        {inviteMode
                            ? 'Share this link to let others join this specific chat group.'
                            : 'Share this link to let others view or import a copy of this chat.'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            value={shareUrl}
                            InputProps={{
                                readOnly: true,
                                sx: {
                                    fontSize: 13,
                                    bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderRadius: 1.5,
                                    height: 40,
                                    '& fieldset': { border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }
                                }
                            }}
                            size="small"
                        />
                        <Button
                            disableElevation
                            variant="outlined"
                            onClick={async () => {
                                if (window.confirm('Revoke this link? No one will be able to join via this link anymore.')) {
                                    try {
                                        await api.delete(`/chats/${currentChatId}/share`);
                                        setShareDialogOpen(false);
                                        setShareUrl('');
                                    } catch (e) { console.error(e); }
                                }
                            }}
                            sx={{
                                color: '#f44336',
                                borderColor: resolvedMode === 'dark' ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.5)',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                px: 2,
                                '&:hover': {
                                    bgcolor: resolvedMode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
                                    borderColor: '#f44336'
                                }
                            }}
                        >
                            Delete
                        </Button>
                        <Button
                            disableElevation
                            variant="contained"
                            onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                                setShareDialogOpen(false);
                            }}
                            sx={{
                                bgcolor: resolvedMode === 'dark' ? '#fff' : '#0a0a0a',
                                color: resolvedMode === 'dark' ? '#0a0a0a' : '#fff',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                px: 3,
                                '&:hover': { bgcolor: resolvedMode === 'dark' ? '#e0e0e0' : '#333' }
                            }}
                        >
                            Copy
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                </DialogActions>
            </Dialog>


            {/* Context Menu for Chats */}
            <Menu
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
                PaperProps={{ sx: { width: 200, bgcolor: resolvedMode === 'dark' ? '#1a1a1a' : '#fff' } }}
            >
                <MenuItem onClick={handleRenameInit}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Rename</ListItemText>
                </MenuItem>
                <MenuItem onClick={handlePinChat}>
                    <ListItemIcon>
                        {chats.find((c: any) => c._id === targetChatId)?.isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{chats.find((c: any) => c._id === targetChatId)?.isPinned ? 'Unpin Chat' : 'Pin Chat'}</ListItemText>
                </MenuItem>
                <Divider />
                {FOLDERS.map(folder => (
                    <MenuItem key={folder} onClick={() => handleMoveToFolder(folder)}>
                        <ListItemIcon><DriveFileMoveIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Move to {folder}</ListItemText>
                    </MenuItem>
                ))}
                {chats.find((c: any) => c._id === targetChatId)?.folder && (
                    <MenuItem onClick={handleRemoveFromFolder}>
                        <ListItemIcon><FolderOpenIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Remove from Folder</ListItemText>
                    </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={(e) => { handleCloseContextMenu(); if (targetChatId) handleDeleteChat(e, targetChatId); }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
                <DialogTitle>Rename Chat</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Chat Name"
                        fullWidth
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveRename()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveRename}>Save</Button>
                </DialogActions>
            </Dialog>

            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />
        </Box>
    );
};

export default ChatPage;
