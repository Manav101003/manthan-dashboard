const pool = require('../config/db');

class StudentModel {
    static async findByUsername(username) {
        const res = await pool.query(
            "SELECT * FROM students WHERE Username=$1 AND Status='Active'",
            [username]
        );
        return res.rows[0];
    }

    static async findAll() {
        const query = `
            SELECT s.*, b.BatchName, b.MonthlyFee,
            (SELECT STRING_AGG(b2.BatchName, ', ') FROM student_batches sb JOIN batches b2 ON sb.BatchId=b2.BatchId WHERE sb.StudentId=s.StudentId) as AllBatches
            FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId ORDER BY s.FullName
        `;
        const res = await pool.query(query);
        return res.rows;
    }

    static async findById(id) {
        const query = `
            SELECT s.*, b.BatchName, b.MonthlyFee,
            (SELECT STRING_AGG(b2.BatchName, ', ') FROM student_batches sb JOIN batches b2 ON sb.BatchId=b2.BatchId WHERE sb.StudentId=s.StudentId) as AllBatches
            FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId WHERE s.StudentId=$1
        `;
        const res = await pool.query(query, [id]);
        return res.rows[0];
    }

    static async findByBatchId(batchId) {
        const query = `
            SELECT s.StudentId, s.FullName, s.Class
            FROM student_batches sb JOIN students s ON sb.StudentId=s.StudentId
            WHERE sb.BatchId=$1 AND s.Status='Active' ORDER BY s.FullName
        `;
        const res = await pool.query(query, [batchId]);
        return res.rows;
    }

    static async findBatchIdsForStudent(studentId) {
        const res = await pool.query('SELECT BatchId FROM student_batches WHERE StudentId=$1', [studentId]);
        return res.rows;
    }

    static async findActive() {
        const res = await pool.query("SELECT StudentId, FullName, Class FROM students WHERE Status='Active'");
        return res.rows;
    }

    static async create(data, primaryBatch) {
        const res = await pool.query(
            `INSERT INTO students (FullName,FatherName,MotherName,StudentPhone,ParentPhone,Address,Class,DateOfBirth,BatchId,Username,Password,Gender)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING StudentId`,
            [
                data.FullName,
                data.FatherName,
                data.MotherName,
                data.StudentPhone,
                data.ParentPhone,
                data.Address,
                data.Class,
                data.DateOfBirth,
                primaryBatch,
                data.Username,
                data.Password || 'student123',
                data.Gender
            ]
        );
        return res.rows[0].studentid;
    }

    static async enrollInBatches(studentId, batchIds) {
        for (const bid of batchIds) {
            await pool.query(
                'INSERT INTO student_batches (StudentId, BatchId) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [studentId, bid]
            );
        }
    }

    static async update(id, data, primaryBatch) {
        await pool.query(
            `UPDATE students
             SET FullName=$1,FatherName=$2,MotherName=$3,StudentPhone=$4,ParentPhone=$5,Address=$6,Class=$7,DateOfBirth=$8,BatchId=$9,Gender=$10,Status=$11
             WHERE StudentId=$12`,
            [
                data.FullName,
                data.FatherName,
                data.MotherName,
                data.StudentPhone,
                data.ParentPhone,
                data.Address,
                data.Class,
                data.DateOfBirth,
                primaryBatch,
                data.Gender,
                data.Status || 'Active',
                id
            ]
        );
    }

    static async syncStudentBatches(studentId, batchIds) {
        await pool.query('DELETE FROM student_batches WHERE StudentId=$1', [studentId]);
        for (const bid of batchIds) {
            await pool.query(
                'INSERT INTO student_batches (StudentId, BatchId) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [studentId, bid]
            );
        }
    }

    static async delete(id) {
        await pool.query('DELETE FROM test_attempts WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM student_batches WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM attendance WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM payment_requests WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM fees WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM results WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM notifications WHERE StudentId=$1', [id]);
        await pool.query('DELETE FROM students WHERE StudentId=$1', [id]);
    }
}

module.exports = StudentModel;
