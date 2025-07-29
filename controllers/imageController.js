const fs = require("fs").promises;
const path = require("path");
const Scan = require("../models/scanModel");
const { processImage } = require("../utils/ocr");
const { getGeminiInsight } = require("../utils/geminiHelper");
const progressTracker = require("../utils/progressTracker");

// Enhanced file deletion with retry logic
const deleteFileWithRetry = async (filePath, maxRetries = 5, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fs.unlink(filePath);
      console.log(`Successfully deleted temporary file: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        // File doesn't exist, consider it successfully "deleted"
        console.log(`File already deleted or doesn't exist: ${filePath}`);
        return true;
      }

      if (attempt === maxRetries) {
        console.error(
          `Failed to delete file after ${maxRetries} attempts: ${filePath}`,
          error
        );
        return false;
      }

      console.warn(
        `Attempt ${attempt} failed to delete ${filePath}, retrying in ${delay}ms...`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
  return false;
};

// Alternative: Schedule file deletion for later
const scheduleFileDeletion = (filePath, delayMs = 5000) => {
  setTimeout(async () => {
    try {
      await fs.unlink(filePath);
      console.log(`Delayed deletion successful: ${filePath}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Delayed deletion failed: ${filePath}`, error.message);
        // Add to cleanup queue for manual review
        addToCleanupQueue(filePath);
      }
    }
  }, delayMs);
};

// Cleanup queue for manual review of failed deletions
const failedDeletions = new Set();
const addToCleanupQueue = (filePath) => {
  failedDeletions.add(filePath);
  console.warn(`Added to cleanup queue: ${filePath}`);
};

// Periodic cleanup function (call this periodically, e.g., via cron job)
const performPeriodicCleanup = async () => {
  const uploadsDir = path.join(__dirname, "../uploads");
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  try {
    const files = await fs.readdir(uploadsDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          await deleteFileWithRetry(filePath, 3, 500);
        }
      } catch (error) {
        console.error(
          `Error processing file during cleanup: ${filePath}`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Periodic cleanup error:", error.message);
  }
};

const processImageInBackground = async (taskId, file, userProfile = null) => {
  const filePath = file.path;

  try {
    progressTracker.updateProgress(taskId, 25, "Extracting text from image...");

    // Process image with OCR using the file path
    const extractedText = await processImage(filePath);

    const progressCallback = (progress, status) => {
      progressTracker.updateProgress(taskId, progress, status);
    };

    const analysis = await getGeminiInsight(
      extractedText,
      userProfile,
      progressCallback
    );

    progressTracker.updateProgress(
      taskId,
      80,
      "Processing analysis results..."
    );

    if (
      !analysis ||
      typeof analysis !== "object" ||
      !Array.isArray(analysis.recommendations)
    ) {
      throw new Error("Invalid analysis structure received");
    }

    progressTracker.updateProgress(taskId, 95, "Finalizing results...");

    const result = {
      extractedText,
      analysis,
    };

    progressTracker.completeTask(taskId, result);
  } catch (error) {
    console.error(
      `Background processing error for task ${taskId}:`,
      error.message
    );
    progressTracker.failTask(taskId, error.message);
  } finally {
    // **ENHANCED CLEANUP WITH MULTIPLE STRATEGIES**

    // Strategy 1: Immediate retry with exponential backoff
    const immediateSuccess = await deleteFileWithRetry(filePath, 3, 500);

    if (!immediateSuccess) {
      // Strategy 2: Schedule deletion for later
      console.warn(
        `Immediate deletion failed, scheduling delayed cleanup for: ${filePath}`
      );
      scheduleFileDeletion(filePath, 10000); // 10 seconds delay
    }
  }
};

const uploadImageAuth = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const taskId = progressTracker.generateTaskId();
    progressTracker.createTask(taskId);

    const userProfile = {
      gender: req.user.gender,
      name: req.user.name,
      age: req.user.age,
      weight: req.user.weight,
      diseases: req.user.diseases,
      allergies: req.user.allergies,
    };

    // Pass the entire file object, which contains the path
    processImageInBackground(taskId, req.file, userProfile);

    res.json({
      taskId,
      message: "Image processing started",
      status: "processing",
    });
  } catch (error) {
    console.error("Authenticated image processing error:", error.message);
    res
      .status(500)
      .json({ message: `Failed to start image processing: ${error.message}` });
  }
};

const uploadImageGuest = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const taskId = progressTracker.generateTaskId();
    progressTracker.createTask(taskId);

    // Pass the entire file object
    processImageInBackground(taskId, req.file);

    res.json({
      taskId,
      message: "Image processing started",
      status: "processing",
    });
  } catch (error) {
    console.error("Guest image processing error:", error.message);
    res
      .status(500)
      .json({ message: `Failed to start image processing: ${error.message}` });
  }
};

const getProgress = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required" });
    }

    const task = progressTracker.getTask(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      taskId,
      progress: task.progress,
      status: task.status,
      completed: task.completed,
      result: task.result,
      error: task.error,
    });
  } catch (error) {
    console.error("Progress check error:", error.message);
    res
      .status(500)
      .json({ message: `Failed to get progress: ${error.message}` });
  }
};

// Export the cleanup function for use in other parts of your application
module.exports = {
  uploadImageAuth,
  uploadImageGuest,
  getProgress,
  performPeriodicCleanup,
  failedDeletions, // Export for monitoring
};
