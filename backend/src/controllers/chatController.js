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

        console.log(`📊 Sending ${history.length} messages to Ollama (trim med from ${chat.messages.length} total)`);

        // Use non-streaming mode for compatibility with ngrok
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await axios({
            method: 'post',
            url: `${ollamaUrl}/api/chat`,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            data: {
                model,
                messages: history,
                stream: false  // Changed to false for ngrok compatibility
            }
        });

        // Extract the assistant's response
        const assistantMessage = response.data.message.content;

        // Save to database
        chat.messages.push({ role: 'assistant', content: assistantMessage });
        chat.lastMessageAt = Date.now();
        await chat.save();

        // Send response to client in SSE format
        res.write(`data: ${JSON.stringify({ content: assistantMessage })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

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
