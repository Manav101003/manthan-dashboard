const pool = require('../config/db');

class HomeworkModel {
    static async findAll() {
        const res = await pool.query(
            'SELECT h.*, b.BatchName, b.Class, t.Name as TeacherName FROM homework h LEFT JOIN batches b ON h.BatchId=b.BatchId LEFT JOIN teachers t ON h.TeacherId=t.TeacherId ORDER BY h.DueDate DESC'
        );
        return res.rows;
    }

    static async create(data) {
        await pool.query(
            'INSERT INTO homework (BatchId,TeacherId,Title,Description,Subject,DueDate) VALUES ($1,$2,$3,$4,$5,$6)',
            [data.BatchId, data.TeacherId, data.Title, data.Description, data.Subject, data.DueDate]
        );
    }

    static async delete(id) {
        await pool.query('DELETE FROM homework WHERE HomeworkId=$1', [id]);
    }
}

module.exports = HomeworkModel;
