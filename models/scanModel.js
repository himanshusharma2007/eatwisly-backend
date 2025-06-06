const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imagePath: { 
    type: String, 
    required: true,
    // Store path as /Uploads/<userId>/filename.<extension>
    match: /^\/Uploads\/[a-f\d]{24}\/[\w\-]+\.(jpg|jpeg|png|heic)$/ // Validate format: /Uploads/userId/filename.extension
  },
  extractedText: { type: String, required: true },
  analysis: {
    harmfulIngredients: [{
      name: String,
      severity: String,
      warning: String,
      alternative: String
    }],
    nutritionalInfo: {
      totalSugar: Number,
      totalSodium: Number
    },
    healthScore: Number,
    recommendations: [{
      type: { type: String, required: true },
      title: { type: String, required: true },
      message: { type: String, required: true }
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);