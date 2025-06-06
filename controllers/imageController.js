const Scan = require('../models/Scan');
const { processImage } = require('../utils/ocr');
const { analyzeIngredients } = require('../utils/analysis');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR
    const extractedText = await processImage(req.file);

    // Analyze ingredients
    const analysis = await analyzeIngredients(extractedText);

    if (req.user) {
      // Authenticated: Save to MongoDB
      const scan = new Scan({
        userId: req.user._id,
        imagePath: req.file.path,
        extractedText,
        analysis
      });
      await scan.save();
      return res.json({ extractedText, analysis, imagePath: req.file.path, scanId: scan._id });
    }

    // Unauthenticated: Return results without saving
    res.json({ extractedText, analysis });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};