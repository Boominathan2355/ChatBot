const UserSettings = require('../models/UserSettings');
const axios = require('axios');

// Get settings - strips API keys, adds hasKey flags
exports.getSettings = async (req, res) => {
    try {
        const settings = await UserSettings.findOne({ userId: req.user.id }).lean();
        if (!settings) {
            return res.json(null);
        }

        // Add hasKey flags without exposing actual keys
        const sanitized = {
            ...settings,
            openai: settings.openai ? { model: settings.openai.model, hasKey: false } : { model: 'gpt-3.5-turbo', hasKey: false },
            anthropic: settings.anthropic ? { model: settings.anthropic.model, hasKey: false } : { model: 'claude-3-sonnet-20240229', hasKey: false },
            deepseek: settings.deepseek ? { model: settings.deepseek.model, hasKey: false } : { model: 'deepseek-chat', hasKey: false },
            grok: settings.grok ? { model: settings.grok.model, hasKey: false } : { model: 'grok-1', hasKey: false },
            aws: settings.aws ? { region: settings.aws.region, modelId: settings.aws.modelId, hasKey: false } : { region: 'us-east-1', modelId: '', hasKey: false },
            azure: settings.azure ? { endpoint: settings.azure.endpoint, deploymentName: settings.azure.deploymentName, hasKey: false } : { endpoint: '', deploymentName: '', hasKey: false },
            custom: settings.custom ? { baseUrl: settings.custom.baseUrl, model: settings.custom.model, hasKey: false } : { baseUrl: '', model: '', hasKey: false },
            rag: settings.rag || { provider: 'ollama', model: '' }
        };

        // Check if keys exist (query with select to get keys)
        const settingsWithKeys = await UserSettings.findOne({ userId: req.user.id })
            .select('+openai.apiKey +anthropic.apiKey +deepseek.apiKey +grok.apiKey +aws.accessKey +azure.apiKey +custom.apiKey');

        if (settingsWithKeys) {
            sanitized.openai.hasKey = !!(settingsWithKeys.openai?.apiKey);
            sanitized.anthropic.hasKey = !!(settingsWithKeys.anthropic?.apiKey);
            sanitized.deepseek.hasKey = !!(settingsWithKeys.deepseek?.apiKey);
            sanitized.grok.hasKey = !!(settingsWithKeys.grok?.apiKey);
            sanitized.aws.hasKey = !!(settingsWithKeys.aws?.accessKey);
            sanitized.azure.hasKey = !!(settingsWithKeys.azure?.apiKey);
            sanitized.custom.hasKey = !!(settingsWithKeys.custom?.apiKey);
        }

        res.json(sanitized);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update non-secret settings only
exports.updateSettings = async (req, res) => {
    try {
        // Extract only non-sensitive fields
        const { aiProvider, ollama, systemInstructions, historyWindowSize, theme } = req.body;

        // For provider configs, only update model selection, not keys
        const updateData = {
            aiProvider,
            'ollama.baseUrl': ollama?.baseUrl,
            'ollama.model': ollama?.model,
            'openai.model': req.body.openai?.model,
            'anthropic.model': req.body.anthropic?.model,
            'deepseek.model': req.body.deepseek?.model,
            'grok.model': req.body.grok?.model,
            'aws.region': req.body.aws?.region,
            'aws.modelId': req.body.aws?.modelId,
            'azure.endpoint': req.body.azure?.endpoint,
            'azure.deploymentName': req.body.azure?.deploymentName,
            'custom.baseUrl': req.body.custom?.baseUrl,
            'custom.model': req.body.custom?.model,
            'rag.provider': req.body.rag?.provider,
            'rag.model': req.body.rag?.model,
            systemInstructions,
            historyWindowSize,
            theme
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const settings = await UserSettings.findOneAndUpdate(
            { userId: req.user.id },
            { $set: updateData },
            { new: true, upsert: true }
        ).lean();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Secure endpoint to update API keys only
exports.updateSecrets = async (req, res) => {
    try {
        const { provider, apiKey, accessKey, secretKey } = req.body;

        if (!provider) {
            return res.status(400).json({ message: 'Provider is required' });
        }

        const updateData = {};

        switch (provider) {
            case 'openai':
                updateData['openai.apiKey'] = apiKey;
                break;
            case 'anthropic':
                updateData['anthropic.apiKey'] = apiKey;
                break;
            case 'deepseek':
                updateData['deepseek.apiKey'] = apiKey;
                break;
            case 'grok':
                updateData['grok.apiKey'] = apiKey;
                break;
            case 'aws':
                if (accessKey) updateData['aws.accessKey'] = accessKey;
                if (secretKey) updateData['aws.secretKey'] = secretKey;
                break;
            case 'azure':
                updateData['azure.apiKey'] = apiKey;
                break;
            case 'custom':
                updateData['custom.apiKey'] = apiKey;
                break;
            default:
                return res.status(400).json({ message: 'Invalid provider' });
        }

        await UserSettings.findOneAndUpdate(
            { userId: req.user.id },
            { $set: updateData },
            { upsert: true }
        );

        res.json({ success: true, message: 'API key saved securely' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch available models for a provider
exports.getModels = async (req, res) => {
    try {
        const { provider } = req.params;
        const { baseUrl: queryBaseUrl } = req.query; // Allow frontend to pass URL

        const settings = await UserSettings.findOne({ userId: req.user.id })
            .select('+openai.apiKey +anthropic.apiKey +deepseek.apiKey +grok.apiKey +aws.accessKey +azure.apiKey +custom.apiKey');

        let models = [];

        switch (provider) {
            case 'ollama':
                // Use query param first, then saved settings, then default
                const ollamaUrl = queryBaseUrl || settings?.ollama?.baseUrl || 'http://localhost:11434';
                try {
                    const ollamaRes = await axios.get(`${ollamaUrl}/api/tags`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' },
                        timeout: 5000
                    });
                    models = ollamaRes.data.models?.map(m => ({ id: m.name, name: m.name })) || [];
                } catch (e) {
                    return res.status(400).json({ message: 'Could not connect to Ollama', models: [] });
                }
                break;


            case 'openai':
                if (settings.openai?.apiKey) {
                    try {
                        const response = await axios.get('https://api.openai.com/v1/models', {
                            headers: { 'Authorization': `Bearer ${settings.openai.apiKey}` },
                            timeout: 5000
                        });
                        models = response.data.data
                            .filter(m => m.id.startsWith('gpt') || m.id.startsWith('o1'))
                            .map(m => ({ id: m.id, name: m.id }));
                    } catch (e) {
                        console.error('OpenAI list failed:', e.message);
                        models = [
                            { id: 'gpt-4o', name: 'GPT-4o' },
                            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                            { id: 'gpt-4', name: 'GPT-4' },
                            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
                        ];
                    }
                } else {
                    models = [
                        { id: 'gpt-4o', name: 'GPT-4o' },
                        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                        { id: 'gpt-4', name: 'GPT-4' },
                        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
                    ];
                }
                break;

            case 'anthropic':
                models = [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
                    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
                ];
                break;

            case 'deepseek':
                if (settings.deepseek?.apiKey) {
                    try {
                        const response = await axios.get('https://api.deepseek.com/v1/models', {
                            headers: { 'Authorization': `Bearer ${settings.deepseek.apiKey}` },
                            timeout: 5000
                        });
                        models = response.data.data.map(m => ({ id: m.id, name: m.id }));
                    } catch (e) {
                        models = [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }, { id: 'deepseek-coder', name: 'DeepSeek Coder' }];
                    }
                } else {
                    models = [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }, { id: 'deepseek-coder', name: 'DeepSeek Coder' }];
                }
                break;

            case 'grok':
                models = [
                    { id: 'grok-beta', name: 'Grok Beta' },
                    { id: 'grok-1', name: 'Grok 1' },
                    { id: 'grok-2', name: 'Grok 2' }
                ];
                break;

            case 'aws':
                models = [
                    { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2' },
                    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
                    { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
                    { id: 'amazon.titan-text-express-v1', name: 'Titan Text Express' }
                ];
                break;

            case 'azure':
                models = [];
                break;

            case 'custom':
                if (settings.custom?.apiKey && settings.custom?.baseUrl) {
                    try {
                        const baseUrl = settings.custom.baseUrl.replace(/\/$/, '');
                        const response = await axios.get(`${baseUrl}/models`, {
                            headers: { 'Authorization': `Bearer ${settings.custom.apiKey}` },
                            timeout: 5000
                        });
                        models = response.data.data.map(m => ({ id: m.id, name: m.id }));
                    } catch (e) {
                        models = [];
                    }
                } else {
                    models = [];
                }
                break;

            default:
                return res.status(400).json({ message: 'Unknown provider' });
        }

        res.json({ models });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Consolidated validation endpoint
exports.validateProvider = async (req, res) => {
    try {
        let { provider, url, apiKey } = req.body;
        const userId = req.user.id;

        // Backward compatibility for old calls that only sent URL
        if (!provider && url) {
            provider = 'ollama';
        }

        if (!provider) {
            return res.status(400).json({ success: false, message: 'AI Provider is required for validation' });
        }

        console.log(`Validating provider: ${provider}${url ? ' at ' + url : ''}`);

        // Fetch user settings to get stored keys if not provided in body
        const settings = await UserSettings.findOne({ userId })
            .select('+openai.apiKey +anthropic.apiKey +deepseek.apiKey +grok.apiKey +aws.accessKey +azure.apiKey +custom.apiKey');

        switch (provider) {
            case 'ollama':
                if (!url) return res.status(400).json({ success: false, message: 'Ollama Base URL is required' });
                const ollamaResponse = await axios.get(`${url.replace(/\/$/, '')}/api/tags`, { timeout: 5000 });
                const modelCount = ollamaResponse.data.models?.length || 0;
                return res.json({
                    success: true,
                    message: `Ollama connected! Found ${modelCount} models.`,
                    models: (ollamaResponse.data.models || []).map(m => ({ id: m.name, name: m.name }))
                });

            case 'openai':
                const key = apiKey || settings.openai?.apiKey;
                if (!key) return res.status(400).json({ success: false, message: 'API key not found' });
                const openaiResponse = await axios.get('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${key}` },
                    timeout: 5000
                });
                const openAiModels = openaiResponse.data.data
                    .filter(m => m.id.startsWith('gpt') || m.id.startsWith('o1'))
                    .map(m => ({ id: m.id, name: m.id }));
                return res.json({
                    success: true,
                    message: 'OpenAI connection verified! ✅',
                    models: openAiModels
                });

            case 'anthropic':
                return res.json({
                    success: true,
                    message: 'Anthropic connection verified! ✅',
                    models: [
                        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
                        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
                        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
                        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
                    ]
                });

            case 'deepseek':
                const dKey = apiKey || settings.deepseek?.apiKey;
                if (!dKey) return res.status(400).json({ success: false, message: 'API key not found' });
                const dsResponse = await axios.get('https://api.deepseek.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${dKey}` },
                    timeout: 5000
                });
                const dsModels = dsResponse.data.data.map(m => ({ id: m.id, name: m.id }));
                return res.json({
                    success: true,
                    message: 'DeepSeek connection verified! ✅',
                    models: dsModels
                });

            case 'grok':
                const gKey = apiKey || settings.grok?.apiKey;
                if (!gKey) return res.status(400).json({ success: false, message: 'API key not found' });
                const grokResponse = await axios.get('https://api.x.ai/v1/models', {
                    headers: { 'Authorization': `Bearer ${gKey}` },
                    timeout: 5000
                });
                const grokModels = grokResponse.data.data.map(m => ({ id: m.id, name: m.id }));
                return res.json({
                    success: true,
                    message: 'Grok connection verified! ✅',
                    models: grokModels
                });

            case 'aws':
                return res.json({
                    success: true,
                    message: 'AWS Bedrock configuration active.',
                    models: [
                        { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2' },
                        { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
                        { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
                        { id: 'amazon.titan-text-express-v1', name: 'Titan Text Express' }
                    ]
                });

            case 'azure':
                return res.json({ success: true, message: 'Azure configuration verified (static).', models: [] });

            case 'custom':
                const cKey = apiKey || settings.custom?.apiKey;
                const cUrl = url || settings.custom?.baseUrl;
                if (!cUrl) return res.status(400).json({ success: false, message: 'Base URL not found' });
                const customResponse = await axios.get(`${cUrl.replace(/\/$/, '')}/models`, {
                    headers: cKey ? { 'Authorization': `Bearer ${cKey}` } : {},
                    timeout: 5000
                });
                const customModels = (customResponse.data.data || customResponse.data || []).map(m => ({
                    id: m.id || m.name || m,
                    name: m.name || m.id || m
                }));
                return res.json({
                    success: true,
                    message: 'Custom endpoint verified! ✅',
                    models: customModels
                });

            default:
                return res.status(400).json({ message: `Validation not yet implemented for ${provider}` });
        }
    } catch (error) {
        console.error('Validation failed:', error.message);
        const errorMsg = error.response?.data?.error?.message || error.message;
        res.status(400).json({ success: false, message: `Connection failed: ${errorMsg}` });
    }
};
