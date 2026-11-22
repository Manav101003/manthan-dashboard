require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');
const os = require('os');
const multer = require('multer');
const fs = require('fs');

// Multer setup for test file uploads
const testUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'tests');
if (!fs.existsSync(testUploadDir)) fs.mkdirSync(testUploadDir, { recursive: true });
const testStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, testUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').replace(ext, '');
        cb(null, 'test_' + Date.now() + '_' + safeName + ext);
    }
});
const testUpload = multer({
    storage: testStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PDF, Word, and image files are allowed'));
    }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({ secret: process.env.SESSION_SECRET || 'manthan_secret', resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));

// Auto-add FilePath column to tests table if missing
(async () => {
    try {
        const cols = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='tests' AND column_name='filepath'")).rows;
        if (cols.length === 0) {
            await pool.query('ALTER TABLE tests ADD COLUMN FilePath TEXT');
            console.log('✅ Added FilePath column to tests table');
        }
    } catch (e) { console.error('Migration check:', e.message); }
})();

// Track connected clients
io.on('connection', (socket) => {
    socket.on('register', (data) => { if (data && data.role) socket.join(data.role); if (data && data.id) socket.join('user_' + data.id); });
    socket.on('disconnect', () => {});
});

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

const today = () => new Date().toISOString().split('T')[0];
const monthName = () => new Date().toLocaleString('en', { month: 'long' });
const currentYear = () => new Date().getFullYear();

// ─── AUTH ───
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        let r;
        if (role === 'admin') r = await pool.query('SELECT * FROM admin WHERE Username=$1', [username]);
        else if (role === 'teacher') r = await pool.query("SELECT * FROM teachers WHERE Username=$1 AND Status='Active'", [username]);
        else r = await pool.query("SELECT * FROM students WHERE Username=$1 AND Status='Active'", [username]);
        const user = r.rows[0];
        if (!user) return res.json({ success: false, message: 'Invalid credentials' });
        // Column names come back lowercase from pg
        const pw = role === 'admin' ? (user.passwordhash || user.PasswordHash) : (user.password || user.Password);
        if (password !== pw) return res.json({ success: false, message: 'Invalid password' });
        const uid = user.adminid || user.teacherid || user.studentid;
        req.session.user = { id: uid, role, username };
        const data = normOne(user);
        res.json({ success: true, user: req.session.user, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Map pg lowercase column names to PascalCase for frontend
const colMap = {adminid:'AdminId',username:'Username',passwordhash:'PasswordHash',fullname:'FullName',email:'Email',createdat:'CreatedAt',teacherid:'TeacherId',name:'Name',subject:'Subject',phone:'Phone',password:'Password',photopath:'PhotoPath',status:'Status',batchid:'BatchId',batchname:'BatchName',class:'Class',timing:'Timing',monthlyfee:'MonthlyFee',maxstudents:'MaxStudents',studentid:'StudentId',fathername:'FatherName',mothername:'MotherName',studentphone:'StudentPhone',parentphone:'ParentPhone',address:'Address',dateofbirth:'DateOfBirth',admissiondate:'AdmissionDate',gender:'Gender',bloodgroup:'BloodGroup',attendanceid:'AttendanceId',date:'Date',markedby:'MarkedBy',remarks:'Remarks',feeid:'FeeId',month:'Month',year:'Year',totalfee:'TotalFee',paidamount:'PaidAmount',paymentdate:'PaymentDate',paymentmethod:'PaymentMethod',receiptnumber:'ReceiptNumber',homeworkid:'HomeworkId',title:'Title',description:'Description',uploaddate:'UploadDate',duedate:'DueDate',filepath:'FilePath',testid:'TestId',testname:'TestName',testdate:'TestDate',testtime:'TestTime',maximummarks:'MaximumMarks',duration:'Duration',resultid:'ResultId',marksobtained:'MarksObtained',grade:'Grade',noticeid:'NoticeId',publishdate:'PublishDate',audience:'Audience',priority:'Priority',postedby:'PostedBy',timetableid:'TimetableId',day:'Day',starttime:'StartTime',endtime:'EndTime',room:'Room',reminderid:'ReminderId',type:'Type',targetdate:'TargetDate',targetid:'TargetId',isread:'IsRead',teachername:'TeacherName',studentcount:'StudentCount',count:'count',total:'total',present:'present',collected:'collected',pending:'pending',percentage:'Percentage',time:'time',notifid:'NotifId',message:'Message',paymentid:'PaymentId',transactionid:'TransactionId',paymentscreenshot:'PaymentScreenshot',submittedat:'SubmittedAt',verifiedat:'VerifiedAt',verifiedby:'VerifiedBy',amount:'Amount',upitransactionid:'UPITransactionId'};
function norm(rows) {
    return rows.map(row => {
        const o = {};
        for (const k in row) o[colMap[k] || k] = row[k];
        return o;
    });
}
function normOne(row) { return row ? norm([row])[0] : {}; }

// Auto-notify helper
async function notify(studentId, type, title, message) {
    try { await pool.query('INSERT INTO notifications (StudentId,Type,Title,Message) VALUES ($1,$2,$3,$4)', [studentId, type, title, message]); } catch(e) { console.error('Notify error:', e.message); }
}
async function notifyBatch(batchId, type, title, message) {
    try {
        const students = (await pool.query("SELECT StudentId FROM students WHERE BatchId=$1 AND Status='Active'", [batchId])).rows;
        for (const s of students) await notify(s.studentid, type, title, message);
    } catch(e) { console.error('NotifyBatch error:', e.message); }
}

// ─── DASHBOARD ───
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const s = (await pool.query("SELECT COUNT(*) as count FROM students WHERE Status='Active'")).rows[0];
        const t = (await pool.query("SELECT COUNT(*) as count FROM teachers WHERE Status='Active'")).rows[0];
        const b = (await pool.query("SELECT COUNT(*) as count FROM batches WHERE Status='Active'")).rows[0];
        const pf = (await pool.query("SELECT COALESCE(SUM(TotalFee-PaidAmount),0) as total FROM fees WHERE Status!='Paid'")).rows[0];
        const mc = (await pool.query("SELECT COALESCE(SUM(PaidAmount),0) as total FROM fees WHERE Month=$1 AND Year=$2", [monthName(), currentYear()])).rows[0];
        const ut = (await pool.query("SELECT COUNT(*) as count FROM tests WHERE TestDate>=$1 AND Status='Upcoming'", [today()])).rows[0];
        const att = (await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN Status='Present' THEN 1 ELSE 0 END),0) as present FROM attendance WHERE Date=$1", [today()])).rows[0];
        const hw = (await pool.query("SELECT COUNT(*) as count FROM homework WHERE DueDate>=$1", [today()])).rows[0];
        const nc = (await pool.query("SELECT COUNT(*) as count FROM notices WHERE Status='Active'")).rows[0];
        res.json({ totalStudents:+s.count, totalTeachers:+t.count, totalBatches:+b.count, pendingFees:+pf.total, monthlyCollection:+mc.total, upcomingTests:+ut.count, attendancePercentage: +att.total>0?Math.round((+att.present/+att.total)*100):0, totalHomework:+hw.count, activeNotices:+nc.count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/charts', async (req, res) => {
    try {
        const feeData = norm((await pool.query("SELECT Month, SUM(PaidAmount) as collected, SUM(TotalFee-PaidAmount) as pending FROM fees WHERE Year=$1 GROUP BY Month", [currentYear()])).rows);
        const classDistribution = norm((await pool.query("SELECT Class, COUNT(*) as count FROM students WHERE Status='Active' GROUP BY Class")).rows);
        res.json({ feeData, attendanceData: [], classDistribution, recentAdmissions: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── STUDENTS ───
app.get('/api/students', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT s.*, b.BatchName, b.MonthlyFee FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId ORDER BY s.FullName')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/students/:id', async (req, res) => {
    try { res.json(normOne((await pool.query('SELECT s.*, b.BatchName, b.MonthlyFee FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId WHERE s.StudentId=$1', [req.params.id])).rows[0])); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/students', async (req, res) => {
    const d = req.body;
    try {
        // Find batch IDs for selected subjects
        const subjects = d.Subjects || ['All Subjects'];
        const batchRows = (await pool.query('SELECT BatchId, Subject FROM batches WHERE Class=$1', [d.Class])).rows;
        // Match batches: for combined 'Maths + Science' or individual subjects
        const matchedBatches = batchRows.filter(b => {
            for (const s of subjects) {
                if (b.subject === s) return true;
                if (s === 'Maths + Science' && b.subject === 'Maths + Science') return true;
            }
            return false;
        });
        const primaryBatch = matchedBatches.length > 0 ? matchedBatches[0].batchid : (batchRows.length > 0 ? batchRows[0].batchid : null);

        const r = await pool.query('INSERT INTO students (FullName,FatherName,MotherName,StudentPhone,ParentPhone,Address,Class,DateOfBirth,BatchId,Username,Password,Gender) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING StudentId', [d.FullName,d.FatherName,d.MotherName,d.StudentPhone,d.ParentPhone,d.Address,d.Class,d.DateOfBirth,primaryBatch,d.Username,d.Password||'student123',d.Gender]);
        const newId = r.rows[0].studentid;
        // Add to student_batches
        for (const b of matchedBatches) {
            await pool.query('INSERT INTO student_batches (StudentId, BatchId) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newId, b.batchid]);
        }
        res.json({ success:true, id:newId });
    }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/students/:id', async (req, res) => {
    const d = req.body;
    try {
        const subjects = d.Subjects || [];
        const batchRows = (await pool.query('SELECT BatchId, Subject FROM batches WHERE Class=$1', [d.Class])).rows;
        // Match batches: for combined 'Maths + Science' or individual subjects
        const matchedBatches = subjects.length > 0 ? batchRows.filter(b => {
            for (const s of subjects) {
                if (b.subject === s) return true;
                if (s === 'Maths + Science' && b.subject === 'Maths + Science') return true;
            }
            return false;
        }) : batchRows.slice(0,1);
        const primaryBatch = matchedBatches.length > 0 ? matchedBatches[0].batchid : (batchRows.length > 0 ? batchRows[0].batchid : null);

        await pool.query('UPDATE students SET FullName=$1,FatherName=$2,MotherName=$3,StudentPhone=$4,ParentPhone=$5,Address=$6,Class=$7,DateOfBirth=$8,BatchId=$9,Gender=$10,Status=$11 WHERE StudentId=$12', [d.FullName,d.FatherName,d.MotherName,d.StudentPhone,d.ParentPhone,d.Address,d.Class,d.DateOfBirth,primaryBatch,d.Gender,d.Status||'Active',req.params.id]);
        // Re-sync student_batches
        if (subjects.length > 0) {
            await pool.query('DELETE FROM student_batches WHERE StudentId=$1', [req.params.id]);
            for (const b of matchedBatches) {
                await pool.query('INSERT INTO student_batches (StudentId, BatchId) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, b.batchid]);
            }
        }
        res.json({ success:true });
    }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/students/:id', async (req, res) => {
    try { await pool.query('DELETE FROM student_batches WHERE StudentId=$1',[req.params.id]); await pool.query('DELETE FROM attendance WHERE StudentId=$1',[req.params.id]); await pool.query('DELETE FROM fees WHERE StudentId=$1',[req.params.id]); await pool.query('DELETE FROM results WHERE StudentId=$1',[req.params.id]); await pool.query('DELETE FROM notifications WHERE StudentId=$1',[req.params.id]); await pool.query('DELETE FROM students WHERE StudentId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── TEACHERS ───
app.get('/api/teachers', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT * FROM teachers ORDER BY Name')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/teachers', async (req, res) => {
    const d = req.body;
    try { const r = await pool.query('INSERT INTO teachers (Name,Subject,Phone,Email,Username,Password) VALUES ($1,$2,$3,$4,$5,$6) RETURNING TeacherId', [d.Name,d.Subject,d.Phone,d.Email,d.Username,d.Password||'teacher123']); res.json({ success:true, id:r.rows[0].teacherid }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/teachers/:id', async (req, res) => {
    const d = req.body;
    try { await pool.query('UPDATE teachers SET Name=$1,Subject=$2,Phone=$3,Email=$4,Status=$5 WHERE TeacherId=$6', [d.Name,d.Subject,d.Phone,d.Email,d.Status||'Active',req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/teachers/:id', async (req, res) => {
    try { await pool.query('UPDATE batches SET TeacherId=NULL WHERE TeacherId=$1',[req.params.id]); await pool.query('UPDATE homework SET TeacherId=NULL WHERE TeacherId=$1',[req.params.id]); await pool.query('UPDATE timetable SET TeacherId=NULL WHERE TeacherId=$1',[req.params.id]); await pool.query('DELETE FROM teachers WHERE TeacherId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── BATCHES ───
app.get('/api/batches', async (req, res) => {
    try { res.json(norm((await pool.query("SELECT b.*, t.Name as TeacherName, (SELECT COUNT(*) FROM students WHERE BatchId=b.BatchId AND Status='Active') as StudentCount FROM batches b LEFT JOIN teachers t ON b.TeacherId=t.TeacherId ORDER BY b.Class")).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/batches', async (req, res) => {
    const d = req.body;
    try { const r = await pool.query('INSERT INTO batches (BatchName,Class,Subject,Timing,TeacherId,MonthlyFee) VALUES ($1,$2,$3,$4,$5,$6) RETURNING BatchId', [d.BatchName,d.Class,d.Subject,d.Timing,d.TeacherId||null,d.MonthlyFee||0]); res.json({ success:true, id:r.rows[0].batchid }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/batches/:id', async (req, res) => {
    const d = req.body;
    try { await pool.query('UPDATE batches SET BatchName=$1,Class=$2,Subject=$3,Timing=$4,TeacherId=$5,MonthlyFee=$6,Status=$7 WHERE BatchId=$8', [d.BatchName,d.Class,d.Subject,d.Timing,d.TeacherId,d.MonthlyFee,d.Status||'Active',req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/batches/:id', async (req, res) => {
    try {
        await pool.query('UPDATE students SET BatchId=NULL WHERE BatchId=$1',[req.params.id]);
        await pool.query('DELETE FROM attendance WHERE BatchId=$1',[req.params.id]);
        await pool.query('DELETE FROM timetable WHERE BatchId=$1',[req.params.id]);
        await pool.query('DELETE FROM homework WHERE BatchId=$1',[req.params.id]);
        const tIds = (await pool.query('SELECT TestId FROM tests WHERE BatchId=$1',[req.params.id])).rows;
        for (const t of tIds) await pool.query('DELETE FROM results WHERE TestId=$1',[t.testid]);
        await pool.query('DELETE FROM tests WHERE BatchId=$1',[req.params.id]);
        await pool.query('DELETE FROM batches WHERE BatchId=$1',[req.params.id]);
        res.json({ success:true });
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── ATTENDANCE ───
app.get('/api/attendance', async (req, res) => {
    const { date, batchId } = req.query;
    try {
        let q = 'SELECT a.*, s.FullName, s.Class, b.BatchName FROM attendance a JOIN students s ON a.StudentId=s.StudentId LEFT JOIN batches b ON a.BatchId=b.BatchId WHERE 1=1';
        const p = []; let n = 0;
        if (date) { n++; q += ' AND a.Date=$'+n; p.push(date); }
        if (batchId) { n++; q += ' AND a.BatchId=$'+n; p.push(batchId); }
        q += ' ORDER BY a.Date DESC, s.FullName';
        res.json(norm((await pool.query(q, p)).rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/attendance/mark', async (req, res) => {
    try {
        for (const r of req.body.records) {
            await pool.query('INSERT INTO attendance (StudentId,BatchId,Date,Status,MarkedBy) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (StudentId,BatchId,Date) DO UPDATE SET Status=EXCLUDED.Status', [r.StudentId,r.BatchId,r.Date,r.Status,r.MarkedBy||1]);
            if (r.Status === 'Absent') await notify(r.StudentId, 'attendance', 'Marked Absent', 'You were marked absent on ' + r.Date + '. Contact your teacher if this is incorrect.');
            else if (r.Status === 'Present') await notify(r.StudentId, 'attendance', 'Attendance Recorded', 'You were marked present on ' + r.Date + '.');
            else if (r.Status === 'Late') await notify(r.StudentId, 'attendance', 'Marked Late', 'You were marked late on ' + r.Date + '.');
        }
        res.json({ success:true });
        io.emit('attendance_updated', { date: req.body.records[0]?.Date });
        for (const r of req.body.records) io.to('user_' + r.StudentId).emit('notification', { type: 'attendance', status: r.Status });
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── FEES ───
app.get('/api/fees', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT f.*, s.FullName, s.Class FROM fees f JOIN students s ON f.StudentId=s.StudentId ORDER BY f.Year DESC, f.Month DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/fees/pending', async (req, res) => {
    try { res.json(norm((await pool.query("SELECT f.*, s.FullName, s.Class, s.ParentPhone FROM fees f JOIN students s ON f.StudentId=s.StudentId WHERE f.Status!='Paid' ORDER BY f.Year,f.Month")).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/fees', async (req, res) => {
    const d = req.body;
    try {
        const status = d.PaidAmount>=d.TotalFee?'Paid':d.PaidAmount>0?'Partial':'Pending';
        const payDate = d.PaidAmount>0?today():null;
        const receipt = d.PaidAmount>0?'REC-'+d.Year+'-'+Date.now().toString().slice(-4):null;
        await pool.query('INSERT INTO fees (StudentId,Month,Year,TotalFee,PaidAmount,PaymentDate,PaymentMethod,ReceiptNumber,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [d.StudentId,d.Month,d.Year,d.TotalFee,d.PaidAmount||0,payDate,d.PaymentMethod,receipt,status]);
        res.json({ success:true });
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/fees/:id', async (req, res) => {
    try {
        const fee = (await pool.query('SELECT * FROM fees WHERE FeeId=$1',[req.params.id])).rows[0];
        if (!fee) return res.status(404).json({ success:false });
        const paid = parseFloat(req.body.PaidAmount);
        const status = paid>=fee.totalfee?'Paid':paid>0?'Partial':'Pending';
        const receipt = fee.receiptnumber || 'REC-'+fee.year+'-'+Date.now().toString().slice(-4);
        await pool.query('UPDATE fees SET PaidAmount=$1,PaymentDate=$2,PaymentMethod=$3,ReceiptNumber=$4,Status=$5 WHERE FeeId=$6', [paid,today(),req.body.PaymentMethod||'Cash',receipt,status,req.params.id]);
        res.json({ success:true });
        io.emit('fee_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── UPI PAYMENTS ───
// Get UPI config
app.get('/api/upi/config', (req, res) => {
    res.json({ upiId: process.env.UPI_ID || '', upiName: process.env.UPI_NAME || 'Mathan Institute', qrImage: '/assets/upi-qr.png' });
});
// Student submits payment
app.post('/api/payments/submit', async (req, res) => {
    const { StudentId, FeeId, Amount, TransactionId } = req.body;
    try {
        await pool.query('INSERT INTO payment_requests (StudentId,FeeId,Amount,TransactionId) VALUES ($1,$2,$3,$4)', [StudentId, FeeId, Amount, TransactionId]);
        await notify(0, 'fee', 'Payment Received', 'Student ID ' + StudentId + ' submitted ₹' + Amount + ' (Txn: ' + TransactionId + ')');
        // Notify admin via broadcast
        io.emit('payment_submitted', { StudentId, Amount, TransactionId });
        res.json({ success: true, message: 'Payment submitted! Admin will verify shortly.' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
// Admin: get pending payments
app.get('/api/payments/pending', async (req, res) => {
    try {
        const rows = (await pool.query("SELECT pr.*, s.FullName, s.Class, f.Month, f.Year, f.TotalFee FROM payment_requests pr JOIN students s ON pr.StudentId=s.StudentId LEFT JOIN fees f ON pr.FeeId=f.FeeId WHERE pr.Status='Pending' ORDER BY pr.SubmittedAt DESC")).rows;
        res.json(norm(rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Admin: get all payment requests
app.get('/api/payments', async (req, res) => {
    try {
        const rows = (await pool.query("SELECT pr.*, s.FullName, s.Class, f.Month, f.Year, f.TotalFee FROM payment_requests pr JOIN students s ON pr.StudentId=s.StudentId LEFT JOIN fees f ON pr.FeeId=f.FeeId ORDER BY pr.SubmittedAt DESC")).rows;
        res.json(norm(rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Admin: approve payment
app.put('/api/payments/:id/approve', async (req, res) => {
    try {
        const pr = (await pool.query('SELECT * FROM payment_requests WHERE PaymentId=$1', [req.params.id])).rows[0];
        if (!pr) return res.status(404).json({ success: false });
        // Update payment request status
        await pool.query("UPDATE payment_requests SET Status='Approved', VerifiedAt=NOW(), VerifiedBy='Admin' WHERE PaymentId=$1", [req.params.id]);
        // Update fee record
        if (pr.feeid) {
            const fee = (await pool.query('SELECT * FROM fees WHERE FeeId=$1', [pr.feeid])).rows[0];
            if (fee) {
                const newPaid = parseFloat(fee.paidamount) + parseFloat(pr.amount);
                const status = newPaid >= fee.totalfee ? 'Paid' : 'Partial';
                const receipt = 'UPI-' + fee.year + '-' + Date.now().toString().slice(-4);
                await pool.query('UPDATE fees SET PaidAmount=$1,PaymentDate=$2,PaymentMethod=$3,ReceiptNumber=$4,Status=$5,UPITransactionId=$6 WHERE FeeId=$7', [newPaid, today(), 'UPI', receipt, status, pr.transactionid, pr.feeid]);
            }
        }
        await notify(pr.studentid, 'fee', 'Payment Approved!', 'Your payment of ₹' + pr.amount + ' has been verified. Thank you!');
        io.to('user_' + pr.studentid).emit('notification', { type: 'fee' });
        io.emit('fee_updated');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
// Admin: reject payment
app.put('/api/payments/:id/reject', async (req, res) => {
    try {
        const pr = (await pool.query('SELECT * FROM payment_requests WHERE PaymentId=$1', [req.params.id])).rows[0];
        if (!pr) return res.status(404).json({ success: false });
        await pool.query("UPDATE payment_requests SET Status='Rejected', VerifiedAt=NOW(), VerifiedBy='Admin' WHERE PaymentId=$1", [req.params.id]);
        await notify(pr.studentid, 'fee', 'Payment Rejected', 'Your payment of ₹' + pr.amount + ' (Txn: ' + pr.transactionid + ') was not verified. Please contact admin.');
        io.to('user_' + pr.studentid).emit('notification', { type: 'fee' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── HOMEWORK ───
app.get('/api/homework', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT h.*, b.BatchName, b.Class, t.Name as TeacherName FROM homework h LEFT JOIN batches b ON h.BatchId=b.BatchId LEFT JOIN teachers t ON h.TeacherId=t.TeacherId ORDER BY h.DueDate DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/homework', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO homework (BatchId,TeacherId,Title,Description,Subject,DueDate) VALUES ($1,$2,$3,$4,$5,$6)', [d.BatchId,d.TeacherId,d.Title,d.Description,d.Subject,d.DueDate]);
        await notifyBatch(d.BatchId, 'homework', 'New Homework: ' + d.Title, (d.Subject||'') + ' homework assigned. Due: ' + d.DueDate);
        res.json({ success:true });
        io.emit('homework_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/homework/:id', async (req, res) => {
    try { await pool.query('DELETE FROM homework WHERE HomeworkId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── TESTS ───
app.get('/api/tests', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT t.*, b.BatchName, b.Class FROM tests t LEFT JOIN batches b ON t.BatchId=b.BatchId ORDER BY t.TestDate DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tests', testUpload.single('testFile'), async (req, res) => {
    const d = req.body;
    try {
        const filePath = req.file ? '/uploads/tests/' + req.file.filename : null;
        const r = await pool.query('INSERT INTO tests (BatchId,Subject,TestName,TestDate,TestTime,MaximumMarks,Duration,FilePath) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING TestId', [d.BatchId,d.Subject,d.TestName,d.TestDate,d.TestTime,d.MaximumMarks||100,d.Duration,filePath]);
        await notifyBatch(d.BatchId, 'test', 'New Test: ' + d.TestName, (d.Subject||'') + ' test on ' + d.TestDate + '. Max marks: ' + (d.MaximumMarks||100));
        res.json({ success:true, id: r.rows[0].testid });
        io.emit('test_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/tests/:id', async (req, res) => {
    try { await pool.query('DELETE FROM results WHERE TestId=$1',[req.params.id]); await pool.query('DELETE FROM tests WHERE TestId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── RESULTS ───
app.get('/api/results', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT r.*, s.FullName, s.Class, s.BatchId, t.TestName, t.Subject, t.MaximumMarks, t.TestDate, b.BatchName FROM results r JOIN students s ON r.StudentId=s.StudentId JOIN tests t ON r.TestId=t.TestId LEFT JOIN batches b ON s.BatchId=b.BatchId ORDER BY s.Class, t.TestDate DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
// Get students enrolled in a specific batch (via student_batches junction)
app.get('/api/students/batch/:batchId', async (req, res) => {
    try {
        const rows = (await pool.query("SELECT s.StudentId, s.FullName, s.Class FROM student_batches sb JOIN students s ON sb.StudentId=s.StudentId WHERE sb.BatchId=$1 AND s.Status='Active' ORDER BY s.FullName", [req.params.batchId])).rows;
        res.json(norm(rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/results', async (req, res) => {
    const d = req.body;
    try {
        const test = (await pool.query('SELECT MaximumMarks,TestName,Subject FROM tests WHERE TestId=$1',[d.TestId])).rows[0];
        const pct = test ? Math.round((d.MarksObtained / test.maximummarks) * 100) : 0;
        const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
        await pool.query('INSERT INTO results (StudentId,TestId,MarksObtained,Grade,Remarks) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (StudentId,TestId) DO UPDATE SET MarksObtained=EXCLUDED.MarksObtained,Grade=EXCLUDED.Grade,Remarks=EXCLUDED.Remarks', [d.StudentId,d.TestId,d.MarksObtained,grade,d.Remarks]);
        await notify(d.StudentId, 'result', 'Result Published: ' + (test?test.testname:'Test'), 'You scored ' + d.MarksObtained + '/' + (test?test.maximummarks:'') + ' (Grade: ' + grade + ')');
        res.json({ success:true });
        io.to('user_' + d.StudentId).emit('notification', { type: 'result' });
        io.emit('results_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
// Bulk results upload
app.post('/api/results/bulk', async (req, res) => {
    const { TestId, results: entries } = req.body;
    try {
        const test = (await pool.query('SELECT MaximumMarks,TestName,Subject FROM tests WHERE TestId=$1',[TestId])).rows[0];
        if (!test) return res.status(404).json({ success:false, message:'Test not found' });
        let saved = 0;
        for (const e of entries) {
            if (e.MarksObtained === '' || e.MarksObtained === null || e.MarksObtained === undefined) continue;
            const marks = Number(e.MarksObtained);
            const pct = Math.round((marks / test.maximummarks) * 100);
            const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
            await pool.query('INSERT INTO results (StudentId,TestId,MarksObtained,Grade,Remarks) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (StudentId,TestId) DO UPDATE SET MarksObtained=EXCLUDED.MarksObtained,Grade=EXCLUDED.Grade,Remarks=EXCLUDED.Remarks', [e.StudentId,TestId,marks,grade,e.Remarks||'']);
            await notify(e.StudentId, 'result', 'Result Published: ' + test.testname, 'You scored ' + marks + '/' + test.maximummarks + ' (Grade: ' + grade + ')');
            io.to('user_' + e.StudentId).emit('notification', { type: 'result' });
            saved++;
        }
        res.json({ success:true, saved });
        io.emit('results_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
// Delete all results for a test (must be before :id route)
app.delete('/api/results/test/:testId', async (req, res) => {
    try { const r = await pool.query('DELETE FROM results WHERE TestId=$1',[req.params.testId]); res.json({ success:true, deleted: r.rowCount }); io.emit('results_updated'); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
// Delete single result
app.delete('/api/results/:id', async (req, res) => {
    try { await pool.query('DELETE FROM results WHERE ResultId=$1',[req.params.id]); res.json({ success:true }); io.emit('results_updated'); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── NOTICES ───
app.get('/api/notices', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT * FROM notices ORDER BY PublishDate DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/notices', async (req, res) => {
    const d = req.body;
    try {
        await pool.query('INSERT INTO notices (Title,Description,Audience,Priority,PostedBy) VALUES ($1,$2,$3,$4,$5)', [d.Title,d.Description,d.Audience||'All',d.Priority||'Normal','Admin']);
        const audience = d.Audience || 'All';
        if (audience === 'All' || audience === 'Students') {
            const allStudents = (await pool.query("SELECT StudentId FROM students WHERE Status='Active'")).rows;
            for (const s of allStudents) await notify(s.studentid, 'notice', d.Title, (d.Description||'').substring(0,100));
        }
        res.json({ success:true });
        io.emit('notice_updated');
    } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/notices/:id', async (req, res) => {
    try { await pool.query('DELETE FROM notices WHERE NoticeId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── TIMETABLE ───
app.get('/api/timetable', async (req, res) => {
    const { batchId } = req.query;
    try {
        let q = 'SELECT tt.*, b.BatchName, t.Name as TeacherName FROM timetable tt LEFT JOIN batches b ON tt.BatchId=b.BatchId LEFT JOIN teachers t ON tt.TeacherId=t.TeacherId';
        const p = [];
        if (batchId) { q += ' WHERE tt.BatchId=$1'; p.push(batchId); }
        q += ' ORDER BY tt.Day, tt.StartTime';
        res.json(norm((await pool.query(q, p)).rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/timetable', async (req, res) => {
    const d = req.body;
    try { await pool.query('INSERT INTO timetable (BatchId,Day,Subject,StartTime,EndTime,TeacherId,Room) VALUES ($1,$2,$3,$4,$5,$6,$7)', [d.BatchId,d.Day,d.Subject,d.StartTime,d.EndTime,d.TeacherId||null,d.Room]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── REMINDERS ───
app.get('/api/reminders', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT * FROM reminders WHERE IsRead=0 ORDER BY CreatedAt DESC')).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/reminders/:id/read', async (req, res) => {
    try { await pool.query('UPDATE reminders SET IsRead=1 WHERE ReminderId=$1',[req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── STUDENT NOTIFICATIONS ───
app.get('/api/notifications/:studentId', async (req, res) => {
    try { res.json(norm((await pool.query('SELECT * FROM notifications WHERE StudentId=$1 ORDER BY CreatedAt DESC LIMIT 50', [req.params.studentId])).rows)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/notifications/:studentId/unread', async (req, res) => {
    try { const r = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE StudentId=$1 AND IsRead=0', [req.params.studentId])).rows[0]; res.json({ count: +r.count }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/notifications/:id/read', async (req, res) => {
    try { await pool.query('UPDATE notifications SET IsRead=1 WHERE NotifId=$1', [req.params.id]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/notifications/:studentId/readall', async (req, res) => {
    try { await pool.query('UPDATE notifications SET IsRead=1 WHERE StudentId=$1', [req.params.studentId]); res.json({ success:true }); }
    catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// ─── ACTIVITY ───
app.get('/api/activity/recent', async (req, res) => {
    try {
        const students = (await pool.query("SELECT 'admission' as type, FullName as title, 'New admission - Class '||Class as description, CreatedAt as time FROM students ORDER BY CreatedAt DESC LIMIT 3")).rows;
        const fees = (await pool.query("SELECT 'fee' as type, s.FullName as title, '₹'||f.PaidAmount||' - '||f.Month||' '||f.Year as description, f.CreatedAt as time FROM fees f JOIN students s ON f.StudentId=s.StudentId WHERE f.PaidAmount>0 ORDER BY f.CreatedAt DESC LIMIT 3")).rows;
        const hw = (await pool.query("SELECT 'homework' as type, h.Title as title, b.BatchName||' - Due: '||h.DueDate as description, h.CreatedAt as time FROM homework h JOIN batches b ON h.BatchId=b.BatchId ORDER BY h.CreatedAt DESC LIMIT 3")).rows;
        res.json([...students,...fees,...hw].sort((a,b)=>String(b.time||'').localeCompare(String(a.time||''))).slice(0,8));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── STUDENT PORTAL (personal data only) ───
app.get('/api/student/dashboard/:id', async (req, res) => {
    const sid = req.params.id;
    try {
        const student = normOne((await pool.query('SELECT s.*, b.BatchName, b.MonthlyFee FROM students s LEFT JOIN batches b ON s.BatchId=b.BatchId WHERE s.StudentId=$1', [sid])).rows[0]);
        const att = (await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN Status='Present' THEN 1 ELSE 0 END),0) as present, COALESCE(SUM(CASE WHEN Status='Absent' THEN 1 ELSE 0 END),0) as absent FROM attendance WHERE StudentId=$1", [sid])).rows[0];
        const fees = norm((await pool.query('SELECT * FROM fees WHERE StudentId=$1 ORDER BY Year DESC, Month', [sid])).rows);
        const totalFee = fees.reduce((s,f) => s + (+f.TotalFee||0), 0);
        const totalPaid = fees.reduce((s,f) => s + (+f.PaidAmount||0), 0);
        const pendingFees = totalFee - totalPaid;
        const results = norm((await pool.query('SELECT r.*, t.TestName, t.Subject, t.MaximumMarks, t.TestDate FROM results r JOIN tests t ON r.TestId=t.TestId WHERE r.StudentId=$1 ORDER BY t.TestDate DESC', [sid])).rows);
        const batchId = student.BatchId;
        const tests = batchId ? norm((await pool.query("SELECT * FROM tests WHERE BatchId=$1 AND Status='Upcoming' ORDER BY TestDate", [batchId])).rows) : [];
        const homework = batchId ? norm((await pool.query('SELECT h.*, t.Name as TeacherName FROM homework h LEFT JOIN teachers t ON h.TeacherId=t.TeacherId WHERE h.BatchId=$1 AND h.DueDate>=CURRENT_DATE::TEXT ORDER BY h.DueDate', [batchId])).rows) : [];
        res.json({ student, attendance: { total: +att.total, present: +att.present, absent: +att.absent, percentage: +att.total > 0 ? Math.round((+att.present / +att.total) * 100) : 0 }, fees, totalFee, totalPaid, pendingFees, results, tests, homework });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SETTINGS ───
app.get('/api/settings', (req, res) => {
    res.json({ instituteName:'Mathan Institute of Career Development', address:'Main Branch, City', phone:'+91 98765 43210', email:'info@manthaninstitute.com', classes:['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th'] });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
const localIP = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log('🏫 Mathan Institute Server running!');
    console.log('   Local:   http://localhost:' + PORT);
    console.log('   Network: http://' + localIP + ':' + PORT);
    console.log('   Share the Network URL with other devices on your WiFi');
});
