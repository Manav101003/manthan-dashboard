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
}

module.exports = AuthController;
