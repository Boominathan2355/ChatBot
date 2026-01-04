import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog, DialogContent, Box, Typography, List, ListItemButton,
    ListItemText, IconButton, Button, Divider, Select, MenuItem, FormControl, TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
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

    // AI Model Config State
    const [aiProvider, setAiProvider] = useState('ollama');
    const [ollamaConfig, setOllamaConfig] = useState({ baseUrl: 'http://localhost:11434', model: '' });

    const [openaiConfig, setOpenaiConfig] = useState({ model: 'gpt-3.5-turbo', hasKey: false });
    const [anthropicConfig, setAnthropicConfig] = useState({ model: 'claude-3-sonnet-20240229', hasKey: false });
    const [deepseekConfig, setDeepseekConfig] = useState({ model: 'deepseek-chat', hasKey: false });
    const [grokConfig, setGrokConfig] = useState({ model: 'grok-1', hasKey: false });
    const [awsConfig, setAwsConfig] = useState({ region: 'us-east-1', modelId: '', hasKey: false });
    const [azureConfig, setAzureConfig] = useState({ endpoint: '', deploymentName: '', hasKey: false });
    const [customConfig, setCustomConfig] = useState({ baseUrl: '', model: '', hasKey: false });
    const [ragConfig, setRagConfig] = useState({ provider: 'ollama', model: '' });

    // New API key input (separate from display state - for secure updates)
    const [newApiKey, setNewApiKey] = useState('');
    const [newAccessKey, setNewAccessKey] = useState('');
    const [newSecretKey, setNewSecretKey] = useState('');

    // Available models per provider
    const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);
    const [ragModels, setRagModels] = useState<{ id: string, name: string }[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingRagModels, setLoadingRagModels] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const [systemInstructions, setSystemInstructions] = useState('');

    React.useEffect(() => {
        if (open) {
            setSettingsLoaded(false);
            loadSettings();
        }
    }, [open]);

    // Load models AFTER settings are loaded
    React.useEffect(() => {
        if (open && settingsLoaded) {
            if (aiProvider) loadModels(aiProvider);
            if (ragConfig.provider) loadRagModels(ragConfig.provider);
        }
    }, [settingsLoaded, aiProvider, ragConfig.provider]);

    const loadModels = async (provider: string) => {
        setLoadingModels(true);
        try {
            const models = await fetchModels(provider);
            setAvailableModels(models);
        } catch (e) {
            setAvailableModels([]);
        } finally {
            setLoadingModels(false);
        }
    };

    const loadRagModels = async (provider: string) => {
        setLoadingRagModels(true);
        try {
            const models = await fetchModels(provider);
            setRagModels(models);
        } catch (e) {
            setRagModels([]);
        } finally {
            setLoadingRagModels(false);
        }
    };

    const fetchModels = async (provider: string) => {
        try {
            let url = `/settings/models/${provider}`;
            if (provider === 'ollama' && ollamaConfig.baseUrl) {
                url += `?baseUrl=${encodeURIComponent(ollamaConfig.baseUrl)}`;
            }
        const { data } = await api.get(url);
            return data.models || [];
        } catch (e: any) {
            console.error('Failed to load models', e);
            throw e;
        }
    };

    // const refreshModels = () => {
    //     loadModels(aiProvider);
    //     if (ragConfig.provider) loadRagModels(ragConfig.provider);
    // };

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            if (data) {
                setAiProvider(data.aiProvider || 'ollama');
                if (data.ollama) setOllamaConfig({ baseUrl: data.ollama.baseUrl || 'http://localhost:11434', model: data.ollama.model || '' });
                if (data.openai) setOpenaiConfig({ model: data.openai.model || 'gpt-3.5-turbo', hasKey: data.openai.hasKey || false });
                if (data.anthropic) setAnthropicConfig({ model: data.anthropic.model || 'claude-3-sonnet-20240229', hasKey: data.anthropic.hasKey || false });
                if (data.deepseek) setDeepseekConfig({ model: data.deepseek.model || 'deepseek-chat', hasKey: data.deepseek.hasKey || false });
                if (data.grok) setGrokConfig({ model: data.grok.model || 'grok-1', hasKey: data.grok.hasKey || false });
                if (data.aws) setAwsConfig({ region: data.aws.region || 'us-east-1', modelId: data.aws.modelId || '', hasKey: data.aws.hasKey || false });
                if (data.azure) setAzureConfig({ endpoint: data.azure.endpoint || '', deploymentName: data.azure.deploymentName || '', hasKey: data.azure.hasKey || false });
                if (data.custom) setCustomConfig({ baseUrl: data.custom.baseUrl || '', model: data.custom.model || '', hasKey: data.custom.hasKey || false });
                if (data.rag) setRagConfig({ provider: data.rag.provider || 'ollama', model: data.rag.model || '' });
                setSystemInstructions(data.systemInstructions || '');
            }
            setSettingsLoaded(true);
        } catch (e) {
            console.error('Failed to load settings', e);
            setSettingsLoaded(true);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await api.put('/settings', {
                aiProvider,
                ollama: ollamaConfig,
                openai: { model: openaiConfig.model },
                anthropic: { model: anthropicConfig.model },
                deepseek: { model: deepseekConfig.model },
                grok: { model: grokConfig.model },
                aws: { region: awsConfig.region, modelId: awsConfig.modelId },
                azure: { endpoint: azureConfig.endpoint, deploymentName: azureConfig.deploymentName },
                custom: { baseUrl: customConfig.baseUrl, model: customConfig.model },
                rag: ragConfig,
                systemInstructions
            });
            alert('Settings saved successfully!');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to save settings');
        }
    };

    const handleSaveApiKey = async (provider: string) => {
        try {
            const payload: any = { provider };
            if (provider === 'aws') {
                payload.accessKey = newAccessKey;
                payload.secretKey = newSecretKey;
            } else {
                payload.apiKey = newApiKey;
            }
            await api.post('/settings/secrets', payload);
            alert('API key saved securely! ✅');
            setNewApiKey('');
            setNewAccessKey('');
            setNewSecretKey('');
            loadSettings(); // Refresh to get hasKey status
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to save API key');
        }
    };

    const testConnection = async (silent = false) => {
        try {
            const { data } = await api.post('/settings/validate', {
                provider: aiProvider,
                url: aiProvider === 'ollama' ? ollamaConfig.baseUrl : undefined,
                apiKey: newApiKey || undefined
            });

            if (data.success) {
                if (data.models) setAvailableModels(data.models);
                if (!silent) alert(`✅ ${data.message || 'Connection successful!'}`);
                if (!data.models) loadModels(aiProvider);
            } else {
                if (!silent) alert(`❌ ${data.message || 'Connection failed'}`);
            }
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Connection failed';
            if (!silent) alert(`❌ ${msg}`);
        }
    };

    // Specifically test with a provided key
    const testProviderConnection = async (provider: string, specificKey?: string, silent = false) => {
        try {
            const { data } = await api.post('/settings/validate', {
                provider: provider,
                apiKey: specificKey || (aiProvider === provider ? newApiKey : undefined)
            });
            if (data.success) {
                if (data.models) setAvailableModels(data.models);
                if (!silent) alert(`✅ ${data.message || 'Connection successful!'}`);
                if (!data.models) loadModels(provider);
            } else {
                if (!silent) alert(`❌ ${data.message || 'Connection failed'}`);
            }
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Connection failed';
            if (!silent) alert(`❌ ${msg}`);
        }
    };

    // Auto-detect effect
    React.useEffect(() => {
        if (!open || !settingsLoaded) return;

        const timer = setTimeout(() => {
            if (aiProvider === 'ollama' && ollamaConfig.baseUrl) {
                testConnection(true);
            } else if (aiProvider !== 'ollama' && newApiKey) {
                testProviderConnection(aiProvider, newApiKey, true);
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timer);
    }, [aiProvider, ollamaConfig.baseUrl, newApiKey, open, settingsLoaded]);

    const tabs = [
        { name: 'General', icon: <SettingsIcon fontSize="small" /> },
        { name: 'Modelconfig', icon: <TuneIcon fontSize="small" /> },
        { name: 'RAG', icon: <StorageIcon fontSize="small" /> },
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
                            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>AI Provider</Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    value={aiProvider}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                >
                                    <MenuItem value="ollama">Ollama (Local)</MenuItem>
                                    <MenuItem value="colab">Google Colab (Ollama)</MenuItem>
                                    <MenuItem value="openai">OpenAI</MenuItem>
                                    <MenuItem value="anthropic">Claude (Anthropic)</MenuItem>
                                    <MenuItem value="deepseek">DeepSeek</MenuItem>
                                    <MenuItem value="grok">Grok (xAI)</MenuItem>
                                    <MenuItem value="aws">AWS Bedrock</MenuItem>
                                    <MenuItem value="azure">Azure OpenAI</MenuItem>
                                    <MenuItem value="custom">Custom Endpoint (OpenAI Compatible)</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Divider />

                        {aiProvider === 'ollama' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Ollama Base URL</Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small"
                                            value={ollamaConfig.baseUrl}
                                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, baseUrl: e.target.value })}
                                            placeholder="http://localhost:11434"
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testConnection(false)} disabled={loadingModels}>
                                            {loadingModels ? '...' : 'Test'}
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        Model {availableModels.length > 0 && <span style={{ color: '#4caf50' }}>({availableModels.length} available)</span>}
                                    </Typography>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={ollamaConfig.model}
                                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, model: e.target.value })}
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled>
                                                {loadingModels ? 'Loading models...' : (availableModels.length === 0 ? 'No models found - click Refresh' : 'Select a model')}
                                            </MenuItem>
                                            {availableModels.map(m => (
                                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'openai' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {openaiConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={openaiConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testProviderConnection('openai')}>
                                            Test
                                        </Button>
                                        <Button variant="contained" size="small" onClick={() => handleSaveApiKey('openai')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={openaiConfig.model}
                                            onChange={(e) => setOpenaiConfig({ ...openaiConfig, model: e.target.value })}
                                        >
                                            {availableModels.length > 0 ? availableModels.map(m => (
                                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                            )) : (
                                                <>
                                                    <MenuItem value="gpt-4o">GPT-4o</MenuItem>
                                                    <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                                                    <MenuItem value="gpt-4">GPT-4</MenuItem>
                                                    <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                                                </>
                                            )}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'anthropic' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {anthropicConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={anthropicConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testProviderConnection('anthropic')}>
                                            Test
                                        </Button>
                                        <Button variant="contained" size="small" onClick={() => handleSaveApiKey('anthropic')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={anthropicConfig.model}
                                            onChange={(e) => setAnthropicConfig({ ...anthropicConfig, model: e.target.value })}
                                        >
                                            {availableModels.map(m => (
                                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'deepseek' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {deepseekConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={deepseekConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testProviderConnection('deepseek')}>
                                            Test
                                        </Button>
                                        <Button variant="contained" size="small" onClick={() => handleSaveApiKey('deepseek')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={deepseekConfig.model}
                                            onChange={(e) => setDeepseekConfig({ ...deepseekConfig, model: e.target.value })}
                                        >
                                            {availableModels.map(m => (
                                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'grok' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {grokConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={grokConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testProviderConnection('grok')}>
                                            Test
                                        </Button>
                                        <Button variant="contained" size="small" onClick={() => handleSaveApiKey('grok')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={grokConfig.model}
                                            onChange={(e) => setGrokConfig({ ...grokConfig, model: e.target.value })}
                                        >
                                            {availableModels.map(m => (
                                                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'aws' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        AWS Credentials {awsConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <TextField
                                            fullWidth size="small"
                                            value={newAccessKey}
                                            onChange={(e) => setNewAccessKey(e.target.value)}
                                            placeholder="Access Key ID"
                                        />
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newSecretKey}
                                            onChange={(e) => setNewSecretKey(e.target.value)}
                                            placeholder="Secret Access Key"
                                        />
                                        <Button variant="outlined" size="small" onClick={() => handleSaveApiKey('aws')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Region</Typography>
                                        <TextField
                                            fullWidth size="small"
                                            value={awsConfig.region}
                                            onChange={(e) => setAwsConfig({ ...awsConfig, region: e.target.value })}
                                            placeholder="us-east-1"
                                        />
                                    </Box>
                                    <Box sx={{ flex: 2 }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                        <FormControl fullWidth size="small">
                                            <Select
                                                value={awsConfig.modelId}
                                                onChange={(e) => setAwsConfig({ ...awsConfig, modelId: e.target.value })}
                                            >
                                                {availableModels.map(m => (
                                                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                            </>
                        )}

                        {aiProvider === 'azure' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {azureConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={azureConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => handleSaveApiKey('azure')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Endpoint</Typography>
                                    <TextField
                                        fullWidth size="small"
                                        value={azureConfig.endpoint}
                                        onChange={(e) => setAzureConfig({ ...azureConfig, endpoint: e.target.value })}
                                        placeholder="https://YOUR_RESOURCE.openai.azure.com/"
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Deployment Name</Typography>
                                    <TextField
                                        fullWidth size="small"
                                        value={azureConfig.deploymentName}
                                        onChange={(e) => setAzureConfig({ ...azureConfig, deploymentName: e.target.value })}
                                    />
                                </Box>
                            </>
                        )}

                        {aiProvider === 'custom' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Base URL</Typography>
                                    <TextField
                                        fullWidth size="small"
                                        value={customConfig.baseUrl}
                                        onChange={(e) => setCustomConfig({ ...customConfig, baseUrl: e.target.value })}
                                        placeholder="https://api.yourprovider.com/v1"
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                        API Key {customConfig.hasKey && <span style={{ color: '#4caf50' }}>✓ Configured</span>}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth size="small" type="password"
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder={customConfig.hasKey ? '••••••••••••••••' : 'Enter API key'}
                                        />
                                        <Button variant="outlined" size="small" onClick={() => testProviderConnection('custom')}>
                                            Test
                                        </Button>
                                        <Button variant="contained" size="small" onClick={() => handleSaveApiKey('custom')}>
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>Model</Typography>
                                    <TextField
                                        fullWidth size="small"
                                        value={customConfig.model}
                                        onChange={(e) => setCustomConfig({ ...customConfig, model: e.target.value })}
                                    />
                                </Box>
                            </>
                        )}


                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="outlined" onClick={() => testConnection(false)} size="small">
                                Test Connection
                            </Button>
                            <Button variant="contained" onClick={handleSaveSettings}>
                                Save Configuration
                            </Button>
                        </Box>
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
            case 'RAG':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            Configure the model used for Retrieval-Augmented Generation (reading documents and search results).
                            You can use a more capable model specifically for processing context.
                        </Typography>
                        <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>RAG Provider</Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    value={ragConfig.provider}
                                    onChange={(e) => {
                                        const newProvider = e.target.value;
                                        setRagConfig({ ...ragConfig, provider: newProvider, model: '' });
                                        loadRagModels(newProvider);
                                    }}
                                >
                                    <MenuItem value="ollama">Ollama (Local)</MenuItem>
                                    <MenuItem value="openai">OpenAI</MenuItem>
                                    <MenuItem value="anthropic">Claude (Anthropic)</MenuItem>
                                    <MenuItem value="deepseek">DeepSeek</MenuItem>
                                    <MenuItem value="grok">Grok (xAI)</MenuItem>
                                    <MenuItem value="aws">AWS Bedrock</MenuItem>
                                    <MenuItem value="azure">Azure OpenAI</MenuItem>
                                    <MenuItem value="custom">Custom Endpoint</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                                RAG Model {ragModels.length > 0 && <span style={{ color: '#4caf50' }}>({ragModels.length} available)</span>}
                            </Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    value={ragConfig.model}
                                    onChange={(e) => setRagConfig({ ...ragConfig, model: e.target.value })}
                                    displayEmpty
                                >
                                    <MenuItem value="" disabled>
                                        {loadingRagModels ? 'Loading models...' : (ragModels.length === 0 ? 'Select a provider above' : 'Select a model')}
                                    </MenuItem>
                                    {ragModels.map(m => (
                                        <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => loadRagModels(ragConfig.provider)}
                            disabled={loadingRagModels}
                            startIcon={<RefreshIcon />} // Assuming RefreshIcon is imported
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            Refresh Models
                        </Button>
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
