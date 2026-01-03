const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    vector: { type: [Number], required: true }, // Store embedding vector
    metadata: {
        pageNumber: Number,
        startIndex: Number,
        endIndex: Number
    }
}, { timestamps: true });

// Index for similarity search (if using Atlas Vector Search, otherwise manual calculation)
// documentChunkSchema.index({ vector: 'vector' }); 

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
