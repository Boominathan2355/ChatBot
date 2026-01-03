import React, { useState, useEffect, useRef } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemText, TextField, IconButton, Typography, Avatar, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';

import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageRenderer } from '../components';
import SettingsDialog from '../components/SettingsDialog';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useThemeMode } from '../context/ThemeContext';

const DRAWER_WIDTH = 260;

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
    // Sidebar always open
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('General');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [shareUrl, setShareUrl] = useState('');
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chats');
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

    const handleSend = async () => {
        if (!input.trim() || !currentChatId || isLoading) return;

        const messageContent = input;
        const userMessage = { role: 'user', content: messageContent };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (isGroupChat(currentChat)) {
                await api.post(`/chats/${currentChatId}/group-message`, { content: messageContent });
                const { data } = await api.get(`/chats/${currentChatId}/messages`);
                setMessages(data);
            } else {
                if (webSearchEnabled) setIsSearching(true);

                const response = await fetch(`http://localhost:5000/api/chats/${currentChatId}/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ content: messageContent, webSearch: webSearchEnabled })
                });

                setIsSearching(false);

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let assistantContent = '';

                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

                while (true) {
                    const { done, value } = await reader?.read()!;
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '');
                            if (dataStr === '[DONE]') break;
                            try {
                                const json = JSON.parse(dataStr);
                                assistantContent += json.content;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].content = assistantContent;
                                    return newMessages;
                                });
                            } catch (e) { }
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
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
                    <List disablePadding>
                        {chats.filter(c => !c.isGrouped).map(chat => (
                            <ListItemButton
                                key={chat._id}
                                selected={currentChatId === chat._id}
                                onClick={() => selectChat(chat._id)}
                                sx={{
                                    borderRadius: 1,
                                    py: 0.75,
                                    px: 1.5,
                                    mb: 0.25,
                                    position: 'relative',
                                    '&.Mui-selected': {
                                        bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    },
                                    '&:hover': {
                                        bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                        '& .delete-icon': { opacity: 1 }
                                    }
                                }}
                            >
                                <ListItemText
                                    primary={chat.title || 'New Chat'}
                                    primaryTypographyProps={{ noWrap: true, fontSize: 14, sx: { pr: 2 } }}
                                />
                                <IconButton
                                    className="delete-icon"
                                    size="small"
                                    onClick={(e) => handleDeleteChat(e, chat._id)}
                                    sx={{
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        color: resolvedMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                                        '&:hover': { color: '#f44336', bgcolor: 'transparent' }
                                    }}
                                >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </ListItemButton>
                        ))}
                    </List>

                    {/* Group Chats (Active) */}
                    {chats.some(c => c.isGrouped) && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Group Chats
                            </Typography>
                            <List disablePadding>
                                {chats.filter(c => c.isGrouped).map(chat => (
                                    <ListItemButton
                                        key={chat._id}
                                        selected={currentChatId === chat._id}
                                        onClick={() => selectChat(chat._id)}
                                        sx={{
                                            borderRadius: 1,
                                            py: 0.75,
                                            px: 1.5,
                                            mb: 0.25,
                                            position: 'relative',
                                            '&.Mui-selected': {
                                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            },
                                            '&:hover': {
                                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                                '& .delete-icon': { opacity: 1 }
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={chat.title || 'Group Chat'}
                                            primaryTypographyProps={{ noWrap: true, fontSize: 14, sx: { pr: 2 } }}
                                        />
                                        <IconButton
                                            className="delete-icon"
                                            size="small"
                                            onClick={(e) => handleDeleteChat(e, chat._id)}
                                            sx={{
                                                position: 'absolute',
                                                right: 4,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                                color: resolvedMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                                                '&:hover': { color: '#f44336', bgcolor: 'transparent' }
                                            }}
                                        >
                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </ListItemButton>
                                ))}
                            </List>
                        </>
                    )}

                    {/* Available Groups */}
                    {groups.length > 0 && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Start New Group Chat
                            </Typography>
                            <List disablePadding>
                                {groups.map(group => (
                                    <ListItemButton
                                        key={group._id}
                                        onClick={() => startGroupChat(group._id)}
                                        sx={{
                                            borderRadius: 1,
                                            py: 0.75,
                                            px: 1.5,
                                            mb: 0.25,
                                            '&:hover': {
                                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={group.name}
                                            primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                                        />
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
                        <Avatar
                            sx={{ width: 32, height: 32, fontSize: 14, bgcolor: '#444' }}
                            alt={user?.username}
                            src={user?.avatar}
                        >
                            {user?.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.username || 'User'}
                        </Typography>
                        <MoreHorizIcon sx={{ fontSize: 20, opacity: 0.6 }} />
                    </Box>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleMenuClose}
                        PaperProps={{
                            sx: {
                                width: 220,
                                borderRadius: 1.5,
                                mt: -1,
                                bgcolor: resolvedMode === 'dark' ? '#1e1e1e' : '#fff',
                                backgroundImage: 'none',
                                border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                            }
                        }}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                        }}
                    >
                        <MenuItem onClick={handleSettingsOpen} sx={{ fontSize: 14, py: 1.5 }}>
                            Settings
                        </MenuItem>
                        <MenuItem onClick={handlePersonalizationOpen} sx={{ fontSize: 14, py: 1.5 }}>
                            Personalization
                        </MenuItem>
                        <Box sx={{ my: 0.5, borderTop: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }} />
                        <MenuItem onClick={handleLogout} sx={{ fontSize: 14, py: 1.5, color: '#f44336' }}>
                            Log out
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
                            onClick={() => navigate('/groups')}
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
                            <GroupsIcon sx={{ fontSize: 16 }} />
                            <Typography sx={{ fontSize: 13 }}>Groups</Typography>
                        </Box>
                        <Box
                            onClick={async () => {
                                if (!currentChatId) return;
                                try {
                                    const { data } = await api.post(`/chats/${currentChatId}/share`);
                                    const url = `${window.location.origin}/shared/${data.shareToken}`;
                                    setShareUrl(url);
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
                            <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
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
                                <Box sx={{ flex: 1, pt: 0.25 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5, opacity: 0.6 }}>
                                        {msg.role === 'user' ? 'You' : 'Jarvis'}
                                    </Typography>
                                    <MessageRenderer content={msg.content} role={msg.role} />
                                </Box>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: resolvedMode === 'dark' ? '#fff' : '#0a0a0a' }}>
                                    <SmartToyIcon sx={{ fontSize: 16, color: resolvedMode === 'dark' ? '#0a0a0a' : '#fff' }} />
                                </Avatar>
                                <Box sx={{ pt: 0.5 }}><CircularProgress size={14} /></Box>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Input */}
                <Box sx={{ p: 2 }}>
                    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
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
                            <TextField
                                fullWidth
                                multiline
                                maxRows={6}
                                placeholder="Message Jarvis..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                variant="standard"
                                InputProps={{ disableUnderline: true, sx: { fontSize: 14, py: 0.5 } }}
                            />
                            <IconButton
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                size="small"
                                sx={{
                                    bgcolor: input.trim() ? (resolvedMode === 'dark' ? '#fff' : '#0a0a0a') : 'transparent',
                                    color: input.trim() ? (resolvedMode === 'dark' ? '#0a0a0a' : '#fff') : 'inherit',
                                    '&:hover': { bgcolor: input.trim() ? (resolvedMode === 'dark' ? '#eee' : '#222') : 'transparent' },
                                    '&.Mui-disabled': { bgcolor: 'transparent' }
                                }}
                            >
                                <SendIcon sx={{ fontSize: 18 }} />
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
                    Share Link to Chat
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography sx={{ fontSize: 13, opacity: 0.7, mb: 1.5, mt: 2 }}>
                        Anyone with the link can view this chat.
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

            {/* Settings Dialog */}
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />
        </Box>
    );
};

export default ChatPage;
