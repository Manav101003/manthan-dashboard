const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendanceController');

router.get('/attendance', AttendanceController.getAttendance);
router.post('/attendance/mark', AttendanceController.markAttendance);

module.exports = router;
