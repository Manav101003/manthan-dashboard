const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/studentController');

router.get('/students', StudentController.getAll);
router.get('/students/batch/:batchId', StudentController.getByBatch);
router.get('/students/:id/batches', StudentController.getStudentBatches);
router.get('/students/:id', StudentController.getById);
router.post('/students', StudentController.create);
router.put('/students/:id', StudentController.update);
router.delete('/students/:id', StudentController.delete);

module.exports = router;
