const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, validateOllama } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.post('/validate', protect, validateOllama);

module.exports = router;
