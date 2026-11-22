const TeacherModel = require('../models/teacherModel');
const { norm } = require('../views/responseView');

class TeacherController {
    static async getAll(req, res) {
        try {
            const rows = await TeacherModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const teacherId = await TeacherModel.create(d);
            res.json({ success: true, id: teacherId });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async update(req, res) {
        const d = req.body;
        try {
            await TeacherModel.update(req.params.id, d);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await TeacherModel.delete(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = TeacherController;
