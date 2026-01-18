const User = require('../models/User');
const Chat = require('../models/Chat');
const Memory = require('../models/Memory');
const UserSettings = require('../models/UserSettings');

// Export all user data
exports.exportData = async (req, res) => {
    try {
        const userId = req.user.id;

        const [user, settings, chats, memories] = await Promise.all([
            User.findById(userId).select('-password'),
            UserSettings.findOne({ userId }),
            Chat.find({ userId }),
            Memory.find({ userId })
        ]);

        const exportPackage = {
            exportDate: new Date().toISOString(),
            user,
            settings,
            stats: {
                totalChats: chats.length,
                totalMemories: memories.length
            },
            data: {
                chats,
                memories
            }
        };

        res.json(exportPackage);
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({ message: 'Failed to export data' });
    }
};

// Delete all chat history
exports.deleteChatHistory = async (req, res) => {
    try {
        await Chat.deleteMany({ userId: req.user.id });
        res.json({ message: 'Chat history cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear chat history' });
    }
};
