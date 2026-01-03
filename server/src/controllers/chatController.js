const Chat = require('../models/Chat');
const Group = require('../models/Group');
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

// Create a group chat from an existing group
exports.createGroupChat = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Verify group exists and user is a member
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isMember = group.members.some(m => m.userId.toString() === req.user.id) || group.ownerId.toString() === req.user.id;
        if (!isMember) return res.status(403).json({ message: 'Not a group member' });

        // Check if group chat already exists
        const existingChat = await Chat.findOne({ groupId, isGrouped: true });
        if (existingChat) {
            return res.json(existingChat);
        }

        // Create new group chat
        const chat = await Chat.create({
            userId: group.ownerId,
            title: group.name,
            isGrouped: true,
            groupId
        });

        res.status(201).json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getChats = async (req, res) => {
    try {
        // Get regular chats (AI chats)
        const regularChats = await Chat.find({
            userId: req.user.id,
            isGrouped: false
        }).sort({ lastMessageAt: -1 });

        // Get group chats where user is a member
        const groups = await Group.find({
            $or: [
                { ownerId: req.user.id },
                { 'members.userId': req.user.id }
            ]
        });

        const groupIds = groups.map(g => g._id);

        const groupChats = await Chat.find({
            groupId: { $in: groupIds },
            isGrouped: true
        }).populate('groupId').sort({ lastMessageAt: -1 });

        // Combine and sort by lastMessageAt
        const allChats = [...regularChats, ...groupChats].sort((a, b) =>
            new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );

        res.json(allChats);
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
    const { content, webSearch } = req.body;
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const settings = await UserSettings.findOne({ userId: req.user.id });
        const ollamaUrl = settings.ollamaBaseUrl;
        const model = settings.defaultModel;

        // Perform web search if enabled
        let searchContext = '';
        if (webSearch) {
            try {
                console.log('🔍 Performing web search for:', content);
                const searchResponse = await axios.get('https://api.duckduckgo.com/', {
                    params: {
                        q: content,
                        format: 'json',
                        no_html: 1,
                        skip_disambig: 1
                    }
                });

                const data = searchResponse.data;

                if (data.Abstract) {
                    searchContext += `Source: ${data.AbstractSource}\n${data.Abstract}\n\n`;
                }
                if (data.Answer) {
                    searchContext += `Answer: ${data.Answer}\n\n`;
                }
                if (data.Definition) {
                    searchContext += `Definition: ${data.Definition}\n\n`;
                }
                if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                    searchContext += 'Related Information:\n';
                    data.RelatedTopics.slice(0, 5).forEach(topic => {
                        if (topic.Text) {
                            searchContext += `- ${topic.Text}\n`;
                        }
                    });
                }

                console.log('✅ Web search completed, context length:', searchContext.length);
            } catch (searchError) {
                console.error('❌ Web search failed:', searchError.message);
            }
        }

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

        // Inject web search results as context
        if (searchContext) {
            history.push({
                role: 'system',
                content: `[Web Search Results for the user's question]\n${searchContext}\n\nUse this information to help answer the user's question accurately.`
            });
        }

        console.log(`📊 Sending ${history.length} messages to Ollama (${searchContext ? 'with web search' : 'no search'})`);

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

// Send message in a group chat
exports.sendGroupMessage = async (req, res) => {
    const { content } = req.body;
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, isGrouped: true }).populate('groupId');
        if (!chat) return res.status(404).json({ message: 'Group chat not found' });

        // Verify user is a member of the group
        const group = chat.groupId;
        const isMember = group.members.some(m => m.userId.toString() === req.user.id) ||
            group.ownerId.toString() === req.user.id;

        if (!isMember) return res.status(403).json({ message: 'Not a group member' });

        // Add message with sender info
        const message = {
            role: 'user',
            content,
            metadata: {
                senderId: req.user.id,
                senderName: req.user.username || req.user.email
            }
        };

        chat.messages.push(message);
        chat.lastMessageAt = Date.now();
        await chat.save();

        res.json({ message: 'Message sent', data: message });
    } catch (error) {
        console.error('Send group message error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Share a chat - generate shareable link
exports.shareChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Only owner can share
        if (chat.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Generate share token if not exists
        if (!chat.shareToken) {
            chat.shareToken = require('crypto').randomBytes(16).toString('hex');
            chat.isShared = true;
            await chat.save();
        }

        res.json({
            shareToken: chat.shareToken,
            shareUrl: `/shared/${chat.shareToken}`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get shared chat (public view)
exports.getSharedChat = async (req, res) => {
    try {
        const { shareToken } = req.params;
        const chat = await Chat.findOne({ shareToken, isShared: true });

        if (!chat) return res.status(404).json({ message: 'Shared chat not found' });

        res.json({
            title: chat.title,
            messages: chat.messages,
            sharedAt: chat.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Unshare a chat
exports.unshareChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (chat.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        chat.isShared = false;
        chat.shareToken = null;
        await chat.save();

        res.json({ message: 'Chat unshared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Import shared chat
exports.importSharedChat = async (req, res) => {
    try {
        const { shareToken } = req.params;
        const sharedChat = await Chat.findOne({ shareToken, isShared: true });

        if (!sharedChat) return res.status(404).json({ message: 'Shared chat not found' });

        // Create a copy of the chat for the current user
        const newChat = await Chat.create({
            userId: req.user.id,
            title: sharedChat.title || 'Imported Chat',
            messages: sharedChat.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                metadata: msg.metadata
            }))
        });

        res.status(201).json(newChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
