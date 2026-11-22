const pool = require('../config/db');

class AttendanceModel {
    static async find({ date, batchId, studentId } = {}) {
        let q = `
            SELECT a.*, s.FullName, s.Class, b.BatchName
            FROM attendance a
            JOIN students s ON a.StudentId=s.StudentId
            LEFT JOIN batches b ON a.BatchId=b.BatchId
            WHERE 1=1
        `;
        const p = [];
        let n = 0;
        if (date) { n++; q += ' AND a.Date=$' + n; p.push(date); }
        if (batchId) { n++; q += ' AND a.BatchId=$' + n; p.push(batchId); }
        if (studentId) { n++; q += ' AND a.StudentId=$' + n; p.push(studentId); }
        q += ' ORDER BY a.Date DESC, s.FullName';

        const res = await pool.query(q, p);
        return res.rows;
    }

    static async markRecord(r) {
        await pool.query(
            'INSERT INTO attendance (StudentId,BatchId,Date,Status,MarkedBy) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (StudentId,BatchId,Date) DO UPDATE SET Status=EXCLUDED.Status',
            [r.StudentId, r.BatchId, r.Date, r.Status, r.MarkedBy || 1]
        );
    }
}

module.exports = AttendanceModel;
