const express = require('express');
const router = express.Router();
const TimetableController = require('../controllers/timetableController');

router.get('/timetable', TimetableController.getAll);
router.post('/timetable', TimetableController.create);

module.exports = router;
