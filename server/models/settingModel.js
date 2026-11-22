const pool = require('../config/db');
const { DEFAULT_SETTINGS } = require('../utils/constants');

class SettingModel {
    static async getSettings() {
        const out = Object.assign({}, DEFAULT_SETTINGS);
        try {
            const rows = (await pool.query('SELECT SettingKey, SettingValue FROM settings')).rows;
            for (const r of rows) out[r.settingkey] = r.settingvalue;
        } catch (e) {
            /* table may not exist yet during first boot */
        }
        if (!out.upiId && process.env.UPI_ID) out.upiId = process.env.UPI_ID;
        if (!out.upiName && process.env.UPI_NAME) out.upiName = process.env.UPI_NAME;
        return out;
    }

    static async saveSettings(obj) {
        const allowed = ['instituteName', 'address', 'phone', 'email', 'upiId', 'upiName', 'qrImage'];
        for (const k of allowed) {
            if (obj[k] !== undefined) {
                await pool.query(
                    'INSERT INTO settings (SettingKey, SettingValue) VALUES ($1,$2) ON CONFLICT (SettingKey) DO UPDATE SET SettingValue=EXCLUDED.SettingValue',
                    [k, obj[k] == null ? '' : String(obj[k])]
                );
            }
        }
    }
}

module.exports = SettingModel;
