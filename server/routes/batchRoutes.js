const express = require('express');
const router = express.Router();
const BatchController = require('../controllers/batchController');

router.get('/batches', BatchController.getAll);
router.post('/batches', BatchController.create);
router.put('/batches/:id', BatchController.update);
router.delete('/batches/:id', BatchController.delete);

module.exports = router;
