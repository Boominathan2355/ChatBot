const UserSettings = require('../models/UserSettings');

exports.getSettings = async (req, res) => {
    try {
        const settings = await UserSettings.findOne({ userId: req.user.id });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = await UserSettings.findOneAndUpdate(
            { userId: req.user.id },
            req.body,
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.validateOllama = async (req, res) => {
    const axios = require('axios');
    const { url } = req.body;
    try {
        const response = await axios.get(`${url}/api/tags`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        res.json({ success: true, models: response.data.models });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Could not connect to Ollama' });
    }
};
