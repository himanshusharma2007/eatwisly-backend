const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const scanModel = require("../models/scanModel");
const { s3Client } = require("../middlewares/uploadMiddleware");

exports.getScanHistory = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const scans = await scanModel
      .find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await scanModel.countDocuments({ userId: req.user._id });

    // Generate pre-signed URLs for each scan's image
    const scansWithUrls = await Promise.all(
      scans.map(async (scan) => {
        try {
          // Fix: Remove the leading slash to get proper S3 key
          // If imagePath is "/Uploads/userId/filename.jpg", we want "Uploads/userId/filename.jpg"
          const s3Key = scan.imagePath.replace(/^\//, "");

    

          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET, // Use consistent env variable
            Key: s3Key,
          });

          const url = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
          }); // URL valid for 1 hour

          return { ...scan.toObject(), imageUrl: url };
        } catch (urlError) {
          console.error(
            `Error generating URL for scan ${scan._id}:`,
            urlError.message
          );
          // Return scan without URL if signing fails
          return {
            ...scan.toObject(),
            imageUrl: null,
            urlError: urlError.message,
          };
        }
      })
    );

    res.json({ scans: scansWithUrls, total, page, limit });
  } catch (error) {
    console.error("Error fetching scan history:", error.message);
    res.status(500).json({ message: "Failed to fetch scan history" });
  }
};

exports.getScanById = async (req, res) => {
  try {
    const scan = await scanModel.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // Fix: Remove the leading slash to get proper S3 key
    const s3Key = scan.imagePath.replace(/^\//, "");


    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET, // Use consistent env variable
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour

    res.json({ ...scan.toObject(), imageUrl: url });
  } catch (error) {
    console.error("Error fetching scan:", error.message);
    res.status(500).json({ message: "Failed to fetch scan" });
  }
};

exports.deleteScan = async (req, res) => {
  try {
    const scan = await scanModel.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // Fix: Use scan.imagePath instead of scanModel.imagePath and remove leading slash
    const s3Key = scan.imagePath.replace(/^\//, "");

    // Delete the file from S3 using AWS SDK v3
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET, // Use consistent env variable
      Key: s3Key,
    });
    await s3Client.send(command);


    // Delete the scan from MongoDB
    await scanModel.deleteOne({ _id: req.params.id, userId: req.user._id });

    res.json({ message: "Scan deleted successfully" });
  } catch (error) {
    console.error("Error deleting scan:", error.message); // Debug log
    if (error.name === "AccessDenied") {
      return res
        .status(403)
        .json({
          message:
            "S3 Access Denied: Check IAM permissions for s3:DeleteObject",
        });
    }
    res.status(500).json({ message: "Failed to delete scan" });
  }
};
