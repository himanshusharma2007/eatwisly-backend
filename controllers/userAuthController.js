const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = "7d"; // 7 days

// Helper: create JWT token
function createToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper: send token as cookie
function sendTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "lax",
  });
}

// Register user
exports.register = async (req, res) => {
  try {
    const { name, age, gender, email, password } = req.body;

    if (!name || !age || !gender || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = new User({ name, age, gender, email, password });
    await user.save();

    const token = createToken(user._id);
    sendTokenCookie(res, token);

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name, email, age, gender },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user._id);
    sendTokenCookie(res, token);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Social login (placeholder)
exports.socialLogin = async (req, res) => {
  try {
    const { email, name, socialId } = req.body;
    if (!email || !socialId)
      return res.status(400).json({ message: "Email and social ID required" });

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from social login
      user = new User({
        email,
        name: name || "Social User",
        isSocialLogin: true,
        password: null,
      });
      await user.save();
    }

    const token = createToken(user._id);
    sendTokenCookie(res, token);

    res.json({
      message: "Social login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Social login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update profile

// 4. Update userAuthController.js - updateProfile function
exports.updateProfile = async (req, res) => {
  console.log('req.body', req.body)
  try {
    const userId = req.user._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, age, gender, email, password, diseases, allergies, weight } =
      req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle image upload
    if (req.file) {
      const base64Image = req.file.buffer.toString("base64");
      user.profileImage = `data:${req.file.mimetype};base64,${base64Image}`;
    }

    // Update other fields...
    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (email) user.email = email;
    if (password) user.password = password;
    if (diseases) user.diseases = Array.isArray(diseases) ? diseases : [];
    if (allergies) user.allergies = Array.isArray(allergies) ? allergies : [];
    if (weight) user.weight = Number(weight) || undefined;

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        diseases: user.diseases,
        allergies: user.allergies,
        weight: user.weight,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout user (clear cookie)
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out successfully" });
};
