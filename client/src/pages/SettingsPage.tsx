import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, TextField, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GlassCard, GlassButton } from '../components';
import ThemeToggle from '../components/ThemeToggle';

const SettingsPage: React.FC = () => {
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
    const [systemInstructions, setSystemInstructions] = useState('');
    const [defaultModel, setDefaultModel] = useState('llama3');
    const navigate = useNavigate();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            setOllamaBaseUrl(data.ollamaBaseUrl);
            setSystemInstructions(data.systemInstructions);
            setDefaultModel(data.defaultModel);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
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

    return (
        <Box sx={{ minHeight: '100vh', py: 4, position: 'relative', zIndex: 1 }}>
            <Container maxWidth="md">
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/chat')}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" color="primary">Settings</Typography>
                    </Box>
                    <ThemeToggle />
                </Box>

                <GlassCard sx={{ p: 4 }}>
                    <Typography variant="h6" gutterBottom>Ollama Configuration</Typography>
                    <TextField
                        fullWidth
                        label="Ollama Base URL"
                        value={ollamaBaseUrl}
                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                        margin="normal"
                        helperText="e.g., http://localhost:11434"
                    />
                    <TextField
                        fullWidth
                        label="Default Model"
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                        margin="normal"
                        helperText="e.g., llama3, mistral, codellama"
                    />
                    <GlassButton variant="outlined" onClick={testConnection} sx={{ mt: 1, mb: 3 }}>
                        Test Connection
                    </GlassButton>

                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>System Instructions</Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Custom System Prompt"
                        value={systemInstructions}
                        onChange={(e) => setSystemInstructions(e.target.value)}
                        margin="normal"
                        helperText="Define Jarvis's personality and behavior"
                    />

                    <GlassButton
                        variant="contained"
                        size="large"
                        onClick={handleSave}
                        sx={{ mt: 3 }}
                        fullWidth
                    >
                        Save Settings
                    </GlassButton>
                </GlassCard>
            </Container>
        </Box>
    );
};

export default SettingsPage;
