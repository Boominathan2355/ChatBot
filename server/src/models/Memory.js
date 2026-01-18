const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true }, // The actual fact/memory text
    vector: { type: [Number], required: true }, // Embedding vector
    type: {
        type: String,
        enum: ['fact', 'preference', 'summary', 'correction'],
        default: 'fact'
    },
    metadata: {
        source: { type: String, default: 'chat' }, // 'chat', 'manual', 'document'
        confidence: { type: Number, default: 1.0 },
        tags: [String]
    },
    lastAccessedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for efficient user-scoped queries
memorySchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Memory', memorySchema);
