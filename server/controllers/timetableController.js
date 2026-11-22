const TimetableModel = require('../models/timetableModel');
const { norm } = require('../views/responseView');

class TimetableController {
    static async getAll(req, res) {
        const { batchId } = req.query;
        try {
            const rows = await TimetableModel.findAll(batchId);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            await TimetableModel.create(d);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = TimetableController;
