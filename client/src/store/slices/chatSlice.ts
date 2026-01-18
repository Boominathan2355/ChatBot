import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// --- Interfaces ---

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
    lastMessageAt?: string;
}

export interface ChatSettings {
    tone: 'formal' | 'casual' | 'friendly' | 'fun' | 'professional';
    mode: 'normal' | 'creative' | 'analytical' | 'educational';
}

interface ChatState {
    messages: Message[];
    chats: Chat[];
    currentChatId: string | null;
    currentChat: Chat | null;
    isLoading: boolean;
    isSearching: boolean;
    isUploading: boolean;
    error: string | null;
    openFolders: Record<string, boolean>;
    // Context Menu State
    contextMenu: { mouseX: number; mouseY: number; chatId: string } | null;
    targetChatId: string | null;
    chatSettings: ChatSettings;
}

// --- Initial State ---

const initialState: ChatState = {
    messages: [],
    chats: [],
    currentChatId: null,
    currentChat: null,
    isLoading: false,
    isSearching: false,
    isUploading: false,
    error: null,
    openFolders: {
        Projects: true,
        Work: true,
        Homework: true,
        Writing: true,
        Story: true
    },
    contextMenu: null,
    targetChatId: null,
    chatSettings: {
        tone: 'formal',
        mode: 'normal'
    }
};

// --- Async Thunks ---

export const fetchChats = createAsyncThunk(
    'chat/fetchChats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/chats');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createNewChat = createAsyncThunk(
    'chat/createNewChat',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/chats');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteChat = createAsyncThunk(
    'chat/deleteChat',
    async (chatId: string, { rejectWithValue }) => {
        try {
            await api.delete(`/chats/${chatId}`);
            return chatId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const selectChat = createAsyncThunk(
    'chat/selectChat',
    async (chatId: string, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/chats/${chatId}/messages`);
            return { chatId, messages: data };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Manual thunk for sending message with streaming to avoid serializable issues with Response objects
// and to handle fine-grained dispatching
export const sendMessage = (
    input: string,
    imageObject: any,
    fileObject: any,
    currentChatId: string,
    currentChat: Chat | null,
    webSearchEnabled: boolean,
    aiProvider: string,
    currentModel: string
) => async (dispatch: any, _getState: any) => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    // Optimistic update
    const userMessage: Message = {
        role: 'user',
        content: input,
        image: imageObject
            ? { url: imageObject.url, id: 'temp' }
            : undefined
    };
    dispatch(addMessage(userMessage));

    // Placeholder for assistant
    dispatch(addMessage({ role: 'assistant', content: '', metadata: { senderName: 'Jarvis' } }));

    try {
        if (webSearchEnabled && !currentChat?.isGrouped) {
            dispatch(setSearching(true));
        }

        const endpoint = currentChat?.isGrouped
            ? `/api/chats/${currentChatId}/group-message`
            : `/api/chats/${currentChatId}/send`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                content: (() => {
                    const { tone, mode } = _getState().chat.chatSettings;
                    const systemPrefix = `[System: Respond in ${tone} tone and ${mode} mode] `;
                    const userContent = input || (imageObject
                        ? 'Sent an image'
                        : fileObject ? `Uploaded something` : '');
                    return `${systemPrefix}${userContent}`;
                })(),
                image: imageObject,
                webSearch: webSearchEnabled,
                useRag: false,
                documentId: fileObject?._id,
                aiProvider,
                model: currentModel
            })
        });

        dispatch(setSearching(false));

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let buffer = '';

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
                            dispatch(updateLastAssistantMessage(assistantContent));
                        }
                        if (json.title) {
                            dispatch(updateChatTitle({ id: currentChatId, title: json.title }));
                        }
                    } catch (e) {
                        console.error('Error parsing chunk', e);
                    }
                }
            }
        }
    } catch (error: any) {
        dispatch(setError(error.message));
        // Simple error handling for message: remove last assistant placeholder and add error
        // Or just append error message
        dispatch(addMessage({ role: 'system', content: `Error: ${error.message}` }));
    } finally {
        dispatch(setLoading(false));
    }
};


// --- Slice ---

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setChats: (state, action: PayloadAction<Chat[]>) => {
            state.chats = action.payload;
        },
        setCurrentChatId: (state, action: PayloadAction<string | null>) => {
            state.currentChatId = action.payload;
        },
        setCurrentChat: (state, action: PayloadAction<Chat | null>) => {
            state.currentChat = action.payload;
        },
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        updateLastAssistantMessage: (state, action: PayloadAction<string>) => {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = action.payload;
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSearching: (state, action: PayloadAction<boolean>) => {
            state.isSearching = action.payload;
        },
        setUploading: (state, action: PayloadAction<boolean>) => {
            state.isUploading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        toggleFolder: (state, action: PayloadAction<string>) => {
            state.openFolders[action.payload] = !state.openFolders[action.payload];
        },
        setContextMenu: (state, action: PayloadAction<ChatState['contextMenu']>) => {
            state.contextMenu = action.payload;
        },
        setTargetChatId: (state, action: PayloadAction<string | null>) => {
            state.targetChatId = action.payload;
        },
        updateChatTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
            const { id, title } = action.payload;
            const chat = state.chats.find(c => c._id === id);
            if (chat) chat.title = title;
            if (state.currentChatId === id && state.currentChat) {
                state.currentChat.title = title;
            }
        },
        pinChat: (state, action: PayloadAction<{ id: string; isPinned: boolean }>) => {
            const { id, isPinned } = action.payload;
            const chat = state.chats.find(c => c._id === id);
            if (chat) chat.isPinned = isPinned;
        },
        moveChatToFolder: (state, action: PayloadAction<{ id: string; folder: string | null }>) => {
            const { id, folder } = action.payload;
            const chat = state.chats.find(c => c._id === id);
            if (chat) chat.folder = folder;
        },
        setChatTone: (state, action: PayloadAction<ChatSettings['tone']>) => {
            state.chatSettings.tone = action.payload;
        },
        setChatMode: (state, action: PayloadAction<ChatSettings['mode']>) => {
            state.chatSettings.mode = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Chats
            .addCase(fetchChats.fulfilled, (state, action) => {
                state.chats = action.payload;
                // Sort chats
                state.chats.sort((a, b) => {
                    if (a.isPinned === b.isPinned) {
                        return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
                    }
                    return a.isPinned ? -1 : 1;
                });
            })
            // Create New Chat
            .addCase(createNewChat.fulfilled, (state, action) => {
                state.chats.unshift(action.payload);
                state.currentChatId = action.payload._id;
                state.currentChat = action.payload;
                state.messages = [];
            })
            // Delete Chat
            .addCase(deleteChat.fulfilled, (state, action) => {
                state.chats = state.chats.filter(c => c._id !== action.payload);
                if (state.currentChatId === action.payload) {
                    state.currentChatId = null;
                    state.currentChat = null;
                    state.messages = [];
                }
            })
            // Select Chat
            .addCase(selectChat.fulfilled, (state, action) => {
                state.currentChatId = action.payload.chatId;
                state.messages = action.payload.messages;
                state.currentChat = state.chats.find(c => c._id === action.payload.chatId) || null;
            });
    }
});

export const {
    setChats,
    setCurrentChatId,
    setCurrentChat,
    setMessages,
    addMessage,
    updateLastAssistantMessage,
    setLoading,
    setSearching,
    setUploading,
    setError,
    toggleFolder,
    setContextMenu,
    setTargetChatId,
    updateChatTitle,
    pinChat,
    moveChatToFolder,
    setChatTone,
    setChatMode
} = chatSlice.actions;

export default chatSlice.reducer;
