import { Box, Container, Typography, List, ListItem, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, Drawer, Avatar, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import api from '../services/api';
import { GlassCard, GlassButton } from '../components';
import { useThemeMode } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import SettingsDialog from '../components/SettingsDialog';

const DRAWER_WIDTH = 260;

const GroupsPage: React.FC = () => {
    const { resolvedMode } = useThemeMode();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    // Groups State
    const [groups, setGroups] = useState<any[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');

    // Sidebar State
    const [chats, setChats] = useState<any[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('General');

    useEffect(() => {
        loadGroups();
        loadChats();
    }, []);

    const loadGroups = async () => {
        try {
            const { data } = await api.get('/groups');
            setGroups(data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadChats = async () => {
        try {
            const { data } = await api.get('/chats');
            setChats(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateGroup = async () => {
        try {
            await api.post('/groups', { name: newGroupName, description: newGroupDesc });
            setOpenDialog(false);
            setNewGroupName('');
            setNewGroupDesc('');
            loadGroups();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to create group');
        }
    };

    const startGroupChat = async (groupId: string) => {
        try {
            await api.post(`/chats/group/${groupId}`);
            navigate('/chat');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to start group chat');
        }
    };

    // Sidebar Handlers
    const createNewChat = async () => {
        try {
            await api.post('/chats');
            navigate('/chat');
        } catch (e) {
            console.error(e);
        }
    };

    const selectChat = (chatId: string) => {
        navigate('/chat', { state: { chatId } });
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (window.confirm('Delete this chat?')) {
            try {
                await api.delete(`/chats/${chatId}`);
                loadChats();
            } catch (error) {
                console.error('Failed to delete chat:', error);
            }
        }
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
        navigate('/login');
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

    const openMenu = Boolean(anchorEl);

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: resolvedMode === 'dark' ? '#0a0a0a' : '#ffffff' }}>
            {/* Sidebar */}
            <Drawer
                variant={isMobile ? 'temporary' : 'persistent'}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: resolvedMode === 'dark' ? '#0a0a0a' : '#f5f5f5',
                        borderRight: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
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
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: 1,
                }}>
                    <List disablePadding>
                        {chats.filter((c: any) => !c.isGrouped).map((chat: any) => (
                            <ListItemButton
                                key={chat._id}
                                onClick={() => selectChat(chat._id)}
                                sx={{
                                    borderRadius: 1,
                                    py: 0.75,
                                    px: 1.5,
                                    mb: 0.25,
                                    position: 'relative',
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
                    {chats.some((c: any) => c.isGrouped) && (
                        <>
                            <Typography sx={{ px: 1.5, pt: 2, pb: 0.5, fontSize: 11, opacity: 0.4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Group Chats
                            </Typography>
                            <List disablePadding>
                                {chats.filter((c: any) => c.isGrouped).map((chat: any) => (
                                    <ListItemButton
                                        key={chat._id}
                                        onClick={() => selectChat(chat._id)}
                                        sx={{
                                            borderRadius: 1,
                                            py: 0.75,
                                            px: 1.5,
                                            mb: 0.25,
                                            position: 'relative',
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

            {/* Main Content Area - Groups Management */}
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: 'transparent' }}>
                {/* Header (Simplified for Groups) */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderBottom: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                }}>
                    {isMobile && (
                        <IconButton onClick={() => setSidebarOpen(true)} size="small" sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" fontWeight={600}>Manage Groups</Typography>
                    <GlassButton variant="contained" size="small" onClick={() => setOpenDialog(true)}>
                        + New Group
                    </GlassButton>
                </Box>

                {/* Groups Content */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: isMobile ? 2 : 3,
                    // Visible scrollbar styling for main content
                    scrollbarWidth: 'thin',
                    scrollbarColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.3) transparent' : 'rgba(0,0,0,0.3) transparent',
                    '&::-webkit-scrollbar': {
                        width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                        borderRadius: '4px',
                        border: '2px solid transparent',
                        backgroundClip: 'padding-box',
                        '&:hover': {
                            bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        },
                    },
                }}>
                    <Container maxWidth="md">
                        <GlassCard sx={{ p: 0, bgcolor: 'transparent', boxShadow: 'none' }}>
                            {groups.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <GroupIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                    <Typography color="text.secondary">No groups yet. Create one to get started!</Typography>
                                </Box>
                            ) : (
                                <List>
                                    {groups.map((group: any) => (
                                        <ListItem key={group._id}
                                            sx={{
                                                mb: 2,
                                                bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                borderRadius: 3,
                                                border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                                            }}
                                            secondaryAction={
                                                <Tooltip title="Start Chat">
                                                    <IconButton edge="end" onClick={() => startGroupChat(group._id)} color="primary">
                                                        <ChatIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            }>
                                            <ListItemButton sx={{ borderRadius: 2 }}>
                                                <ListItemText
                                                    primary={group.name}
                                                    secondary={
                                                        <>
                                                            <Typography component="span" variant="body2" color="text.primary">
                                                                {group.members.length} members
                                                            </Typography>
                                                            {group.description && ` — ${group.description}`}
                                                        </>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </GlassCard>
                    </Container>
                </Box>
            </Box>

            {/* Create Group Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: resolvedMode === 'dark' ? '#1e1e1e' : '#fff',
                        borderRadius: 3
                    }
                }}
            >
                <DialogTitle>Create New Group</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Group Name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        margin="normal"
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        fullWidth
                        label="Description (optional)"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <GlassButton onClick={() => setOpenDialog(false)}>Cancel</GlassButton>
                    <GlassButton onClick={handleCreateGroup} variant="contained" disabled={!newGroupName.trim()}>
                        Create
                    </GlassButton>
                </DialogActions>
            </Dialog>

            {/* Settings Dialog */}
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                initialTab={settingsTab}
            />
        </Box>
    );
};

export default GroupsPage;
