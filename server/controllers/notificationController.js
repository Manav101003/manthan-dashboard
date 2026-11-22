const NotificationModel = require('../models/notificationModel');
const { norm } = require('../views/responseView');

class NotificationController {
    // Admin notifications (StudentId = 0)
    static async getAdminNotifications(req, res) {
        try {
            const rows = await NotificationModel.findByStudentId(0, 50);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getAdminUnreadCount(req, res) {
        try {
            const count = await NotificationModel.getUnreadCount(0);
            res.json({ count });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async readAllAdmin(req, res) {
        try {
            await NotificationModel.markAllAsRead(0);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    // Student notifications
    static async getStudentNotifications(req, res) {
        try {
            const rows = await NotificationModel.findByStudentId(req.params.studentId, 50);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getStudentUnreadCount(req, res) {
        try {
            const count = await NotificationModel.getUnreadCount(req.params.studentId);
            res.json({ count });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async readOne(req, res) {
        try {
            await NotificationModel.markAsRead(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async readAllStudent(req, res) {
        try {
            await NotificationModel.markAllAsRead(req.params.studentId);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = NotificationController;
