const AttendanceModel = require('../models/attendanceModel');
const { norm } = require('../views/responseView');
const { notify, getIO } = require('../services/socketService');

class AttendanceController {
    static async getAttendance(req, res) {
        const { date, batchId, studentId } = req.query;
        try {
            const rows = await AttendanceModel.find({ date, batchId, studentId });
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async markAttendance(req, res) {
        try {
            const io = getIO();
            const records = req.body.records || [];
            for (const r of records) {
                await AttendanceModel.markRecord(r);
                if (r.Status === 'Absent') {
                    await notify(r.StudentId, 'attendance', 'Marked Absent', 'You were marked absent on ' + r.Date + '. Contact your teacher if this is incorrect.');
                } else if (r.Status === 'Present') {
                    await notify(r.StudentId, 'attendance', 'Attendance Recorded', 'You were marked present on ' + r.Date + '.');
                } else if (r.Status === 'Late') {
                    await notify(r.StudentId, 'attendance', 'Marked Late', 'You were marked late on ' + r.Date + '.');
                }
            }

            res.json({ success: true });
            if (io) {
                io.emit('attendance_updated', { date: records[0]?.Date });
                for (const r of records) {
                    io.to('user_' + r.StudentId).emit('notification', { type: 'attendance', status: r.Status });
                }
            }
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = AttendanceController;
