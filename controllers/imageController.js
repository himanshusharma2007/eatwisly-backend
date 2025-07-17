const Scan = require('../models/scanModel');
const { processImage } = require('../utils/ocr');

const { getGeminiInsight } = require('../utils/geminiHelper');

const uploadImageAuth = async (req, res) => {
  try {
    console.log('Authenticated upload invoked, user:', req.user._id);
    console.log('File details:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR
    const extractedText = await processImage(req.file);

    // Prepare user profile for Gemini
    const userProfile = {
      gender: req.user.gender,
      name: req.user.name,
      age: req.user.age,
      weight: req.user.weight,
      diseases: req.user.diseases,
      allergies: req.user.allergies
    };

    // Analyze using Gemini API with user profile
    const analysis = await getGeminiInsight(extractedText, userProfile);
    console.log('Analysis result:', JSON.stringify(analysis, null, 2));

    // Validate analysis structure
    if (!analysis || typeof analysis !== 'object') {
      console.error('Invalid analysis structure:', analysis);
      return res.status(400).json({ message: 'Invalid analysis structure from Gemini API' });
    }

    // Validate recommendations structure
    if (!Array.isArray(analysis.recommendations) || 
        analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      console.error('Invalid recommendations structure:', analysis.recommendations);
      return res.status(400).json({ message: 'Invalid analysis recommendations structure' });
    }

    // Validate harmfulIngredients
    if (!Array.isArray(analysis.harmfulIngredients)) {
      console.error('Validation failed: harmfulIngredients is not an array:', analysis.harmfulIngredients);
      return res.status(400).json({ message: 'Invalid analysis: harmfulIngredients must be an array' });
    }

    // Validate nutritionalInfo
    if (!analysis.nutritionalInfo || 
        typeof analysis.nutritionalInfo.totalSugar !== 'number' ||
        typeof analysis.nutritionalInfo.totalSodium !== 'number') {
      console.error('Invalid nutritionalInfo structure:', analysis.nutritionalInfo);
      return res.status(400).json({ message: 'Invalid nutritional information structure' });
    }

    // Return response without saving to DB or S3
    res.json({
      extractedText,
      analysis: {
        healthImpact: analysis.healthImpact,
        harmfulIngredients: analysis.harmfulIngredients,
        nutritionalInfo: analysis.nutritionalInfo,
        healthScore: analysis.healthScore,
        shouldEat: analysis.shouldEat,
        shouldEatReason: analysis.shouldEatReason,
        recommendations: analysis.recommendations,
        healthyAlternatives: analysis.healthyAlternatives,
        additionalNotes: analysis.additionalNotes
      }
    });
  } catch (error) {
    console.error('Authenticated image processing error:', error.message);
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};

const uploadImageGuest = async (req, res) => {
  try {
    console.log('Guest upload invoked');

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR
    const extractedText = await processImage(req.file);

    // Analyze using Gemini API without user profile
    const analysis = await getGeminiInsight(extractedText);

    // Validate analysis structure
    if (!analysis || typeof analysis !== 'object') {
      console.error('Invalid analysis structure:', analysis);
      return res.status(400).json({ message: 'Invalid analysis structure from Gemini API' });
    }

    // Validate recommendations structure
    if (!Array.isArray(analysis.recommendations) || 
        analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      console.error('Invalid recommendations structure:', analysis.recommendations);
      return res.status(400).json({ message: 'Invalid analysis recommendations structure' });
    }

    // Validate harmfulIngredients
    if (!Array.isArray(analysis.harmfulIngredients)) {
      console.error('Validation failed: harmfulIngredients is not an array:', analysis.harmfulIngredients);
      return res.status(400).json({ message: 'Invalid analysis: harmfulIngredients must be an array' });
    }

    // Validate nutritionalInfo
    if (!analysis.nutritionalInfo || 
        typeof analysis.nutritionalInfo.totalSugar !== 'number' ||
        typeof analysis.nutritionalInfo.totalSodium !== 'number') {
      console.error('Invalid nutritionalInfo structure:', analysis.nutritionalInfo);
      return res.status(400).json({ message: 'Invalid nutritional information structure' });
    }

    // Return response matching Gemini's structure
    res.json({
      extractedText,
      analysis: {
        healthImpact: analysis.healthImpact,
        harmfulIngredients: analysis.harmfulIngredients,
        nutritionalInfo: analysis.nutritionalInfo,
        healthScore: analysis.healthScore,
        shouldEat: analysis.shouldEat,
        shouldEatReason: analysis.shouldEatReason,
        recommendations: analysis.recommendations,
        healthyAlternatives: analysis.healthyAlternatives,
        additionalNotes: analysis.additionalNotes
      }
    });
  } catch (error) {
    console.error('Guest image processing error:', error.message);
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};

module.exports = { uploadImageAuth, uploadImageGuest };
