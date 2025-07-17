const multer = require('multer');
const { S3Client  } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
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
const s3Storage = multer.memoryStorage();
const memoryStorage = multer.memoryStorage();

const uploadMiddleware = (req, res, next) => {
  const isAuthRoute = req.path.includes('/auth');
  console.log(`Upload middleware invoked, route: ${req.path}, user: ${req.user ? req.user._id : 'unauthenticated'}`);

  // Check if user is authenticated for S3 uploads
  if (isAuthRoute && !req.user) {
    console.error('Unauthorized access attempt to auth route');
    return res.status(401).json({ message: 'Authentication required for image upload' });
  }

  const storage = isAuthRoute ? s3Storage : memoryStorage;

  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      // Accept any image type
      if (file.mimetype.startsWith('image/')) {
        console.log(`Valid file type: ${file.mimetype}`);
        return cb(null, true);
      }
      const error = new Error('Invalid file type. Only image files are allowed.');
      console.error(error.message);
      cb(error);
    }
  }).single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      console.error('Upload error:', err.message);
      if (err.message.includes('Access Denied')) {
        return res.status(403).json({ message: 'S3 Access Denied: Check IAM permissions' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Log original file size - no optimization here
    console.log(`Original file size: ${req.file.size} bytes`);

    // If auth route, prepare for S3 upload (will be optimized in controller)
    if (isAuthRoute) {
      req.file.s3UploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `uploads/${Date.now()}_${path.basename(req.file.originalname)}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };
    }

    console.log('File processed successfully (no optimization):', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    next();
  });
};

// Export s3Client for use in other modules
module.exports = { uploadMiddleware, s3Client };