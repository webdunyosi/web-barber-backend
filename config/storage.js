const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'shu_yerga_yozasiz' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'shu_yerga_yozasiz' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'shu_yerga_yozasiz';

let storage;
let uploadType = 'local';

if (isCloudinaryConfigured) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'barber_receipts',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        public_id: (req, file) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          return 'receipt-' + uniqueSuffix;
        }
      }
    });
    uploadType = 'cloudinary';
    console.log('☁️ Storage: Cloudinary configured successfully.');
  } catch (error) {
    console.error('❌ Cloudinary configuration failed, falling back to local storage:', error.message);
  }
}

if (uploadType === 'local') {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'uploads/';
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  console.log('📂 Storage: Cloudinary credentials missing or placeholders. Using Local Storage fallback.');
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = {
  upload,
  uploadType,
  cloudinary
};
