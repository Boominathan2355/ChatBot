const memoryService = require('../services/memoryService');
const Memory = require('../models/Memory');

exports.getMemories = async (req, res) => {
    try {
        const memories = await Memory.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(memories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch memories' });
    }
};

exports.deleteMemory = async (req, res) => {
    try {
        await memoryService.deleteMemory(req.params.id, req.user.id);
        res.json({ message: 'Memory deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete memory' });
    }
};

exports.clearMemories = async (req, res) => {
    try {
        await Memory.deleteMany({ userId: req.user.id });
        res.json({ message: 'All memories cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear memories' });
    }
};
