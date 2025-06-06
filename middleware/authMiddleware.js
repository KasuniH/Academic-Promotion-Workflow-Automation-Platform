const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.header('Authorization'); // Authorization header should include "Bearer <token>"
    
    if (!token) {
        return res.status(401).send('Access Denied: No Token Provided');
    }

    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).send('Access Denied: Invalid Token Format');
    }

    try {
        // Verify the token using the secret
        const verified = jwt.verify(tokenParts[1], process.env.JWT_SECRET || 'secretkey');
        req.user = verified; // Attach the verified user data to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
}

// Middleware to verify user roles (HOD, Dean, Senate)
function verifyRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).send('Access Denied: Insufficient Permissions');
        }
        next(); // Proceed if the role matches
    };
}

// Middleware to check if the user has any of the required roles (e.g., ['HOD', 'Dean', 'Senate'])
function verifyAnyRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).send('Access Denied: Insufficient Permissions');
        }
        next(); // Proceed if the role is one of the allowed roles
    };
}

module.exports = { verifyToken, verifyRole, verifyAnyRole };
