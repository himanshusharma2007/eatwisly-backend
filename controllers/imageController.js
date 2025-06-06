const Scan = require('../models/scanModel');
const { processImage } = require('../utils/ocr');
const { analyzeIngredients } = require('../utils/analysis');
const fs = require('fs-extra');

exports.uploadImageAuth = async (req, res) => {
  try {
    console.log('Authenticated upload invoked, user:', req.user._id); // Debug log
    console.log('File details:', req.file); // Debug log

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR
    const extractedText = await processImage(req.file);

    // Analyze ingredients
    const analysis = await analyzeIngredients(extractedText);
    console.log('Analysis result:', JSON.stringify(analysis, null, 2)); // Debug log

    // Validate recommendations structure
    if (!Array.isArray(analysis.recommendations) || analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      console.error('Invalid recommendations structure:', analysis.recommendations); // Debug log
      return res.status(400).json({ message: 'Invalid analysis recommendations structure' });
    }

    // Construct relative path (e.g., /Uploads/<userId>/filename.jpg)
    const relativePath = `/Uploads/${req.user._id.toString()}/${req.file.filename}`;
    console.log('Saving relative path:', relativePath); // Debug log

    // Save to MongoDB
    console.log('Saving scan for user:', req.user._id); // Debug log
    const scan = new Scan({
      userId: req.user._id,
      imagePath: relativePath,
      extractedText,
      analysis
    });
    await scan.save();
    console.log('Scan saved, ID:', scan._id); // Debug log

    res.json({ extractedText, analysis, imagePath: relativePath, scanId: scan._id });
  } catch (error) {
    console.error('Authenticated image processing error:', error.message); // Debug log
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};

exports.uploadImageGuest = async (req, res) => {
  try {
    console.log('Guest upload invoked'); // Debug log
    console.log('File details:', req.file); // Debug log

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Confirm memory storage (no disk write)
    if (req.file.path) {
      console.warn('Unexpected disk write detected for guest upload:', req.file.path); // Debug log
      // Clean up any unexpected temporary file
      try {
        await fs.unlink(req.file.path);
        console.log('Cleaned up unexpected file:', req.file.path); // Debug log
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError.message); // Debug log
      }
    }

    // Process image with OCR
    const extractedText = await processImage(req.file);

    // Analyze ingredients
    const analysis = await analyzeIngredients(extractedText);
    console.log('Analysis result:', JSON.stringify(analysis, null, 2)); // Debug log

    // Return results without saving
    console.log('Returning guest results'); // Debug log
    res.json({ extractedText, analysis });
  } catch (error) {
    console.error('Guest image processing error:', error.message); // Debug log
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};