const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ollamaBaseUrl: { type: String, default: 'http://localhost:11434' },
    defaultModel: { type: String, default: 'llama3' },
    systemInstructions: { type: String, default: 'You are Jarvis, a helpful AI assistant.' },
    historyWindowSize: { type: Number, default: 20 },
    theme: { type: String, default: 'dark' }
}, { timestamps: true });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
