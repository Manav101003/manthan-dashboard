const NoticeModel = require('../models/noticeModel');
const StudentModel = require('../models/studentModel');
const { norm } = require('../views/responseView');
const { notify, getIO } = require('../services/socketService');

class NoticeController {
    static async getAll(req, res) {
        try {
            const rows = await NoticeModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            await NoticeModel.create(d);
            const audience = d.Audience || 'All';
            const io = getIO();

            if (audience === 'All' || audience === 'Students') {
                const allStudents = await StudentModel.findActive();
                for (const s of allStudents) {
                    const sid = s.studentid || s.StudentId;
                    await notify(sid, 'notice', d.Title, (d.Description || '').substring(0, 100));
                }
                if (io) io.to('student').emit('notification', { type: 'notice', title: d.Title });
            }

            if (io) io.emit('notice_updated');
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async delete(req, res) {
        try {
            await NoticeModel.delete(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = NoticeController;
