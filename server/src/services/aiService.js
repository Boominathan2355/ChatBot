const axios = require('axios');

class AIService {
    /**
     * Get a streaming response from the selected provider
     */
    async getStream(settings, messages, options = {}) {
        const provider = options.provider || settings.aiProvider || 'ollama';
        const modelOverride = options.model;

        // Create a temporary config if override is present
        let currentSettings = { ...settings };
        if (options.provider && options.provider !== settings.aiProvider) {
            // Use the config for the requested provider
        }

        switch (provider) {
            case 'openai':
                return this.handleOpenAI(modelOverride ? { ...settings.openai, model: modelOverride } : settings.openai, messages, options);
            case 'anthropic':
                return this.handleAnthropic(modelOverride ? { ...settings.anthropic, model: modelOverride } : settings.anthropic, messages, options);
            case 'deepseek':
                return this.handleDeepSeek(modelOverride ? { ...settings.deepseek, model: modelOverride } : settings.deepseek, messages, options);
            case 'grok':
                return this.handleGrok(modelOverride ? { ...settings.grok, model: modelOverride } : settings.grok, messages, options);
            case 'custom':
                return this.handleCustom(modelOverride ? { ...settings.custom, model: modelOverride } : settings.custom, messages, options);
            case 'ollama':
            default:
                const ollamaConfig = modelOverride ? { ...settings.ollama, model: modelOverride } : (settings.ollama || {});
                return this.handleOllama({ ...settings, ollama: ollamaConfig }, messages, options);
        }
    }

    /**
     * Get a single (non-streaming) response from the selected provider
     */
    async generate(settings, messages, options = {}) {
        const provider = settings.aiProvider || 'ollama';
        const config = settings[provider] || {};

        // Simple implementation: consume the stream or use non-streaming API
        // For now, let's just use the stream and concatenate for simplicity
        const { stream, parser } = await this.getStream(settings, messages, { ...options, stream: false });

        return new Promise((resolve, reject) => {
            let fullContent = '';
            stream.on('data', chunk => {
                const results = parser(chunk);
                results.forEach(r => fullContent += r.content);
            });
            stream.on('end', () => resolve(fullContent));
            stream.on('error', err => reject(err));
        });
    }

    async handleOllama(settings, messages, options) {
        const ollamaConfig = settings.ollama || {};
        const baseUrl = (ollamaConfig.baseUrl || settings.ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '');
        const model = ollamaConfig.model || settings.defaultModel || 'llama3';
        const url = `${baseUrl}/api/chat`;

        const response = await axios({
            method: 'post',
            url,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'stream',
            data: { model, messages, stream: true }
        });

        return {
            stream: response.data,
            parser: (chunk) => {
                const lines = chunk.toString().split('\n').filter(l => l.trim());
                const results = [];
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) results.push({ content: json.message.content });
                    } catch (e) { }
                }
                return results;
            }
        };
    }

    async handleOpenAI(config, messages, options) {
        return this.handleOpenAICompatible(
            'https://api.openai.com/v1/chat/completions',
            config.apiKey,
            config.model || 'gpt-3.5-turbo',
            messages
        );
    }

    async handleDeepSeek(config, messages, options) {
        return this.handleOpenAICompatible(
            'https://api.deepseek.com/v1/chat/completions',
            config.apiKey,
            config.model || 'deepseek-chat',
            messages
        );
    }

    async handleGrok(config, messages, options) {
        return this.handleOpenAICompatible(
            'https://api.x.ai/v1/chat/completions',
            config.apiKey,
            config.model || 'grok-1',
            messages
        );
    }

    async handleCustom(config, messages, options) {
        const baseUrl = config.baseUrl.replace(/\/$/, '');
        return this.handleOpenAICompatible(
            `${baseUrl}/chat/completions`,
            config.apiKey,
            config.model,
            messages
        );
    }

    async handleOpenAICompatible(url, apiKey, model, messages) {
        // Remove 'system' role if not first, or ensure OpenAI format
        // OpenAI expects system, then user/assistant pairs
        const response = await axios({
            method: 'post',
            url,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            data: {
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            }
        });

        return {
            stream: response.data,
            parser: (chunk) => {
                const lines = chunk.toString().split('\n').filter(l => l.trim());
                const results = [];
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const json = JSON.parse(dataStr);
                            const content = json.choices?.[0]?.delta?.content;
                            if (content) results.push({ content });
                        } catch (e) { }
                    }
                }
                return results;
            }
        };
    }

    async handleAnthropic(config, messages, options) {
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const anthropicMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }));

        const response = await axios({
            method: 'post',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            data: {
                model: config.model || 'claude-3-sonnet-20240229',
                messages: anthropicMessages,
                system: systemMessage,
                max_tokens: 4096,
                stream: true
            }
        });

        return {
            stream: response.data,
            parser: (chunk) => {
                const lines = chunk.toString().split('\n').filter(l => l.trim());
                const results = [];
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        try {
                            const json = JSON.parse(dataStr);
                            if (json.type === 'content_block_delta' && json.delta?.text) {
                                results.push({ content: json.delta.text });
                            }
                        } catch (e) { }
                    }
                }
                return results;
            }
        };
    }
}

module.exports = new AIService();
