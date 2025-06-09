const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const stream = require('stream');
const path = require('path');
// Configure S3Client for AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Custom storage engine for multer using AWS SDK v3
const s3Storage = multer.memoryStorage(); // We'll handle S3 upload in ImageController

const memoryStorage = multer.memoryStorage();

const uploadMiddleware = (req, res, next) => {
  const isAuthRoute = req.path.includes('/auth');
  console.log(`Upload middleware invoked, route: ${req.path}, user: ${req.user ? req.user._id : 'unauthenticated'}`); // Debug log
  const storage = isAuthRoute ? s3Storage : memoryStorage;
  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|heic/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        console.log(`Valid file type: ${file.mimetype}`); // Debug log
        return cb(null, true);
      }
      const error = new Error('Invalid file type. Only JPG, PNG, HEIC allowed.');
      console.error(error.message); // Debug log
      cb(error);
    }
  }).single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message); // Debug log
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      console.error('Upload error:', err.message); // Debug log
      if (err.message.includes('Access Denied')) {
        return res.status(403).json({ message: 'S3 Access Denied: Check IAM permissions' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      console.error('No file uploaded'); // Debug log
      return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log('File uploaded to memory:', req.file); // Debug log
    next();
  });
};

// Export s3Client for use in other modules
module.exports = { uploadMiddleware, s3Client };