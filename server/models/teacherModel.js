const pool = require('../config/db');

class TeacherModel {
    static async findAll() {
        const res = await pool.query('SELECT * FROM teachers ORDER BY Name');
        return res.rows;
    }

    static async create(data) {
        const res = await pool.query(
            'INSERT INTO teachers (Name,Subject,Phone,Email,Username,Password) VALUES ($1,$2,$3,$4,$5,$6) RETURNING TeacherId',
            [
                data.Name,
                data.Subject,
                data.Phone,
                data.Email,
                data.Username,
                data.Password || 'teacher123'
            ]
        );
        return res.rows[0].teacherid;
    }

    static async update(id, data) {
        await pool.query(
            'UPDATE teachers SET Name=$1,Subject=$2,Phone=$3,Email=$4,Status=$5 WHERE TeacherId=$6',
            [data.Name, data.Subject, data.Phone, data.Email, data.Status || 'Active', id]
        );
    }

    static async delete(id) {
        await pool.query('UPDATE batches SET TeacherId=NULL WHERE TeacherId=$1', [id]);
        await pool.query('UPDATE homework SET TeacherId=NULL WHERE TeacherId=$1', [id]);
        await pool.query('UPDATE timetable SET TeacherId=NULL WHERE TeacherId=$1', [id]);
        await pool.query('DELETE FROM teachers WHERE TeacherId=$1', [id]);
    }
}

module.exports = TeacherModel;
