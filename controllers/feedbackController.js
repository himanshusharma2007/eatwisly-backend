const Feedback = require('../models/feedbackModel');

const submitFeedback = async (req, res) => {
  try {
    const { name, email, feedbackType, message } = req.body;

    // Create a new feedback entry
    const feedback = new Feedback({
      name,
      email,
      feedbackType,
      message
    });

    // Save to MongoDB
    await feedback.save();

    console.log('Feedback saved:', feedback); // Debug log

    res.status(201).json({
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Feedback submission error:', error.message); // Debug log

    // Handle validation errors from the model
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      message: 'Failed to submit feedback. Please try again.'
    });
  }
};

// Get all feedback entries (paginated, admin only)
const getAllFeedback = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Feedback.countDocuments();
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    res.json({
      feedback,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFeedback: total
    });
  } catch (error) {
    console.error('Error fetching feedback:', error.message); // Debug log
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// Get a specific feedback entry by ID (admin only)
const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback by ID:', error.message); // Debug log
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
};

// Delete a specific feedback entry by ID (admin only)
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    console.log('Feedback deleted:', feedback); // Debug log
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error.message); // Debug log
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
};

module.exports = {
  submitFeedback,
  getAllFeedback,
  getFeedbackById,
  deleteFeedback
};