const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: false,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.isSocialLogin;
    },
  },
  isSocialLogin: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  diseases: {
    type: [String],
    default: [],
  },
  allergies: {
    type: [String],
    default: [],
  },
  weight: {
    type: Number,
    required: false,
  },
}, { timestamps: true });

// Password hash before save
userSchema.pre("save", async function (next) {
  // Skip hashing if password is not set (social login) or not modified
  if (!this.isModified("password") || this.password == null) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);