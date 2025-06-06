const express = require("express");
const router = express.Router();

const authController = require("../controllers/userAuthController");
const { protect } = require("../middlewares/auth");
const { uploadImage } = require("../controllers/ImageController");
const { getScanHistory, getScanById, deleteScan } = require("../controllers/ScanController");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/social-login", authController.socialLogin);

// Protected routes
router.get("/me", protect, authController.getProfile);
router.put("/me", protect, authController.updateProfile);
router.post("/logout", protect, authController.logout);
// User routes
router.post('/images/upload', uploadMiddleware, uploadImage);
router.get('/scans', protect, getScanHistory);
router.get('/scans/:id', protect, getScanById);
router.delete('/scans/:id', protect, deleteScan);

module.exports = router;
