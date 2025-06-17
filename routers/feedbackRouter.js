const express = require('express');
const router = express.Router();
const { submitFeedback, getAllFeedback, getFeedbackById, deleteFeedback } = require('../controllers/feedbackController');
const { protect, adminProtect } = require('../middlewares/auth');

router.post('/feedback', submitFeedback);

router.get('/feedback', protect, adminProtect, getAllFeedback); // Get all feedback
router.get('/feedback/:id', protect, adminProtect, getFeedbackById); // Get feedback by ID
router.delete('/feedback/:id', protect, adminProtect, deleteFeedback); // Delete feedback by ID

module.exports = router;