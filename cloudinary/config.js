const cloudinary = require("cloudinary");
require("dotenv").config(); // Load environment variables from .env file

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

module.exports = cloudinary;
