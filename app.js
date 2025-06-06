Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key];
});

require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const authRoutes = require('./routes/authRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

const User = require('./models/User');
const app = express();
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enable CORS for all routes (adjust origin as needed for security)
app.use(cors({
    origin: 'http://localhost:3001', // Adjust based on where your frontend is served
    credentials: true
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
const mongoURI = 'mongodb://localhost:27017/applicantsDB';
let gfs;
// Connect to MongoDB
const conn = mongoose.connection;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

const storage1 = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return {
            filename: file.originalname,
            bucketName: 'uploads',
        };
    },
});
const upload1 = multer({ storage1 });

// Route to upload PDF
app.post('/upload1', upload1.single('file'), (req, res) => {
    res.json({ file: req.file });
});

// Route to retrieve PDF
app.get('/file/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({ err: 'No file exists' });
        }
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
    });
});
// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'));
        }
    }
});

// Connect to MongoDB (use environment variables for security)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/applicantsDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Schema for storing PDFs
const pdfSchema = new mongoose.Schema({
    pdfData: Buffer,  // To store the PDF as binary data
    createdAt: { type: Date, default: Date.now }
});

const Pdf = mongoose.model('Pdf', pdfSchema);

//Endpoint to save PDF data
app.post('/save-pdf', async (req, res) => {
    const { pdfData } = req.body;
    const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');  // Remove the base64 prefix

    const newPdf = new Pdf({ pdfData: pdfBuffer });

    try {
        await newPdf.save();
        res.status(200).json({ message: 'PDF saved successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving PDF', error });
    }
});
// User Schema for Authentication
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true } // Added role field
}, { timestamps: true });

// Middleware to verify token
function verifyToken(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).send('Access Denied: No Token Provided');

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).send('Access Denied: Malformed Token');
    }

    const token = tokenParts[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
}

// Serve the login page at '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/register', async (req, res) => {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
        return res.status(400).send('All fields are required');
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).send('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email, password: hashedPassword, role });

    try {
        const savedUser = await user.save();
        res.status(201).send({ userId: savedUser._id });
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send('Email or password is incorrect');
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token, role: user.role });
});

