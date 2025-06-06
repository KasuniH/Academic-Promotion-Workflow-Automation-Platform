const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// User registration route
router.post('/register', authController.register);

// User login route
router.post('/login', authController.login);

// Get logged-in user's profile
router.get('/profile', verifyToken, authController.getProfile);

// Optional logout route (not strictly necessary with JWT)
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
