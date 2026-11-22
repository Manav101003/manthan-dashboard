const StudentModel = require('../models/studentModel');
const BatchModel = require('../models/batchModel');
const { norm, normOne } = require('../views/responseView');
const { matchSubjectBatches } = require('../utils/helpers');
const { notifyAdmin } = require('../services/socketService');

class StudentController {
    static async getAll(req, res) {
        try {
            const rows = await StudentModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getById(req, res) {
        try {
            const row = await StudentModel.findById(req.params.id);
            res.json(normOne(row));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getByBatch(req, res) {
        try {
            const rows = await StudentModel.findByBatchId(req.params.batchId);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getStudentBatches(req, res) {
        try {
            const rows = await StudentModel.findBatchIdsForStudent(req.params.id);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const subjects = d.Subjects || ['All Subjects'];
            const batchRows = await BatchModel.findByClass(d.Class);
            const matchedBatches = matchSubjectBatches(batchRows, subjects);

            let primaryBatch = null;
            if (d.BatchId) {
                const chosen = batchRows.find(b => String(b.batchid || b.BatchId) === String(d.BatchId));
                if (chosen) primaryBatch = chosen.batchid || chosen.BatchId;
            }
            if (!primaryBatch) {
                primaryBatch = matchedBatches.length > 0
                    ? (matchedBatches[0].batchid || matchedBatches[0].BatchId)
                    : (batchRows.length > 0 ? (batchRows[0].batchid || batchRows[0].BatchId) : null);
            }

            const newId = await StudentModel.create(d, primaryBatch);

            const enrollIds = new Set(matchedBatches.map(b => b.batchid || b.BatchId));
            if (primaryBatch) enrollIds.add(primaryBatch);
            await StudentModel.enrollInBatches(newId, enrollIds);

            await notifyAdmin('student', 'New student added', d.FullName + ' · Class ' + d.Class);
            res.json({ success: true, id: newId, batchId: primaryBatch });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async update(req, res) {
        const d = req.body;
        try {
            const subjects = d.Subjects || [];
            const batchRows = await BatchModel.findByClass(d.Class);
            const matchedBatches = subjects.length > 0 ? matchSubjectBatches(batchRows, subjects) : [];

            let primaryBatch = null;
            if (d.BatchId) {
                const chosen = batchRows.find(b => String(b.batchid || b.BatchId) === String(d.BatchId));
                if (chosen) primaryBatch = chosen.batchid || chosen.BatchId;
            }
            if (!primaryBatch) {
                primaryBatch = matchedBatches.length > 0
                    ? (matchedBatches[0].batchid || matchedBatches[0].BatchId)
                    : (batchRows.length > 0 ? (batchRows[0].batchid || batchRows[0].BatchId) : null);
            }

            await StudentModel.update(req.params.id, d, primaryBatch);

            const enrollIds = new Set(matchedBatches.map(b => b.batchid || b.BatchId));
            if (primaryBatch) enrollIds.add(primaryBatch);
            await StudentModel.syncStudentBatches(req.params.id, enrollIds);

            res.json({ success: true, batchId: primaryBatch });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await StudentModel.delete(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = StudentController;
