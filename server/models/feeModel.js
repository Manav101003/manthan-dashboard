const pool = require('../config/db');

class FeeModel {
    static async findAll(studentId = null) {
        if (studentId) {
            const res = await pool.query(
                'SELECT f.*, s.FullName, s.Class FROM fees f JOIN students s ON f.StudentId=s.StudentId WHERE f.StudentId=$1 ORDER BY f.Year DESC, f.Month DESC',
                [studentId]
            );
            return res.rows;
        }
        const res = await pool.query(
            'SELECT f.*, s.FullName, s.Class FROM fees f JOIN students s ON f.StudentId=s.StudentId ORDER BY f.Year DESC, f.Month DESC'
        );
        return res.rows;
    }

    static async findPending() {
        const res = await pool.query(
            "SELECT f.*, s.FullName, s.Class, s.ParentPhone FROM fees f JOIN students s ON f.StudentId=s.StudentId WHERE f.Status!='Paid' ORDER BY f.Year,f.Month"
        );
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query('SELECT * FROM fees WHERE FeeId=$1', [id]);
        return res.rows[0];
    }

    static async create(data, status, payDate, receipt) {
        await pool.query(
            'INSERT INTO fees (StudentId,Month,Year,TotalFee,PaidAmount,PaymentDate,PaymentMethod,ReceiptNumber,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [data.StudentId, data.Month, data.Year, data.TotalFee, data.PaidAmount || 0, payDate, data.PaymentMethod, receipt, status]
        );
    }

    static async update(id, paid, payDate, paymentMethod, receipt, status) {
        await pool.query(
            'UPDATE fees SET PaidAmount=$1,PaymentDate=$2,PaymentMethod=$3,ReceiptNumber=$4,Status=$5 WHERE FeeId=$6',
            [paid, payDate, paymentMethod, receipt, status, id]
        );
    }

    static async updateForApprovedPayment(feeId, newPaid, payDate, receipt, status, transactionId) {
        await pool.query(
            'UPDATE fees SET PaidAmount=$1,PaymentDate=$2,PaymentMethod=$3,ReceiptNumber=$4,Status=$5,UPITransactionId=$6 WHERE FeeId=$7',
            [newPaid, payDate, 'UPI', receipt, status, transactionId, feeId]
        );
    }
}

module.exports = FeeModel;
