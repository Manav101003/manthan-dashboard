const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');

// Admin notifications
router.get('/notifications/admin', NotificationController.getAdminNotifications);
router.get('/notifications/admin/unread', NotificationController.getAdminUnreadCount);
router.put('/notifications/admin/readall', NotificationController.readAllAdmin);

// Student notifications
router.get('/notifications/:studentId', NotificationController.getStudentNotifications);
router.get('/notifications/:studentId/unread', NotificationController.getStudentUnreadCount);
router.put('/notifications/:id/read', NotificationController.readOne);
router.put('/notifications/:studentId/readall', NotificationController.readAllStudent);

module.exports = router;
