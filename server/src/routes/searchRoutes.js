const express = require('express');
const router = express.Router();
const { webSearch } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, webSearch);

module.exports = router;
