const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, updateSecrets, getModels, validateProvider } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.post('/secrets', protect, updateSecrets);
router.get('/models/:provider', protect, getModels);
router.post('/validate', protect, validateProvider);

module.exports = router;
