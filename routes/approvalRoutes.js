
const express = require('express');
const router = express.Router();
const socket = require('./Socket');
const jwt = require('jsonwebtoken');
const { 
    getPendingApplications, 
    approveApplication, 
    rejectApplication 
} = require('../controllers/approvalController');

const Application = require('../models/Application');

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(403).send('Forbidden');
    }
};

// Apply authentication middleware globally to all routes
router.use(authenticate);

// Fetch all applications
router.get('/applications', async (req, res) => {
    try {
        const applications = await Application.find(); // Fetch all applications from the database
        res.json(applications);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching applications');
    }
});

// Fetch all pending applications for approval
router.get('/pending', getPendingApplications);

// Approve or reject an application
router.post('/approve/:id', verifyRole('HOD'), approveApplication);
router.post('/reject/:id', verifyRole('HOD'), rejectApplication);

// Submit a new application
router.post('/submit-form', async (req, res) => {
    try {
        const application = new Application(req.body);
        await application.save();
        broadcastApplication(application);
        res.status(201).json(application);
    } catch (err) {
        console.error('Error submitting application:', err);
        res.status(500).send('Error submitting application');
    }
});

module.exports = router;
