const express = require('express');
const router = express.Router();
const {
    createChat,
    createGroupChat,
    getChats,
    getChatMessages,
    sendMessage,
    sendGroupMessage,
    deleteChat,
    bulkDelete,
    shareChat,
    getSharedChat,
    unshareChat,
    importSharedChat,
    joinSharedChat
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createChat);
router.post('/group/:groupId', protect, createGroupChat);
router.get('/', protect, getChats);
router.get('/:id/messages', protect, getChatMessages);
router.post('/:id/send', protect, sendMessage);
router.post('/:id/group-message', protect, sendGroupMessage);
// Update chat (rename, pin, folder)
router.patch('/:id', protect, chatController.updateChat);

// Delete a chat
router.delete('/:id', protect, chatController.deleteChat);
router.post('/bulk-delete', protect, bulkDelete);

// Share routes
router.post('/:id/share', protect, shareChat);
router.delete('/:id/share', protect, unshareChat);
router.get('/shared/:shareToken', getSharedChat); // Public route for viewing shared chats
router.post('/shared/:shareToken/import', protect, importSharedChat);
router.post('/shared/:shareToken/join', protect, joinSharedChat);

module.exports = router;
