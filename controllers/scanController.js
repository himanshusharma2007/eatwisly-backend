const Scan = require('../models/scanModel');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const {s3Client}  = require('../middlewares/uploadMiddleware');

exports.getScanHistory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const scans = await Scan.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Scan.countDocuments({ userId: req.user._id });
    res.json({ scans, total, page, limit });
  } catch (error) {
    console.error('Error fetching scan history:', error.message); // Debug log
    res.status(500).json({ message: 'Failed to fetch scan history' });
  }
};

exports.getScanById = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }
    res.json(scan);
  } catch (error) {
    console.error('Error fetching scan:', error.message); // Debug log
    res.status(500).json({ message: 'Failed to fetch scan' });
  }
};

exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // Extract the S3 key from imagePath (remove the leading /Uploads/ to match S3 key)
    const s3Key = scan.imagePath.replace(/^\/Uploads\//, '');
    console.log(`Deleting file from S3: ${s3Key}`); // Debug log

    // Delete the file from S3 using AWS SDK v3
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key
    });
    await s3Client.send(command);

    console.log(`Successfully deleted file from S3: ${s3Key}`); // Debug log

    // Delete the scan from MongoDB
    await Scan.deleteOne({ _id: req.params.id, userId: req.user._id });
    console.log('Scan deleted from MongoDB, ID:', req.params.id); // Debug log

    res.json({ message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan:', error.message); // Debug log
    if (error.name === 'AccessDenied') {
      return res.status(403).json({ message: 'S3 Access Denied: Check IAM permissions for s3:DeleteObject' });
    }
    res.status(500).json({ message: 'Failed to delete scan' });
  }
};