const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB  = require('./db/connectDB');
const userRoutes = require('./routers/userRouter');
const adminRoutes = require('./routers/adminRouter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', userRoutes);
app.use('/api', adminRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to the EatWisly API!');
});

// Start server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on http://localhost:${PORT}`);
});