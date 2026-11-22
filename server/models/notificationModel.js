const pool = require('../config/db');

class NotificationModel {
    static async create(studentId, type, title, message) {
        await pool.query(
            'INSERT INTO notifications (StudentId,Type,Title,Message) VALUES ($1,$2,$3,$4)',
            [studentId, type, title, message]
        );
    }

    static async findByStudentId(studentId, limit = 50) {
        const res = await pool.query(
            'SELECT * FROM notifications WHERE StudentId=$1 ORDER BY CreatedAt DESC LIMIT $2',
            [studentId, limit]
        );
        return res.rows;
    }

    static async getUnreadCount(studentId) {
        const res = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE StudentId=$1 AND IsRead=0',
            [studentId]
        );
        return +res.rows[0].count;
    }

    static async markAsRead(id) {
        await pool.query('UPDATE notifications SET IsRead=1 WHERE NotifId=$1', [id]);
    }

    static async markAllAsRead(studentId) {
        await pool.query('UPDATE notifications SET IsRead=1 WHERE StudentId=$1', [studentId]);
    }
}

module.exports = NotificationModel;
