import React, { useState, useEffect, useRef } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, TextField, IconButton, Typography, Paper, Divider, Checkbox } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

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
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: 240,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', bgcolor: 'background.paper' },
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
                        <Paper
                            key={i}
                            sx={{
                                p: 2,
                                maxWidth: '80%',
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                bgcolor: msg.role === 'user' ? 'primary.dark' : 'background.paper',
                                borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0'
                            }}
                        >
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                        </Paper>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                    />
                    <IconButton color="primary" onClick={handleSend} sx={{ bgcolor: 'background.paper', p: 1.5 }}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatPage;
