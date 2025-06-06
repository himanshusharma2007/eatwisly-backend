const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user ? req.user._id.toString() : 'anonymous';
    const uploadPath = path.join(__dirname, '../uploads', userId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const memoryStorage = multer.memoryStorage();

const uploadMiddleware = (req, res, next) => {
  const storage = req.user ? diskStorage : memoryStorage;
  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|heic/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) return cb(null, true);
      cb(new Error('Invalid file type. Only JPG, PNG, HEIC allowed.'));
    }
  }).single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = uploadMiddleware;