const pool = require('../config/db');

class AdminModel {
    static async findByUsername(username) {
        const res = await pool.query('SELECT * FROM admin WHERE Username=$1', [username]);
        return res.rows[0];
    }
}

module.exports = AdminModel;
