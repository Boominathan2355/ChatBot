const axios = require('axios');
const DocumentChunk = require('../models/DocumentChunk');
const UserSettings = require('../models/UserSettings');

class VectorService {
    async generateEmbedding(text, userId) {
        let model, ollamaUrl; // Declare outside try-catch for error logging
        try {
            const settings = await UserSettings.findOne({ userId });
            ollamaUrl = settings?.ollamaBaseUrl || 'http://localhost:11434';
            model = settings?.embeddingModel || 'nomic-embed-text';

            // Sanitize URL: Remove any trailing slashes or legacy endpoints if entered by mistake
            const normalizedUrl = ollamaUrl.replace(/\/$/, '').replace(/\/api\/(embeddings|embed)$/, '');
            const endpoint = `${normalizedUrl}/api/embed`;

            const response = await axios.post(endpoint, {
                model: model,
                input: text
            });

            return response.data.embeddings[0]; // /api/embed returns 'embeddings' array
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            console.error(`❌ Embedding generation failed (${model || 'unknown model'} @ ${ollamaUrl || 'unknown URL'}):`, errorMsg);

            if (error.response?.status === 404) {
                console.error(`💡 TIP: Make sure to pull the embedding model using: ollama pull ${model || 'nomic-embed-text'}`);
            }
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
