const Applicant = require('../models/Applicant');

// Fetch all pending applications for the current role (HOD, Dean, or Senate)
exports.getPendingApplications = async (req, res) => {
    try {
        const { role } = req.user;
        let query = {};

        // Define role-based queries for fetching pending applications
        if (role === 'HOD') {
            query['hodApproval.approved'] = { $ne: true }; // Applications not approved by HOD
        } else if (role === 'Dean') {
            query['deanApproval.approved'] = { $ne: true, 'hodApproval.approved': true }; // HOD-approved applications only
        } else if (role === 'Senate') {
            query['senateApproval.approved'] = { $ne: true, 'deanApproval.approved': true }; // Dean-approved applications only
        } else {
            return res.status(403).json({ message: 'Access Denied: Invalid role' });
        }

        const applications = await Applicant.find(query);
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching applications', error: err.message });
    }
};

// Approve an application (HOD, Dean, or Senate)
exports.approveApplication = async (req, res) => {
    try {
        const { role } = req.user;
        const { comments = 'Approved' } = req.body;

        const application = await Applicant.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Role-based approval logic
        if (role === 'HOD') {
            application.hodApproval = { approved: true, date: new Date(), comments };
        } else if (role === 'Dean') {
            if (!application.hodApproval.approved) {
                return res.status(400).json({ message: 'Application must be approved by HOD first' });
            }
            application.deanApproval = { approved: true, date: new Date(), comments };
        } else if (role === 'Senate') {
            if (!application.deanApproval.approved) {
                return res.status(400).json({ message: 'Application must be approved by Dean first' });
            }
            application.senateApproval = { approved: true, date: new Date(), comments };
        } else {
            return res.status(403).json({ message: 'Access Denied: Insufficient permissions' });
        }

        await application.save();
        res.json({ message: 'Application approved successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error approving application', error: err.message });
    }
};

// Reject an application (HOD, Dean, or Senate)
exports.rejectApplication = async (req, res) => {
    try {
        const { role } = req.user;
        const { comments = 'Rejected' } = req.body;

        const application = await Applicant.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Role-based rejection logic
        if (role === 'HOD') {
            application.hodApproval = { approved: false, date: new Date(), comments };
        } else if (role === 'Dean') {
            if (!application.hodApproval.approved) {
                return res.status(400).json({ message: 'Application must be approved by HOD first' });
            }
            application.deanApproval = { approved: false, date: new Date(), comments };
        } else if (role === 'Senate') {
            if (!application.deanApproval.approved) {
                return res.status(400).json({ message: 'Application must be approved by Dean first' });
            }
            application.senateApproval = { approved: false, date: new Date(), comments };
        } else {
            return res.status(403).json({ message: 'Access Denied: Insufficient permissions' });
        }

        await application.save();
        res.json({ message: 'Application rejected successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error rejecting application', error: err.message });
    }
};

// View a specific application (For detailed view, e.g., during approval/rejection)
exports.viewApplication = async (req, res) => {
    try {
        const application = await Applicant.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        res.json(application);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching application', error: err.message });
    }
};
