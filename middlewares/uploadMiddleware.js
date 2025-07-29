const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

// Configure S3Client for AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Define the temporary upload directory
const UPLOAD_DIR = 'uploads/';
fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // Ensure the directory exists

// Use disk storage to save files temporarily instead of using memory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadMiddleware = (req, res, next) => {
  multer({
    storage: storage, // Use the disk storage engine
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        return cb(null, true);
      }
      const error = new Error('Invalid file type. Only image files are allowed.');
      cb(error);
    }
  }).single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File uploaded to disk:', {
      path: req.file.path,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    next();
  });
};

module.exports = { uploadMiddleware, s3Client };