const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth");
const { uploadImage } = require("../controllers/ImageController");
const { getScanHistory, getScanById, deleteScan } = require("../controllers/ScanController");
const uploadMiddleware = require("../middlewares/uploadMiddleware");


// User routes
router.post('/images/upload', uploadMiddleware, uploadImage);
router.get('/scans', protect, getScanHistory);
router.get('/scans/:id', protect, getScanById);
router.delete('/scans/:id', protect, deleteScan);

module.exports = router;
