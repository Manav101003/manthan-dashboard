const express = require('express');
const router = express.Router();
const SettingController = require('../controllers/settingController');
const { qrUpload } = require('../middlewares/uploadMiddleware');

router.get('/settings', SettingController.getSettings);
router.post('/settings', SettingController.saveSettings);
router.post('/settings/qr', qrUpload.single('qr'), SettingController.uploadQr);

module.exports = router;
