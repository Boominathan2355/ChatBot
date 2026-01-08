const Chat = require('../models/Chat');
const Group = require('../models/Group');
const UserSettings = require('../models/UserSettings');
const axios = require('axios');
const searchService = require('../services/searchService');
const vectorService = require('../services/vectorService');
const DocumentChunk = require('../models/DocumentChunk');
const aiService = require('../services/aiService');

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
    const { content, webSearch, image, aiProvider, model, useRag } = req.body;
    const chatId = req.params.id;

    try {
        const currentChat = await Chat.findOne({ _id: chatId, userId: req.user.id });
        if (!currentChat) return res.status(404).json({ message: 'Chat not found' });

        let settings = await UserSettings.findOne({ userId: req.user.id }) || {};

        if (aiProvider) settings.aiProvider = aiProvider;
        if (model && settings.aiProvider) {
            if (settings.toObject) settings = settings.toObject();
            if (!settings[settings.aiProvider]) settings[settings.aiProvider] = {};
            settings[settings.aiProvider].model = model;
        }
        const histSize = settings.historyWindowSize || 20;

        // Perform RAG web search if enabled
        let searchContext = '';
        if (webSearch) {
            try {
                const isSearchNeeded = await searchService.detectIntent(content);
                if (isSearchNeeded) {
                    const focusedQuery = await searchService.generateSearchQuery(content);
                    const searchData = await searchService.performSearch(focusedQuery);
                    searchContext = searchService.processResults(searchData);
                    console.log(`🌐 Web Search: Found context (${searchContext.length} chars)`);
                }
            } catch (searchError) {
                console.error('❌ RAG Search failed:', searchError.message);
            }
        }

        // Add user message to DB
        currentChat.messages.push({ role: 'user', content, image });
        await currentChat.save();

        // Perform Document RAG ONLY if explicitly requested via useRag flag
        let docContext = '';
        const isRagEnabled = settings.rag && settings.rag.enabled !== false;

        if (isRagEnabled && useRag) {
            try {
                const relevantChunks = await vectorService.findRelevantChunks(content, req.user.id);
                if (relevantChunks.length > 0) {
                    docContext = relevantChunks.map((c, i) => `[Doc ${i + 1}] (Relevance: ${Math.round(c.score * 100)}%): ${c.content}`).join('\n\n');
                    console.log(`📚 Document RAG: Found ${relevantChunks.length} relevant chunks`);
                }
            } catch (docError) {
                console.error('❌ Document RAG failed:', docError.message);
            }
        } else if (!useRag) {
            console.log(`ℹ️ Document RAG skipped - useRag flag not set`);
        }

        // Prepare context for AI provider
        const recentMessages = currentChat.messages.slice(-histSize);

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

        // Add system timestamp and context (from environment, not internet)
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
        const timezoneOffset = -now.getTimezoneOffset() / 60; // Hours from UTC
        const timezone = settings.timezone || `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;

        unifiedSystemMessage += `\n\n[SYSTEM CONTEXT]\nCurrent Date: ${dateStr}\nCurrent Time: ${timeStr}\nTimezone: ${timezone}`;
        if (settings.country) {
            unifiedSystemMessage += `\nUser Location: ${settings.country}`;
        }
        unifiedSystemMessage += `\n\nNote: This timestamp is from the system environment. Use it to understand "today", "now", "latest", "recent", etc.`;
        if (docContext) {
            unifiedSystemMessage += `\n\n[EXTRACTED DOCUMENT KNOWLEDGE]\n${docContext}\n\nINSTRUCTION: Ground your response in these sources. Cite as [Doc 1], etc.`;
        }
        if (searchContext) {
            unifiedSystemMessage += `\n\n[GROUNDED KNOWLEDGE BASE]\n${searchContext}\n\nINSTRUCTION: Ground your response in these search results. Cite as [1], [2], etc.`;

            // Load recent scraped files for full content
            try {
                const scraperService = require('../services/scraperService');
                const recentFiles = await scraperService.loadRecentFiles(60 * 60 * 1000); // Last 1 hour

                if (recentFiles.length > 0) {
                    const scrapedContent = recentFiles.slice(0, 3).map((file, index) =>
                        `[Scraped ${index + 1}] ${file.title}\n${file.content.substring(0, 2000)}...\nSource: ${file.url}`
                    ).join('\n\n');

                    unifiedSystemMessage += `\n\n[FULL SCRAPED CONTENT]\n${scrapedContent}\n\nNote: This is the complete article text from scraped web pages. Use this for detailed information.`;
                    console.log(`📖 Loaded ${recentFiles.length} scraped documents for context`);
                }
            } catch (err) {
                console.warn('⚠️ Failed to load scraped files:', err.message);
            }
        }
        history.unshift({ role: 'system', content: unifiedSystemMessage });

        // Auto-rename logic for first message
        let newTitle = null;
        if (currentChat.messages.length === 1 && currentChat.title === 'New Chat') {
            try {
                const titlePrompt = `Summarize the following user message into a very short, concise title (max 5 words). Output ONLY the title, no quotes, no punctuation, no extra text.\n\nUser Message: ${content}`;
                const generatedTitle = await aiService.generate(settings, [{ role: 'user', content: titlePrompt }]);
                newTitle = generatedTitle?.trim().replace(/(^["'])|(["']$)/g, '');
                if (newTitle) {
                    currentChat.title = newTitle;
                    await currentChat.save();
                    console.log(`🏷️  Auto-renamed chat to: ${newTitle}`);
                }
            } catch (titleError) {
                console.error('❌ Title generation failed:', titleError.message);
            }
        }

        console.log(`📊 AI Request: [${settings.aiProvider || 'ollama'}] ${history.length} messages`);
        console.log(`📚 Context: docContext=${!!docContext}, searchContext=${!!searchContext}`);

        // Note: RAG model is used for embeddings/retrieval in vectorService
        // Main model is ALWAYS used for generation (with context in prompt)
        const { stream, parser } = await aiService.getStream(settings, history);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send new title if generated
        if (newTitle) {
            res.write(`data: ${JSON.stringify({ title: newTitle })}\n\n`);
        }

        let assistantMessage = '';
        let isThinking = false; // State to track if inside <think> block

        stream.on('data', chunk => {
            const results = parser(chunk);
            for (const resObj of results) {
                if (resObj.content) {
                    let content = resObj.content;

                    // Filter out <think> blocks
                    if (isThinking) {
                        if (content.includes('</think>')) {
                            isThinking = false;
                            content = content.split('</think>')[1] || ''; // Keep content after tag
                        } else {
                            content = ''; // Suppress thinking content
                        }
                    } else if (content.includes('<think>')) {
                        isThinking = true;
                        if (content.includes('</think>')) {
                            // Handle inline think block in same chunk
                            isThinking = false;
                            const parts = content.split('</think>');
                            content = content.replace(/<think>.*?<\/think>/s, '') || parts[1] || '';
                        } else {
                            content = content.split('<think>')[0] || ''; // Keep content before tag
                        }
                    }

                    if (content) {
                        assistantMessage += content;
                        res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
                    }
                }
            }
        });

        stream.on('end', async () => {
            const latestChat = await Chat.findById(chatId);
            if (latestChat && assistantMessage.trim()) {
                latestChat.messages.push({ role: 'assistant', content: assistantMessage });
                latestChat.lastMessageAt = Date.now();
                await latestChat.save();
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });

        stream.on('error', err => {
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
        const { content, webSearch, image } = req.body;
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
        const histSize = settings.historyWindowSize || 20;

        let docContext = '';
        const isRagEnabled = settings.rag && settings.rag.enabled !== false;

        if (isRagEnabled) {
            try {
                const relevantChunks = await vectorService.findRelevantChunks(content, req.user.id);
                if (relevantChunks.length > 0) {
                    docContext = relevantChunks.map((c, i) => `[Doc ${i + 1}] (Relevance: ${Math.round(c.score * 100)}%): ${c.content}`).join('\n\n');
                }
            } catch (docError) {
                console.error('❌ Document RAG failed in Group:', docError.message);
            }
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

        const recentMessages = currentChat.messages.slice(-histSize).map(m => {
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

        console.log(`👥 Group Chat: [${settings.aiProvider || 'ollama'}] ${recentMessages.length} messages`);

        try {
            const { stream, parser } = await aiService.getStream(settings, recentMessages);

            // Set headers after successful AI connection
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            let assistantMessage = '';
            let isThinking = false;

            stream.on('data', chunk => {
                const results = parser(chunk);
                for (const resObj of results) {
                    if (resObj.content) {
                        let content = resObj.content;

                        // Filter out <think> blocks
                        if (isThinking) {
                            if (content.includes('</think>')) {
                                isThinking = false;
                                content = content.split('</think>')[1] || '';
                            } else {
                                content = '';
                            }
                        } else if (content.includes('<think>')) {
                            isThinking = true;
                            if (content.includes('</think>')) {
                                isThinking = false;
                                const parts = content.split('</think>');
                                content = content.replace(/<think>.*?<\/think>/s, '') || parts[1] || '';
                            } else {
                                content = content.split('<think>')[0] || '';
                            }
                        }

                        if (content) {
                            assistantMessage += content;
                            res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
                        }
                    }
                }
            });

            stream.on('end', async () => {
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
            chat.shareToken = require('node:crypto').randomBytes(16).toString('hex');
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



        // If it's a Direct Chat (not grouped), convert to Group Chat
        if (!chat.isGrouped) {
            // Create a new Group
            const newGroup = await Group.create({
                name: chat.title || 'Group Chat',
                ownerId: chat.userId,
                members: [{ userId: req.user.id, role: 'member' }]
            });


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
