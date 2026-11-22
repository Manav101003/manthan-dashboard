const HomeworkModel = require('../models/homeworkModel');
const { norm } = require('../views/responseView');
const { notifyBatch, getIO } = require('../services/socketService');

class HomeworkController {
    static async getAll(req, res) {
        try {
            const rows = await HomeworkModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            await HomeworkModel.create(d);
            await notifyBatch(d.BatchId, 'homework', 'New Homework: ' + d.Title, (d.Subject || '') + ' homework assigned. Due: ' + d.DueDate);

            const io = getIO();
            if (io) io.emit('homework_updated');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await HomeworkModel.delete(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = HomeworkController;
