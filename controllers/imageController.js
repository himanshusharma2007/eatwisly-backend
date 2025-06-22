const Scan = require('../models/scanModel');
const { processImage } = require('../utils/ocr');
const { Upload } = require('@aws-sdk/lib-storage');
const { s3Client } = require('../middlewares/uploadMiddleware');
const { getGeminiInsight } = require('../utils/geminiHelper');

// Function to generate user-friendly insights using Gemini API

exports.uploadImageAuth = async (req, res) => {
  try {
    console.log('Authenticated upload invoked, user:', req.user._id); // Debug log
    console.log('File details:', req.file); // Debug log

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR (using Google Cloud Vision API)
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
    console.log('Analysis result:', JSON.stringify(analysis, null, 2)); // Debug log

    // Validate recommendations structure
    if (!Array.isArray(analysis.recommendations) || analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      console.error('Invalid recommendations structure:', analysis.recommendations); // Debug log
      return res.status(400).json({ message: 'Invalid analysis recommendations structure' });
    }

    // Additional validation for harmfulIngredients
    if (!Array.isArray(analysis.harmfulIngredients)) {
      console.error('Validation failed: harmfulIngredients is not an array:', analysis.harmfulIngredients);
      return res.status(400).json({ message: 'Invalid analysis: harmfulIngredients must be an array' });
    }

    // Construct S3 key (e.g., Uploads/<userId>/filename.jpg)
    const userId = req.user._id.toString();
    const timestamp = Date.now();
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${timestamp}_${sanitizedFilename}`;
    const s3Key = `Uploads/${userId}/${filename}`;

    // Upload to S3 using @aws-sdk/lib-storage
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET, // Use consistent env variable
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      }
    });

    await upload.done();

    // Construct S3 URL for response (though it won't be directly accessible due to private bucket)
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // Construct relative path for database (e.g., /Uploads/<userId>/filename.jpg)
    const relativePath = `/${s3Key}`; // Store with leading slash for consistency

    // Save to MongoDB
    const scan = new Scan({
      userId: req.user._id,
      imagePath: relativePath,
      extractedText,
      analysis
    });
    await scan.save();

    res.json({ extractedText, analysis, imagePath: s3Url, scanId: scan._id });
  } catch (error) {
    console.error('Authenticated image processing error:', error.message); // Debug log
    if (error.name === 'AccessDenied') {
      return res.status(403).json({ message: 'S3 Access Denied: Check IAM permissions for s3:PutObject' });
    }
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};

exports.uploadImageGuest = async (req, res) => {
  try {
    console.log('Guest upload invoked'); // Debug log


    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Process image with OCR (using Google Cloud Vision API)
    const extractedText = await processImage(req.file);

    // Analyze using Gemini API without user profile
    const analysis = await getGeminiInsight(extractedText);

    res.json({ extractedText, analysis });
  } catch (error) {
    console.error('Guest image processing error:', error.message); // Debug log
    res.status(500).json({ message: `Failed to process image: ${error.message}` });
  }
};