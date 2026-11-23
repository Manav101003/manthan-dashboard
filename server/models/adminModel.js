const pool = require('../config/db');

class AdminModel {
    static async findByUsername(username) {
        const res = await pool.query('SELECT * FROM admin WHERE Username=$1', [username]);
        return res.rows[0];
    }

    static async updatePassword(adminId, newPassword) {
        await pool.query('UPDATE admin SET PasswordHash=$1 WHERE AdminId=$2', [String(newPassword).trim(), adminId]);
    }
}

module.exports = AdminModel;
