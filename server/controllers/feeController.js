const FeeModel = require('../models/feeModel');
const { norm } = require('../views/responseView');
const { today } = require('../utils/helpers');
const { getIO } = require('../services/socketService');

class FeeController {
    static async getAll(req, res) {
        try {
            const { studentId } = req.query;
            const rows = await FeeModel.findAll(studentId);
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getPending(req, res) {
        try {
            const rows = await FeeModel.findPending();
            res.json(norm(rows));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async create(req, res) {
        const d = req.body;
        try {
            const status = d.PaidAmount >= d.TotalFee ? 'Paid' : (d.PaidAmount > 0 ? 'Partial' : 'Pending');
            const payDate = d.PaidAmount > 0 ? today() : null;
            const receipt = d.PaidAmount > 0 ? ('REC-' + d.Year + '-' + Date.now().toString().slice(-4)) : null;

            await FeeModel.create(d, status, payDate, receipt);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }

    static async update(req, res) {
        try {
            const fee = await FeeModel.findById(req.params.id);
            if (!fee) return res.status(404).json({ success: false });

            const paid = parseFloat(req.body.PaidAmount);
            const totalFee = parseFloat(fee.totalfee || fee.TotalFee);
            const status = paid >= totalFee ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
            const receipt = (fee.receiptnumber || fee.ReceiptNumber) || ('REC-' + (fee.year || fee.Year) + '-' + Date.now().toString().slice(-4));
            const method = req.body.PaymentMethod || 'Cash';

            await FeeModel.update(req.params.id, paid, today(), method, receipt, status);

            const io = getIO();
            if (io) io.emit('fee_updated');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = FeeController;
