const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        console.log('📝 Registration attempt:', { username: req.body.username, email: req.body.email });
        const { username, email, password } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            console.log('❌ User already exists');
            return res.status(400).json({ message: 'User already exists' });
        }

        console.log('✅ Creating user...');
        const user = await User.create({ username, email, password });

        console.log('✅ Creating user settings...');
        // Create default settings for the user
        await UserSettings.create({ userId: user._id });

        console.log('✅ Generating JWT token...');
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        console.log('✅ Registration successful');
        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
