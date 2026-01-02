const express = require('express');
const router = express.Router();
const { createChat, getChats, getChatMessages, sendMessage, deleteChat, bulkDelete } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createChat);
router.get('/', protect, getChats);
router.get('/:id/messages', protect, getChatMessages);
router.post('/:id/send', protect, sendMessage);
router.delete('/:id', protect, deleteChat);
router.post('/bulk-delete', protect, bulkDelete);

module.exports = router;
