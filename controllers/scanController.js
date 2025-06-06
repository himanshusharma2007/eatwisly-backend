const Scan = require('../models/scanModel');
const fs = require('fs-extra');

exports.getScanHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const scans = await Scan.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Scan.countDocuments({ userId: req.user._id });

    res.json({ scans, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get scan history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getScanById = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    res.json({ scan });
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    // Delete image file
    await fs.remove(scan.imagePath);

    await scan.remove();
    res.json({ message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Delete scan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};