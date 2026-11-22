const pool = require('../config/db');

class ResultModel {
    static async findAll(studentId = null) {
        const base = `
            SELECT r.*, s.FullName, s.Class, s.BatchId, t.TestName, t.Subject, t.MaximumMarks, t.TestDate, b.BatchName
            FROM results r
            JOIN students s ON r.StudentId=s.StudentId
            JOIN tests t ON r.TestId=t.TestId
            LEFT JOIN batches b ON s.BatchId=b.BatchId
        `;
        if (studentId) {
            const res = await pool.query(base + ' WHERE r.StudentId=$1 ORDER BY t.TestDate DESC', [studentId]);
            return res.rows;
        }
        const res = await pool.query(base + ' ORDER BY s.Class, t.TestDate DESC');
        return res.rows;
    }

    static async upsert(studentId, testId, marksObtained, grade, remarks) {
        await pool.query(
            `INSERT INTO results (StudentId,TestId,MarksObtained,Grade,Remarks)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (StudentId,TestId)
             DO UPDATE SET MarksObtained=EXCLUDED.MarksObtained,Grade=EXCLUDED.Grade,Remarks=EXCLUDED.Remarks`,
            [studentId, testId, marksObtained, grade, remarks]
        );
    }

    static async deleteByTestId(testId, autoGradedOnly = false) {
        if (autoGradedOnly) {
            const r = await pool.query("DELETE FROM results WHERE TestId=$1 AND Remarks='Auto-graded online test'", [testId]);
            return r.rowCount;
        }
        const r = await pool.query('DELETE FROM results WHERE TestId=$1', [testId]);
        return r.rowCount;
    }

    static async deleteById(id) {
        await pool.query('DELETE FROM results WHERE ResultId=$1', [id]);
    }
}

module.exports = ResultModel;
