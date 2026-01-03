const searchService = require('../services/searchService');

exports.webSearch = async (req, res) => {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: 'Query is required' });
    }

    try {
        // 1. Generate focused query
        const focusedQuery = await searchService.generateSearchQuery(query);

        // 2. Perform search
        const data = await searchService.performSearch(focusedQuery);

        if (!data) {
            return res.status(500).json({ message: 'Search execution failed' });
        }

        // 3. Extract and map relevant results (Maintaining legacy structure for compatibility)
        const results = {
            query,
            abstract: data.Abstract || null,
            abstractSource: data.AbstractSource || null,
            abstractURL: data.AbstractURL || null,
            answer: data.Answer || null,
            answerType: data.AnswerType || null,
            definition: data.Definition || null,
            definitionURL: data.DefinitionURL || null,
            relatedTopics: (data.RelatedTopics || [])
                .filter(topic => topic.Text && topic.FirstURL)
                .slice(0, 5)
                .map(topic => ({
                    text: topic.Text,
                    url: topic.FirstURL
                })),
            infobox: data.Infobox || null,
            // Use the service to generate the context summary for AI RAG support
            contextSummary: searchService.processResults(data) || 'No direct results found. The AI will use its knowledge to answer.'
        };

        res.json(results);
    } catch (error) {
        console.error('Web search controller error:', error.message);
        res.status(500).json({
            message: 'Search failed',
            error: error.message
        });
    }
};
