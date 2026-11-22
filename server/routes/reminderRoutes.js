const express = require('express');
const router = express.Router();
const ReminderController = require('../controllers/reminderController');

router.get('/reminders', ReminderController.getUnread);
router.put('/reminders/:id/read', ReminderController.markAsRead);

module.exports = router;
