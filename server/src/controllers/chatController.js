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
        const chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const settings = await UserSettings.findOne({ userId: req.user.id });
        const ollamaUrl = settings.ollamaBaseUrl;
        const model = settings.defaultModel;

        // Perform RAG web search if enabled
        let searchContext = '';
        if (webSearch) {
            try {
                // 1. Detect Intent
                const isSearchNeeded = await searchService.detectIntent(content);

                if (isSearchNeeded) {
                    // 2. Focused Query Generation
                    const focusedQuery = await searchService.generateSearchQuery(content);

                    // 3. Search & Process
                    const searchData = await searchService.performSearch(focusedQuery);
                    searchContext = searchService.processResults(searchData);

                    if (searchContext) {
                        console.log('✅ RAG Search Context retrieved, length:', searchContext.length);
                    }
                }
            } catch (searchError) {
                console.error('❌ RAG Search failed:', searchError.message);
            }
        }

        // Add user message
        chat.messages.push({ role: 'user', content, image });
        await chat.save();

        // Prepare history for Ollama with sliding window
        const HISTORY_WINDOW_SIZE = settings.historyWindowSize || 20;

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

        // Get last N messages
        const recentMessages = chat.messages.slice(-HISTORY_WINDOW_SIZE);

        const history = recentMessages.map(m => {
            const msgObj = {
                role: m.role,
                content: m.content
            };
            if (m.image && m.image.url) {
                // Extract raw base64 from data URL if present
                const base64 = m.image.url.includes(',')
                    ? m.image.url.split(',')[1]
                    : m.image.url;
                msgObj.images = [base64];
            }
            return msgObj;
        });

        // Inject system instructions as first message
        if (settings.systemInstructions) {
            history.unshift({ role: 'system', content: settings.systemInstructions });
        }

        // Inject Document Context (Higher priority than web search if specific doc mentioned)
        if (docContext) {
            history.push({
                role: 'system',
                content: `[Extracted Document Knowledge]\n${docContext}\n\nINSTRUCTION: The user is asking about specific documents they uploaded. Use the \"Extracted Document Knowledge\" above to provide a factually accurate answer. Strictly ground your response in these document sources. If the information is not present in the document, say you don't know based on the provided library. Use citations like [Doc 1], [Doc 2].`
            });
        }

        // Inject web search results as context (RAG)
        if (searchContext) {
            history.push({
                role: 'system',
                content: `[Grounded Knowledge Base]\n${searchContext}\n\nINSTRUCTION: The user has asked a question that requires fresh or specific information. Use the "Grounded Knowledge Base" above to provide a factually accurate answer. Strictly ground your response in these sources. If the information is not present, say you don't know based on modern search results. Use citations like [1], [2] where appropriate.`
            });
        }

        console.log(`📊 Sending ${history.length} messages to Ollama (${searchContext ? 'with web search' : 'no search'})`);

        const response = await axios({
            method: 'post',
            url: `${ollamaUrl}/api/chat`,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            responseType: 'stream',
            data: {
                model,
                messages: history,
                stream: true
            }
        });

        // Set headers ONLY after successful connection
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let assistantMessage = '';

        response.data.on('data', chunk => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message && json.message.content) {
                        const token = json.message.content;
                        assistantMessage += token;
                        res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
                    }
                    if (json.done) {
                        // Stream finished
                    }
                } catch (e) {
                    console.error('Error parsing JSON chunk', e);
                }
            }
        });

        response.data.on('end', async () => {
            // Re-fetch chat to avoid VersionError if it was modified concurrently
            const latestChat = await Chat.findById(chatId);
            if (latestChat) {
                latestChat.messages.push({ role: 'assistant', content: assistantMessage });
                latestChat.lastMessageAt = Date.now();
                await latestChat.save();
            }

            res.write('data: [DONE]\n\n');
            res.end();
        });

        response.data.on('error', err => {
            console.error('Stream error:', err);
            // If we already started sending data, we can't send JSON error
            res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Send message error:', error);
        // If headers not sent (axios failed), send JSON error.
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
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
        const chat = await Chat.findOne({ _id: chatId, isGrouped: true }).populate('groupId');
        if (!chat) return res.status(404).json({ message: 'Group chat not found' });

        // Verify user is a member of the group
        const group = chat.groupId;
        const isMember = group.members.some(m => m.userId.toString() === req.user.id) ||
            group.ownerId.toString() === req.user.id;

        if (!isMember) return res.status(403).json({ message: 'Not a group member' });

        // Create user message
        const userMessage = {
            role: 'user',
            content,
            image,
            metadata: {
                senderId: req.user.id,
                senderName: req.user.username || req.user.email
            }
        };

        chat.messages.push(userMessage);
        chat.lastMessageAt = Date.now();
        await chat.save();

        // Initialize AI response
        const settings = await UserSettings.findOne({ userId: req.user.id }) || {};
        const ollamaUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        const model = settings.defaultModel || 'mistral';
        const HISTORY_WINDOW_SIZE = settings.historyWindowSize || 20;


        // Perform Document RAG if applicable
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
                console.error('❌ RAG Search failed in Group:', searchError.message);
            }
        }

        // Prepare context for AI (last 20 messages)
        const recentMessages = chat.messages.slice(-HISTORY_WINDOW_SIZE).map(m => {
            const msgObj = {
                role: m.role,
                content: m.content
            };
            if (m.image && m.image.url) {
                const base64 = m.image.url.includes(',')
                    ? m.image.url.split(',')[1]
                    : m.image.url;
                msgObj.images = [base64];
            }
            return msgObj;
        });

        if (settings.systemInstructions) {
            recentMessages.unshift({ role: 'system', content: settings.systemInstructions });
        }

        // Inject Document Context (Higher priority than web search)
        if (docContext) {
            recentMessages.push({
                role: 'system',
                content: `[Extracted Document Knowledge]\n${docContext}\n\nINSTRUCTION: The user is asking about specific documents they uploaded. Use the \"Extracted Document Knowledge\" above to provide a factually accurate answer in this GROUP chat. Strictly ground your response in these document sources. If the information is not present, say it is not in the library. Use citations like [Doc 1].`
            });
        }

        // Inject web search results as context (RAG)
        if (searchContext) {
            recentMessages.push({
                role: 'system',
                content: `[Grounded Knowledge Base]\n${searchContext}\n\nINSTRUCTION: The user has asked a question in a GROUP chat that requires fresh or specific information. Use the "Grounded Knowledge Base" above to provide a factually accurate answer. Strictly ground your response in these sources. If the information is not present, say you don't know based on modern search results. Use citations like [1], [2] where appropriate.`
            });
        }

        console.log(`👥 Group Chat: Sending ${recentMessages.length} messages to Ollama (${searchContext ? 'with RAG search' : 'no search'})`);

        try {
            const response = await axios({
                method: 'post',
                url: `${ollamaUrl}/api/chat`,
                headers: { 'Content-Type': 'application/json' },
                responseType: 'stream',
                data: {
                    model,
                    messages: recentMessages,
                    stream: true
                }
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
                        if (json.message && json.message.content) {
                            const token = json.message.content;
                            assistantMessage += token;
                            res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
                        }
                    } catch (e) { }
                }
            });

            response.data.on('end', async () => {
                // Re-fetch chat to avoid VersionError if it was modified concurrently
                const latestChat = await Chat.findById(chatId);
                if (latestChat) {
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

        } catch (aiError) {
            console.error('AI Error in Group:', aiError.message);
            // If AI fails, still return success for the user message
            // But since we want streaming pattern, we might send an error packet or just end
            if (!res.headersSent) {
                res.json({ message: 'Message sent (AI unavailable)', data: message });
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
