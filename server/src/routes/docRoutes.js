const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadDocument, getDocuments, deleteDocument } = require('../controllers/docController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.delete('/:id', protect, deleteDocument);

module.exports = router;
