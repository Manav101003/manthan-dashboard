const pool = require('../config/db');

class BatchModel {
    static async findAll() {
        const query = `
            SELECT b.*, t.Name as TeacherName,
            (SELECT COUNT(*) FROM student_batches sb JOIN students s ON sb.StudentId=s.StudentId
                WHERE sb.BatchId=b.BatchId AND s.Status='Active') as StudentCount
            FROM batches b LEFT JOIN teachers t ON b.TeacherId=t.TeacherId ORDER BY b.Class
        `;
        const res = await pool.query(query);
        return res.rows;
    }

    static async findByClass(classVal) {
        const res = await pool.query('SELECT BatchId, Subject FROM batches WHERE Class=$1', [classVal]);
        return res.rows;
    }

    static async create(data) {
        const r = await pool.query(
            'INSERT INTO batches (BatchName,Class,Subject,Timing,TeacherId,MonthlyFee) VALUES ($1,$2,$3,$4,$5,$6) RETURNING BatchId',
            [data.BatchName, data.Class, data.Subject, data.Timing, data.TeacherId || null, data.MonthlyFee || 0]
        );
        const batchId = r.rows[0].batchid;

        // Allot students of this class who were added before any batch existed
        await pool.query(`INSERT INTO student_batches (StudentId, BatchId)
            SELECT s.StudentId, $1 FROM students s
            WHERE s.Class=$2 AND s.BatchId IS NULL
              AND NOT EXISTS (SELECT 1 FROM student_batches sb WHERE sb.StudentId=s.StudentId)
            ON CONFLICT DO NOTHING`, [batchId, data.Class]);

        await pool.query(`UPDATE students SET BatchId=$1
            WHERE Class=$2 AND BatchId IS NULL
              AND EXISTS (SELECT 1 FROM student_batches sb WHERE sb.StudentId=students.StudentId AND sb.BatchId=$1)`, [batchId, data.Class]);

        return batchId;
    }

    static async update(id, data) {
        await pool.query(
            'UPDATE batches SET BatchName=$1,Class=$2,Subject=$3,Timing=$4,TeacherId=$5,MonthlyFee=$6,Status=$7 WHERE BatchId=$8',
            [data.BatchName, data.Class, data.Subject, data.Timing, data.TeacherId, data.MonthlyFee, data.Status || 'Active', id]
        );
    }

    static async delete(id) {
        await pool.query('UPDATE students SET BatchId=NULL WHERE BatchId=$1', [id]);
        await pool.query('DELETE FROM student_batches WHERE BatchId=$1', [id]);
        await pool.query('DELETE FROM attendance WHERE BatchId=$1', [id]);
        await pool.query('DELETE FROM timetable WHERE BatchId=$1', [id]);
        await pool.query('DELETE FROM homework WHERE BatchId=$1', [id]);

        const tIds = (await pool.query('SELECT TestId FROM tests WHERE BatchId=$1', [id])).rows;
        for (const t of tIds) {
            await pool.query('DELETE FROM results WHERE TestId=$1', [t.testid]);
        }
        await pool.query('DELETE FROM tests WHERE BatchId=$1', [id]);
        await pool.query('DELETE FROM batches WHERE BatchId=$1', [id]);
    }
}

module.exports = BatchModel;
