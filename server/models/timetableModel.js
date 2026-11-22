const pool = require('../config/db');

class TimetableModel {
    static async findAll(batchId = null) {
        let q = 'SELECT tt.*, b.BatchName, t.Name as TeacherName FROM timetable tt LEFT JOIN batches b ON tt.BatchId=b.BatchId LEFT JOIN teachers t ON tt.TeacherId=t.TeacherId';
        const p = [];
        if (batchId) {
            q += ' WHERE tt.BatchId=$1';
            p.push(batchId);
        }
        q += ' ORDER BY tt.Day, tt.StartTime';
        const res = await pool.query(q, p);
        return res.rows;
    }

    static async create(data) {
        await pool.query(
            'INSERT INTO timetable (BatchId,Day,Subject,StartTime,EndTime,TeacherId,Room) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [data.BatchId, data.Day, data.Subject, data.StartTime, data.EndTime, data.TeacherId || null, data.Room]
        );
    }
}

module.exports = TimetableModel;
