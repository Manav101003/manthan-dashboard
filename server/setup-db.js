require('dotenv').config();
const { Client } = require('pg');

async function setup() {
    // First connect without DB to create it
    const rootClient = new Client({ host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'postgres', password: process.env.DB_PASSWORD||'', database: 'postgres', port: parseInt(process.env.DB_PORT)||5432 });
    await rootClient.connect();
    const dbName = process.env.DB_NAME || 'manthan_institute';
    const exists = await rootClient.query("SELECT 1 FROM pg_database WHERE datname=$1", [dbName]);
    if (exists.rows.length === 0) {
        await rootClient.query('CREATE DATABASE ' + dbName);
        console.log('Created database:', dbName);
    }
    await rootClient.end();

    // Now connect to the actual DB
    const db = new Client({ host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'postgres', password: process.env.DB_PASSWORD||'', database: dbName, port: parseInt(process.env.DB_PORT)||5432 });
    await db.connect();
    console.log('Setting up tables...');

    await db.query(`
CREATE TABLE IF NOT EXISTS admin (AdminId SERIAL PRIMARY KEY, Username TEXT UNIQUE, PasswordHash TEXT, FullName TEXT DEFAULT 'Administrator', Email TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS teachers (TeacherId SERIAL PRIMARY KEY, Name TEXT NOT NULL, Subject TEXT, Phone TEXT, Email TEXT, Username TEXT UNIQUE, Password TEXT, PhotoPath TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS batches (BatchId SERIAL PRIMARY KEY, BatchName TEXT NOT NULL, Class TEXT NOT NULL, Subject TEXT, Timing TEXT, TeacherId INTEGER, MonthlyFee REAL DEFAULT 0, MaxStudents INTEGER DEFAULT 30, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS students (StudentId SERIAL PRIMARY KEY, FullName TEXT NOT NULL, FatherName TEXT, MotherName TEXT, StudentPhone TEXT, ParentPhone TEXT, Address TEXT, Class TEXT, DateOfBirth TEXT, AdmissionDate TEXT DEFAULT CURRENT_DATE::TEXT, BatchId INTEGER, Username TEXT UNIQUE, Password TEXT, PhotoPath TEXT, Gender TEXT DEFAULT 'Male', BloodGroup TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS attendance (AttendanceId SERIAL PRIMARY KEY, StudentId INTEGER, BatchId INTEGER, Date TEXT, Status TEXT DEFAULT 'Present', MarkedBy INTEGER, Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW(), UNIQUE(StudentId, BatchId, Date));
CREATE TABLE IF NOT EXISTS fees (FeeId SERIAL PRIMARY KEY, StudentId INTEGER, Month TEXT, Year INTEGER, TotalFee REAL, PaidAmount REAL DEFAULT 0, PaymentDate TEXT, PaymentMethod TEXT DEFAULT 'Cash', ReceiptNumber TEXT UNIQUE, Status TEXT DEFAULT 'Pending', Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS homework (HomeworkId SERIAL PRIMARY KEY, BatchId INTEGER, TeacherId INTEGER, Title TEXT, Description TEXT, Subject TEXT, UploadDate TEXT DEFAULT CURRENT_DATE::TEXT, DueDate TEXT, FilePath TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tests (TestId SERIAL PRIMARY KEY, BatchId INTEGER, Subject TEXT, TestName TEXT, TestDate TEXT, TestTime TEXT, MaximumMarks INTEGER DEFAULT 100, Duration TEXT, Description TEXT, Status TEXT DEFAULT 'Upcoming', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS results (ResultId SERIAL PRIMARY KEY, StudentId INTEGER, TestId INTEGER, MarksObtained REAL, Grade TEXT, Remarks TEXT, CreatedAt TIMESTAMP DEFAULT NOW(), UNIQUE(StudentId, TestId));
CREATE TABLE IF NOT EXISTS notices (NoticeId SERIAL PRIMARY KEY, Title TEXT, Description TEXT, PublishDate TEXT DEFAULT CURRENT_DATE::TEXT, Audience TEXT DEFAULT 'All', Priority TEXT DEFAULT 'Normal', PostedBy TEXT, Status TEXT DEFAULT 'Active', CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS timetable (TimetableId SERIAL PRIMARY KEY, BatchId INTEGER, Day TEXT, Subject TEXT, StartTime TEXT, EndTime TEXT, TeacherId INTEGER, Room TEXT, CreatedAt TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS reminders (ReminderId SERIAL PRIMARY KEY, Type TEXT, Title TEXT, Description TEXT, TargetDate TEXT, TargetId INTEGER, IsRead INTEGER DEFAULT 0, Audience TEXT DEFAULT 'All', CreatedAt TIMESTAMP DEFAULT NOW());
    `);

    // Check if already seeded
    const cnt = await db.query('SELECT COUNT(*) as c FROM admin');
    if (parseInt(cnt.rows[0].c) > 0) { await db.end(); console.log('Already seeded.'); return; }

    console.log('Seeding data...');
    await db.query("INSERT INTO admin (Username,PasswordHash,FullName,Email) VALUES ($1,$2,$3,$4)", ['admin','admin123','Administrator','admin@manthaninstitute.com']);

    const teachers = [['Rajesh Kumar','Mathematics','9876543210','rajesh@manthan.com','rajesh','teacher123'],['Priya Sharma','Science','9876543211','priya@manthan.com','priya','teacher123'],['Amit Verma','English','9876543212','amit@manthan.com','amit','teacher123'],['Sunita Devi','Hindi','9876543213','sunita@manthan.com','sunita','teacher123'],['Vikram Singh','Social Science','9876543214','vikram@manthan.com','vikram','teacher123']];
    for (const t of teachers) await db.query('INSERT INTO teachers (Name,Subject,Phone,Email,Username,Password) VALUES ($1,$2,$3,$4,$5,$6)', t);

    const allSubj = ['Mathematics','Science','English','Hindi','Social Science'];
    const teacherMap = {Mathematics:1, Science:2, English:3, Hindi:4, 'Social Science':5};
    const classNames = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th'];
    const baseFee = [500,600,700,800,900,1000,1100,1200,1500,1800,2000];
    const timings = ['8:00-9:00 AM','9:00-10:00 AM','10:00-11:00 AM','11:00-12:00 PM','2:00-3:00 PM'];
    for (let i = 0; i < 11; i++) {
        if (i < 5) {
            // Classes 1-5: All Subjects batch
            const subjects = allSubj;
            for (let si = 0; si < subjects.length; si++) {
                await db.query('INSERT INTO batches (BatchName,Class,Subject,Timing,TeacherId,MonthlyFee) VALUES ($1,$2,$3,$4,$5,$6)', ['Class '+classNames[i]+' - '+subjects[si], classNames[i], subjects[si], timings[si%5], teacherMap[subjects[si]], baseFee[i]]);
            }
        } else if (i < 10) {
            // Classes 6-10: Combined Maths + Science batch
            await db.query('INSERT INTO batches (BatchName,Class,Subject,Timing,TeacherId,MonthlyFee) VALUES ($1,$2,$3,$4,$5,$6)', ['Class '+classNames[i]+' - Maths + Science', classNames[i], 'Maths + Science', timings[i%5], teacherMap['Mathematics'], baseFee[i]]);
        } else {
            // Class 11: Separate Mathematics and Science
            const subjects = ['Mathematics','Science'];
            for (let si = 0; si < subjects.length; si++) {
                await db.query('INSERT INTO batches (BatchName,Class,Subject,Timing,TeacherId,MonthlyFee) VALUES ($1,$2,$3,$4,$5,$6)', ['Class '+classNames[i]+' - '+subjects[si], classNames[i], subjects[si], timings[si%5], teacherMap[subjects[si]], baseFee[i]]);
            }
        }
    }

    // Students
    const students = [
        ['Saanvi Nair','Arun Nair','Divya Nair','9001000019','9001000020','480 College Road','3rd','2017-08-12',11,'saanvi','student123','Female'],
        ['Vivaan Reddy','Krishna Reddy','Lakshmi Reddy','9001000017','9001000018','369 Station Road','4th','2016-02-28',16,'vivaan','student123','Male'],
        ['Priya Mishra','Sanjay Mishra','Rekha Mishra','9001000015','9001000016','258 Market Road','5th','2015-06-18',21,'priyam','student123','Female'],
        ['Aarav Patel','Suresh Patel','Meena Patel','9001000001','9001000002','123 Main Street','6th','2014-03-15',26,'aarav','student123','Male'],
        ['Ananya Singh','Rajiv Singh','Kavita Singh','9001000003','9001000004','456 Park Road','6th','2014-07-22',27,'ananya','student123','Female'],
        ['Meera Jain','Sunil Jain','Rina Jain','9001000021','9001000022','77 MG Road','6th','2014-05-10',26,'meera','student123','Female'],
        ['Rohan Sharma','Vikash Sharma','Sunita Sharma','9001000005','9001000006','789 Lake View','7th','2013-11-08',28,'rohan','student123','Male'],
        ['Tanya Kapoor','Raj Kapoor','Sima Kapoor','9001000023','9001000024','88 Nehru Nagar','7th','2013-09-14',29,'tanya','student123','Female'],
        ['Diya Gupta','Alok Gupta','Neha Gupta','9001000007','9001000008','321 Hill Road','8th','2012-05-30',30,'diya','student123','Female'],
        ['Aditya Rao','Prasad Rao','Sneha Rao','9001000025','9001000026','99 Gandhi Road','8th','2012-03-22',31,'aditya','student123','Male'],
        ['Arjun Kumar','Manoj Kumar','Geeta Devi','9001000009','9001000010','654 River Side','9th','2011-01-14',32,'arjun','student123','Male'],
        ['Kavya Menon','Rajeev Menon','Latha Menon','9001000027','9001000028','42 Temple Street','9th','2011-06-20',33,'kavya','student123','Female'],
        ['Ishika Verma','Rahul Verma','Pooja Verma','9001000011','9001000012','987 Garden Lane','10th','2010-09-25',34,'ishika','student123','Female'],
        ['Nikhil Das','Ravi Das','Priti Das','9001000029','9001000030','55 Lake Road','10th','2010-04-17',35,'nikhil','student123','Male'],
        ['Karan Joshi','Deepak Joshi','Anita Joshi','9001000013','9001000014','147 Temple Street','11th','2009-12-03',36,'karan','student123','Male'],
        ['Sneha Pillai','Mohan Pillai','Radha Pillai','9001000031','9001000032','33 Park Avenue','11th','2009-08-11',37,'sneha','student123','Female']
    ];
    for (const s of students) await db.query('INSERT INTO students (FullName,FatherName,MotherName,StudentPhone,ParentPhone,Address,Class,DateOfBirth,BatchId,Username,Password,Gender) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', s);

    const today = new Date().toISOString().split('T')[0];
    for (let sid = 1; sid <= 16; sid++) await db.query('INSERT INTO attendance (StudentId,BatchId,Date,Status,MarkedBy) VALUES ($1,$2,$3,$4,$5)', [sid, null, today, sid%4===0?'Absent':'Present', 1]);

    for (let sid = 1; sid <= 16; sid++) {
        await db.query('INSERT INTO fees (StudentId,Month,Year,TotalFee,PaidAmount,PaymentDate,PaymentMethod,ReceiptNumber,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [sid,'January',2026,1000,1000,'2026-01-05','Cash','REC-2026-'+String(sid).padStart(3,'0'),'Paid']);
        if (sid%3===0) await db.query('INSERT INTO fees (StudentId,Month,Year,TotalFee,PaidAmount,PaymentDate,PaymentMethod,ReceiptNumber,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [sid,'February',2026,1000,0,null,null,null,'Pending']);
        else await db.query('INSERT INTO fees (StudentId,Month,Year,TotalFee,PaidAmount,PaymentDate,PaymentMethod,ReceiptNumber,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [sid,'February',2026,1000,1000,'2026-02-05','UPI','REC-2026-1'+String(sid).padStart(2,'0'),'Paid']);
    }

    const tests = [[26,'Mathematics','Unit Test 1 - Algebra','2026-05-21','10:00',50,'1 hour','Upcoming'],[26,'Mathematics','Monthly Test - April','2026-04-15','10:00',100,'2 hours','Completed'],[27,'Science','Mid-Term Exam','2026-05-26','09:00',100,'3 hours','Upcoming'],[27,'Science','Unit Test - Plants','2026-04-10','10:00',50,'1 hour','Completed'],[28,'Mathematics','Weekly Test - Geometry','2026-05-19','11:00',25,'30 mins','Upcoming'],[29,'Science','Science Quiz','2026-05-20','11:00',30,'30 mins','Upcoming'],[30,'Mathematics','Chapter Test - Algebra','2026-05-22','10:00',50,'1 hour','Upcoming'],[33,'Science','Physics Practical','2026-05-23','14:00',50,'2 hours','Upcoming'],[34,'Mathematics','Pre-Board Math','2026-05-25','10:00',100,'3 hours','Upcoming'],[37,'Science','Mechanics Test','2026-05-18','16:00',30,'45 mins','Upcoming'],[11,'Mathematics','Class Test - Tables','2026-04-20','09:00',25,'30 mins','Completed']];
    for (const t of tests) await db.query('INSERT INTO tests (BatchId,Subject,TestName,TestDate,TestTime,MaximumMarks,Duration,Status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', t);

    const results = [[4,2,82,'A','Good performance'],[6,2,91,'A+','Excellent'],[5,4,42,'A','Very good'],[1,11,22,'A+','Outstanding']];
    for (const r of results) await db.query('INSERT INTO results (StudentId,TestId,MarksObtained,Grade,Remarks) VALUES ($1,$2,$3,$4,$5)', r);

    const hws = [[26,1,'Ch 5 Exercises','Complete exercises from Chapter 5','Mathematics','2026-05-19'],[27,2,'Lab Report','Write a lab report on photosynthesis','Science','2026-05-21'],[28,1,'Geometry Worksheet','Solve problems on angles','Mathematics','2026-05-18'],[30,1,'Quadratic Equations','NCERT problems 1-20','Mathematics','2026-05-20'],[34,1,'Trigonometry Practice','Complete worksheet','Mathematics','2026-05-23']];
    for (const h of hws) await db.query('INSERT INTO homework (BatchId,TeacherId,Title,Description,Subject,DueDate) VALUES ($1,$2,$3,$4,$5,$6)', h);

    const notices = [['Summer Break','Institute closed June 1-15.',today,'All','Important','Admin'],['Annual Day','Annual day on May 25.',today,'Students','Normal','Admin'],['PTM Scheduled','PTM on May 20.',today,'All','Urgent','Admin'],['Fee Reminder','Clear pending dues.',today,'Students','Important','Admin']];
    for (const n of notices) await db.query('INSERT INTO notices (Title,Description,PublishDate,Audience,Priority,PostedBy) VALUES ($1,$2,$3,$4,$5,$6)', n);

    const tts = [[26,'Monday','Mathematics','08:00','09:00',1,'Room 1'],[26,'Wednesday','Mathematics','08:00','09:00',1,'Room 1'],[27,'Tuesday','Science','09:00','10:00',2,'Lab 1'],[27,'Thursday','Science','09:00','10:00',2,'Lab 1'],[28,'Monday','Mathematics','10:00','11:00',1,'Room 2'],[29,'Tuesday','Science','10:00','11:00',2,'Lab 1'],[34,'Thursday','Mathematics','14:00','16:00',1,'Room 1'],[37,'Friday','Science','16:00','18:00',2,'Lab 1']];
    for (const t of tts) await db.query('INSERT INTO timetable (BatchId,Day,Subject,StartTime,EndTime,TeacherId,Room) VALUES ($1,$2,$3,$4,$5,$6,$7)', t);

    const rms = [['Fee','Fee Due Reminder','Several students have pending fees','2026-05-21',0,'Admin'],['Test','Upcoming Test','Unit Test 1 in 5 days','2026-05-21',0,'All'],['Homework','Homework Due','Ch 5 due in 3 days','2026-05-19',0,'Students'],['Attendance','Low Attendance','3 students below 75%',today,0,'Admin']];
    for (const r of rms) await db.query('INSERT INTO reminders (Type,Title,Description,TargetDate,IsRead,Audience) VALUES ($1,$2,$3,$4,$5,$6)', r);

    await db.end();
    console.log('Done! PostgreSQL database seeded.');
}
setup().catch(e => { console.error('Error:', e.message); process.exit(1); });
