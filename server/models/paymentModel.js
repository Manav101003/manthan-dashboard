const pool = require('../config/db');

class PaymentModel {
    static async create(studentId, feeId, amount, transactionId) {
        await pool.query(
            'INSERT INTO payment_requests (StudentId,FeeId,Amount,TransactionId) VALUES ($1,$2,$3,$4)',
            [studentId, feeId, amount, transactionId]
        );
    }

    static async findPending() {
        const res = await pool.query(
            "SELECT pr.*, s.FullName, s.Class, f.Month, f.Year, f.TotalFee FROM payment_requests pr JOIN students s ON pr.StudentId=s.StudentId LEFT JOIN fees f ON pr.FeeId=f.FeeId WHERE pr.Status='Pending' ORDER BY pr.SubmittedAt DESC"
        );
        return res.rows;
    }

    static async findAll() {
        const res = await pool.query(
            'SELECT pr.*, s.FullName, s.Class, f.Month, f.Year, f.TotalFee FROM payment_requests pr JOIN students s ON pr.StudentId=s.StudentId LEFT JOIN fees f ON pr.FeeId=f.FeeId ORDER BY pr.SubmittedAt DESC'
        );
        return res.rows;
    }

    static async findById(id) {
        const res = await pool.query('SELECT * FROM payment_requests WHERE PaymentId=$1', [id]);
        return res.rows[0];
    }

    static async approve(id) {
        await pool.query(
            "UPDATE payment_requests SET Status='Approved', VerifiedAt=NOW(), VerifiedBy='Admin' WHERE PaymentId=$1",
            [id]
        );
    }

    static async reject(id) {
        await pool.query(
            "UPDATE payment_requests SET Status='Rejected', VerifiedAt=NOW(), VerifiedBy='Admin' WHERE PaymentId=$1",
            [id]
        );
    }
}

module.exports = PaymentModel;
