const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Multer setup for test file uploads
const testUploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'tests');
if (!fs.existsSync(testUploadDir)) fs.mkdirSync(testUploadDir, { recursive: true });

const testStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, testUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').replace(ext, '');
        cb(null, 'test_' + Date.now() + '_' + safeName + ext);
    }
});

const testUpload = multer({
    storage: testStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PDF, Word, and image files are allowed'));
    }
});

// Multer setup for payment QR uploads
const qrUploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'qr');
if (!fs.existsSync(qrUploadDir)) fs.mkdirSync(qrUploadDir, { recursive: true });

const qrUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, qrUploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, 'qr_' + Date.now() + ext);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PNG, JPG or WEBP images are allowed'));
    }
});

module.exports = {
    testUpload,
    qrUpload
};
