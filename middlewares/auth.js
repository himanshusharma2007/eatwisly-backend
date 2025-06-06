const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET ;

exports.protect = async (req, res, next) => {
  try {
    let token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) {
      console.log('No token provided'); // Debug log
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token decoded:', decoded); // Debug log

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('User not found for ID:', decoded.id); // Debug log
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = user;
    console.log('User set in req:', user._id); // Debug log
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message); // Debug log
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

exports.adminProtect = async (req, res, next) => {
  try {
    await exports.protect(req, res, () => {
      if (!req.user.isAdmin) {
        console.log('Non-admin user attempted access:', req.user._id); // Debug log
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth error:', error.message); // Debug log
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
};