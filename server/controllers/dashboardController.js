const DashboardModel = require('../models/dashboardModel');
const { norm, normOne } = require('../views/responseView');
const { today, monthName, currentYear } = require('../utils/helpers');

class DashboardController {
    static async getStats(req, res) {
        try {
            const stats = await DashboardModel.getStats(today(), monthName(), currentYear());
            res.json(stats);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getCharts(req, res) {
        try {
            const { feeRows, classRows, recentAdmissions } = await DashboardModel.getCharts(currentYear());
            const feeData = norm(feeRows).map(r => Object.assign({}, r, {
                collected: +r.collected || 0,
                pending: +r.pending || 0
            }));
            const classDistribution = norm(classRows).map(r => Object.assign({}, r, {
                count: +r.count || 0
            }));
            res.json({ feeData, classDistribution, recentAdmissions });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getRecentActivity(req, res) {
        try {
            const activity = await DashboardModel.getRecentActivity();
            res.json(activity);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getStudentDashboard(req, res) {
        const sid = req.params.id;
        try {
            const data = await DashboardModel.getStudentDashboardData(sid);
            const student = normOne(data.student);
            const att = data.att;
            const fees = norm(data.fees);
            const totalFee = fees.reduce((s, f) => s + (+f.TotalFee || 0), 0);
            const totalPaid = fees.reduce((s, f) => s + (+f.PaidAmount || 0), 0);
            const pendingFees = totalFee - totalPaid;
            const results = norm(data.results);
            const tests = norm(data.tests);
            const homework = norm(data.homework);

            res.json({
                student,
                attendance: {
                    total: +att.total,
                    present: +att.present,
                    absent: +att.absent,
                    percentage: +att.total > 0 ? Math.round((+att.present / +att.total) * 100) : 0
                },
                fees,
                totalFee,
                totalPaid,
                pendingFees,
                results,
                tests,
                homework
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = DashboardController;
