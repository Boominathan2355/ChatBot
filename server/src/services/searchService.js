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
            'price of', 'status of', 'latest', 'recent', 'who won', 'where is'
        ];

        const lowerContent = content.toLowerCase();
        return searchKeywords.some(keyword => lowerContent.includes(keyword)) || content.length > 50;
    }

    /**
     * Refines the user query into a focused search query.
     */
    async generateSearchQuery(content) {
        // Simple refinement: remove conversational filler
        return content.replace(/^(can you|please|search for|tell me|find|lookup)\s+/i, '').trim();
    }

    /**
     * Performs the search against DuckDuckGo (or other API).
     */
    async performSearch(focusedQuery) {
        try {
            console.log('🔍 RAG Search:', focusedQuery);
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: focusedQuery,
                    format: 'json',
                    no_html: 1,
                    skip_disambig: 1
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Search execution failed:', error.message);
            return null;
        }
    }

    /**
     * Ranks, filters, and formats search results into a context string.
     */
    processResults(data) {
        if (!data) return '';

        let contexts = [];

        // 1. Abstract (Highest priority)
        if (data.Abstract) {
            contexts.push(`[Source: ${data.AbstractSource || 'General'}] ${data.Abstract}`);
        }

        // 2. Direct Answer
        if (data.Answer) {
            contexts.push(`[Direct Answer] ${data.Answer}`);
        }

        // 3. Related Topics (Snippets)
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 3).forEach((topic, index) => {
                if (topic.Text) {
                    contexts.push(`[Related Information ${index + 1}] ${topic.Text}`);
                }
            });
        }

        return contexts.join('\n\n');
    }
}

module.exports = new SearchService();
