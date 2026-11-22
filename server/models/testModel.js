const pool = require('../config/db');

class TestModel {
    static async findAll() {
        const query = `
            SELECT t.*, b.BatchName, b.Class,
            (SELECT COUNT(*) FROM test_questions q WHERE q.TestId=t.TestId) as QuestionCount,
            (SELECT COUNT(*) FROM test_attempts ta WHERE ta.TestId=t.TestId) as AttemptCount
            FROM tests t LEFT JOIN batches b ON t.BatchId=b.BatchId ORDER BY t.TestDate DESC
        `;
        const res = await pool.query(query);
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query('SELECT * FROM tests WHERE TestId=$1', [id]);
        return res.rows[0];
    }

    static async findByIdWithBatch(id) {
        const res = await pool.query(
            'SELECT t.*, b.BatchName FROM tests t LEFT JOIN batches b ON t.BatchId=b.BatchId WHERE t.TestId=$1',
            [id]
        );
        return res.rows[0];
    }

    static async create(data, filePath, driveLink, maxMarks) {
        const res = await pool.query(
            'INSERT INTO tests (BatchId,Subject,TestName,TestDate,TestTime,MaximumMarks,Duration,Description,FilePath,DriveLink,TestType) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING TestId',
            [
                data.BatchId ? parseInt(data.BatchId) : null,
                data.Subject,
                data.TestName,
                data.TestDate,
                data.TestTime || null,
                maxMarks,
                data.Duration || null,
                data.Description || null,
                filePath,
                driveLink,
                data.TestType === 'MCQ' ? 'MCQ' : 'Paper'
            ]
        );
        return res.rows[0].testid;
    }

    static async update(id, fields, vals) {
        if (!fields.length) return;
        await pool.query('UPDATE tests SET ' + fields.join(',') + ' WHERE TestId=$' + (fields.length + 1), [...vals, id]);
    }

    static async delete(id) {
        await pool.query('DELETE FROM test_attempts WHERE TestId=$1', [id]);
        await pool.query('DELETE FROM test_questions WHERE TestId=$1', [id]);
        await pool.query('DELETE FROM results WHERE TestId=$1', [id]);
        await pool.query('DELETE FROM tests WHERE TestId=$1', [id]);
    }

    static async findQuestions(testId) {
        const res = await pool.query(
            'SELECT * FROM test_questions WHERE TestId=$1 ORDER BY OrderIndex, QuestionId',
            [testId]
        );
        return res.rows;
    }

    static async findQuestionsForQuiz(testId) {
        const res = await pool.query(
            'SELECT QuestionId,QuestionText,OptionA,OptionB,OptionC,OptionD,Marks,OrderIndex FROM test_questions WHERE TestId=$1 ORDER BY OrderIndex, QuestionId',
            [testId]
        );
        return res.rows;
    }

    static async createQuestion(testId, questionText, optionA, optionB, optionC, optionD, correctOption, marks, orderIndex) {
        const res = await pool.query(
            'INSERT INTO test_questions (TestId,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectOption,Marks,OrderIndex) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING QuestionId',
            [testId, questionText, optionA, optionB, optionC, optionD, correctOption, marks, orderIndex]
        );
        return res.rows[0].questionid;
    }

    static async getQuestionCount(testId) {
        const res = await pool.query('SELECT COUNT(*) as c FROM test_questions WHERE TestId=$1', [testId]);
        return +res.rows[0].c;
    }

    static async getQuestionMarksSum(testId) {
        const res = await pool.query('SELECT COALESCE(SUM(Marks),0) as total FROM test_questions WHERE TestId=$1', [testId]);
        return +res.rows[0].total;
    }

    static async findQuestionById(qid) {
        const res = await pool.query('SELECT * FROM test_questions WHERE QuestionId=$1', [qid]);
        return res.rows[0];
    }

    static async deleteQuestion(qid) {
        await pool.query('DELETE FROM test_questions WHERE QuestionId=$1', [qid]);
    }

    static async updateTestMaxMarks(testId, maxMarks, testType = 'MCQ') {
        await pool.query("UPDATE tests SET TestType=$1, MaximumMarks=$2 WHERE TestId=$3", [testType, maxMarks, testId]);
    }

    static async findAttempt(testId, studentId) {
        const res = await pool.query(
            'SELECT AttemptId,Score,TotalMarks,CorrectCount,TotalQuestions,SubmittedAt FROM test_attempts WHERE TestId=$1 AND StudentId=$2',
            [testId, studentId]
        );
        return res.rows[0];
    }

    static async createAttempt(testId, studentId, answersJson, score, totalMarks, correctCount, totalQuestions) {
        await pool.query(
            'INSERT INTO test_attempts (TestId,StudentId,Answers,Score,TotalMarks,CorrectCount,TotalQuestions) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [testId, studentId, answersJson, score, totalMarks, correctCount, totalQuestions]
        );
    }

    static async findAttemptsByTestId(testId) {
        const res = await pool.query(
            'SELECT ta.*, s.FullName, s.Class FROM test_attempts ta JOIN students s ON ta.StudentId=s.StudentId WHERE ta.TestId=$1 ORDER BY ta.Score DESC',
            [testId]
        );
        return res.rows;
    }

    static async deleteAttempts(testId) {
        const r = await pool.query('DELETE FROM test_attempts WHERE TestId=$1', [testId]);
        return r.rowCount;
    }
}

module.exports = TestModel;
