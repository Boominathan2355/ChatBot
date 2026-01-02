const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    storagePath: { type: String, required: true },
    vectorIds: [{ type: String }],
    status: { type: String, enum: ['processing', 'indexed', 'error'], default: 'processing' },
    error: String
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
