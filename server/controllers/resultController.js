const ResultModel = require('../models/resultModel');
const TestModel = require('../models/testModel');
const { norm } = require('../views/responseView');
const { notify, getIO } = require('../services/socketService');

class ResultController {
    static async getAll(req, res) {
        const { studentId } = req.query;
        try {
            const rows = await ResultModel.findAll(studentId);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const test = await TestModel.findById(d.TestId);
            const maxMarks = test ? (test.maximummarks || test.MaximumMarks) : 100;
            const pct = maxMarks ? Math.round((d.MarksObtained / maxMarks) * 100) : 0;
            const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';

            await ResultModel.upsert(d.StudentId, d.TestId, d.MarksObtained, grade, d.Remarks);

            const testName = test ? (test.testname || test.TestName) : 'Test';
            await notify(d.StudentId, 'result', 'Result Published: ' + testName, 'You scored ' + d.MarksObtained + '/' + (maxMarks || '') + ' (Grade: ' + grade + ')');

            const io = getIO();
            if (io) {
                io.to('user_' + d.StudentId).emit('notification', { type: 'result' });
                io.emit('results_updated');
            }

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async createBulk(req, res) {
        const { TestId, results: entries } = req.body;
        try {
            const test = await TestModel.findById(TestId);
            if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

            const maxMarks = test.maximummarks || test.MaximumMarks;
            const testName = test.testname || test.TestName;
            let saved = 0;
            const io = getIO();

            for (const e of entries) {
                if (e.MarksObtained === '' || e.MarksObtained === null || e.MarksObtained === undefined) continue;
                const marks = Number(e.MarksObtained);
                const pct = Math.round((marks / maxMarks) * 100);
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';

                await ResultModel.upsert(e.StudentId, TestId, marks, grade, e.Remarks || '');
                await notify(e.StudentId, 'result', 'Result Published: ' + testName, 'You scored ' + marks + '/' + maxMarks + ' (Grade: ' + grade + ')');

                if (io) {
                    io.to('user_' + e.StudentId).emit('notification', { type: 'result' });
                }
                saved++;
            }

            if (io) io.emit('results_updated');
            res.json({ success: true, saved });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async deleteByTest(req, res) {
        try {
            const count = await ResultModel.deleteByTestId(req.params.testId);
            const io = getIO();
            if (io) io.emit('results_updated');
            res.json({ success: true, deleted: count });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await ResultModel.deleteById(req.params.id);
            const io = getIO();
            if (io) io.emit('results_updated');
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = ResultController;
