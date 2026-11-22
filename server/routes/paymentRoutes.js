const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

router.get('/upi/config', PaymentController.getConfig);
router.post('/payments/submit', PaymentController.submitPayment);
router.get('/payments/pending', PaymentController.getPending);
router.get('/payments', PaymentController.getAll);
router.put('/payments/:id/approve', PaymentController.approvePayment);
router.put('/payments/:id/reject', PaymentController.rejectPayment);

module.exports = router;
