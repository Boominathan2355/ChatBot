const Group = require('../models/Group');
const Chat = require('../models/Chat');

exports.createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        const group = await Group.create({
            name,
            description,
            ownerId: req.user.id,
            members: [{ userId: req.user.id, role: 'admin' }]
        });

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getGroups = async (req, res) => {
    try {
        const groups = await Group.find({
            'members.userId': req.user.id
        }).populate('ownerId', 'username email');

        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Check if requester is admin
        const requesterMember = group.members.find(m => m.userId.toString() === req.user.id);
        if (!requesterMember || requesterMember.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can add members' });
        }

        // Check if user already in group
        if (group.members.find(m => m.userId.toString() === userId)) {
            return res.status(400).json({ message: 'User already in group' });
        }

        group.members.push({ userId, role: 'member' });
        await group.save();

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        const requesterMember = group.members.find(m => m.userId.toString() === req.user.id);
        if (!requesterMember || requesterMember.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }

        group.members = group.members.filter(m => m.userId.toString() !== req.params.userId);
        await group.save();

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can update group' });
        }

        const { name, description } = req.body;
        if (name) group.name = name;
        if (description) group.description = description;

        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
