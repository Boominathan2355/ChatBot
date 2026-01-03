import React, { useState, useEffect, useRef } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, TextField, IconButton, Typography, Divider, Checkbox, Avatar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton } from '../components';

const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [chats, setChats] = useState<any[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [selectedChats, setSelectedChats] = useState<string[]>([]);
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchChats();
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
            if (data.length > 0 && !currentChatId) {
                selectChat(data[0]._id);
            }
        } catch (e) { console.error(e); }
    };

    const selectChat = async (id: string) => {
        setCurrentChatId(id);
        const { data } = await api.get(`/chats/${id}/messages`);
        setMessages(data);
    };

    const createNewChat = async () => {
        const { data } = await api.post('/chats');
        setChats([data, ...chats]);
        setCurrentChatId(data._id);
        setMessages([]);
    };

    const handleBulkDelete = async () => {
        if (selectedChats.length === 0) return;

        if (!confirm(`Delete ${selectedChats.length} chat(s)?`)) return;

        try {
            await api.post('/chats/bulk-delete', { chatIds: selectedChats });
            setChats(chats.filter(c => !selectedChats.includes(c._id)));
            setSelectedChats([]);
            if (selectedChats.includes(currentChatId!)) {
                setCurrentChatId(null);
                setMessages([]);
            }
        } catch (e) {
            alert('Failed to delete chats');
        }
    };

    const toggleChatSelection = (chatId: string) => {
        setSelectedChats(prev =>
            prev.includes(chatId)
                ? prev.filter(id => id !== chatId)
                : [...prev, chatId]
        );
    };

    const handleSend = async () => {
        if (!input.trim() || !currentChatId) return;

        const messageContent = input; // Store before clearing
        const userMessage = { role: 'user', content: messageContent };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            const response = await fetch(`http://localhost:5000/api/chats/${currentChatId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ content: messageContent })
            });

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
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', position: 'relative', zIndex: 1 }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: 260,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 260,
                        boxSizing: 'border-box',
                        background: 'rgba(10, 14, 39, 0.95)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary">Jarvis AI</Typography>
                    <Box>
                        {selectedChats.length > 0 && (
                            <IconButton onClick={handleBulkDelete} color="error" size="small">
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <IconButton onClick={() => navigate('/settings')}><SettingsIcon /></IconButton>
                    </Box>
                </Box>
                <Divider />
                <List>
                    <ListItem disablePadding>
                        <ListItemButton onClick={createNewChat}>
                            <ListItemText primary="+ New Chat" sx={{ textAlign: 'center', color: 'primary.main' }} />
                        </ListItemButton>
                    </ListItem>
                    {chats.map(chat => (
                        <ListItem key={chat._id} disablePadding>
                            <Checkbox
                                checked={selectedChats.includes(chat._id)}
                                onChange={() => toggleChatSelection(chat._id)}
                                size="small"
                                sx={{ py: 0 }}
                            />
                            <ListItemButton
                                selected={currentChatId === chat._id}
                                onClick={() => selectChat(chat._id)}
                            >
                                <ListItemText primary={chat.title} primaryTypographyProps={{ noWrap: true }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                <Box sx={{ mt: 'auto', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={logout} color="error"><LogoutIcon /></IconButton>
                    <Typography variant="body2">{user?.username}</Typography>
                </Box>
            </Drawer>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                <Box
                    ref={scrollRef}
                    sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    {messages.map((msg, i) => (
                        <Box
                            key={i}
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                maxWidth: '85%',
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 36,
                                    height: 36,
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #00e5ff 0%, #bb86fc 100%)'
                                        : 'linear-gradient(135deg, #bb86fc 0%, #ff6b9d 100%)',
                                    boxShadow: msg.role === 'user'
                                        ? '0 4px 16px rgba(0, 229, 255, 0.3)'
                                        : '0 4px 16px rgba(187, 134, 252, 0.3)'
                                }}
                            >
                                {msg.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                            </Avatar>
                            <GlassCard
                                sx={{
                                    p: 2,
                                    flex: 1,
                                    background: msg.role === 'user'
                                        ? 'rgba(0, 229, 255, 0.1)'
                                        : 'rgba(16, 24, 48, 0.6)',
                                    border: msg.role === 'user'
                                        ? '1px solid rgba(0, 229, 255, 0.3)'
                                        : '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            </GlassCard>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        multiline
                        maxRows={4}
                    />
                    <GlassButton
                        variant="contained"
                        onClick={handleSend}
                        sx={{
                            minWidth: 56,
                            height: 56,
                            borderRadius: '50%',
                            p: 0
                        }}
                    >
                        <SendIcon />
                    </GlassButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatPage;
