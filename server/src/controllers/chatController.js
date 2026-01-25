const Chat = require('../models/Chat');
const Group = require('../models/Group');
const UserSettings = require('../models/UserSettings');
const axios = require('axios');
const searchService = require('../services/searchService');
const vectorService = require('../services/vectorService');
const mcpService = require('../services/mcpService'); // New Service
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
    console.log('[DEBUG] Request Body Keys:', Object.keys(req.body));
    const { content, webSearch, image, aiProvider, model, useRag, tone, mode, thinkingEnabled = true } = req.body;
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

        // DEBUG: Test Thinking UI
        if (content.trim() === '/test-think') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const chunks = [
                { content: '<think>' },
                { content: 'This is a simulated thought process.\n' },
                { content: 'Checking system parameters...\n' },
                { content: 'Verifying UI rendering...\n' },
                { content: '</think>' },
                { content: 'The Thinking UI is working correctly if you see the thought block above.' }
            ];

            for (const chunk of chunks) {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                await new Promise(r => setTimeout(r, 100)); // Simulate delay
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        // --- AGENTIC ROUTER START ---
        // 1. Analyze Intent & Decide Tools
        let useWeb = webSearch; // User override
        let useDocs = false;
        let useMemory = true; // Default to using memory
        let saveMemory = true;

        // If specific RAG flags aren't forced, ask the Agent
        if (!webSearch && !useRag) {
            try {
                const routerSystem = `You are a decision engine. Analyze the user query and output a JSON object deciding which tools to use.
Tools:
- "web": Use for current events, news, weather, or specific facts not known.
- "docs": Use if user asks about "uploaded" files, "documents", or specific context provided previously.
- "memory": Use if user asks about themselves, past conversations, or personal details.
- "save": Set true if the user shares new personal information or facts.

Output Schema: { "web": boolean, "docs": boolean, "memory": boolean, "save": boolean }`;

                const decision = await aiService.generate(settings, [
                    { role: 'system', content: routerSystem },
                    { role: 'user', content }
                ]);

                // Try parse JSON
                const cleanDecision = decision.replace(/```json/g, '').replace(/```/g, '').trim();
                const plan = JSON.parse(cleanDecision);

                useWeb = plan.web === true;
                useDocs = plan.docs === true;
                useMemory = plan.memory !== false; // Default true if uncertain
                saveMemory = plan.save !== false;

                console.log(`🧠 Agent Plan: Web=${useWeb}, Docs=${useDocs}, Memory=${useMemory}, Save=${saveMemory}`);
            } catch (e) {
                console.warn('⚠️ Agent Router failed, defaulting to basic config');
            }
        } else {
            if (useRag) useDocs = true;
        }

        // 2. Parallel Execution of Tools
        const toolPromises = [];
        const memoryService = require('../services/memoryService'); // Lazy load

        // Web Search
        if (useWeb) {
            toolPromises.push(searchService.generateSearchQuery(content)
                .then(q => searchService.performSearch(q))
                .then(data => ({ type: 'web', data: searchService.processResults(data) }))
                .catch(e => ({ type: 'web', data: '' }))
            );
        }

        // Document RAG
        if (useDocs) {
            const isRagEnabled = settings.rag && settings.rag.enabled !== false;
            if (isRagEnabled) {
                toolPromises.push(vectorService.findRelevantChunks(content, req.user.id)
                    .then(chunks => ({
                        type: 'docs',
                        data: chunks.map((c, i) => `[Doc ${i + 1}] (Relevance: ${Math.round(c.score * 100)}%): ${c.content}`).join('\n\n')
                    }))
                    .catch(e => ({ type: 'docs', data: '' }))
                );
            }
        }


        // 1.5 MCP Tool Execution (Agentic Step)
        let mcpContext = '';
        try {
            const tools = await mcpService.getTools(req.user.id);
            if (tools.length > 0) {
                // Agentic Router for Tools
                const toolPrompt = `
User Query: "${content}"
Available Tools:
${tools.map(t => `- ${t.functionName}: ${t.description}`).join('\n')}

Determine if the user's query requires using one of these tools.
If yes, reply STRICTLY in this format: TOOL: <functionName> | <JSON_arguments>
If no, reply: NO
`;
                // Use a fast model for routing if possible, otherwise use default
                const routerResponse = await aiService.generate(settings, [{ role: 'user', content: toolPrompt }]);

                if (routerResponse.includes('TOOL:')) {
                    const match = routerResponse.match(/TOOL:\s*(\S+)\s*\|\s*(.+)/);
                    if (match) {
                        const [_, fnName, argsStr] = match;
                        const [serverName, toolName] = fnName.split('__');

                        console.log(`🛠️ Executing MCP Tool: ${fnName} with ${argsStr}`);
                        const toolResult = await mcpService.callTool(req.user.id, serverName, toolName, JSON.parse(argsStr));

                        mcpContext = `[MCP TOOL RESULT: ${fnName}]\n${JSON.stringify(toolResult.content, null, 2)}`;
                    }
                }
            }
        } catch (e) {
            console.error('MCP Execution Error:', e);
            // Fail silently, don't block response
        }


        // Memory Retrieval
        if (useMemory) {
            toolPromises.push(memoryService.retrieveMemories(req.user.id, content)
                .then(mems => ({
                    type: 'memory',
                    data: mems.map(m => `[Memory] (${m.date ? new Date(m.date).toLocaleDateString() : 'Past'}): ${m.content}`).join('\n')
                }))
                .catch(e => ({ type: 'memory', data: '' }))
            );
        }

        const results = await Promise.all(toolPromises);

        const searchContext = results.find(r => r.type === 'web')?.data || '';
        const docContext = results.find(r => r.type === 'docs')?.data || '';
        const memoryContext = results.find(r => r.type === 'memory')?.data || '';

        // Add user message to DB
        currentChat.messages.push({ role: 'user', content, image });
        await currentChat.save();

        // Prepare History
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

        // 🔥 OPTIMIZED: Send ONLY the most recent image
        let foundImage = false;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].images) {
                if (foundImage) delete history[i].images;
                else foundImage = true;
            }
        }

        // Consolidate System Message
        let unifiedSystemMessage = settings.systemInstructions || 'You are Jarvis, a helpful AI assistant.';

        // Add Tone/Mode instructions if provided
        if (tone && mode) {
            unifiedSystemMessage += `\n\n[RESPONSE STYLE]\nTone: ${tone}\nMode: ${mode}\nINSTRUCTION: Adapt your response accordingly.`;
        }

        // Add system timestamp
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        const timezoneOffset = -now.getTimezoneOffset() / 60;
        const timezone = settings.timezone || `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;
        unifiedSystemMessage += `\n\n[SYSTEM CONTEXT]\nCurrent Date: ${dateStr}\nCurrent Time: ${timeStr}\nTimezone: ${timezone}`;

        if (settings.country) unifiedSystemMessage += `\nUser Location: ${settings.country}`;

        console.log('[DEBUG] Thinking Enabled:', thinkingEnabled); // Debug log

        // Add Thinking Mode instruction if enabled
        if (thinkingEnabled) {
            unifiedSystemMessage += `\n\n[SYSTEM MODE: THINKING ENABLED]\n⚠️ CRITICAL INSTRUCTION ⚠️\nYou are in THINKING MODE. You MUST start your response with a thinking block.\n\nFORMAT:\n<think>\n[Plan and reason step-by-step here. Be detailed.]\n</think>\n[Your final response]\n\nDO NOT output the answer directly. You MUST output <think>...</think> first. This is a STRICT requirement.`;
        }

        // Inject Tool Contexts
        if (memoryContext) {
            unifiedSystemMessage += `\n\n[LONG-TERM MEMORY]\n${memoryContext}\n\nINSTRUCTION: Use these memories to personalize your response.`;
        }
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
                const titlePrompt = `Summarize: "${content}" into max 4 words title. No quotes.`;
                const generatedTitle = await aiService.generate(settings, [{ role: 'user', content: titlePrompt }]);
                newTitle = generatedTitle?.trim().replace(/(^["'])|(["']$)/g, '');
                if (newTitle) {
                    currentChat.title = newTitle;
                    await currentChat.save();
                }
            } catch (ignore) { }
        }

        console.log(`📊 AI Request: [${settings.aiProvider || 'ollama'}] ${history.length} msgs | M:${!!memoryContext} D:${!!docContext} W:${!!searchContext} MCP:${!!mcpContext}`);

        const { stream, parser } = await aiService.getStream(settings, history);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (newTitle) res.write(`data: ${JSON.stringify({ title: newTitle })}\n\n`);

        let assistantMessage = '';
        let isThinking = false;

        stream.on('data', chunk => {
            const results = parser(chunk);
            for (const resObj of results) {
                if (resObj.content) {
                    const text = resObj.content;
                    // Send raw content including <think> tags to frontend
                    if (text) {
                        assistantMessage += text;
                        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
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

                // --- AGENTIC LEARNING ---
                // Fire and forget memory extraction
                if (saveMemory) {
                    process.nextTick(() => {
                        memoryService.extractAndSaveMemories(req.user.id, content, assistantMessage);
                    });
                }
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });

        stream.on('error', err => {
            console.error('Stream error:', err);
            if (!res.headersSent) res.end();
        });

    } catch (error) {
        console.error('Send message error:', error.message);
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
