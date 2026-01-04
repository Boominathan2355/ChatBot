const Chat = require('../models/Chat');
const Group = require('../models/Group');
const UserSettings = require('../models/UserSettings');
const axios = require('axios');
const searchService = require('../services/searchService');
const vectorService = require('../services/vectorService');
const DocumentChunk = require('../models/DocumentChunk');

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
    const { content, webSearch, image, documentId } = req.body;
    const chatId = req.params.id;

    try {
        const currentChat = await Chat.findOne({ _id: chatId, userId: req.user.id });
        if (!currentChat) return res.status(404).json({ message: 'Chat not found' });

        const settings = await UserSettings.findOne({ userId: req.user.id }) || {};
        const ollamaUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        const model = settings.defaultModel || 'mistral';

        // Sanitize URL
        const normalizedUrl = ollamaUrl.replace(/\/$/, '').replace(/\/api\/(chat|generate|embeddings|embed)$/, '');
        const chatEndpoint = `${normalizedUrl}/api/chat`;

        // Perform RAG web search if enabled
        let searchContext = '';
        if (webSearch) {
            try {
                const isSearchNeeded = await searchService.detectIntent(content);
                if (isSearchNeeded) {
                    const focusedQuery = await searchService.generateSearchQuery(content);
                    const searchData = await searchService.performSearch(focusedQuery);
                    searchContext = searchService.processResults(searchData);
                }
            } catch (searchError) {
                console.error('❌ RAG Search failed:', searchError.message);
            }
        }

        // Add user message to DB
        currentChat.messages.push({ role: 'user', content, image });
        await currentChat.save();

        // Perform Document RAG if applicable
        let docContext = '';
        try {
            const relevantChunks = await vectorService.findRelevantChunks(content, req.user.id);
            if (relevantChunks.length > 0) {
                docContext = relevantChunks.map((c, i) => `[Doc ${i + 1}] (Relevance: ${Math.round(c.score * 100)}%): ${c.content}`).join('\n\n');
            }
        } catch (docError) {
            console.error('❌ Document RAG failed:', docError.message);
        }

        // Prepare context for Ollama
        const HISTORY_WINDOW_SIZE = settings.historyWindowSize || 20;
        const recentMessages = currentChat.messages.slice(-HISTORY_WINDOW_SIZE);

        const history = recentMessages.map(m => {
            const msgObj = {
                role: m.role,
                content: m.content || (m.role === 'user' ? (m.image ? 'Analyzing image...' : '...') : '...')
            };
            if (m.image && m.image.url) {
                const base64 = m.image.url.includes(',') ? m.image.url.split(',')[1] : m.image.url;
                if (base64) msgObj.images = [base64];
            }
            return msgObj;
        });

        // 🔥 OPTIMIZED: Send ONLY the most recent image to avoid 400 errors
        // Keep full text history, but limit vision processing to the last image
        let foundImage = false;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].images) {
                if (foundImage) {
                    // This is an older image, remove it but keep the text
                    delete history[i].images;
                } else {
                    // This is the most recent image, keep it
                    foundImage = true;
                }
            }
        }

        // Consolidate System Message
        let unifiedSystemMessage = settings.systemInstructions || 'You are Jarvis, a helpful AI assistant.';
        if (docContext) {
            unifiedSystemMessage += `\n\n[EXTRACTED DOCUMENT KNOWLEDGE]\n${docContext}\n\nINSTRUCTION: Ground your response in these sources. Cite as [Doc 1], etc.`;
        }
        if (searchContext) {
            unifiedSystemMessage += `\n\n[GROUNDED KNOWLEDGE BASE]\n${searchContext}\n\nINSTRUCTION: Ground your response in these search results. Cite as [1], [2], etc.`;
        }
        history.unshift({ role: 'system', content: unifiedSystemMessage });

        // Auto-rename logic for first message
        let newTitle = null;
        if (currentChat.messages.length === 1 && currentChat.title === 'New Chat') {
            try {
                const titlePrompt = `Summarize the following user message into a very short, concise title (max 5 words). Output ONLY the title, no quotes, no punctuation, no extra text.\n\nUser Message: ${content}`;
                const titleResponse = await axios.post(`${normalizedUrl}/api/generate`, {
                    model,
                    prompt: titlePrompt,
                    stream: false
                });
                newTitle = titleResponse.data.response?.trim().replace(/^["']|["']$/g, '');
                if (newTitle) {
                    currentChat.title = newTitle;
                    await currentChat.save();
                    console.log(`🏷️  Auto-renamed chat to: ${newTitle}`);
                }
            } catch (titleError) {
                console.error('❌ Title generation failed:', titleError.message);
            }
        }

        console.log(`📊 AI Request: [${model}] ${history.length} messages`);
        console.log('📡 Payload Summary:', history.map(h => `${h.role} (${h.content?.length || 0} chars)${h.images ? ' + [Img]' : ''}`).join(' | '));

        const response = await axios({
            method: 'post',
            url: chatEndpoint,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            responseType: 'stream',
            data: { model, messages: history, stream: true }
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send new title if generated
        if (newTitle) {
            res.write(`data: ${JSON.stringify({ title: newTitle })}\n\n`);
        }

        let assistantMessage = '';
        response.data.on('data', chunk => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        assistantMessage += json.message.content;
                        res.write(`data: ${JSON.stringify({ content: json.message.content })}\n\n`);
                    }
                } catch (e) { }
            }
        });

        response.data.on('end', async () => {
            const latestChat = await Chat.findById(chatId);
            if (latestChat && assistantMessage.trim()) {
                latestChat.messages.push({ role: 'assistant', content: assistantMessage });
                latestChat.lastMessageAt = Date.now();
                await latestChat.save();
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });

        response.data.on('error', err => {
            console.error('Stream error:', err);
            if (!res.headersSent) res.end();
            else {
                res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
                res.end();
            }
        });

    } catch (error) {
        console.error('Send message error:', error.message);
        if (error.response) {
            console.error(`📡 Ollama Error [${error.response.status}]: ${error.response.statusText || 'Bad Request'}`);
            // Log error details safely without circular refs
            if (error.response.data?.error) {
                console.error('Error details:', error.response.data.error);
            }
        }
        if (!res.headersSent) {
            res.status(error.response?.status || 500).json({ message: error.response?.data?.error || error.message });
        } else {
            res.end();
        }
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

// Update chat (rename, pin, folder)
exports.updateChat = async (req, res) => {
    try {
        const { title, isPinned, folder } = req.body;
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });

        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (title !== undefined) chat.title = title;
        if (isPinned !== undefined) chat.isPinned = isPinned;
        if (folder !== undefined) chat.folder = folder;

        await chat.save();
        res.json(chat);
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
    try {
        const { chatId } = req.params;
        const { content, webSearch, image, documentId } = req.body;
        const currentChat = await Chat.findOne({ _id: chatId, isGrouped: true }).populate('groupId');
        if (!currentChat) return res.status(404).json({ message: 'Group chat not found' });

        const group = currentChat.groupId;
        const isMember = group.members.some(m => m.userId.toString() === req.user.id) || group.ownerId.toString() === req.user.id;
        if (!isMember) return res.status(403).json({ message: 'Not a group member' });

        const userMessage = {
            role: 'user',
            content,
            image,
            metadata: { senderId: req.user.id, senderName: req.user.username || req.user.email }
        };

        currentChat.messages.push(userMessage);
        currentChat.lastMessageAt = Date.now();
        await currentChat.save();

        const settings = await UserSettings.findOne({ userId: req.user.id }) || {};
        const ollamaUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        const model = settings.defaultModel || 'mistral';
        const HISTORY_WINDOW_SIZE = settings.historyWindowSize || 20;

        const normalizedUrl = ollamaUrl.replace(/\/$/, '').replace(/\/api\/(chat|generate|embeddings|embed)$/, '');
        const chatEndpoint = `${normalizedUrl}/api/chat`;

        let docContext = '';
        try {
            // Note: In groups, we could potentially search documents shared with the group
            // For now, we search the documents of the user who is sending the message
            const relevantChunks = await vectorService.findRelevantChunks(content, req.user.id);
            if (relevantChunks.length > 0) {
                docContext = relevantChunks.map((c, i) => `[Doc ${i + 1}] (Relevance: ${Math.round(c.score * 100)}%): ${c.content}`).join('\n\n');
            }
        } catch (docError) {
            console.error('❌ Document RAG failed in Group:', docError.message);
        }

        let searchContext = '';
        if (webSearch) {
            try {
                const isSearchNeeded = await searchService.detectIntent(content);
                if (isSearchNeeded) {
                    const focusedQuery = await searchService.generateSearchQuery(content);
                    const searchData = await searchService.performSearch(focusedQuery);
                    searchContext = searchService.processResults(searchData);
                }
            } catch (searchError) {
                console.error('❌ RAG Search failed in Group:', searchError.message);
            }
        }

        const recentMessages = currentChat.messages.slice(-HISTORY_WINDOW_SIZE).map(m => {
            const msgObj = {
                role: m.role,
                content: m.content || (m.role === 'user' ? (m.image ? 'Image prompt' : '...') : '...')
            };
            if (m.image && m.image.url) {
                const base64 = m.image.url.includes(',') ? m.image.url.split(',')[1] : m.image.url;
                if (base64) msgObj.images = [base64];
            }
            return msgObj;
        });

        // OPTIMIZED: Send only the most recent image in group chat
        let foundImage = false;
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            if (recentMessages[i].images) {
                if (foundImage) {
                    delete recentMessages[i].images;
                } else {
                    foundImage = true;
                }
            }
        }

        let unifiedSystemMessage = settings.systemInstructions || 'You are Jarvis, a helpful AI assistant in a GROUP chat.';
        if (docContext) {
            unifiedSystemMessage += `\n\n[EXTRACTED DOCUMENT KNOWLEDGE]\n${docContext}\n\nINSTRUCTION: Ground your response in these sources. Cite as [Doc 1], etc.`;
        }
        if (searchContext) {
            unifiedSystemMessage += `\n\n[GROUNDED KNOWLEDGE BASE]\n${searchContext}\n\nINSTRUCTION: Ground your response in these search results. Cite as [1], [2], etc.`;
        }
        recentMessages.unshift({ role: 'system', content: unifiedSystemMessage });

        console.log(`👥 Group Chat: [${model}] ${recentMessages.length} messages`);
        console.log('📡 Group Payload Summary:', recentMessages.map(h => `${h.role} (${h.content?.length || 0} chars)${h.images ? ' + [Img]' : ''}`).join(' | '));

        try {
            const response = await axios({
                method: 'post',
                url: chatEndpoint,
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                responseType: 'stream',
                data: { model, messages: recentMessages, stream: true }
            });

            // Set headers after successful AI connection
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            let assistantMessage = '';

            // 1. Send the user message confirmation first (optional, but helps UI know it's saved)
            // res.write(`data: ${JSON.stringify({ type: 'confirmation', message })}\n\n`); 
            // Simplified: Just start streaming AI response

            response.data.on('data', chunk => {
                const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            assistantMessage += json.message.content;
                            res.write(`data: ${JSON.stringify({ content: json.message.content })}\n\n`);
                        }
                    } catch (e) { }
                }
            });

            response.data.on('end', async () => {
                // Re-fetch chat to avoid VersionError if it was modified concurrently
                const latestChat = await Chat.findById(chatId);
                if (latestChat && assistantMessage.trim()) {
                    latestChat.messages.push({
                        role: 'assistant',
                        content: assistantMessage,
                        metadata: { senderName: 'Jarvis' }
                    });
                    latestChat.lastMessageAt = Date.now();
                    await latestChat.save();
                }

                res.write('data: [DONE]\n\n');
                res.end();
            });

        } catch (error) {
            console.error('AI Error in Group:', error.message);
            if (error.response) {
                console.error(`📡 Ollama Group Error [${error.response.status}]: ${error.response.statusText || 'Bad Request'}`);
                if (error.response.data?.error) {
                    console.error('Error details:', error.response.data.error);
                }
            }
            if (!res.headersSent) {
                res.status(error.response?.status || 500).json({ message: error.response?.data?.error || error.message });
            } else {
                res.write(`data: ${JSON.stringify({ error: 'AI unavailable' })}\n\n`);
                res.end();
            }
        }

    } catch (error) {
        console.error('Send group message error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        } else {
            res.end();
        }
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

// Join shared chat (Join the SAME chat)
exports.joinSharedChat = async (req, res) => {
    try {
        const { shareToken } = req.params;
        const chat = await Chat.findOne({ shareToken, isShared: true });

        if (!chat) return res.status(404).json({ message: 'Shared chat not found' });

        // If user is already the owner, just return the chat
        if (chat.userId.toString() === req.user.id) {
            return res.json(chat);
        }

        let groupId = chat.groupId;

        // If it's a Direct Chat (not grouped), convert to Group Chat
        if (!chat.isGrouped) {
            // Create a new Group
            const newGroup = await Group.create({
                name: chat.title || 'Group Chat',
                ownerId: chat.userId,
                members: [{ userId: req.user.id, role: 'member' }]
            });
            groupId = newGroup._id;

            // Update Chat to be Grouped
            chat.isGrouped = true;
            chat.groupId = newGroup._id;
            await chat.save();
        } else {
            // It IS a Group Chat, add member to existing group
            const group = await Group.findById(chat.groupId);
            if (group) {
                // Check if already a member
                const isMember = group.members.some(m => m.userId.toString() === req.user.id) || group.ownerId.toString() === req.user.id;
                if (!isMember) {
                    group.members.push({ userId: req.user.id, role: 'member' });
                    await group.save();
                }
            }
        }

        res.json(chat);
    } catch (error) {
        console.error('Join shared chat error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Import shared chat (Copy)
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
