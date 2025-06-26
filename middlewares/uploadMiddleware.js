const multer = require('multer');
const { S3Client  } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const sharp = require('sharp');
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
const s3Storage = multer.memoryStorage();
const memoryStorage = multer.memoryStorage();

// Utility function to optimize and resize image
async function optimizeImage(buffer, mimetype) {
  try {
    const sharpInstance = sharp(buffer)
      .resize({
        width: 1920,
        height: 1080,
        fit: 'inside',
        withoutEnlargement: true
      })
      .withMetadata(false); // Strip metadata to reduce size

    let optimizedBuffer;

    if (mimetype.includes('png')) {
      // Optimize PNG with high compression and palette reduction
      optimizedBuffer = await sharpInstance
        .png({
          compressionLevel: 9, // Maximum compression
          palette: true, // Reduce colors for smaller files
          colors: 256, // Limit color palette
          force: true
        })
        .toBuffer();
    } else if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
      // Optimize JPEG with lower quality for smaller files
      optimizedBuffer = await sharpInstance
        .jpeg({
          quality: 70, // Reduced quality for better compression
          progressive: true,
          optimizeScans: true,
          force: true
        })
        .toBuffer();
    } else {
      // Fallback for other formats (e.g., HEIC)
      optimizedBuffer = await sharpInstance.toBuffer();
    }

    // If optimized size is larger, return original buffer
    if (optimizedBuffer.length > buffer.length) {
      console.log(`Optimization increased size (${optimizedBuffer.length} > ${buffer.length} bytes), using original`);
      return buffer;
    }

    return optimizedBuffer;
  } catch (error) {
    console.error('Image optimization error:', error.message);
    throw new Error('Failed to optimize image');
  }
}

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
      const filetypes = /jpeg|jpg|png|heic/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        console.log(`Valid file type: ${file.mimetype}`);
        return cb(null, true);
      }
      const error = new Error('Invalid file type. Only JPG, PNG, HEIC allowed.');
      console.error(error.message);
      cb(error);
    }
  }).single('image')(req, res, async (err) => {
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

    try {
      // Log original file size
      console.log(`Original file size: ${req.file.size} bytes`);

      // Optimize image
      const optimizedBuffer = await optimizeImage(req.file.buffer, req.file.mimetype);

      // Log optimized file size
      console.log(`Optimized file size: ${optimizedBuffer.length} bytes`);

      // Update req.file with optimized buffer and size
      req.file.buffer = optimizedBuffer;
      req.file.size = optimizedBuffer.length;

      // If auth route, prepare for S3 upload
      if (isAuthRoute) {
        req.file.s3UploadParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `uploads/${Date.now()}_${path.basename(req.file.originalname)}`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype
        };
      }

      console.log('File processed successfully:', req.file);
      next();
    } catch (error) {
      console.error('Processing error:', error.message);
      return res.status(500).json({ message: 'Failed to process image' });
    }
  });
};

// Export s3Client for use in other modules
module.exports = { uploadMiddleware, s3Client };