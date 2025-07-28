const Scan = require('../models/scanModel');
const { processImage } = require('../utils/ocr');
const { getGeminiInsight } = require('../utils/geminiHelper');
const progressTracker = require('../utils/progressTracker');

// Background processing function
const processImageInBackground = async (taskId, file, userProfile = null) => {
  try {
    // Update progress: Starting OCR
    progressTracker.updateProgress(taskId, 25, 'Extracting text from image...');
    
    // Process image with OCR
    const extractedText = await processImage(file);
    
    // Update progress: OCR completed, starting Gemini analysis
    
    // Create progress callback function for Gemini
    const progressCallback = (progress, status) => {
      progressTracker.updateProgress(taskId, progress, status);
    };
    
    // Analyze using Gemini API with progress callback
    const analysis = userProfile 
      ? await getGeminiInsight(extractedText, userProfile, progressCallback)
      : await getGeminiInsight(extractedText, null, progressCallback);
    
    // Update progress: Analysis completed, validating results
    progressTracker.updateProgress(taskId, 80, 'Processing analysis results...');
    
    // Validate analysis structure
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis structure from Gemini API');
    }

    // Validate recommendations structure
    if (!Array.isArray(analysis.recommendations) || 
        analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      throw new Error('Invalid analysis recommendations structure');
    }

    // Validate harmfulIngredients
    if (!Array.isArray(analysis.harmfulIngredients)) {
      throw new Error('Invalid analysis: harmfulIngredients must be an array');
    }

    // Validate nutritionalInfo
    if (!analysis.nutritionalInfo || 
        typeof analysis.nutritionalInfo.totalSugar !== 'number' ||
        typeof analysis.nutritionalInfo.totalSodium !== 'number') {
      throw new Error('Invalid nutritional information structure');
    }

    // Update progress: Finalizing
    progressTracker.updateProgress(taskId, 95, 'Finalizing results...');

    // Prepare final result
    const result = {
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
    };

    // Complete the task
    progressTracker.completeTask(taskId, result);
    
  } catch (error) {
    console.error(`Background processing error for task ${taskId}:`, error.message);
    progressTracker.failTask(taskId, error.message);
  }
};

const uploadImageAuth = async (req, res) => {
  try {
    console.log('Authenticated upload invoked, user:', req.user._id);
    console.log('File details:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Generate task ID and create task
    const taskId = progressTracker.generateTaskId();
    progressTracker.createTask(taskId);

    // Prepare user profile for Gemini
    const userProfile = {
      gender: req.user.gender,
      name: req.user.name,
      age: req.user.age,
      weight: req.user.weight,
      diseases: req.user.diseases,
      allergies: req.user.allergies
    };

    // Start background processing
    processImageInBackground(taskId, req.file, userProfile);

    // Return task ID immediately
    res.json({
      taskId,
      message: 'Image processing started',
      status: 'processing'
    });

  } catch (error) {
    console.error('Authenticated image processing error:', error.message);
    res.status(500).json({ message: `Failed to start image processing: ${error.message}` });
  }
};

const uploadImageGuest = async (req, res) => {
  try {
    console.log('Guest upload invoked');

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Generate task ID and create task
    const taskId = progressTracker.generateTaskId();
    progressTracker.createTask(taskId);

    // Start background processing without user profile
    processImageInBackground(taskId, req.file);

    // Return task ID immediately
    res.json({
      taskId,
      message: 'Image processing started',
      status: 'processing'
    });

  } catch (error) {
    console.error('Guest image processing error:', error.message);
    res.status(500).json({ message: `Failed to start image processing: ${error.message}` });
  }
};

// New endpoint to get progress
const getProgress = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const task = progressTracker.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Return task status
    res.json({
      taskId,
      progress: task.progress,
      status: task.status,
      completed: task.completed,
      result: task.result,
      error: task.error
    });

  } catch (error) {
    console.error('Progress check error:', error.message);
    res.status(500).json({ message: `Failed to get progress: ${error.message}` });
  }
};

module.exports = { uploadImageAuth, uploadImageGuest, getProgress };