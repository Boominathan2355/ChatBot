import React, { useState, useEffect, useRef } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemText, TextField, IconButton, Typography, Avatar, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, ListItemIcon, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
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
    // Sidebar always open
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [inviteMode, setInviteMode] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Chat Management State
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; chatId: string } | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [targetChatId, setTargetChatId] = useState<string | null>(null);

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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
            // Basic validation
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('File size too large (max 5MB)');
                return;
            }
            setSelectedImage(file);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || !currentChatId || isLoading || isUploading) return;

        let messageContent = input;
        let imageObject = null;

        // Optimistic update
        setMessages(prev => [...prev, {
            role: 'user',
            content: messageContent,
            image: selectedImage ? { url: URL.createObjectURL(selectedImage), id: 'temp' } : undefined
        }]);

        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        try {
            // Handle Image Upload First (Simulation)
            if (selectedImage) {
                setIsUploading(true);
                // Simulate upload delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock response from object storage
                imageObject = {
                    url: "https://picsum.photos/400/300?random=" + Math.random(), // Placehold image
                    id: `img_${Date.now()}`,
                    width: 400,
                    height: 300,
                    mimeType: selectedImage.type || 'image/jpeg'
                };
                setIsUploading(false);
            }

            if (webSearchEnabled && !isGroupChat(currentChat)) setIsSearching(true);

            // Unified streaming logic for both Direct and Group chats
            const endpoint = isGroupChat(currentChat)
                ? `/api/chats/${currentChatId}/group-message`
                : `/api/chats/${currentChatId}/send`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    content: messageContent || (imageObject ? 'Sent an image' : ''), // Fallback text if just image
                    image: imageObject,
                    webSearch: webSearchEnabled
                })
            });

            setIsSearching(false);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            let buffer = '';

            // Group Chat: AI is "Jarvis", Direct Chat: AI is "assistant"
            // For Direct Chat, we optimistically add "assistant".
            // For Group Chat, we should wait? But user want "live typing".
            // Let's assume response is ALWAYS AI.
            // But wait, Group Chat might return JUST the user message if AI fails?
            // The streaming backend sends user confirmation? No, I skipped that.
            // It sends AI tokens.

            // So we add a placeholder for the incoming AI message
            setMessages(prev => [...prev, { role: 'assistant', content: '', metadata: { senderName: 'Jarvis' } }]);

            while (true) {
                const { done, value } = await reader?.read()!;
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
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMsg = newMessages[newMessages.length - 1];
                                    // Ensure we are updating the AI placeholder
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
        } catch (e: any) {
            console.error(e);
            // Remove the empty assistant message if it failed immediately
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.role === 'assistant' && !last.content) {
                    return prev.slice(0, -1);
                }
                // Determine if we should append a localized error message
                // If the error seems to be "Failed to fetch", it might be network.
                // If it's a backend 500, we already threw "Failed to send message".
                return [...prev, {
                    role: 'system',
                    content: `Error: ${e.message || 'Something went wrong. Please check if Ollama is running.'}`
                }];
            });
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
                                <Box sx={{ flex: 1, pt: 0.25, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5, opacity: 0.6 }}>
                                        {msg.role === 'user' ? 'You' : 'Jarvis'}
                                    </Typography>
                                    {msg.image && (
                                        <ImageMessage
                                            src={msg.image.url}
                                            width={msg.image.width}
                                            height={msg.image.height}
                                            resolvedMode={resolvedMode}
                                        />
                                    )}
                                    {msg.content && <MessageRenderer content={msg.content} role={msg.role} />}
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

                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                            <Tooltip title="Attach Image">
                                <IconButton
                                    onClick={() => fileInputRef.current?.click()}
                                    size="small"
                                    color={selectedImage ? 'primary' : 'default'}
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
                                variant="standard"
                                InputProps={{ disableUnderline: true, sx: { fontSize: 14, py: 0.5 } }}
                            />
                            <IconButton
                                onClick={handleSend}
                                disabled={(!input.trim() && !selectedImage) || isLoading || isUploading}
                                size="small"
                                sx={{
                                    bgcolor: (input.trim() || selectedImage) ? (resolvedMode === 'dark' ? '#fff' : '#0a0a0a') : 'transparent',
                                    color: (input.trim() || selectedImage) ? (resolvedMode === 'dark' ? '#0a0a0a' : '#fff') : 'inherit',
                                    '&:hover': { bgcolor: (input.trim() || selectedImage) ? (resolvedMode === 'dark' ? '#eee' : '#222') : 'transparent' },
                                    '&.Mui-disabled': { bgcolor: 'transparent' }
                                }}
                            >
                                {isUploading ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
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
