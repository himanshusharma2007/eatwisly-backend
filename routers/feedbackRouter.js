const express = require('express');
const router = express.Router();
const { submitFeedback, getAllFeedback, getFeedbackById, deleteFeedback } = require('../controllers/feedbackController');
const { protect, adminProtect } = require('../middlewares/auth');

router.post('/', submitFeedback);

router.get('/', protect, adminProtect, getAllFeedback); // Get all feedback
router.get('/:id', protect, adminProtect, getFeedbackById); // Get feedback by ID
router.delete('/:id', protect, adminProtect, deleteFeedback); // Delete feedback by ID

module.exports = router;