const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const TESSERACT_CACHE_PATH = path.resolve(__dirname, '..', 'tesseract_cache');
fs.ensureDirSync(TESSERACT_CACHE_PATH);

const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const isSupportedImage = (mimetype) => SUPPORTED_TYPES.includes(mimetype);

const convertToPngBuffer = async (buffer) => {
  return await sharp(buffer)
    .png({ quality: 100, compressionLevel: 0 })
    .toBuffer();
};

const preprocessImage = async (buffer) => {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width * 2, img.height * 2);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
    data[i] = data[i + 1] = data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer('image/png');
};

exports.processImage = async (file) => {
  try {
    if (!isSupportedImage(file.mimetype)) {
      throw new Error('Unsupported image type. Please upload JPG, PNG, or WebP images.');
    }

    const rawBuffer = file.buffer || await fs.readFile(file.path);
    const pngBuffer = await convertToPngBuffer(rawBuffer);
    const processedBuffer = await preprocessImage(pngBuffer);

    const { data: { text } } = await Tesseract.recognize(
      processedBuffer,
      'eng',
      {
        // logger: (m) => console.log(m),
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
  }
};
