const mongoose = require('mongoose');

const webPageSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    domain: {
        type: String,
        index: true
    },
    title: String,
    description: String,
    content: String,
    author: String,
    publishDate: String,
    images: [{
        url: String,
        alt: String
    }],
    videos: [String],
    keywords: [String],
    tags: [String],
    links: [{
        url: String,
        text: String
    }],
    wordCount: Number,
    readingTime: Number,
    scrapedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('WebPage', webPageSchema);
