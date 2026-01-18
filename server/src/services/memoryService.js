const Memory = require('../models/Memory');
const vectorService = require('./vectorService');
const aiService = require('./aiService');
const UserSettings = require('../models/UserSettings');

class MemoryService {
    /**
     * Store a new memory with its embedding
     */
    async storeMemory(userId, content, type = 'fact', metadata = {}) {
        try {
            // Check for duplicates (simple string match for now)
            const existing = await Memory.findOne({ userId, content });
            if (existing) {
                // Update timestamp
                existing.lastAccessedAt = Date.now();
                await existing.save();
                return existing;
            }

            // Generate embedding
            const vector = await vectorService.generateEmbedding(content, userId);
            if (!vector) throw new Error('Failed to generate embedding for memory');

            const memory = await Memory.create({
                userId,
                content,
                vector,
                type,
                metadata
            });

            console.log(`🧠 Memory stored: "${content}"`);
            return memory;
        } catch (error) {
            console.error('Failed to store memory:', error.message);
            return null;
        }
    }

    /**
     * Delete a specific memory
     */
    async deleteMemory(memoryId, userId) {
        return await Memory.findOneAndDelete({ _id: memoryId, userId });
    }

    /**
     * Retrieve relevant memories for a query
     */
    async retrieveMemories(userId, query, limit = 5, threshold = 0.6) {
        try {
            const queryVector = await vectorService.generateEmbedding(query, userId);
            if (!queryVector) return [];

            // Get all user memories (Optimization: In production, use Vector DB search)
            const allMemories = await Memory.find({ userId });

            const relevant = allMemories.map(mem => ({
                memory: mem,
                score: vectorService.cosineSimilarity(queryVector, mem.vector)
            }))
                .filter(item => item.score > threshold) // Filter by similarity threshold
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            if (relevant.length > 0) {
                // Update access time asynchronously
                Promise.all(relevant.map(r => {
                    r.memory.lastAccessedAt = Date.now();
                    return r.memory.save();
                })).catch(err => console.error('Error updating memory access time:', err));
            }

            return relevant.map(r => ({
                content: r.memory.content,
                type: r.memory.type,
                score: r.score,
                date: r.memory.createdAt
            }));
        } catch (error) {
            console.error('Failed to retrieve memories:', error.message);
            return [];
        }
    }

    /**
     * Extract facts from a user message using LLM and store them
     */
    async extractAndSaveMemories(userId, userMessage, assistantResponse) {
        try {
            const settings = await UserSettings.findOne({ userId }) || {};

            const prompt = `
Analyze the following interaction and extract any PERMANENT facts, preferences, or personal details about the USER that should be remembered for future conversations.
Do NOT extract:
- Temporary context (e.g., "I am writing code now")
- Generic statements
- Questions
- Information already known or trivial

User: "${userMessage}"
Assistant: "${assistantResponse}"

Output ONLY a JSON array of strings. If nothing to remember, output empty array [].
Example: ["User's name is John", "User prefers Python over JavaScript", "User lives in New York"]
`;

            const rawOutput = await aiService.generate(settings, [{ role: 'user', content: prompt }]);

            let facts = [];
            try {
                // Try to parse JSON from the output (handle potential markdown fences)
                const jsonStr = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
                facts = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('Memory extraction parse error:', e.message);
                return;
            }

            if (Array.isArray(facts) && facts.length > 0) {
                console.log(`🧠 Extracting ${facts.length} memories...`);
                for (const fact of facts) {
                    await this.storeMemory(userId, fact, 'fact', { source: 'auto-extraction' });
                }
            }
        } catch (error) {
            console.error('Memory extraction failed:', error.message);
        }
    }
}

module.exports = new MemoryService();
