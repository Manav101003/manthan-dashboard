const BatchModel = require('../models/batchModel');
const { norm } = require('../views/responseView');

class BatchController {
    static async getAll(req, res) {
        try {
            const rows = await BatchModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const batchId = await BatchModel.create(d);
            res.json({ success: true, id: batchId });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async update(req, res) {
        const d = req.body;
        try {
            await BatchModel.update(req.params.id, d);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await BatchModel.delete(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = BatchController;
