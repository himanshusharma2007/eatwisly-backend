const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const scanModel = require("../models/scanModel");
const { s3Client } = require("../middlewares/uploadMiddleware");
const { Upload } = require('@aws-sdk/lib-storage');
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

    const s3Key = scan.imagePath.replace(/^\//, "");

    try {
      // Delete the file from S3 using AWS SDK v3
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
      });
      await s3Client.send(command);
      
      // Only delete from MongoDB if S3 deletion was successful
      await scanModel.deleteOne({ _id: req.params.id, userId: req.user._id });
      res.json({ message: "Scan deleted successfully" });
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error.message);
      if (s3Error.name === "AccessDenied") {
        return res.status(403).json({
          message: "S3 Access Denied: Check IAM permissions for s3:DeleteObject"
        });
      }
      return res.status(500).json({ 
        message: "Failed to delete file from S3. Scan retained in database." 
      });
    }
  } catch (error) {
    console.error("Error in delete operation:", error.message);
    res.status(500).json({ message: "Server error during delete operation" });
  }
};

exports.saveScanResult = async (req, res) => {
  try {
    console.log('Save scan result invoked, user:', req.user._id);
    const { extractedText } = req.body;
    const file = req.file;
    const analysis = JSON.parse(req.body.analysis.replace(/<\/?[^>]+(>|$)/g, ""));
    if (!file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    if (!extractedText || !analysis || typeof analysis !== 'object') {
      console.error('Invalid scan data:', { extractedText, analysis });
      return res.status(400).json({ message: 'Invalid scan data provided' });
    }

    // Validate analysis structure
    if (!Array.isArray(analysis.recommendations) || 
        analysis.recommendations.some(rec => !rec.type || !rec.title || !rec.message)) {
      console.error('Invalid recommendations structure:', analysis.recommendations);
      return res.status(400).json({ message: 'Invalid analysis recommendations structure' });
    }

    if (!Array.isArray(analysis.harmfulIngredients)) {
      console.error('Validation failed: harmfulIngredients is not an array:', analysis.harmfulIngredients);
      return res.status(400).json({ message: 'Invalid analysis: harmfulIngredients must be an array' });
    }

    if (!analysis.nutritionalInfo || 
        typeof analysis.nutritionalInfo.totalSugar !== 'number' ||
        typeof analysis.nutritionalInfo.totalSodium !== 'number') {
      console.error('Invalid nutritionalInfo structure:', analysis.nutritionalInfo);
      return res.status(400).json({ message: 'Invalid nutritional information structure' });
    }

    // Construct S3 key
    const userId = req.user._id.toString();
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${timestamp}_${sanitizedFilename}`;
    const s3Key = `Uploads/${userId}/${filename}`;

    // Upload to S3
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype
      }
    });

    await upload.done();

    // Construct S3 URL and relative path
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    const relativePath = `/${s3Key}`;

    // Save to MongoDB
    const scan = new scanModel({
      userId: req.user._id,
      imagePath: relativePath,
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
    await scan.save();

    res.json({
      message: 'Scan result saved successfully',
      imagePath: s3Url,
      scanId: scan._id
    });
  } catch (error) {
    console.error('Save scan result error:', error.message);
    if (error.name === 'AccessDenied') {
      return res.status(403).json({ message: 'S3 Access Denied: Check IAM permissions for s3:PutObject' });
    }
    res.status(500).json({ message: `Failed to save scan result: ${error.message}` });
  }
};