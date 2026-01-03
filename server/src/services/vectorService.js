const axios = require('axios');
const DocumentChunk = require('../models/DocumentChunk');
const UserSettings = require('../models/UserSettings');

class VectorService {
    async generateEmbedding(text, userId) {
        try {
            const settings = await UserSettings.findOne({ userId });
            const ollamaUrl = settings?.ollamaBaseUrl || 'http://localhost:11434';

            // Note: Some embedding models might be different from chat models (e.g. 'nomic-embed-text' or 'mxbai-embed-large')
            // For simplicity, we use the default model or a known embed model if specified
            const model = settings?.embeddingModel || 'nomic-embed-text';

            const response = await axios.post(`${ollamaUrl}/api/embeddings`, {
                model: model,
                prompt: text
            });

            return response.data.embedding;
        } catch (error) {
            console.error('Embedding generation failed:', error.message);
            // Fallback: If specialized embed model fails, try with the chat model if it supports it
            // or return a zero vector (not ideal but avoids crash)
            return null;
        }
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async findRelevantChunks(query, userId, limit = 5) {
        const queryVector = await this.generateEmbedding(query, userId);
        if (!queryVector) return [];

        // Fetch chunks for this user
        // Optimization: In production, use Atlas Vector Search or a specialized Vector DB
        const chunks = await DocumentChunk.find({ userId });

        const rankedChunks = chunks.map(chunk => ({
            chunk,
            score: this.cosineSimilarity(queryVector, chunk.vector)
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return rankedChunks.map(item => ({
            content: item.chunk.content,
            score: item.score,
            metadata: item.chunk.metadata
        }));
    }
}

module.exports = new VectorService();
