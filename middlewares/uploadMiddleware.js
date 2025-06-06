const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!req.user) {
        const error = new Error('User not authenticated for disk storage');
        console.error(error.message); // Debug log
        return cb(error);
      }
      const userId = req.user._id.toString();
      const uploadPath = path.resolve(__dirname, '..', 'Uploads', userId);
      fs.ensureDirSync(uploadPath, { mode: 0o755 });
      console.log(`Upload directory created/confirmed: ${uploadPath}`); // Debug log
      // Verify write permissions
      const testFile = path.join(uploadPath, 'test.txt');
      fs.writeFileSync(testFile, 'test', { flag: 'wx' });
      fs.unlinkSync(testFile);
      console.log(`Write permission verified for: ${uploadPath}`); // Debug log
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error creating upload directory:', error.message); // Debug log
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const timestamp = Date.now();
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const filename = `${timestamp}_${sanitizedFilename}`;
      console.log(`Saving file as: ${filename}`); // Debug log
      cb(null, filename);
    } catch (error) {
      console.error('Error setting filename:', error.message); // Debug log
      cb(error);
    }
  }
});

const memoryStorage = multer.memoryStorage();

const uploadMiddleware = (req, res, next) => {
  const isAuthRoute = req.path.includes('/auth');
  console.log(`Upload middleware invoked, route: ${req.path}, user: ${req.user ? req.user._id : 'unauthenticated'}`); // Debug log
  const storage = isAuthRoute ? diskStorage : memoryStorage;
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
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      console.error('No file uploaded'); // Debug log
      return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log('File uploaded:', req.file); // Debug log
    next();
  });
};

module.exports = uploadMiddleware;