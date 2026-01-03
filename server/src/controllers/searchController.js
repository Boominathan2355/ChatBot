const axios = require('axios');

// DuckDuckGo Instant Answer API - Free, no key required
const DUCKDUCKGO_API = 'https://api.duckduckgo.com/';

exports.webSearch = async (req, res) => {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: 'Query is required' });
    }

    try {
        const response = await axios.get(DUCKDUCKGO_API, {
            params: {
                q: query,
                format: 'json',
                no_html: 1,
                skip_disambig: 1
            }
        });

        const data = response.data;

        // Extract relevant search results
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
            infobox: data.Infobox || null
        };

        // Create a summary for AI context
        let contextSummary = '';
        if (results.abstract) {
            contextSummary += `${results.abstract}\n\n`;
        }
        if (results.answer) {
            contextSummary += `Answer: ${results.answer}\n\n`;
        }
        if (results.definition) {
            contextSummary += `Definition: ${results.definition}\n\n`;
        }
        if (results.relatedTopics.length > 0) {
            contextSummary += 'Related Information:\n';
            results.relatedTopics.forEach(topic => {
                contextSummary += `- ${topic.text}\n`;
            });
        }

        results.contextSummary = contextSummary.trim() || 'No direct results found. The AI will use its knowledge to answer.';

        res.json(results);
    } catch (error) {
        console.error('Web search error:', error.message);
        res.status(500).json({
            message: 'Search failed',
            error: error.message
        });
    }
};
