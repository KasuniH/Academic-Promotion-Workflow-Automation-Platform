const mongoose = require('mongoose');

// Define Applicant Schema
const ApplicantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dateOfAppointment: { type: Date, required: true },
    faculty: { type: String, required: true },
    department: { type: String, required: true },
    periodOfStudy: {
        fullPayFrom: Date,
        fullPayTo: Date,
        noPayFrom: Date,
        noPayTo: Date
    },
    academicQualifications: [
        {
            university: String,
            registrationFrom: Date,
            registrationTo: Date,
            degreeObtained: String
        }
    ],
    postgraduateDegrees: [
        {
            university: String,
            registrationFrom: Date,
            registrationTo: Date,
            fullOrPartTime: String,
            degreeObtained: String,
            thesisTitle: String
        }
    ],
    teachingAppointments: [
        {
            post: String,
            appointmentFrom: Date,
            appointmentTo: Date,
            institution: String
        }
    ],
    confirmation: { type: String, required: true },
    confirmationLetter: String,
    presentSalary: { type: String, required: true },
    salaryMaxDate: Date,
    researchPublications: String,
    signature: { type: String, required: true },
    hodObservations: {
        observations: String,
        date: Date,
        signature: String
    },
    deanObservations: {
        observations: String,
        date: Date,
        signature: String
    },
    uploadedFiles: {
        pdf1: String, // Path to PhD Certificate
        pdf2: String  // Path to Teaching Methodology
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Applicant', ApplicantSchema);
