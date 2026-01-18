const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const dataController = require('../controllers/dataController');

router.get('/export', protect, dataController.exportData);
router.delete('/history', protect, dataController.deleteChatHistory);

module.exports = router;
