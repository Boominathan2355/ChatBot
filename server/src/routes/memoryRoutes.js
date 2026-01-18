const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const memoryController = require('../controllers/memoryController');

router.get('/', protect, memoryController.getMemories);
router.delete('/:id', protect, memoryController.deleteMemory);
router.delete('/', protect, memoryController.clearMemories);

module.exports = router;
