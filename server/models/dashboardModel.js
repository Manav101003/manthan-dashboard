const pool = require('../config/db');

class DashboardModel {
    static async getStats(todayStr, monthNameStr, currentYearNum) {
        const s = (await pool.query("SELECT COUNT(*) as count FROM students WHERE Status='Active'")).rows[0];
        const t = (await pool.query("SELECT COUNT(*) as count FROM teachers WHERE Status='Active'")).rows[0];
        const b = (await pool.query("SELECT COUNT(*) as count FROM batches WHERE Status='Active'")).rows[0];
        const pf = (await pool.query("SELECT COALESCE(SUM(TotalFee-PaidAmount),0) as total FROM fees WHERE Status!='Paid'")).rows[0];
        const mc = (await pool.query("SELECT COALESCE(SUM(PaidAmount),0) as total FROM fees WHERE Month=$1 AND Year=$2", [monthNameStr, currentYearNum])).rows[0];
        const ut = (await pool.query("SELECT COUNT(*) as count FROM tests WHERE TestDate>=$1 AND Status='Upcoming'", [todayStr])).rows[0];
        const att = (await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN Status='Present' THEN 1 ELSE 0 END),0) as present FROM attendance WHERE Date=$1", [todayStr])).rows[0];
        const hw = (await pool.query("SELECT COUNT(*) as count FROM homework WHERE DueDate>=$1", [todayStr])).rows[0];
        const nc = (await pool.query("SELECT COUNT(*) as count FROM notices WHERE Status='Active'")).rows[0];

        return {
            totalStudents: +s.count,
            totalTeachers: +t.count,
            totalBatches: +b.count,
            pendingFees: +pf.total,
            monthlyCollection: +mc.total,
            upcomingTests: +ut.count,
            attendancePercentage: +att.total > 0 ? Math.round((+att.present / +att.total) * 100) : 0,
            attendanceMarked: +att.total,
            totalHomework: +hw.count,
            activeNotices: +nc.count
        };
    }

    static async getCharts(currentYearNum) {
        const feeRows = (await pool.query(
            "SELECT Month, SUM(PaidAmount) as collected, SUM(TotalFee-PaidAmount) as pending FROM fees WHERE Year=$1 GROUP BY Month",
            [currentYearNum]
        )).rows;

        const classRows = (await pool.query(
            "SELECT Class, COUNT(*) as count FROM students WHERE Status='Active' GROUP BY Class"
        )).rows;

        return {
            feeRows,
            classRows,
            recentAdmissions: []
        };
    }

    static async getRecentActivity() {
        const students = (await pool.query("SELECT 'admission' as type, FullName as title, 'New admission - Class '||Class as description, CreatedAt as time FROM students ORDER BY CreatedAt DESC LIMIT 3")).rows;
        const fees = (await pool.query("SELECT 'fee' as type, s.FullName as title, '₹'||f.PaidAmount||' - '||f.Month||' '||f.Year as description, f.CreatedAt as time FROM fees f JOIN students s ON f.StudentId=s.StudentId WHERE f.PaidAmount>0 ORDER BY f.CreatedAt DESC LIMIT 3")).rows;
        const hw = (await pool.query("SELECT 'homework' as type, h.Title as title, b.BatchName||' - Due: '||h.DueDate as description, h.CreatedAt as time FROM homework h JOIN batches b ON h.BatchId=b.BatchId ORDER BY h.CreatedAt DESC LIMIT 3")).rows;

        return [...students, ...fees, ...hw].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))).slice(0, 8);
    }

    static async getStudentDashboardData(studentId) {
        const student = (await pool.query(
            'SELECT s.*, b.BatchName, b.MonthlyFee FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId WHERE s.StudentId=$1',
            [studentId]
        )).rows[0];

        const att = (await pool.query(
            "SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN Status='Present' THEN 1 ELSE 0 END),0) as present, COALESCE(SUM(CASE WHEN Status='Absent' THEN 1 ELSE 0 END),0) as absent FROM attendance WHERE StudentId=$1",
            [studentId]
        )).rows[0];

        const fees = (await pool.query('SELECT * FROM fees WHERE StudentId=$1 ORDER BY Year DESC, Month', [studentId])).rows;
        const results = (await pool.query(
            'SELECT r.*, t.TestName, t.Subject, t.MaximumMarks, t.TestDate FROM results r JOIN tests t ON r.TestId=t.TestId WHERE r.StudentId=$1 ORDER BY t.TestDate DESC',
            [studentId]
        )).rows;

        const batchId = student ? (student.batchid || student.BatchId) : null;
        const tests = (await pool.query(
            "SELECT * FROM tests WHERE Status='Upcoming' AND (BatchId=$1 OR BatchId IN (SELECT BatchId FROM student_batches WHERE StudentId=$2)) ORDER BY TestDate",
            [batchId, studentId]
        )).rows;

        const homework = (await pool.query(
            "SELECT h.*, t.Name as TeacherName FROM homework h LEFT JOIN teachers t ON h.TeacherId=t.TeacherId WHERE (h.BatchId=$1 OR h.BatchId IN (SELECT BatchId FROM student_batches WHERE StudentId=$2)) AND h.DueDate>=CURRENT_DATE::TEXT ORDER BY h.DueDate",
            [batchId, studentId]
        )).rows;

        return {
            student,
            att,
            fees,
            results,
            tests,
            homework
        };
    }
}

module.exports = DashboardModel;
