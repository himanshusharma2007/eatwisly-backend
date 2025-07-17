const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth");
const { getScanHistory, getScanById, deleteScan, saveScanResult } = require("../controllers/ScanController");
const { uploadMiddleware } = require("../middlewares/uploadMiddleware");
const { uploadImageAuth, uploadImageGuest } = require("../controllers/imageController");

// User routes
router.post('/images/upload/auth', protect, uploadMiddleware, uploadImageAuth);// Authenticated
router.post('/images/upload/guest', uploadMiddleware, uploadImageGuest); // Unauthenticated

router.post('/save/auth', protect, uploadMiddleware, saveScanResult);// Authenticated
router.get('/scans', protect, getScanHistory);
router.get('/scans/:id', protect, getScanById);
router.delete('/scans/:id', protect, deleteScan);

module.exports = router;