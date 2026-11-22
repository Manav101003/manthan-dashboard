const express = require('express');
const router = express.Router();
const FeeController = require('../controllers/feeController');

router.get('/fees', FeeController.getAll);
router.get('/fees/pending', FeeController.getPending);
router.post('/fees', FeeController.create);
router.put('/fees/:id', FeeController.update);

module.exports = router;
