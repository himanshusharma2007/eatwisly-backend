const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const TESSERACT_CACHE_PATH = path.resolve(__dirname, '..', 'tesseract_cache');
fs.ensureDirSync(TESSERACT_CACHE_PATH);

/**
 * Preprocesses an image from a file path using sharp for efficiency.
 * It resizes, converts to grayscale, and normalizes the image to improve OCR accuracy.
 * @param {string} inputPath - The path to the input image.
 * @param {string} outputPath - The path to save the processed image.
 */
const preprocessImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }) // Resize without enlarging
    .greyscale() // Convert to grayscale
    .normalize() // Improve contrast
    .toFile(outputPath);
};

/**
 * Processes an image from a given file path to extract text using OCR.
 * @param {string} filePath - The path to the image file uploaded via multer.
 * @returns {Promise<string>} - The extracted text.
 */
exports.processImage = async (filePath) => {
  const processedImagePath = path.join(path.dirname(filePath), `processed-${path.basename(filePath)}.png`);
  
  try {
    // Preprocess the image from disk and save it to a new file
    await preprocessImage(filePath, processedImagePath);

    const { data: { text } } = await Tesseract.recognize(
      processedImagePath,
      'eng',
      {
        cachePath: TESSERACT_CACHE_PATH,
      }
    );

    if (!text.trim()) {
      throw new Error('No text found in the image');
    }

    console.log('OCR completed successfully');
    return text.trim();

  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  } finally {
    // Clean up the processed image file
    try {
      await fs.unlink(processedImagePath);
    } catch (cleanupError) {
      // Log if cleanup fails but don't throw, as the main error is more important
      console.error(`Failed to cleanup processed image file: ${processedImagePath}`, cleanupError);
    }
  }
};