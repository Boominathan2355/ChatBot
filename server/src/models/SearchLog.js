const mongoose = require('mongoose');

const searchLogSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        index: true
    },
    results: [{
        title: String,
        url: String,
        description: String,
        thumbnail: String,
        profile: mongoose.Schema.Types.Mixed
    }],
    provider: {
        type: String,
        default: 'unknown'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SearchLog', searchLogSchema);
