const pool = require('../config/db');

class ReminderModel {
    static async findUnread() {
        const res = await pool.query('SELECT * FROM reminders WHERE IsRead=0 ORDER BY CreatedAt DESC');
        return res.rows;
    }

    static async markAsRead(id) {
        await pool.query('UPDATE reminders SET IsRead=1 WHERE ReminderId=$1', [id]);
    }
}

module.exports = ReminderModel;
