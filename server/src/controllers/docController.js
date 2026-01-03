const Document = require('../models/Document');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { originalname, mimetype, path: filePath } = req.file;
        const document = await Document.create({
            userId: req.user.id,
            filename: originalname,
            fileType: mimetype,
            storagePath: filePath,
            status: 'processing'
        });

        // Process document in background (simplified)
        processDocument(document, filePath);

        res.status(202).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const processDocument = async (doc, filePath) => {
    try {
        let content = '';
        const fileExt = path.extname(filePath).toLowerCase();

        if (fileExt === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            content = data.text;
        } else if (fileExt === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            content = result.value;
        } else {
            content = fs.readFileSync(filePath, 'utf8');
        }

        // Placeholder for Vector Embedding & Storage
        // In a real app: 
        // 1. Chunk content
        // 2. Generate embeddings via Ollama or OpenAI
        // 3. Save to ChromaDB/Milvus
        console.log(`Processing ${doc.filename}: extracted ${content.length} characters`);

        doc.status = 'indexed';
        await doc.save();
    } catch (error) {
        console.error('Document processing error:', error);
        doc.status = 'error';
        doc.error = error.message;
        await doc.save();
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ userId: req.user.id });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        // Delete file from storage
        if (fs.existsSync(doc.storagePath)) {
            fs.unlinkSync(doc.storagePath);
        }

        await Document.findByIdAndDelete(doc._id);
        res.json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
