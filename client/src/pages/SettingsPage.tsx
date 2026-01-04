import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, TextField, IconButton, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GlassCard, GlassButton } from '../components';
import ThemeToggle from '../components/ThemeToggle';

const SettingsPage: React.FC = () => {
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
    const [systemInstructions, setSystemInstructions] = useState('');
    const [defaultModel, setDefaultModel] = useState('llama3');
    const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            if (data) {
                setOllamaBaseUrl(data.ollamaBaseUrl || 'http://localhost:11434');
                setSystemInstructions(data.systemInstructions || '');
                setDefaultModel(data.defaultModel || 'llama3');
                setSettingsLoaded(true);
            }
        } catch (e) {
            console.error(e);
            setSettingsLoaded(true);
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

    const testConnection = async (silent = false) => {
        if (!silent) setLoadingModels(true);
        try {
            const { data } = await api.post('/settings/validate', {
                provider: 'ollama',
                url: ollamaBaseUrl
            });

            if (data.success) {
                if (data.models) setAvailableModels(data.models);
                if (!silent) alert(`✅ ${data.message || 'Ollama connected successfully!'}`);
            } else {
                if (!silent) alert(`❌ ${data.message || 'Connection failed'}`);
            }
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Could not connect to Ollama';
            if (!silent) alert(`❌ ${msg}`);
        } finally {
            if (!silent) setLoadingModels(false);
        }
    };

    // Auto-detect effect
    useEffect(() => {
        if (!settingsLoaded || !ollamaBaseUrl) return;

        const timer = setTimeout(() => {
            testConnection(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, [ollamaBaseUrl, settingsLoaded]);

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
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                            fullWidth
                            label="Ollama Base URL"
                            value={ollamaBaseUrl}
                            onChange={(e) => setOllamaBaseUrl(e.target.value)}
                            margin="normal"
                            helperText="e.g., http://localhost:11434"
                        />
                        <GlassButton
                            variant="outlined"
                            onClick={() => testConnection(false)}
                            sx={{ mt: 2 }}
                            disabled={loadingModels}
                        >
                            {loadingModels ? <CircularProgress size={20} /> : 'Test'}
                        </GlassButton>
                    </Box>

                    <FormControl fullWidth margin="normal" variant="outlined">
                        <InputLabel>Default Model</InputLabel>
                        <Select
                            value={defaultModel}
                            onChange={(e) => setDefaultModel(e.target.value as string)}
                            label="Default Model"
                        >
                            <MenuItem value="" disabled>
                                {availableModels.length === 0 ? 'No models detected - type URL above' : 'Select a model'}
                            </MenuItem>
                            {availableModels.map(m => (
                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                            ))}
                            {/* Fallback if current model is not in list */}
                            {defaultModel && !availableModels.find(m => m.id === defaultModel) && (
                                <MenuItem value={defaultModel}>{defaultModel} (custom)</MenuItem>
                            )}
                        </Select>
                        {availableModels.length > 0 && (
                            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1 }}>
                                ✓ {availableModels.length} models detected automatically
                            </Typography>
                        )}
                    </FormControl>

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
