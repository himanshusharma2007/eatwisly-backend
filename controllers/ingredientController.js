const Ingredient = require('../models/ingredientModel');

exports.createIngredient = async (req, res) => {
  try {
    const { name, severity, warning, alternative } = req.body;
    if (!name || !severity || !warning || !alternative) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await Ingredient.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Ingredient already exists' });

    const ingredient = new Ingredient({ name, severity, warning, alternative });
    await ingredient.save();

    res.status(201).json({ message: 'Ingredient created', ingredient });
  } catch (error) {
    console.error('Create ingredient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getIngredients = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const ingredients = await Ingredient.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ingredient.countDocuments();

    res.json({ ingredients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get ingredients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const { name, severity, warning, alternative } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });

    if (name) ingredient.name = name;
    if (severity) ingredient.severity = severity;
    if (warning) ingredient.warning = warning;
    if (alternative) ingredient.alternative = alternative;

    await ingredient.save();
    res.json({ message: 'Ingredient updated', ingredient });
  } catch (error) {
    console.error('Update ingredient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });

    await ingredient.remove();
    res.json({ message: 'Ingredient deleted' });
  } catch (error) {
    console.error('Delete ingredient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllScans = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const scans = await Scan.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Scan.countDocuments();

    res.json({ scans, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get all scans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};