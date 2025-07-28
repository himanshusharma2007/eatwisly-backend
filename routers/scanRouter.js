const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth");

const { uploadMiddleware } = require("../middlewares/uploadMiddleware");
const { uploadImageAuth, uploadImageGuest, getProgress } = require("../controllers/imageController");
const { saveScanResult, getScanHistory, getScanById, deleteScan } = require("../controllers/scanController");

// Image upload routes
router.post('/images/upload/auth', protect, uploadMiddleware, uploadImageAuth);// Authenticated
router.post('/images/upload/guest', uploadMiddleware, uploadImageGuest); // Unauthenticated

// Progress tracking route
router.get('/progress/:taskId', getProgress); // Get progress status

// Scan management routes
router.post('/save/auth', protect, uploadMiddleware, saveScanResult);// Authenticated
router.get('/scans', protect, getScanHistory);
router.get('/scans/:id', protect, getScanById);
router.delete('/scans/:id', protect, deleteScan);

module.exports = router;