const AdminModel = require('../models/adminModel');
const StudentModel = require('../models/studentModel');
const { normOne } = require('../views/responseView');

class AuthController {
    static async login(req, res) {
        const { username, password, role } = req.body;
        try {
            if (role !== 'admin' && role !== 'student') {
                return res.json({ success: false, message: 'Invalid role' });
            }

            let user;
            if (role === 'admin') {
                user = await AdminModel.findByUsername(username);
            } else {
                user = await StudentModel.findByUsername(username);
            }

            if (!user) {
                return res.json({ success: false, message: 'Invalid credentials' });
            }

            const pw = role === 'admin'
                ? (user.passwordhash || user.PasswordHash)
                : (user.password || user.Password);

            if (password !== pw) {
                return res.json({ success: false, message: 'Invalid password' });
            }

            const uid = user.adminid || user.studentid || user.AdminId || user.StudentId;
            req.session.user = { id: uid, role, username };
            const data = normOne(user);

            res.json({ success: true, user: req.session.user, data });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    static async changePassword(req, res) {
        const { newPassword } = req.body;
        if (!newPassword || !String(newPassword).trim()) {
            return res.status(400).json({ success: false, message: 'New password cannot be empty' });
        }
        try {
            const adminId = (req.session && req.session.user && req.session.user.id) || 1;
            await AdminModel.updatePassword(adminId, String(newPassword).trim());
            res.json({ success: true, message: 'Password updated successfully' });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }
}

module.exports = AuthController;
