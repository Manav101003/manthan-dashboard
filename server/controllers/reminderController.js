const ReminderModel = require('../models/reminderModel');
const { norm } = require('../views/responseView');

class ReminderController {
    static async getUnread(req, res) {
        try {
            const rows = await ReminderModel.findUnread();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async markAsRead(req, res) {
        try {
            await ReminderModel.markAsRead(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = ReminderController;
