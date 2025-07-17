const express = require('express');
const router = express.Router();

const { protect, adminProtect } = require('../middlewares/auth');
const { getAllFeedback, getFeedbackById, deleteFeedback } = require('../controllers/feedbackController');

router.post('/', submitFeedback);

router.get('/', protect, adminProtect, getAllFeedback); // Get all feedback
router.get('/:id', protect, adminProtect, getFeedbackById); // Get feedback by ID
router.delete('/:id', protect, adminProtect, deleteFeedback); // Delete feedback by ID

module.exports = router;