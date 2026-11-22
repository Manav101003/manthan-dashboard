const express = require('express');
const router = express.Router();
const TeacherController = require('../controllers/teacherController');

router.get('/teachers', TeacherController.getAll);
router.post('/teachers', TeacherController.create);
router.put('/teachers/:id', TeacherController.update);
router.delete('/teachers/:id', TeacherController.delete);

module.exports = router;
