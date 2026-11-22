const pool = require('../config/db');

class NoticeModel {
    static async findAll() {
        const res = await pool.query('SELECT * FROM notices ORDER BY PublishDate DESC');
        return res.rows;
    }

    static async create(data) {
        await pool.query(
            'INSERT INTO notices (Title,Description,Audience,Priority,PostedBy) VALUES ($1,$2,$3,$4,$5)',
            [data.Title, data.Description, data.Audience || 'All', data.Priority || 'Normal', 'Admin']
        );
    }

    static async delete(id) {
        await pool.query('DELETE FROM notices WHERE NoticeId=$1', [id]);
    }
}

module.exports = NoticeModel;
