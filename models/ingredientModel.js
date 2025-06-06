const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  severity: { type: String, enum: ['high', 'medium', 'low'], required: true },
  warning: { type: String, required: true },
  alternative: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);