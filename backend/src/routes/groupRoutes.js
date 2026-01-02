const express = require('express');
const router = express.Router();
const { createGroup, getGroups, addMember, removeMember, updateGroup } = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createGroup);
router.get('/', protect, getGroups);
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.put('/:id', protect, updateGroup);

module.exports = router;
