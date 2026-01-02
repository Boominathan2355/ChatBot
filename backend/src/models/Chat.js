const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    metadata: {
        model: String,
        tokenCount: Number,
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
    }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    isGrouped: { type: Boolean, default: false },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
