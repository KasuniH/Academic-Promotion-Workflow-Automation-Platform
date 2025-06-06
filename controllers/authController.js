const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
    const { fullName, email, password, role } = req.body;

    // Validate the required fields
    if (!fullName || !email || !password || !role) {
        return res.status(400).send('All fields are required');
    }

    try {
        // Check if the user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).send('Email already exists');
        }

        // Hash the password using bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user with the provided data
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            role, // Role should be 'HOD', 'Dean', or 'Senate'
        });

        // Save the new user in the database
        const savedUser = await newUser.save();
        res.status(201).send({ userId: savedUser._id, message: 'User registered successfully' });
    } catch (error) {
        res.status(500).send('Error registering user: ' + error.message);
    }
};

// Login a user
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Validate the required fields
    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
        // Check if the user exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        // Compare the provided password with the hashed password in the database
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).send('Invalid email or password');
        }

        // Generate a JWT token
        const token = jwt.sign(
            { _id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey', // Use environment variable for secret key
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Respond with the token
        res.json({ message: 'Logged in successfully', token });
    } catch (error) {
        res.status(500).send('Error logging in: ' + error.message);
    }
};

// Get currently logged-in user's profile
exports.getProfile = async (req, res) => {
    try {
        // Find the user by the ID decoded from the JWT token
        const user = await User.findById(req.user._id).select('-password'); // Exclude the password field
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Respond with user profile information
        res.json(user);
    } catch (error) {
        res.status(500).send('Error fetching user profile: ' + error.message);
    }
};

// Logout user (optional, JWT-based authentication typically doesn't require this)
exports.logout = (req, res) => {
    // You can simply invalidate the token on the client side by removing it from local storage
    res.json({ message: 'Logged out successfully' });
};

