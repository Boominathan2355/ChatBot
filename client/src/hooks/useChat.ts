import { useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    setMessages,
    sendMessage,
    setLoading,
    setSearching,
    setUploading,
    // clearMessages
} from '../store/slices/chatSlice';
import api from '../services/api';
// import { Message } from '../store/slices/chatSlice'; // Import types if needed, or redefine

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    image?: { url: string; id?: string; width?: number; height?: number; mimeType?: string };
    metadata?: { senderName?: string; documentId?: string };
}

interface Chat {
    _id: string;
    title?: string;
    isPinned?: boolean;
    folder?: string | null;
    isGrouped?: boolean;
}

interface UseChatResult {
    // State
    messages: Message[];
    isLoading: boolean;
    isSearching: boolean;
    isUploading: boolean;
    attachedFile: File | null;
    attachedFileUrl: string | null;
    // Actions
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    handleSend: (
        input: string,
        currentChatId: string,
        currentChat: Chat | null,
        webSearchEnabled: boolean,
        aiProvider: string,
        currentModel: string,
        thinkingEnabled: boolean
    ) => Promise<void>;
    handleRegenerate: (
        index: number | undefined,
        currentChatId: string,
        currentChat: Chat | null,
        webSearchEnabled: boolean
    ) => Promise<void>;
    handleStop: () => void;
    // File handling
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handlePaste: (e: React.ClipboardEvent) => void;
    clearAttachment: () => void;
}

