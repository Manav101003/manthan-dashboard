const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const studentRoutes = require('./studentRoutes');
const teacherRoutes = require('./teacherRoutes');
const batchRoutes = require('./batchRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const feeRoutes = require('./feeRoutes');
const paymentRoutes = require('./paymentRoutes');
const homeworkRoutes = require('./homeworkRoutes');
const testRoutes = require('./testRoutes');
const resultRoutes = require('./resultRoutes');
const noticeRoutes = require('./noticeRoutes');
const timetableRoutes = require('./timetableRoutes');
const reminderRoutes = require('./reminderRoutes');
const notificationRoutes = require('./notificationRoutes');
const settingRoutes = require('./settingRoutes');

router.use(authRoutes);
router.use(dashboardRoutes);
router.use(studentRoutes);
router.use(teacherRoutes);
router.use(batchRoutes);
router.use(attendanceRoutes);
router.use(feeRoutes);
router.use(paymentRoutes);
router.use(homeworkRoutes);
router.use(testRoutes);
router.use(resultRoutes);
router.use(noticeRoutes);
router.use(timetableRoutes);
router.use(reminderRoutes);
router.use(notificationRoutes);
router.use(settingRoutes);

module.exports = router;
