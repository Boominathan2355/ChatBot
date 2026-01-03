import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog, DialogContent, Box, Typography, List, ListItemButton,
    ListItemText, IconButton, Button, Divider, Select, MenuItem, FormControl, TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useThemeMode } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PaletteIcon from '@mui/icons-material/Palette';
import AppsIcon from '@mui/icons-material/Apps';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TuneIcon from '@mui/icons-material/Tune';

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    initialTab?: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose, initialTab }) => {
    const [activeTab, setActiveTab] = useState('General');

    // Update active tab when dialog opens with initialTab
    React.useEffect(() => {
        if (open && initialTab) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const { mode, setMode, resolvedMode } = useThemeMode();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/auth/me');
            logout();
            onClose();
            navigate('/register');
        } catch (error) {
            console.error('Delete account error:', error);
            alert('Failed to delete account');
        }
    };

    // Model Config State
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
    const [systemInstructions, setSystemInstructions] = useState('');
    const [defaultModel, setDefaultModel] = useState('llama3');

    React.useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            if (data) {
                setOllamaBaseUrl(data.ollamaBaseUrl || 'http://localhost:11434');
                setSystemInstructions(data.systemInstructions || '');
                setDefaultModel(data.defaultModel || 'llama3');
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await api.put('/settings', {
                ollamaBaseUrl,
                systemInstructions,
                defaultModel
            });
            alert('Settings saved successfully!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to save settings');
        }
    };

    const testConnection = async () => {
        try {
            const { data } = await api.post('/settings/validate', { url: ollamaBaseUrl });
            alert(`✅ Connected! Found ${data.models?.length || 0} models`);
        } catch (e) {
            alert('❌ Could not connect to Ollama');
        }
    };

    const tabs = [
        { name: 'General', icon: <SettingsIcon fontSize="small" /> },
        { name: 'Modelconfig', icon: <TuneIcon fontSize="small" /> },
        { name: 'Notifications', icon: <NotificationsNoneIcon fontSize="small" /> },
        { name: 'Personalization', icon: <PaletteIcon fontSize="small" /> },
        { name: 'Apps', icon: <AppsIcon fontSize="small" /> },
        { name: 'Data controls', icon: <StorageIcon fontSize="small" /> },
        { name: 'Security', icon: <SecurityIcon fontSize="small" /> },
        { name: 'Parental controls', icon: <SupervisorAccountIcon fontSize="small" /> },
        { name: 'Account', icon: <AccountCircleIcon fontSize="small" /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'General':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* App updates */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>App updates</Typography>
                                <Typography sx={{ fontSize: 13, opacity: 0.6 }}>Current version: 1.2025.328</Typography>
                            </Box>
                            <Button variant="outlined" size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>
                                Check for updates
                            </Button>
                        </Box>
                        <Divider sx={{ opacity: 0.1 }} />

                        {/* Launch at Login */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Launch at Login</Typography>
                            <Typography sx={{ fontSize: 14, opacity: 0.6 }}>Off ↗</Typography>
                        </Box>
                        <Divider sx={{ opacity: 0.1 }} />

                        {/* Appearance used to be ThemeToggle, now integrated */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Appearance</Typography>
                            <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
                                <Select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value as any)}
                                    disableUnderline
                                    sx={{ fontSize: 14 }}
                                >
                                    <MenuItem value="system">System</MenuItem>
                                    <MenuItem value="dark">Dark</MenuItem>
                                    <MenuItem value="light">Light</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Divider sx={{ opacity: 0.1 }} />

                        {/* Accent Color */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Accent color</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2196f3' }} />
                                <Typography sx={{ fontSize: 14 }}>Blue</Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ opacity: 0.1 }} />

                        {/* Language */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Language</Typography>
                            <Typography sx={{ fontSize: 14 }}>Auto-detect</Typography>
                        </Box>

                    </Box>
                );
            case 'Modelconfig':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Ollama Configuration</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Base URL"
                                value={ollamaBaseUrl}
                                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                helperText="e.g., http://localhost:11434"
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                size="small"
                                label="Default Model"
                                value={defaultModel}
                                onChange={(e) => setDefaultModel(e.target.value)}
                                helperText="e.g., llama3, mistral"
                            />
                        </Box>

                        <Button variant="outlined" onClick={testConnection} size="small" sx={{ alignSelf: 'start' }}>
                            Test Connection
                        </Button>
                        <Button variant="contained" onClick={handleSaveSettings} sx={{ alignSelf: 'end' }}>
                            Save Changes
                        </Button>
                    </Box>
                );
            case 'Personalization':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>System Instructions</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                size="small"
                                placeholder="Define AI behavior..."
                                value={systemInstructions}
                                onChange={(e) => setSystemInstructions(e.target.value)}
                                helperText="Customize how Jarvis responds to you."
                            />
                        </Box>

                        <Button variant="contained" onClick={handleSaveSettings} sx={{ alignSelf: 'end' }}>
                            Save Changes
                        </Button>
                    </Box>
                );
            case 'Account':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', mt: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            {user?.avatar ? (
                                <Box
                                    component="img"
                                    src={user.avatar}
                                    sx={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(128,128,128,0.2)' }}
                                />
                            ) : (
                                <AccountCircleIcon sx={{ fontSize: 100, opacity: 0.2 }} />
                            )}
                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    bgcolor: resolvedMode === 'dark' ? '#333' : '#e0e0e0',
                                    '&:hover': { bgcolor: resolvedMode === 'dark' ? '#444' : '#d0d0d0' }
                                }}
                                size="small"
                            >
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Box>

                        <Box sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Username"
                                value={user?.username || ''}
                                InputProps={{ readOnly: true }}
                                variant="outlined"
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                value={user?.email || ''}
                                InputProps={{ readOnly: true }}
                                variant="outlined"
                            />
                            <Button variant="outlined" color="error" fullWidth sx={{ mt: 2 }} onClick={handleLogout}>
                                Log out
                            </Button>

                            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Danger Zone
                                </Typography>
                                <Button
                                    color="error"
                                    size="small"
                                    onClick={() => setDeleteConfirmOpen(true)}
                                    sx={{ opacity: 0.8, '&:hover': { opacity: 1, bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                                >
                                    Delete Account
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                );
            default:
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.5 }}>
                        <Typography>Feature coming soon</Typography>
                    </Box>
                );
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        height: 600,
                        overflow: 'hidden',

                        backgroundImage: 'none',
                        border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    }
                }}
            >
                <Box sx={{ display: 'flex', height: '100%' }}>
                    {/* Sidebar */}
                    <Box sx={{
                        width: 240,
                        borderRight: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                        p: 2,
                        bgcolor: resolvedMode === 'dark' ? '#171717' : '#f9f9f9',
                    }}>
                        <List>
                            {tabs.map((tab) => (
                                <ListItemButton
                                    key={tab.name}
                                    selected={activeTab === tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    sx={{
                                        borderRadius: 2,
                                        mb: 0.5,
                                        py: 1,
                                        '&.Mui-selected': { bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                    }}
                                >
                                    <Box sx={{ mr: 1.5, display: 'flex', opacity: 0.7 }}>{tab.icon}</Box>
                                    <ListItemText
                                        primary={tab.name}
                                        primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>

                    {/* Main Content */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>{activeTab}</Typography>
                            <IconButton onClick={onClose} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        <DialogContent sx={{ p: 4 }}>
                            {renderContent()}
                        </DialogContent>
                    </Box>
                </Box>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogContent>
                    <Typography variant="h6" gutterBottom color="error">Delete Account?</Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        This action is permanent and cannot be undone. All your chats and settings will be lost.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="contained" color="error" onClick={handleDeleteAccount}>Delete Permanently</Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SettingsDialog;
