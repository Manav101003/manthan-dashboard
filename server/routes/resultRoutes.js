const express = require('express');
const router = express.Router();
const ResultController = require('../controllers/resultController');

router.get('/results', ResultController.getAll);
router.post('/results', ResultController.create);
router.post('/results/bulk', ResultController.createBulk);
router.delete('/results/test/:testId', ResultController.deleteByTest);
router.delete('/results/:id', ResultController.delete);

module.exports = router;
