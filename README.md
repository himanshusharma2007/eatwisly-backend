# EatWisely - Backend

This is the backend server for **EatWisely**, built using Node.js and Express. It supports OCR-based food label scanning, AI-based ingredient analysis, user management, and admin tools.

## 🚀 Live API

Hosted on Render or other cloud server [(link here)](https://eatwisly-backend.onrender.com).

## ✨ Features

* User Authentication with JWT
* Image upload using Multer and S3
* Text recognition using Tesseract.js
* AI analysis with Google Gemini API
* Scan history and detailed results
* Admin routes for managing users and feedback
* Feedback submission by users

## 🧑‍💻 Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* Multer + S3 (AWS SDK)
* Tesseract.js
* Sharp (image optimization)
* Cookie-parser, bcrypt, dotenv, cors

## 📁 Folder Structure

```
root/
├── controllers/
├── models/
├── routers/
│   ├── userRouter.js
│   ├── adminRouter.js
│   ├── scanRouter.js
│   └── feedbackRouter.js
├── db/
│   └── connectDB.js
├── server.js
├── .env
```

## 📦 Installation

```bash
git clone https://github.com/himanshusharma2007/eatwisly-backend
cd eatwisly-backend
npm install
npm run server
```

## 🌐 API Endpoints

| Method | Endpoint               | Description                    | Protected |
| ------ | ---------------------- | ------------------------------ | --------- |
| POST   | `/api/auth/signup`     | Register new user              | No        |
| POST   | `/api/auth/login`      | Login existing user            | No        |
| GET    | `/api/auth/me`         | Get logged-in user info        | Yes       |
| POST   | `/api/scan/image`      | Upload and analyze image       | Yes       |
| GET    | `/api/scan/history`    | Get scan history for user      | Yes       |
| GET    | `/api/scan/:id`        | Get scan detail by ID          | Yes       |
| POST   | `/api/feedback`        | Submit feedback                | Yes       |
| GET    | `/api/admin/users`     | Get all users (admin only)     | Admin     |
| GET    | `/api/admin/feedbacks` | Get all feedbacks (admin only) | Admin     |

## 🛠 Environment Variables

Create a `.env` file:

```env
PORT=3000
MONGO_URI=your_mongo_connection
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=your_bucket_name
FIREBASE_API_KEY=your_firebase_api_key
```

## 📄 License

MIT
