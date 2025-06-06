const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const connectDB = require('./db/connectDB');
const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to the Express server!');
});

// Start the server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on http://localhost:${PORT}`);
});