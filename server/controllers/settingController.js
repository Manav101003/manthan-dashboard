const SettingModel = require('../models/settingModel');
const { CLASS_LIST } = require('../utils/constants');

class SettingController {
    static async getSettings(req, res) {
        try {
            const s = await SettingModel.getSettings();
            s.classes = CLASS_LIST;
            res.json(s);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async saveSettings(req, res) {
        try {
            await SettingModel.saveSettings(req.body || {});
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async uploadQr(req, res) {
        try {
            if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
            const url = '/uploads/qr/' + req.file.filename;
            await SettingModel.saveSettings({ qrImage: url });
            res.json({ success: true, qrImage: url });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = SettingController;
