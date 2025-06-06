const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imagePath: { type: String, required: true },
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
      type: String,
      title: String,
      message: String
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);