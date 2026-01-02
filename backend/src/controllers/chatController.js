const Chat = require('../models/Chat');
const UserSettings = require('../models/UserSettings');
const axios = require('axios');

exports.createChat = async (req, res) => {
    try {
        const chat = await Chat.create({ userId: req.user.id });
        res.status(201).json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getChats = async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id }).sort({ lastMessageAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getChatMessages = async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        res.json(chat.messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    const { content } = req.body;
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const settings = await UserSettings.findOne({ userId: req.user.id });
        const ollamaUrl = settings.ollamaBaseUrl;
        const model = settings.defaultModel;

        // Add user message
        chat.messages.push({ role: 'user', content });
        await chat.save();

        // Prepare history for Ollama with sliding window
        const HISTORY_WINDOW_SIZE = settings.historyWindowSize || 20;

        // Get last N messages
        const recentMessages = chat.messages.slice(-HISTORY_WINDOW_SIZE);

        const history = recentMessages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Inject system instructions as first message
        if (settings.systemInstructions) {
            history.unshift({ role: 'system', content: settings.systemInstructions });
        }

        console.log(`📊 Sending ${history.length} messages to Ollama (trimmed from ${chat.messages.length} total)`);

        // Build prompt from history for /api/generate endpoint (backward compatible)
        let prompt = '';

        // Add system instructions
        if (settings.systemInstructions) {
            prompt += `System: ${settings.systemInstructions}\n\n`;
        }

        // Add conversation history
        for (const msg of history) {
            if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                prompt += `Assistant: ${msg.content}\n`;
            }
        }

        prompt += 'Assistant: ';

        // Stream response from Ollama using /api/generate (compatible with older versions)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await axios({
            method: 'post',
            url: `${ollamaUrl}/api/generate`,
            data: {
                model,
                prompt,
                stream: true
            },
            responseType: 'stream'
        });

        let fullAssistantContent = '';

        response.data.on('data', chunk => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) {
                        fullAssistantContent += json.response;
                        res.write(`data: ${JSON.stringify({ content: json.response })}\n\n`);
                    }
                    if (json.done) {
                        // Save assistant message to DB
                        chat.messages.push({ role: 'assistant', content: fullAssistantContent });
                        chat.lastMessageAt = Date.now();
                        chat.save();
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }
                } catch (e) {
                    console.error('Error parsing Ollama stream:', e);
                }
            }
        });

        response.data.on('error', error => {
            console.error('Ollama stream error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Ollama streaming error' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.deleteChat = async (req, res) => {
    try {
        await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ message: 'Chat deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.bulkDelete = async (req, res) => {
    try {
        const { chatIds } = req.body;

        if (!chatIds || !Array.isArray(chatIds)) {
            return res.status(400).json({ message: 'chatIds array is required' });
        }

        // Delete only chats that belong to the user
        const result = await Chat.deleteMany({
            _id: { $in: chatIds },
            userId: req.user.id
        });

        res.json({
            message: `${result.deletedCount} chat(s) deleted`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
