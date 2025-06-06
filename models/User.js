const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['HOD', 'Dean', 'Senate','Applicant'],  // Define the allowed roles
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);