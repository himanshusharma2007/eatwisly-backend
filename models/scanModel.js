const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imagePath: { 
    type: String, 
    required: true,
    // Store path as /Uploads/<userId>/filename.<extension>
  },
  extractedText: { type: String, required: true },
  analysis: {
    healthImpact: { type: String },
    harmfulIngredients: [{
      name: String,
      severity: String,
      warning: String,
      alternative: String
    }],
    nutritionalInfo: {
      totalSugar: Number,
      totalSodium: Number,
      caloriesPerServing: Number,
      servingSize: String
    },
    healthScore: Number,
    shouldEat: String,
    shouldEatReason: String,
    recommendations: [{
      type: { type: String, required: true },
      title: { type: String, required: true },
      message: { type: String, required: true }
    }],
    healthyAlternatives: [String],
    additionalNotes: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);