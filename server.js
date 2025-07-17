const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./db/connectDB");
const userRoutes = require("./routers/userRouter");
const adminRoutes = require("./routers/adminRouter");
const scanRoutes = require("./routers/scanRouter");
const feedbackRoutes = require("./routers/feedbackRouter");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://eatwisely.vercel.app"], // Replace with your frontend's URL
    credentials: true, // Allow cookies to be sent
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", userRoutes);
app.use("/api", adminRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/feedback", feedbackRoutes);
// Basic route
app.get("/", (req, res) => {
  res.send("Welcome to the EatWisly API!");
});

// Start server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on http://localhost:${PORT}`);
});
