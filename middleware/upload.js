// Multer config for resume upload (Supabase memory storage)

const multer = require('multer');

const storage = multer.memoryStorage(); // Store file in memory for Supabase upload

const upload = multer({ storage });

module.exports = upload;
