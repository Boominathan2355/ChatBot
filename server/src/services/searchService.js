const axios = require('axios');

/**
 * Service to handle Retrieval-Augmented Generation (RAG) search pipeline.
 */
class SearchService {
    /**
     * Detects if the user query requires a web search.
     * For now, uses simple keyword heuristics. Could be upgraded to an LLM call.
     */
    async detectIntent(content) {
        const searchKeywords = [
            'who is', 'what is', 'current', 'news', 'weather', 'today',
            'price of', 'status of', 'latest', 'recent', 'who won', 'where is',
            'update', 'happening', 'now'
        ];

        const lowerContent = content.toLowerCase();
        return searchKeywords.some(keyword => lowerContent.includes(keyword)) || content.length > 50;
    }

    /**
     * Refines the user query into optimized search keywords using AI.
     * Uses daily cache to avoid calling AI on every search (performance optimization).
     */
    async generateSearchQuery(content) {
        try {
            // Check cache first (24-hour cache)
            const fs = require('fs').promises;
            const path = require('path');
            const cacheDir = path.join(__dirname, '../../data/cache');
            const cacheFile = path.join(cacheDir, 'query_cache.json');

            let cache = {};
            const now = Date.now();
            const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours

            // Load existing cache
            try {
                await fs.mkdir(cacheDir, { recursive: true });
                const cacheData = await fs.readFile(cacheFile, 'utf8');
                cache = JSON.parse(cacheData);
            } catch (err) {
                // Cache doesn't exist yet, will create
            }

            // Check if we have a recent cached result
            const cacheKey = content.toLowerCase().trim();
            if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < cacheMaxAge) {
                console.log(`🎯 Query (cached): "${content}" → "${cache[cacheKey].optimized}"`);
                return cache[cacheKey].optimized;
            }

            // Cache miss or expired - run AI optimization
            const aiService = require('./aiService');
            const UserSettings = require('../models/UserSettings');
            const settings = await UserSettings.findOne({}).lean();

            const prompt = `Extract optimized search keywords from this question. Focus on:
- Main intent/topic
- Important nouns and entities
- Time references (latest, recent, today, etc.)
- Location/constraints
- Remove filler words

Question: "${content}"

Return ONLY the optimized search keywords as a short phrase (max 10 words), no explanation.`;

            const keywords = await aiService.generate(settings, [
                { role: 'user', content: prompt }
            ]);

            const optimizedQuery = keywords?.trim() || content;

            // Store in cache
            cache[cacheKey] = {
                optimized: optimizedQuery,
                timestamp: now
            };

            // Clean old entries (keep only last 1000)
            const entries = Object.entries(cache);
            if (entries.length > 1000) {
                const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                cache = Object.fromEntries(sorted.slice(0, 1000));
            }

            await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
            console.log(`🎯 Query optimization (AI): "${content}" → "${optimizedQuery}"`);
            return optimizedQuery;
        } catch (error) {
            console.warn('⚠️ Query optimization failed, using original:', error.message);
            return content.replace(/^(can you|please|search for|tell me|find|lookup)\s+/i, '').trim();
        }
    }

    /**
     * Performs the search using Brave Search API for real-time results.
     */
    async performSearch(focusedQuery) {
        try {
            console.log('🔍 Brave Search:', focusedQuery);

            const apiKey = process.env.BRAVE_SEARCH_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ BRAVE_SEARCH_API_KEY not set. Add it to .env file.');
                console.warn('Get a free API key at: https://brave.com/search/api/');
                return null;
            }

            const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
                params: {
                    q: focusedQuery,
                    count: 5,  // Number of results
                    safesearch: 'moderate',
                    freshness: 'pw'  // Past week for recent results
                },
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                    'X-Subscription-Token': apiKey
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Brave Search failed:', error.message);
            if (error.response?.status === 401) {
                console.error('❌ Invalid Brave Search API key. Check your .env file.');
            }
            return null;
        }
    }

    /**
     * Ranks, filters, and formats search results into a context string.
     */
    processResults(data) {
        if (!data || !data.web || !data.web.results) {
            console.warn('⚠️ No search results found');
            return '';
        }

        let contexts = [];

        // Process web results
        const results = data.web.results.slice(0, 5);  // Top 5 results
        results.forEach((result, index) => {
            const title = result.title || 'No title';
            const description = result.description || '';
            const url = result.url || '';

            if (description) {
                contexts.push(`[${index + 1}] ${title}\n${description}\nSource: ${url}`);
            }
        });

        const contextString = contexts.join('\n\n');
        console.log(`✅ Processed ${contexts.length} search results (${contextString.length} chars)`);
        return contextString;
    }
}

module.exports = new SearchService();

