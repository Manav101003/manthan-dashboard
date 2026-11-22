const express = require('express');
const router = express.Router();
const HomeworkController = require('../controllers/homeworkController');

router.get('/homework', HomeworkController.getAll);
router.post('/homework', HomeworkController.create);
router.delete('/homework/:id', HomeworkController.delete);

module.exports = router;
