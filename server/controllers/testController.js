const TestModel = require('../models/testModel');
const StudentModel = require('../models/studentModel');
const ResultModel = require('../models/resultModel');
const { norm, normOne } = require('../views/responseView');
const { today, gradeForPct, cleanDriveLink } = require('../utils/helpers');
const { notify, notifyBatch, notifyAdmin, getIO } = require('../services/socketService');

class TestController {
    static async getAll(req, res) {
        try {
            const rows = await TestModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const filePath = req.file ? '/uploads/tests/' + req.file.filename : null;
            const testType = d.TestType === 'MCQ' ? 'MCQ' : 'Paper';
            let questions = [];
            if (d.Questions) {
                try {
                    questions = typeof d.Questions === 'string' ? JSON.parse(d.Questions) : d.Questions;
                } catch (e) {
                    questions = [];
                }
                if (!Array.isArray(questions)) questions = [];
            }
            questions = questions.filter(q => q && String(q.QuestionText || '').trim());

            let maxMarks = parseInt(d.MaximumMarks) || 100;
            if (testType === 'MCQ' && questions.length) {
                maxMarks = questions.reduce((sum, q) => sum + (parseFloat(q.Marks) || 1), 0);
            }
            const driveLink = cleanDriveLink(d.DriveLink);
            const batchId = d.BatchId ? parseInt(d.BatchId) : null;

            const testId = await TestModel.create({
                ...d,
                TestDate: d.TestDate || today(),
                TestType: testType
            }, filePath, driveLink, maxMarks);

            let order = 0;
            for (const q of questions) {
                const correct = ['A', 'B', 'C', 'D'].includes(String(q.CorrectOption || '').toUpperCase())
                    ? String(q.CorrectOption).toUpperCase()
                    : 'A';
                await TestModel.createQuestion(
                    testId,
                    String(q.QuestionText).trim(),
                    q.OptionA || '',
                    q.OptionB || '',
                    q.OptionC || '',
                    q.OptionD || '',
                    correct,
                    parseFloat(q.Marks) || 1,
                    order++
                );
            }

            if (batchId) {
                await notifyBatch(
                    batchId,
                    'test',
                    'New Test: ' + d.TestName,
                    (d.Subject || '') + ' test on ' + (d.TestDate || today()) + '. Max marks: ' + maxMarks
                );
            }

            const io = getIO();
            if (io) io.emit('test_updated');

            res.json({ success: true, id: testId, questions: questions.length, maximumMarks: maxMarks });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async update(req, res) {
        const d = req.body;
        try {
            const fields = [];
            const vals = [];
            let n = 0;
            const map = {
                TestName: 'TestName',
                Subject: 'Subject',
                TestDate: 'TestDate',
                TestTime: 'TestTime',
                Duration: 'Duration',
                Description: 'Description',
                Status: 'Status',
                DriveLink: 'DriveLink'
            };
            for (const key of Object.keys(map)) {
                if (d[key] !== undefined) {
                    n++;
                    fields.push(map[key] + '=$' + n);
                    vals.push(key === 'DriveLink' ? cleanDriveLink(d[key]) : d[key]);
                }
            }

            if (!fields.length) return res.json({ success: true });

            await TestModel.update(req.params.id, fields, vals);

            const io = getIO();
            if (io) io.emit('test_updated');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async getQuestions(req, res) {
        try {
            const rows = await TestModel.findQuestions(req.params.id);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async addQuestion(req, res) {
        const d = req.body;
        try {
            const testId = req.params.id;
            if (!d.QuestionText || !String(d.QuestionText).trim()) {
                return res.status(400).json({ success: false, error: 'Question text is required' });
            }

            const correct = ['A', 'B', 'C', 'D'].includes(String(d.CorrectOption || '').toUpperCase())
                ? String(d.CorrectOption).toUpperCase()
                : 'A';

            const count = await TestModel.getQuestionCount(testId);
            const questionId = await TestModel.createQuestion(
                testId,
                String(d.QuestionText).trim(),
                d.OptionA || '',
                d.OptionB || '',
                d.OptionC || '',
                d.OptionD || '',
                correct,
                parseFloat(d.Marks) || 1,
                count
            );

            const totalMarks = await TestModel.getQuestionMarksSum(testId);
            await TestModel.updateTestMaxMarks(testId, totalMarks, 'MCQ');

            const io = getIO();
            if (io) io.emit('test_updated');

            res.json({ success: true, id: questionId, maximumMarks: totalMarks });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async deleteQuestion(req, res) {
        try {
            const q = await TestModel.findQuestionById(req.params.qid);
            await TestModel.deleteQuestion(req.params.qid);

            if (q) {
                const testId = q.testid || q.TestId;
                const totalMarks = await TestModel.getQuestionMarksSum(testId);
                await TestModel.updateTestMaxMarks(testId, totalMarks);
            }

            const io = getIO();
            if (io) io.emit('test_updated');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async getQuiz(req, res) {
        const studentId = req.query.studentId ? parseInt(req.query.studentId) : null;
        try {
            const test = await TestModel.findByIdWithBatch(req.params.id);
            if (!test) return res.status(404).json({ error: 'Test not found' });

            const questions = await TestModel.findQuestionsForQuiz(req.params.id);
            let attempt = null;
            if (studentId) {
                attempt = await TestModel.findAttempt(req.params.id, studentId);
            }

            res.json({
                test: normOne(test),
                questions: norm(questions),
                attempt: attempt ? normOne(attempt) : null,
                maxMarks: +(test.maximummarks || test.MaximumMarks)
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async submitQuiz(req, res) {
        const { StudentId, Answers } = req.body;
        try {
            if (!StudentId) return res.status(400).json({ success: false, error: 'StudentId is required' });

            const test = await TestModel.findById(req.params.id);
            if (!test) return res.status(404).json({ success: false, error: 'Test not found' });

            const existing = await TestModel.findAttempt(req.params.id, StudentId);
            if (existing) {
                return res.json({
                    success: false,
                    alreadySubmitted: true,
                    attempt: normOne(existing),
                    message: 'You have already submitted this test.'
                });
            }

            const questions = await TestModel.findQuestions(req.params.id);
            if (!questions.length) return res.status(400).json({ success: false, error: 'This test has no questions yet' });

            const answers = Answers && typeof Answers === 'object' ? Answers : {};
            let score = 0, totalMarks = 0, correctCount = 0;
            const review = [];

            for (const q of questions) {
                const qMarks = parseFloat(q.marks || q.Marks) || 1;
                totalMarks += qMarks;

                const qId = q.questionid || q.QuestionId;
                const correctOpt = q.correctoption || q.CorrectOption;
                const given = String(answers[String(qId)] || '').toUpperCase();
                const isCorrect = given === String(correctOpt).toUpperCase();

                if (isCorrect) {
                    score += qMarks;
                    correctCount++;
                }

                review.push({
                    QuestionId: qId,
                    Given: given || null,
                    CorrectOption: correctOpt,
                    IsCorrect: isCorrect
                });
            }

            const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
            const grade = gradeForPct(pct);

            await TestModel.createAttempt(
                req.params.id,
                StudentId,
                JSON.stringify(answers),
                score,
                totalMarks,
                correctCount,
                questions.length
            );

            await ResultModel.upsert(
                StudentId,
                req.params.id,
                score,
                grade,
                'Auto-graded online test'
            );

            const testName = test.testname || test.TestName;
            await notify(StudentId, 'result', 'Online Test Result: ' + testName, 'You scored ' + score + '/' + totalMarks + ' (' + pct + '%, Grade ' + grade + ')');

            const taker = await StudentModel.findById(StudentId);
            await notifyAdmin(
                'result',
                'Online test submitted',
                (taker ? (taker.fullname || taker.FullName) : 'Student #' + StudentId) + ' scored ' + score + '/' + totalMarks + ' on ' + testName
            );

            const io = getIO();
            if (io) {
                io.to('user_' + StudentId).emit('notification', { type: 'result' });
                io.emit('results_updated');
                io.emit('test_updated');
            }

            res.json({
                success: true,
                score,
                totalMarks,
                percentage: pct,
                grade,
                correctCount,
                totalQuestions: questions.length,
                review
            });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async getAttempts(req, res) {
        try {
            const rows = await TestModel.findAttemptsByTestId(req.params.id);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteAttempts(req, res) {
        try {
            const count = await TestModel.deleteAttempts(req.params.id);
            await ResultModel.deleteByTestId(req.params.id, true);

            const io = getIO();
            if (io) {
                io.emit('results_updated');
                io.emit('test_updated');
            }

            res.json({ success: true, deleted: count });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await TestModel.delete(req.params.id);

            const io = getIO();
            if (io) io.emit('test_updated');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = TestController;
