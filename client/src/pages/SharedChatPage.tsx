import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Container, CircularProgress } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { MessageRenderer } from '../components';
import { useThemeMode } from '../context/ThemeContext';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '@mui/material';

const SharedChatPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { mode, resolvedMode } = useThemeMode();
    const [chat, setChat] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token: authToken } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const isInvite = searchParams.get('invite') === 'true';
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleAction = async () => {
        if (!authToken) {
            navigate('/login');
            return;
        }

        try {
            if (isInvite) {
                // Join flow
                const { data } = await api.post(`/chats/shared/${token}/join`);
                navigate('/chat', { state: { chatId: data._id } });
            } else {
                // Import/Copy flow
                await api.post(`/chats/shared/${token}/import`);
                navigate('/chat');
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const fetchSharedChat = async () => {
            try {
                const { data } = await api.get(`/chats/shared/${token}`);
                setChat(data);
            } catch (err: any) {
                console.error(err);
                setError(err.response?.data?.message || 'Failed to load chat');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchSharedChat();
    }, [token]);

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: resolvedMode === 'dark' ? '#0a0a0a' : '#ffffff', color: resolvedMode === 'dark' ? '#fff' : '#000' }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ width: 100 }} /> {/* Spacer */}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {chat?.title || 'Shared Chat'}
                </Typography>
                <Box sx={{ width: 100 }} /> {/* Spacer */}
            </Box>

            {/* Content */}
            <Container maxWidth="md" sx={{ flex: 1, overflowY: 'auto', py: 4 }} ref={scrollRef}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : (
                    <Box>
                        {/* Disclaimer */}
                        <Box sx={{
                            p: 2,
                            mb: 4,
                            borderRadius: 2,
                            bgcolor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                            border: resolvedMode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                            textAlign: 'center'
                        }}>
                            <Typography sx={{ fontSize: 13, opacity: 0.7 }}>
                                This is a shared chat session from Jarvis AI.
                            </Typography>
                        </Box>

                        {chat.messages.map((msg: any, i: number) => (
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
                                        {msg.role === 'user' ? 'User' : 'Jarvis'}
                                    </Typography>
                                    <MessageRenderer content={msg.content} role={msg.role} />
                                </Box>
                            </Box>
                        ))}

                        {/* Action Button - Bottom */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                            <Button
                                variant="contained"
                                onClick={handleAction}
                                startIcon={isInvite ? <PersonIcon /> : <SmartToyIcon />}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    bgcolor: mode === 'dark' ? '#fff' : '#0a0a0a',
                                    color: mode === 'dark' ? '#0a0a0a' : '#fff',
                                    '&:hover': { bgcolor: mode === 'dark' ? '#e0e0e0' : '#333' }
                                }}
                            >
                                {isInvite ? 'Join Chat' : 'Import Copy'}
                            </Button>
                        </Box>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default SharedChatPage;
