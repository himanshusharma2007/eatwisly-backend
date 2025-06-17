const express = require("express");
const router = express.Router();

const authController = require("../controllers/userAuthController");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/multer");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/social-login", authController.socialLogin);

// Protected routes
router.get("/me", protect, authController.getProfile);
router.put("/me", protect,upload.single('profileImage'),  authController.updateProfile);
router.post("/logout", protect, authController.logout);


module.exports = router;
