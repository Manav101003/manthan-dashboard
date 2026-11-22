const PaymentModel = require('../models/paymentModel');
const FeeModel = require('../models/feeModel');
const StudentModel = require('../models/studentModel');
const SettingModel = require('../models/settingModel');
const { norm } = require('../views/responseView');
const { today } = require('../utils/helpers');
const { notify, notifyAdmin, getIO } = require('../services/socketService');

class PaymentController {
    static async getConfig(req, res) {
        try {
            const s = await SettingModel.getSettings();
            res.json({
                upiId: s.upiId || '',
                upiName: s.upiName || 'Mathan Institute',
                qrImage: s.qrImage || ''
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async submitPayment(req, res) {
        const { StudentId, FeeId, Amount, TransactionId } = req.body;
        try {
            await PaymentModel.create(StudentId, FeeId, Amount, TransactionId);
            const payer = await StudentModel.findById(StudentId);
            const io = getIO();

            await notifyAdmin(
                'fee',
                'Payment submitted',
                (payer ? payer.fullname + ' (Class ' + payer.class + ')' : 'Student #' + StudentId) + ' submitted ₹' + Amount + ' · Txn ' + TransactionId
            );

            if (io) io.emit('payment_submitted', { StudentId, Amount, TransactionId });

            res.json({ success: true, message: 'Payment submitted! Admin will verify shortly.' });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async getPending(req, res) {
        try {
            const rows = await PaymentModel.findPending();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getAll(req, res) {
        try {
            const rows = await PaymentModel.findAll();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async approvePayment(req, res) {
        try {
            const pr = await PaymentModel.findById(req.params.id);
            if (!pr) return res.status(404).json({ success: false });

            const feeId = pr.feeid || pr.FeeId;
            const amount = parseFloat(pr.amount || pr.Amount) || 0;
            const studentId = pr.studentid || pr.StudentId;
            const transactionId = pr.transactionid || pr.TransactionId;

            if (feeId) {
                const fee = await FeeModel.findById(feeId);
                if (fee) {
                    const currentPaid = parseFloat(fee.paidamount || fee.PaidAmount) || 0;
                    const totalFee = parseFloat(fee.totalfee || fee.TotalFee) || 0;
                    const newPaid = currentPaid + amount;
                    const status = newPaid >= totalFee ? 'Paid' : 'Partial';
                    const receipt = (fee.receiptnumber || fee.ReceiptNumber) || ('UPI-' + (fee.year || fee.Year) + '-' + Date.now().toString().slice(-4));

                    await FeeModel.updateForApprovedPayment(feeId, newPaid, today(), receipt, status, transactionId);
                }
            }

            await PaymentModel.approve(req.params.id);
            await notify(studentId, 'fee', 'Payment Approved!', 'Your payment of ₹' + amount + ' has been verified. Thank you!');

            const io = getIO();
            if (io) {
                io.to('user_' + studentId).emit('notification', { type: 'fee' });
                io.emit('fee_updated');
            }

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async rejectPayment(req, res) {
        try {
            const pr = await PaymentModel.findById(req.params.id);
            if (!pr) return res.status(404).json({ success: false });

            const studentId = pr.studentid || pr.StudentId;
            const amount = pr.amount || pr.Amount;
            const transactionId = pr.transactionid || pr.TransactionId;

            await PaymentModel.reject(req.params.id);
            await notify(studentId, 'fee', 'Payment Rejected', 'Your payment of ₹' + amount + ' (Txn: ' + transactionId + ') was not verified. Please contact admin.');

            const io = getIO();
            if (io) {
                io.to('user_' + studentId).emit('notification', { type: 'fee' });
            }

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = PaymentController;
