import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    useMediaQuery,
    useTheme,
    Button,
    Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeMode } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

// Hooks
import { useChat, useChatManagement, FOLDERS } from '../hooks';

// Organisms
import {
    ChatSidebar,
    ChatInputArea,
    MessageList,
    ShareDialog,
    RenameDialog
} from '../organisms';

// Molecules
import { ChatContextMenu } from '../molecules';

// Components
import SettingsDialog from '../components/SettingsDialog';
import { ChatConfigMenu } from '../components/ChatConfigMenu';
import { ExportMenu } from '../components/ExportMenu';
import { ErrorBoundary } from 'react-error-boundary';
import OopsPage from './OopsPage';

const ChatPage: React.FC = () => {
    const { resolvedMode } = useThemeMode();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

    // Settings dialog state
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general');

    // Share dialog state
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [inviteMode, setInviteMode] = useState(false);

    // Message editing state
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState('');

    // Web search state
    // Web search state
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    // Thinking mode state
    const [thinkingEnabled, setThinkingEnabled] = useState(true);

    // Input state
    const [input, setInput] = useState('');

    // Model switching state
    const [aiProvider, setAiProvider] = useState('ollama');
    const [currentModel, setCurrentModel] = useState('');
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);
    const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Scroll ref
    const scrollRef = useRef<HTMLDivElement>(null);
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    // Custom hooks
    const chatManagement = useChatManagement();
    const chat = useChat();

    // Responsive sidebar
    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    // Initial data fetch
    useEffect(() => {
        chatManagement.fetchChats(location.state);
        chatManagement.fetchGroups();
        loadQuickSettings();
    }, []);

    // Load messages when chat changes
    useEffect(() => {
        if (chatManagement.currentChatId) {
            chatManagement.selectChat(chatManagement.currentChatId)
                .then((messages) => chat.setMessages(messages));
        }
    }, [chatManagement.currentChatId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (!userScrolledUp && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat.messages, userScrolledUp]);

    const loadQuickSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            if (data) {
                setAiProvider(data.aiProvider || 'ollama');
                const model = data[data.aiProvider || 'ollama']?.model || '';
                setCurrentModel(model);
                fetchAvailableModels(data.aiProvider || 'ollama', data.ollama?.baseUrl);
            }
        } catch (e) {
            console.error('Failed to load quick settings', e);
        }
    };

    const fetchAvailableModels = async (provider: string, ollamaBaseUrl?: string) => {
        setIsLoadingModels(true);
        try {
            let url = `/settings/models/${provider}`;
            if (provider === 'ollama' && ollamaBaseUrl) {
                url += `?baseUrl=${encodeURIComponent(ollamaBaseUrl)}`;
            }
            const { data } = await api.get(url);
            setAvailableModels(data.models || []);
        } catch (e) {
            console.error('Failed to fetch models', e);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleModelSwitch = async (modelId: string) => {
        try {
            setCurrentModel(modelId);
            setModelMenuAnchor(null);
            await api.put('/settings', { aiProvider, [aiProvider]: { model: modelId } });
        } catch (e) {
            console.error('Failed to switch model', e);
            alert('Failed to save model change');
        }
    };

    // Message actions
    const handleCopy = useCallback(async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    const handleEditMessage = useCallback((index: number, content: string) => {
        setEditingMessageIndex(index);
        setEditedContent(content);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageIndex(null);
        setEditedContent('');
    }, []);

    const handleSaveEdit = async (index: number) => {
        if (!editedContent.trim() || !chatManagement.currentChatId) return;

        const updatedMessages = [...chat.messages];
        updatedMessages[index] = { ...updatedMessages[index], content: editedContent };
        const messagesToKeep = updatedMessages.slice(0, index + 1);
        chat.setMessages(messagesToKeep);

        setEditingMessageIndex(null);
        setEditedContent('');

        try {
            await api.patch(`/chats/${chatManagement.currentChatId}`, { messages: messagesToKeep });
            chat.setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '', metadata: { senderName: 'Jarvis' } }
            ]);

            // Trigger regeneration
            await chat.handleSend(
                editedContent,
                chatManagement.currentChatId,
                chatManagement.currentChat,
                webSearchEnabled,
                aiProvider,
                currentModel,
                thinkingEnabled
            );
        } catch (error) {
            console.error('Failed to save edited message:', error);
        }
    };

    // Send handler
    const handleSend = useCallback(() => {
        if (!chatManagement.currentChatId) return;
        chat.handleSend(
            input,
            chatManagement.currentChatId,
            chatManagement.currentChat,
            webSearchEnabled,
            aiProvider,
            currentModel,
            thinkingEnabled
        );
        setInput('');
    }, [input, chatManagement.currentChatId, chatManagement.currentChat, webSearchEnabled, aiProvider, currentModel, chat.handleSend, chatManagement.updateChatTitle]);

    // Regenerate handler
    const handleRegenerate = useCallback((index: number) => {
        if (!chatManagement.currentChatId) return;
        chat.handleRegenerate(
            index,
            chatManagement.currentChatId,
            chatManagement.currentChat,
            webSearchEnabled
        );
    }, [chatManagement.currentChatId, chatManagement.currentChat, webSearchEnabled, chat.handleRegenerate]);

    // Share handlers
    const handleShare = async (invite: boolean) => {
        if (!chatManagement.currentChatId) return;
        try {
            const { data } = await api.post(`/chats/${chatManagement.currentChatId}/share`);
            const url = invite
                ? `${window.location.origin}/shared/${data.shareToken}?invite=true`
                : `${window.location.origin}/shared/${data.shareToken}`;
            setShareUrl(url);
            setInviteMode(invite);
            setShareDialogOpen(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRevokeShare = async () => {
        if (window.confirm('Revoke this link?')) {
            try {
                await api.delete(`/chats/${chatManagement.currentChatId}/share`);
                setShareDialogOpen(false);
                setShareUrl('');
            } catch (e) {
                console.error(e);
            }
        }
    };

    // User menu handlers
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setMenuAnchorEl(event.currentTarget);
    const handleMenuClose = () => setMenuAnchorEl(null);
    const handleSettingsOpen = () => { setSettingsTab('General'); setSettingsOpen(true); handleMenuClose(); };
    const handlePersonalizationOpen = () => { setSettingsTab('Personalization'); setSettingsOpen(true); handleMenuClose(); };
    const handleLogout = () => { handleMenuClose(); logout(); };

    // Select chat handler
    const handleSelectChat = async (id: string) => {
        chat.handleStop();
        const messages = await chatManagement.selectChat(id);
        chat.setMessages(messages);
    };

    // Scroll handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        setUserScrolledUp(!isNearBottom);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'transparent' }}>
            {/* Sidebar */}
            <ChatSidebar
                chats={chatManagement.chats}
                groups={chatManagement.groups}
                currentChatId={chatManagement.currentChatId}
                sidebarOpen={sidebarOpen}
                isMobile={isMobile}
                folders={FOLDERS}
                openFolders={chatManagement.openFolders}
                user={user}
                resolvedMode={resolvedMode}
                menuAnchorEl={menuAnchorEl}
                menuOpen={Boolean(menuAnchorEl)}
                onSidebarClose={() => setSidebarOpen(false)}
                onSelectChat={handleSelectChat}
                onContextMenu={chatManagement.handleContextMenu}
                onCreateNewChat={async () => {
                    await chatManagement.createNewChat();
                    chat.setMessages([]);
                }}
                onNavigateGroups={() => navigate('/groups')}
                onStartGroupChat={chatManagement.startGroupChat}
                onToggleFolder={chatManagement.toggleFolder}
                onMenuClick={handleMenuClick}
                onMenuClose={handleMenuClose}
                onSettingsOpen={handleSettingsOpen}
                onPersonalizationOpen={handlePersonalizationOpen}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    ml: 0,
                    px: 2
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderBottom: resolvedMode === 'dark'
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(0,0,0,0.06)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isMobile && (
                            <IconButton onClick={() => setSidebarOpen(true)} size="small" sx={{ mr: 1 }}>
                                <MenuIcon />
                            </IconButton>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
                                {chatManagement.currentChat?.title || 'Jarvis AI'}
                            </Typography>
                            <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ChatConfigMenu resolvedMode={resolvedMode} />
                        <ExportMenu resolvedMode={resolvedMode} />

                        <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />

                        <Button
                            variant="text"
                            size="small"
                            onClick={() => handleShare(true)}
                            startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
                            sx={{
                                textTransform: 'none',
                                color: 'text.primary',
                                minWidth: 'auto',
                                px: 1.5
                            }}
                        >
                            Add People
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleShare(false)}
                            startIcon={<span style={{ fontSize: '1.2em', lineHeight: 1 }}>↑</span>}
                            sx={{
                                textTransform: 'none',
                                borderRadius: 5,
                                px: 2,
                                ml: 0.5,
                                borderColor: 'divider',
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            Share
                        </Button>
                    </Box>
                </Box>

                <ErrorBoundary FallbackComponent={({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: () => void }) => (
                    <OopsPage
                        title="Chat Interface Error"
                        description={error.message || "Something went wrong in the chat window."}
                        onReset={resetErrorBoundary}
                        isError={true}
                        sx={{ height: '100%', justifyContent: 'center' }}
                    />
                )}>
                    {/* Messages Area */}
                    <Box ref={scrollRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: 'auto' }}>
                        <MessageList
                            messages={chat.messages}
                            isLoading={chat.isLoading}
                            resolvedMode={resolvedMode}
                            isMobile={isMobile}
                            editingMessageIndex={editingMessageIndex}
                            editedContent={editedContent}
                            onEditChange={setEditedContent}
                            onCancelEdit={handleCancelEdit}
                            onSaveEdit={handleSaveEdit}
                            onCopy={handleCopy}
                            onEdit={handleEditMessage}
                            onRegenerate={handleRegenerate}
                        />
                    </Box>

                    {/* Input Area */}
                    <ChatInputArea
                        input={input}
                        onInputChange={setInput}
                        onSend={handleSend}
                        onStop={chat.handleStop}
                        onPaste={chat.handlePaste}
                        isLoading={chat.isLoading}
                        isUploading={chat.isUploading}
                        webSearchEnabled={webSearchEnabled}
                        onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                        isSearching={chat.isSearching}
                        thinkingEnabled={thinkingEnabled}
                        onToggleThinking={() => setThinkingEnabled(!thinkingEnabled)}
                        attachedFile={chat.attachedFile}
                        attachedFileUrl={chat.attachedFileUrl}
                        onFileSelect={chat.handleFileSelect}
                        onRemoveAttachment={chat.clearAttachment}
                        currentModel={currentModel}
                        availableModels={availableModels}
                        aiProvider={aiProvider}
                        isLoadingModels={isLoadingModels}
                        onModelSwitch={handleModelSwitch}
                        modelMenuAnchor={modelMenuAnchor}
                        onModelMenuOpen={(e) => setModelMenuAnchor(e.currentTarget)}
                        onModelMenuClose={() => setModelMenuAnchor(null)}
                        resolvedMode={resolvedMode}
                        isMobile={isMobile}
                    />

                    {/* Disclaimer */}
                    <Typography sx={{ fontSize: 11, textAlign: 'center', py: 1, opacity: 0.35 }}>
                        Jarvis AI can make mistakes. Markdown is supported. Consider checking important information.
                    </Typography>
                </ErrorBoundary>
            </Box>

            {/* Dialogs and Menus */}
            <ShareDialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                shareUrl={shareUrl}
                inviteMode={inviteMode}
                onRevoke={handleRevokeShare}
                onCopy={() => { navigator.clipboard.writeText(shareUrl); setShareDialogOpen(false); }}
                resolvedMode={resolvedMode}
            />

            <RenameDialog
                open={chatManagement.renameDialogOpen}
                onClose={() => chatManagement.setRenameDialogOpen(false)}
                title={chatManagement.newTitle}
                onTitleChange={chatManagement.setNewTitle}
                onSave={chatManagement.handleSaveRename}
            />

            <ChatContextMenu
                contextMenu={chatManagement.contextMenu}
                onClose={chatManagement.handleCloseContextMenu}
                targetChat={chatManagement.chats.find((c) => c._id === chatManagement.targetChatId)}
                folders={FOLDERS}
                onRename={chatManagement.handleRenameInit}
                onPinChat={chatManagement.handlePinChat}
                onMoveToFolder={chatManagement.handleMoveToFolder}
                onRemoveFromFolder={chatManagement.handleRemoveFromFolder}
                onDelete={chatManagement.handleDeleteChat}
                resolvedMode={resolvedMode}
            />

            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                initialTab={settingsTab}
            />
        </Box >
    );
};

export default ChatPage;
