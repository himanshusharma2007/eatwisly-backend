const express = require("express");
const router = express.Router();

const authController = require("../controllers/userAuthController");
const { protect } = require("../middlewares/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/social-login", authController.socialLogin);

// Protected routes
router.get("/me", protect, authController.getProfile);
router.put("/me", protect, authController.updateProfile);
router.post("/logout", protect, authController.logout);
// User routes
router.post('/images/upload', uploadMiddleware, ImageController.uploadImage);
router.get('/scans', protect, ScanController.getScanHistory);
router.get('/scans/:id', protect, ScanController.getScanById);
router.delete('/scans/:id', protect, ScanController.deleteScan);

module.exports = router;
