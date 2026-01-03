const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const vectorService = require('../services/vectorService');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
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

        // Process document in background
        processDocument(document, filePath, req.user.id);

        res.status(202).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const cleanText = (text) => {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
};

const chunkText = (text, maxLength = 1000, overlap = 200) => {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxLength;

        // Try to find a good breaking point (paragraph or sentence)
        if (end < text.length) {
            const nextParagraph = text.indexOf('\n\n', end - 100);
            if (nextParagraph !== -1 && nextParagraph < end + 100) {
                end = nextParagraph + 2;
            } else {
                const nextSentence = text.indexOf('. ', end - 50);
                if (nextSentence !== -1 && nextSentence < end + 50) {
                    end = nextSentence + 2;
                }
            }
        }

        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start < 0) start = 0;

        // Avoid infinite loops if chunking doesn't progress
        if (start >= end) start = end;
    }

    return chunks.filter(c => c.length > 50); // Filter out tiny chunks
};

const processDocument = async (doc, filePath, userId) => {
    try {
        let content = '';
        const fileExt = path.extname(filePath).toLowerCase();

        if (fileExt === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            content = data.text;

            // If PDF is empty/scanned, try OCR
            if (content.trim().length < 100) {
                console.log(`PDF ${doc.filename} appears to be scanned, starting OCR...`);
                // Note: Tesseract on multi-page PDF requires converting to image first
                // For now, we handle basic OCR on image files directly
            }
        } else if (fileExt === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            content = result.value;
        } else if (['.png', '.jpg', '.jpeg', '.tiff'].includes(fileExt)) {
            const { data: { text } } = await Tesseract.recognize(filePath);
            content = text;
        } else {
            content = fs.readFileSync(filePath, 'utf8');
        }

        const cleanedContent = cleanText(content);
        const chunks = chunkText(cleanedContent);

        console.log(`Processing ${doc.filename}: extracted ${content.length} chars, created ${chunks.length} chunks`);

        // Generate embeddings and save chunks
        const chunkPromises = chunks.map(async (chunkText, index) => {
            const vector = await vectorService.generateEmbedding(chunkText, userId);
            if (vector) {
                return DocumentChunk.create({
                    documentId: doc._id,
                    userId: userId,
                    content: chunkText,
                    vector: vector,
                    metadata: {
                        startIndex: index * 800 // Approximate
                    }
                });
            }
        });

        await Promise.all(chunkPromises);

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

        // Delete associated chunks
        await DocumentChunk.deleteMany({ documentId: doc._id });

        await Document.findByIdAndDelete(doc._id);
        res.json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
