const express = require('express');
const router = express.Router();
const { register, login, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.delete('/me', protect, deleteAccount);

module.exports = router;
