const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            // Fallback to default user on token error if intended, 
            // but usually token error means invalid attempt. 
            // For now, let's allow fallback only if NO token is provided, 
            // or maybe on error too if we want to be super permissive.
            // Let's stick to "if no token provided" logic for safety against bad tokens, 
            // but if the goal is "remove login", the client might still send an old token.
            // Let's proceed to fallback if token fails too, to be safe for "removing login".
        }
    }

    // If no token or token failed, try to use default user
    try {
        // Just get the first user
        const user = await User.findOne({});
        if (user) {
            req.user = user;
            return next();
        }
    } catch (error) {
        console.error('Error finding default user:', error);
    }

    if (!token && !req.user) {
        return res.status(401).json({ message: 'Not authorized, no token and no default user found' });
    }
};

module.exports = { protect };
