const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth");
const { uploadImageAuth, uploadImageGuest } = require("../controllers/ImageController");
const { getScanHistory, getScanById, deleteScan } = require("../controllers/ScanController");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

// User routes
router.post('/images/upload/auth', protect, uploadMiddleware, uploadImageAuth); // Authenticated
router.post('/images/upload/guest', uploadMiddleware, uploadImageGuest); // Unauthenticated
router.get('/scans', protect, getScanHistory);
router.get('/scans/:id', protect, getScanById);
router.delete('/scans/:id', protect, deleteScan);

module.exports = router;