// Submit Form Route
app.post('/submit-form', verifyToken, upload.fields([{ name: 'pdf1', maxCount: 1 }, { name: 'pdf2', maxCount: 1 }]), async (req, res) => {
    try {
        const formData = req.body;
        const files = req.files;

        // Extract form fields
        const {
            name,
            dateOfAppointment,
            faculty,
            department,
            periodOfStudy_fullPayFrom,
            periodOfStudy_fullPayTo,
            periodOfStudy_noPayFrom,
            periodOfStudy_noPayTo,
            'academicQualifications.university': academicUniversities,
            'academicQualifications.registrationFrom': academicRegFrom,
            'academicQualifications.registrationTo': academicRegTo,
            'academicQualifications.degreeObtained': academicDegrees,
            'postgraduateDegrees.university': postgraduateUniversities,
            'postgraduateDegrees.registrationFrom': postgraduateRegFrom,
            'postgraduateDegrees.registrationTo': postgraduateRegTo,
            'postgraduateDegrees.fullOrPartTime': postgraduateFullPartTime,
            'postgraduateDegrees.degreeObtained': postgraduateDegrees,
            'postgraduateDegrees.thesisTitle': postgraduateThesisTitles,
            'teachingAppointments.post': teachingPosts,
            'teachingAppointments.appointmentFrom': teachingAppFrom,
            'teachingAppointments.appointmentTo': teachingAppTo,
            'teachingAppointments.institution': teachingInstitutions,
            confirmation,
            confirmationLetter,
            presentSalary,
            salaryMaxDate,
            researchPublications,
            signature,
            'hodObservations.observations': hodObservations,
            'hodObservations.date': hodObservationsDate,
            'hodObservations.signature': hodSignature,
            'deanObservations.observations': deanObservations,
            'deanObservations.date': deanObservationsDate,
            'deanObservations.signature': deanSignature
        } = formData;
        const Applicant = require('./models/Applicant'); // Adjust the path as needed

        // Create Applicant entry
        const applicant = new Applicant({
            name,
            dateOfAppointment,
            faculty,
            department,
            periodOfStudy: {
                fullPayFrom: periodOfStudy_fullPayFrom || null,
                fullPayTo: periodOfStudy_fullPayTo || null,
                noPayFrom: periodOfStudy_noPayFrom || null,
                noPayTo: periodOfStudy_noPayTo || null
            },
            academicQualifications: [],
            postgraduateDegrees: [],
            teachingAppointments: [],
            confirmation,
            confirmationLetter,
            presentSalary,
            salaryMaxDate: salaryMaxDate || null,
            researchPublications,
            signature,
            hodObservations: {
                observations: hodObservations || '',
                date: hodObservationsDate || null,
                signature: hodSignature || ''
            },
            deanObservations: {
                observations: deanObservations || '',
                date: deanObservationsDate || null,
                signature: deanSignature || ''
            },
            uploadedFiles: {
                pdf1: files['pdf1'] ? files['pdf1'][0].path : '',
                pdf2: files['pdf2'] ? files['pdf2'][0].path : ''
            },
            user: req.user._id
        });

        // Handle dynamic academic qualifications
        if (Array.isArray(academicUniversities)) {
            for (let i = 0; i < academicUniversities.length; i++) {
                applicant.academicQualifications.push({
                    university: academicUniversities[i],
                    registrationFrom: academicRegFrom[i],
                    registrationTo: academicRegTo[i],
                    degreeObtained: academicDegrees[i]
                });
            }
        } else if (academicUniversities) { // Single entry
            applicant.academicQualifications.push({
                university: academicUniversities,
                registrationFrom: academicRegFrom,
                registrationTo: academicRegTo,
                degreeObtained: academicDegrees
            });
        }

        // Handle dynamic postgraduate degrees
        if (Array.isArray(postgraduateUniversities)) {
            for (let i = 0; i < postgraduateUniversities.length; i++) {
                applicant.postgraduateDegrees.push({
                    university: postgraduateUniversities[i],
                    registrationFrom: postgraduateRegFrom[i],
                    registrationTo: postgraduateRegTo[i],
                    fullOrPartTime: postgraduateFullPartTime[i],
                    degreeObtained: postgraduateDegrees[i],
                    thesisTitle: postgraduateThesisTitles[i]
                });
            }
        } else if (postgraduateUniversities) { // Single entry
            applicant.postgraduateDegrees.push({
                university: postgraduateUniversities,
                registrationFrom: postgraduateRegFrom,
                registrationTo: postgraduateRegTo,
                fullOrPartTime: postgraduateFullPartTime,
                degreeObtained: postgraduateDegrees,
                thesisTitle: postgraduateThesisTitles
            });
        }

        // Handle dynamic teaching appointments
        if (Array.isArray(teachingPosts)) {
            for (let i = 0; i < teachingPosts.length; i++) {
                applicant.teachingAppointments.push({
                    post: teachingPosts[i],
                    appointmentFrom: teachingAppFrom[i],
                    appointmentTo: teachingAppTo[i],
                    institution: teachingInstitutions[i]
                });
            }
        } else if (teachingPosts) { // Single entry
            applicant.teachingAppointments.push({
                post: teachingPosts,
                appointmentFrom: teachingAppFrom,
                appointmentTo: teachingAppTo,
                institution: teachingInstitutions
            });
        }

        // Save applicant
        const savedApplicant = await applicant.save();
        res.status(201).send(savedApplicant);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error while submitting the form');
    }
});

// Authorization Routes
app.use('/api/auth', authRoutes);



const http = require("http");
const { Server } = require("socket.io");
const initializeSocket = require("./routes/Socket" )// Import socket.js


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (example route setup, replace with your actual routes)

app.use("/approval", approvalRoutes);

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Update this for production with specific domains
    },
});

// Initialize Socket.IO functionality
initializeSocket(io);

// Broadcast new applications
const broadcastApplication = (application) => {
    io.emit("newApplication", application);
};

// Export `broadcastApplication` for use in other routes
module.exports = { broadcastApplication };

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
