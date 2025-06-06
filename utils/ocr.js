const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');

const preprocessImage = async (buffer) => {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width * 2, img.height * 2); // Scale for better OCR
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const enhanced = gray < 128 ? Math.max(0, gray - 50) : Math.min(255, gray + 50);
    data[i] = data[i + 1] = data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer('image/png');
};

exports.processImage = async (file) => {
  try {
    const processedBuffer = await preprocessImage(file.buffer || file.path);
    const { data: { text } } = await Tesseract.recognize(
      processedBuffer,
      'eng',
      {
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,():-/%'
      }
    );

    if (!text.trim()) {
      throw new Error('No text found in the image');
    }

    return text.trim();
  } catch (error) {
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};