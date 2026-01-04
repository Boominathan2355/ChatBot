const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    aiProvider: { type: String, default: 'ollama', enum: ['ollama', 'openai', 'anthropic', 'deepseek', 'grok', 'aws', 'azure', 'custom', 'colab'] },

    // Provider specific configs - API keys have select: false for security
    ollama: {
        baseUrl: { type: String, default: 'http://localhost:11434' },
        model: { type: String, default: 'qwen3-vl:2b' }
    },
    colab: {
        baseUrl: { type: String, default: '' },
        model: { type: String, default: '' }
    },
    openai: {
        apiKey: { type: String, default: '', select: false },
        model: { type: String, default: 'gpt-3.5-turbo' }
    },
    anthropic: {
        apiKey: { type: String, default: '', select: false },
        model: { type: String, default: 'claude-3-sonnet-20240229' }
    },
    deepseek: {
        apiKey: { type: String, default: '', select: false },
        model: { type: String, default: 'deepseek-chat' }
    },
    grok: {
        apiKey: { type: String, default: '', select: false },
        model: { type: String, default: 'grok-1' }
    },
    aws: {
        accessKey: { type: String, default: '', select: false },
        secretKey: { type: String, default: '', select: false },
        region: { type: String, default: 'us-east-1' },
        modelId: { type: String, default: 'anthropic.claude-3-sonnet-20240229-v1:0' }
    },
    azure: {
        apiKey: { type: String, default: '', select: false },
        endpoint: { type: String, default: '' },
        deploymentName: { type: String, default: '' }
    },
    custom: {
        baseUrl: { type: String, default: '' },
        apiKey: { type: String, default: '', select: false },
        model: { type: String, default: '' }
    },

    // Legacy fields (kept for compatibility or mapped later)
    ollamaBaseUrl: { type: String, default: 'http://localhost:11434' },
    defaultModel: { type: String, default: 'llama3.1:2b' },

    systemInstructions: { type: String, default: 'You are Jarvis, a helpful AI assistant.' },
    rag: {
        provider: { type: String, default: 'ollama' },
        model: { type: String, default: '' }
    },
    historyWindowSize: { type: Number, default: 20 },
    theme: { type: String, default: 'dark' }
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