export function useChat(): UseChatResult {
    const dispatch = useAppDispatch();
    // Select from Redux
    const messages = useAppSelector((state) => state.chat.messages);
    const isLoading = useAppSelector((state) => state.chat.isLoading);
    const isSearching = useAppSelector((state) => state.chat.isSearching);
    const isUploading = useAppSelector((state) => state.chat.isUploading);

    // Local state for file attachment (non-serializable)
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedFileUrl, setAttachedFileUrl] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const isGroupChat = (chat: Chat | null) => chat?.isGrouped === true;

    const processFile = useCallback((file: File) => {
        const isImage = file.type.startsWith('image/');
        const isDoc = file.name.endsWith('.docx') ||
            file.name.endsWith('.pdf') ||
            file.name.endsWith('.txt');

        if (!isImage && !isDoc) {
            alert('Please upload an image or a document (PDF, DOCX, TXT)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size too large (max 10MB)');
            return;
        }

        setAttachedFile(file);
        if (isImage) {
            setAttachedFileUrl(URL.createObjectURL(file));
        } else {
            setAttachedFileUrl(null);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    }, [processFile]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) processFile(file);
            }
        }
    }, [processFile]);

    const clearAttachment = useCallback(() => {
        setAttachedFile(null);
        setAttachedFileUrl(null);
    }, []);

    // Removed executeAIStep and handleAIError as they are handled in Thunks or locally


    const handleSend = useCallback(async (
        input: string,
        currentChatId: string,
        currentChat: Chat | null,
        webSearchEnabled: boolean,
        aiProvider: string,
        currentModel: string,
        thinkingEnabled: boolean
    ) => {
        if ((!input.trim() && !attachedFile) || isLoading || isUploading) return;

        let imageObject = null;
        let fileObject = null;
        const currentFile = attachedFile;

        // Clear attachment state immediately
        setAttachedFile(null);
        setAttachedFileUrl(null);

        // We set loading here for immediate UI feedback, though thunk also does it
        // dispatch(setLoading(true)); // Thunk handles it

        try {
            if (currentFile) {
                dispatch(setUploading(true));
                const formData = new FormData();
                formData.append('file', currentFile);
                formData.append('chatId', currentChatId);

                if (currentFile.type.startsWith('image/')) {
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(currentFile);
                    });
                    imageObject = {
                        url: base64,
                        id: `img_${Date.now()}`,
                        width: 400,
                        height: 300,
                        mimeType: currentFile.type || 'image/jpeg'
                    };
                } else {
                    const { data } = await api.post('/docs/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    fileObject = data;
                }
                dispatch(setUploading(false));
            }

            // Dispatch the thunk
            // Note: We need to cast dispatch to any because thunks are complex typing
            await (dispatch as any)(sendMessage(
                input,
                imageObject,
                fileObject,
                currentChatId,
                currentChat,
                webSearchEnabled,
                aiProvider,
                currentModel,
                thinkingEnabled
            ));

        } catch (e: any) {
            console.error(e);
            dispatch(setLoading(false));
            dispatch(setUploading(false));
        }
    }, [attachedFile, isLoading, isUploading, dispatch]);

    const handleRegenerate = useCallback(async (
        index: number | undefined,
        currentChatId: string,
        currentChat: Chat | null,
        webSearchEnabled: boolean
    ) => {
        if (isLoading || isUploading || messages.length < 1) return;

        let targetUserMsg: Message | undefined = undefined;
        let assistantMsgIndex = -1;

        // Logic to find target message...
        if (index !== undefined) {
            const msg = messages[index];
            if (msg.role === 'user') {
                targetUserMsg = msg;
                if (index + 1 < messages.length && messages[index + 1].role === 'assistant') {
                    assistantMsgIndex = index + 1;
                }
            } else if (msg.role === 'assistant') {
                assistantMsgIndex = index;
                for (let i = index - 1; i >= 0; i--) {
                    if (messages[i].role === 'user') {
                        targetUserMsg = messages[i];
                        break;
                    }
                }
            }
        } else {
            targetUserMsg = [...messages].reverse().find((m) => m.role === 'user');
            if (messages[messages.length - 1].role === 'assistant') {
                assistantMsgIndex = messages.length - 1;
            }
        }

        if (!targetUserMsg) return;

        // Create new messages array
        const newMsgs = [...messages];
        const placeholder: Message = {
            role: 'assistant',
            content: '',
            metadata: { senderName: 'Jarvis' }
        };

        if (assistantMsgIndex !== -1) {
            newMsgs[assistantMsgIndex] = placeholder;
        } else {
            newMsgs.push(placeholder);
        }

        // Dispatch update
        dispatch(setMessages(newMsgs));

        // Note: For regeneration, we manually trigger the API call similar to sendMessage logic
        // But since sendMessage thunk appends a user message, we might need a separate logic
        // or just call executeAIStep directly if exposed, OR call sendMessage with a flag?
        // Simpler: Reuse the fetch logic here but dispatch actions for loading state

        // Actually, let's reuse the logic from sendMessage thunk but without adding user message
        // But simpler to just keep the logic here using dispatch for states

        dispatch(setLoading(true));

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
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    content: targetUserMsg.content,
                    image: targetUserMsg.image,
                    webSearch: webSearchEnabled,
                    useRag: false,
                    documentId: targetUserMsg.metadata?.documentId
                })
            });

            if (!response.ok) throw new Error('Regeneration failed');

            // We need to parse stream and update Redux
            // This replicates executeAIStep logic but dispatches actions
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
                            if (json.content) {
                                assistantContent += json.content;
                                dispatch(setMessages(newMsgs.map((m, i) =>
                                    i === (assistantMsgIndex !== -1 ? assistantMsgIndex : newMsgs.length - 1)
                                        ? { ...m, content: assistantContent }
                                        : m
                                )));
                            }
                        } catch (e) { console.error(e); }
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            // Add error message
            dispatch(setMessages([...newMsgs, { role: 'system', content: `Error: ${e.message}` }]));
        } finally {
            dispatch(setLoading(false));
            abortControllerRef.current = null;
        }
    }, [messages, isLoading, isUploading, dispatch]);

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            dispatch(setLoading(false));
            dispatch(setSearching(false));
            dispatch(setUploading(false));
        }
    }, [dispatch]);

    // Wrap setMessages to use dispatch
    const setMessagesWrapper = useCallback((value: React.SetStateAction<Message[]>) => {
        if (typeof value === 'function') {
            // This is tricky with Redux, we generally don't want function updates here
            // But for compatibility...
            // Best to just dispatch the new array if possible, or support it
            // Current codebase mostly uses it for optimistic updates or appends.
            // Since we have Redux, we should try to pass the new state directly where possible.
            // But for now, let's just accept the new array if it's not a function
            console.warn('Functional updates to setMessages via hook are not fully supported in Redux migration yet');
        } else {
            dispatch(setMessages(value));
        }
    }, [dispatch]);

    return {
        messages,
        isLoading,
        isSearching,
        isUploading,
        attachedFile,
        attachedFileUrl,
        setMessages: setMessagesWrapper,
        handleSend,
        handleRegenerate,
        handleStop,
        handleFileSelect,
        handlePaste,
        clearAttachment
    };
}
export default useChat;
