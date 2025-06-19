// Multer config for resume upload

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use /tmp/uploads for Railway or fallback to local uploads
    const uploadPath = process.env.UPLOADS_PATH || path.resolve('/tmp/uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use a unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

module.exports = upload;
