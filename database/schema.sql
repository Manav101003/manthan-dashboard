-- ============================================================
-- Mathan Institute of Career Development
-- Complete Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS manthan_institute;
USE manthan_institute;

-- ============================================================
-- 1. Admin Table
-- ============================================================
CREATE TABLE IF NOT EXISTS admin (
    AdminId INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(100) DEFAULT 'Administrator',
    Email VARCHAR(100),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. Teachers Table
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
    TeacherId INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Subject VARCHAR(100),
    Phone VARCHAR(15),
    Email VARCHAR(100),
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    PhotoPath VARCHAR(255),
    Status ENUM('Active', 'Inactive') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Batches Table
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
    BatchId INT AUTO_INCREMENT PRIMARY KEY,
    BatchName VARCHAR(100) NOT NULL,
    Class VARCHAR(20) NOT NULL,
    Subject VARCHAR(100),
    Timing VARCHAR(50),
    TeacherId INT,
    MonthlyFee DECIMAL(10,2) DEFAULT 0.00,
    MaxStudents INT DEFAULT 30,
    Status ENUM('Active', 'Inactive') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (TeacherId) REFERENCES teachers(TeacherId) ON DELETE SET NULL
);

-- ============================================================
-- 4. Students Table
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    StudentId INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    FatherName VARCHAR(100),
    MotherName VARCHAR(100),
    StudentPhone VARCHAR(15),
    ParentPhone VARCHAR(15),
    Address TEXT,
    Class VARCHAR(20),
    DateOfBirth DATE,
    AdmissionDate DATE DEFAULT (CURRENT_DATE),
    BatchId INT,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    PhotoPath VARCHAR(255),
    Gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    BloodGroup VARCHAR(5),
    Status ENUM('Active', 'Inactive', 'Graduated') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (BatchId) REFERENCES batches(BatchId) ON DELETE SET NULL
);

-- ============================================================
-- 5. Attendance Table
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    AttendanceId INT AUTO_INCREMENT PRIMARY KEY,
    StudentId INT NOT NULL,
    BatchId INT,
    Date DATE NOT NULL,
    Status ENUM('Present', 'Absent', 'Late') NOT NULL DEFAULT 'Present',
    MarkedBy INT,
    Remarks VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES students(StudentId) ON DELETE CASCADE,
    FOREIGN KEY (BatchId) REFERENCES batches(BatchId) ON DELETE SET NULL,
    FOREIGN KEY (MarkedBy) REFERENCES teachers(TeacherId) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (StudentId, BatchId, Date)
);

-- ============================================================
-- 6. Fees Table
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
    FeeId INT AUTO_INCREMENT PRIMARY KEY,
    StudentId INT NOT NULL,
    Month VARCHAR(20) NOT NULL,
    Year INT NOT NULL,
    TotalFee DECIMAL(10,2) NOT NULL,
    PaidAmount DECIMAL(10,2) DEFAULT 0.00,
    RemainingAmount DECIMAL(10,2) GENERATED ALWAYS AS (TotalFee - PaidAmount) STORED,
    PaymentDate DATE,
    PaymentMethod ENUM('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online') DEFAULT 'Cash',
    ReceiptNumber VARCHAR(50) UNIQUE,
    Status ENUM('Paid', 'Partial', 'Pending') DEFAULT 'Pending',
    Remarks VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES students(StudentId) ON DELETE CASCADE
);

-- ============================================================
-- 7. Homework Table
-- ============================================================
CREATE TABLE IF NOT EXISTS homework (
    HomeworkId INT AUTO_INCREMENT PRIMARY KEY,
    BatchId INT NOT NULL,
    TeacherId INT,
    Title VARCHAR(200) NOT NULL,
    Description TEXT,
    Subject VARCHAR(100),
    UploadDate DATE DEFAULT (CURRENT_DATE),
    DueDate DATE,
    FilePath VARCHAR(255),
    Status ENUM('Active', 'Expired') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BatchId) REFERENCES batches(BatchId) ON DELETE CASCADE,
    FOREIGN KEY (TeacherId) REFERENCES teachers(TeacherId) ON DELETE SET NULL
);

-- ============================================================
-- 8. Tests Table
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
    TestId INT AUTO_INCREMENT PRIMARY KEY,
    BatchId INT NOT NULL,
    Subject VARCHAR(100),
    TestName VARCHAR(200) NOT NULL,
    TestDate DATE NOT NULL,
    TestTime TIME,
    MaximumMarks INT DEFAULT 100,
    Duration VARCHAR(50),
    Description TEXT,
    Status ENUM('Upcoming', 'Completed', 'Cancelled') DEFAULT 'Upcoming',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BatchId) REFERENCES batches(BatchId) ON DELETE CASCADE
);

-- ============================================================
-- 9. Results Table
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
    ResultId INT AUTO_INCREMENT PRIMARY KEY,
    StudentId INT NOT NULL,
    TestId INT NOT NULL,
    MarksObtained DECIMAL(5,2),
    Percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((MarksObtained / (SELECT MaximumMarks FROM tests t WHERE t.TestId = results.TestId)) * 100, 2)) STORED,
    Grade VARCHAR(5),
    Remarks VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentId) REFERENCES students(StudentId) ON DELETE CASCADE,
    FOREIGN KEY (TestId) REFERENCES tests(TestId) ON DELETE CASCADE,
    UNIQUE KEY unique_result (StudentId, TestId)
);

-- ============================================================
-- 10. Notices Table
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
    NoticeId INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(200) NOT NULL,
    Description TEXT,
    PublishDate DATE DEFAULT (CURRENT_DATE),
    Audience ENUM('All', 'Students', 'Teachers', 'Parents') DEFAULT 'All',
    Priority ENUM('Normal', 'Important', 'Urgent') DEFAULT 'Normal',
    PostedBy VARCHAR(100),
    Status ENUM('Active', 'Archived') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 11. Timetable Table
-- ============================================================
CREATE TABLE IF NOT EXISTS timetable (
    TimetableId INT AUTO_INCREMENT PRIMARY KEY,
    BatchId INT NOT NULL,
    Day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    Subject VARCHAR(100),
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    TeacherId INT,
    Room VARCHAR(50),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BatchId) REFERENCES batches(BatchId) ON DELETE CASCADE,
    FOREIGN KEY (TeacherId) REFERENCES teachers(TeacherId) ON DELETE SET NULL
);

-- ============================================================
-- 12. Reminders Table
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
    ReminderId INT AUTO_INCREMENT PRIMARY KEY,
    Type ENUM('Fee', 'Homework', 'Test', 'Attendance', 'General') NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Description TEXT,
    TargetDate DATE,
    TargetId INT,
    IsRead BOOLEAN DEFAULT FALSE,
    Audience ENUM('All', 'Students', 'Teachers', 'Admin') DEFAULT 'All',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. Fee Receipts Table
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_receipts (
    ReceiptId INT AUTO_INCREMENT PRIMARY KEY,
    FeeId INT NOT NULL,
    ReceiptNumber VARCHAR(50) NOT NULL UNIQUE,
    StudentId INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    PaymentDate DATE NOT NULL,
    PaymentMethod VARCHAR(50),
    GeneratedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FeeId) REFERENCES fees(FeeId) ON DELETE CASCADE,
    FOREIGN KEY (StudentId) REFERENCES students(StudentId) ON DELETE CASCADE
);

-- ============================================================
-- Seed Data
-- ============================================================

-- Default Admin (password: admin123)
INSERT INTO admin (Username, PasswordHash, FullName, Email) VALUES 
('admin', '$2b$10$defaulthash', 'Administrator', 'admin@manthaninstitute.com');

-- Sample Teachers
INSERT INTO teachers (Name, Subject, Phone, Email, Username, Password) VALUES
('Rajesh Kumar', 'Mathematics', '9876543210', 'rajesh@manthan.com', 'rajesh', 'teacher123'),
('Priya Sharma', 'Science', '9876543211', 'priya@manthan.com', 'priya', 'teacher123'),
('Amit Verma', 'English', '9876543212', 'amit@manthan.com', 'amit', 'teacher123'),
('Sunita Devi', 'Hindi', '9876543213', 'sunita@manthan.com', 'sunita', 'teacher123'),
('Vikram Singh', 'Social Science', '9876543214', 'vikram@manthan.com', 'vikram', 'teacher123');

-- Sample Batches
INSERT INTO batches (BatchName, Class, Subject, Timing, TeacherId, MonthlyFee) VALUES
('Class 1 - Morning', '1st', 'All Subjects', '8:00 AM - 10:00 AM', 1, 500.00),
('Class 2 - Morning', '2nd', 'All Subjects', '8:00 AM - 10:00 AM', 2, 600.00),
('Class 3 - Morning', '3rd', 'All Subjects', '10:00 AM - 12:00 PM', 3, 700.00),
('Class 4 - Afternoon', '4th', 'All Subjects', '2:00 PM - 4:00 PM', 4, 800.00),
('Class 5 - Afternoon', '5th', 'All Subjects', '2:00 PM - 4:00 PM', 5, 900.00),
('Class 6 - Morning', '6th', 'Mathematics', '8:00 AM - 10:00 AM', 1, 1000.00),
('Class 6 - Science', '6th', 'Science', '10:00 AM - 12:00 PM', 2, 1000.00),
('Class 7 - Mathematics', '7th', 'Mathematics', '8:00 AM - 10:00 AM', 1, 1100.00),
('Class 8 - Mathematics', '8th', 'Mathematics', '10:00 AM - 12:00 PM', 1, 1200.00),
('Class 9 - Science', '9th', 'Science', '2:00 PM - 4:00 PM', 2, 1500.00),
('Class 10 - Mathematics', '10th', 'Mathematics', '4:00 PM - 6:00 PM', 1, 1800.00),
('Class 11 - Physics', '11th', 'Physics', '6:00 PM - 8:00 PM', 2, 2000.00);

-- Sample Students
INSERT INTO students (FullName, FatherName, MotherName, StudentPhone, ParentPhone, Address, Class, DateOfBirth, AdmissionDate, BatchId, Username, Password, Gender, Status) VALUES
('Aarav Patel', 'Suresh Patel', 'Meena Patel', '9001000001', '9001000002', '123 Main Street, City', '6th', '2014-03-15', '2025-04-01', 6, 'aarav', 'student123', 'Male', 'Active'),
('Ananya Singh', 'Rajiv Singh', 'Kavita Singh', '9001000003', '9001000004', '456 Park Road, City', '6th', '2014-07-22', '2025-04-01', 6, 'ananya', 'student123', 'Female', 'Active'),
('Rohan Sharma', 'Vikash Sharma', 'Sunita Sharma', '9001000005', '9001000006', '789 Lake View, City', '7th', '2013-11-08', '2025-04-01', 8, 'rohan', 'student123', 'Male', 'Active'),
('Diya Gupta', 'Alok Gupta', 'Neha Gupta', '9001000007', '9001000008', '321 Hill Road, City', '8th', '2012-05-30', '2025-04-01', 9, 'diya', 'student123', 'Female', 'Active'),
('Arjun Kumar', 'Manoj Kumar', 'Geeta Devi', '9001000009', '9001000010', '654 River Side, City', '9th', '2011-01-14', '2025-04-01', 10, 'arjun', 'student123', 'Male', 'Active'),
('Ishika Verma', 'Rahul Verma', 'Pooja Verma', '9001000011', '9001000012', '987 Garden Lane, City', '10th', '2010-09-25', '2025-04-01', 11, 'ishika', 'student123', 'Female', 'Active'),
('Karan Joshi', 'Deepak Joshi', 'Anita Joshi', '9001000013', '9001000014', '147 Temple Street, City', '11th', '2009-12-03', '2025-04-01', 12, 'karan', 'student123', 'Male', 'Active'),
('Priya Mishra', 'Sanjay Mishra', 'Rekha Mishra', '9001000015', '9001000016', '258 Market Road, City', '5th', '2015-06-18', '2025-04-01', 5, 'priyam', 'student123', 'Female', 'Active'),
('Vivaan Reddy', 'Krishna Reddy', 'Lakshmi Reddy', '9001000017', '9001000018', '369 Station Road, City', '4th', '2016-02-28', '2025-04-01', 4, 'vivaan', 'student123', 'Male', 'Active'),
('Saanvi Nair', 'Arun Nair', 'Divya Nair', '9001000019', '9001000020', '480 College Road, City', '3rd', '2017-08-12', '2025-04-01', 3, 'saanvi', 'student123', 'Female', 'Active');

-- Sample Attendance (Last 7 days)
INSERT INTO attendance (StudentId, BatchId, Date, Status, MarkedBy) VALUES
(1, 6, CURDATE(), 'Present', 1),
(2, 6, CURDATE(), 'Present', 1),
(3, 8, CURDATE(), 'Absent', 1),
(4, 9, CURDATE(), 'Present', 1),
(5, 10, CURDATE(), 'Late', 2),
(6, 11, CURDATE(), 'Present', 1),
(7, 12, CURDATE(), 'Present', 2),
(8, 5, CURDATE(), 'Absent', 5),
(9, 4, CURDATE(), 'Present', 4),
(10, 3, CURDATE(), 'Present', 3);

-- Sample Fees
INSERT INTO fees (StudentId, Month, Year, TotalFee, PaidAmount, PaymentDate, PaymentMethod, ReceiptNumber, Status) VALUES
(1, 'January', 2026, 1000.00, 1000.00, '2026-01-05', 'Cash', 'REC-2026-001', 'Paid'),
(1, 'February', 2026, 1000.00, 1000.00, '2026-02-03', 'UPI', 'REC-2026-002', 'Paid'),
(1, 'March', 2026, 1000.00, 1000.00, '2026-03-04', 'Cash', 'REC-2026-003', 'Paid'),
(1, 'April', 2026, 1000.00, 500.00, '2026-04-10', 'Cash', 'REC-2026-004', 'Partial'),
(1, 'May', 2026, 1000.00, 0.00, NULL, NULL, NULL, 'Pending'),
(2, 'January', 2026, 1000.00, 1000.00, '2026-01-06', 'UPI', 'REC-2026-005', 'Paid'),
(2, 'February', 2026, 1000.00, 1000.00, '2026-02-05', 'Cash', 'REC-2026-006', 'Paid'),
(2, 'March', 2026, 1000.00, 0.00, NULL, NULL, NULL, 'Pending'),
(3, 'January', 2026, 1100.00, 1100.00, '2026-01-07', 'Bank Transfer', 'REC-2026-007', 'Paid'),
(3, 'February', 2026, 1100.00, 0.00, NULL, NULL, NULL, 'Pending'),
(4, 'January', 2026, 1200.00, 1200.00, '2026-01-03', 'Cash', 'REC-2026-008', 'Paid'),
(5, 'January', 2026, 1500.00, 1500.00, '2026-01-04', 'UPI', 'REC-2026-009', 'Paid'),
(6, 'January', 2026, 1800.00, 1800.00, '2026-01-05', 'Cash', 'REC-2026-010', 'Paid'),
(7, 'January', 2026, 2000.00, 0.00, NULL, NULL, NULL, 'Pending');

-- Sample Homework
INSERT INTO homework (BatchId, TeacherId, Title, Description, Subject, DueDate) VALUES
(6, 1, 'Chapter 5 Exercises', 'Complete all exercises from Chapter 5 - Algebraic Expressions', 'Mathematics', DATE_ADD(CURDATE(), INTERVAL 3 DAY)),
(7, 2, 'Science Lab Report', 'Write a detailed lab report on the photosynthesis experiment', 'Science', DATE_ADD(CURDATE(), INTERVAL 5 DAY)),
(8, 1, 'Quadratic Equations', 'Solve problems 1-20 from NCERT textbook', 'Mathematics', DATE_ADD(CURDATE(), INTERVAL 2 DAY)),
(10, 2, 'Physics Numericals', 'Complete all numerical problems from Chapter 8', 'Science', DATE_ADD(CURDATE(), INTERVAL 4 DAY)),
(11, 1, 'Trigonometry Worksheet', 'Complete the attached trigonometry worksheet', 'Mathematics', DATE_ADD(CURDATE(), INTERVAL 7 DAY));

-- Sample Tests
INSERT INTO tests (BatchId, Subject, TestName, TestDate, TestTime, MaximumMarks, Duration, Status) VALUES
(6, 'Mathematics', 'Unit Test 1 - Algebra', DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:00:00', 50, '1 hour', 'Upcoming'),
(7, 'Science', 'Mid-Term Exam', DATE_ADD(CURDATE(), INTERVAL 10 DAY), '09:00:00', 100, '3 hours', 'Upcoming'),
(8, 'Mathematics', 'Weekly Test - Geometry', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00', 25, '30 mins', 'Upcoming'),
(10, 'Science', 'Physics Practical', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '14:00:00', 50, '2 hours', 'Upcoming'),
(12, 'Physics', 'Chapter Test - Mechanics', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '16:00:00', 30, '45 mins', 'Upcoming'),
(6, 'Mathematics', 'Previous Unit Test', DATE_SUB(CURDATE(), INTERVAL 15 DAY), '10:00:00', 50, '1 hour', 'Completed'),
(8, 'Mathematics', 'Monthly Test - March', DATE_SUB(CURDATE(), INTERVAL 30 DAY), '10:00:00', 100, '2 hours', 'Completed');

-- Sample Results
INSERT INTO results (StudentId, TestId, MarksObtained, Grade, Remarks) VALUES
(1, 6, 42, 'A', 'Excellent performance'),
(2, 6, 38, 'B+', 'Good effort'),
(3, 7, 85, 'A+', 'Outstanding'),
(4, 7, 72, 'B', 'Can improve');

-- Sample Notices
INSERT INTO notices (Title, Description, PublishDate, Audience, Priority, PostedBy) VALUES
('Summer Break Schedule', 'The institute will remain closed from June 1 to June 15 for summer break. All pending homework must be submitted before May 30.', CURDATE(), 'All', 'Important', 'Admin'),
('Annual Day Celebration', 'Annual day will be celebrated on May 25. All students are requested to participate actively.', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Students', 'Normal', 'Admin'),
('Parent-Teacher Meeting', 'PTM scheduled for May 20. Parents are requested to attend without fail.', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'All', 'Urgent', 'Admin'),
('New Batch Starting', 'New batch for Class 11 Physics starting from next Monday. Interested students may contact the office.', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Students', 'Normal', 'Admin'),
('Fee Reminder', 'Students with pending fees are requested to clear their dues before the month end.', CURDATE(), 'Students', 'Important', 'Admin');

-- Sample Timetable
INSERT INTO timetable (BatchId, Day, Subject, StartTime, EndTime, TeacherId, Room) VALUES
(6, 'Monday', 'Mathematics', '08:00:00', '10:00:00', 1, 'Room 1'),
(6, 'Wednesday', 'Mathematics', '08:00:00', '10:00:00', 1, 'Room 1'),
(6, 'Friday', 'Mathematics', '08:00:00', '10:00:00', 1, 'Room 1'),
(7, 'Tuesday', 'Science', '10:00:00', '12:00:00', 2, 'Lab 1'),
(7, 'Thursday', 'Science', '10:00:00', '12:00:00', 2, 'Lab 1'),
(7, 'Saturday', 'Science', '10:00:00', '12:00:00', 2, 'Lab 1'),
(8, 'Monday', 'Mathematics', '10:00:00', '12:00:00', 1, 'Room 2'),
(8, 'Wednesday', 'Mathematics', '10:00:00', '12:00:00', 1, 'Room 2'),
(9, 'Tuesday', 'Mathematics', '10:00:00', '12:00:00', 1, 'Room 3'),
(10, 'Monday', 'Science', '14:00:00', '16:00:00', 2, 'Lab 1'),
(11, 'Tuesday', 'Mathematics', '16:00:00', '18:00:00', 1, 'Room 1'),
(12, 'Wednesday', 'Physics', '18:00:00', '20:00:00', 2, 'Lab 1');

-- Sample Reminders
INSERT INTO reminders (Type, Title, Description, TargetDate, IsRead, Audience) VALUES
('Fee', 'Fee Due Reminder', '5 students have pending fees for this month', DATE_ADD(CURDATE(), INTERVAL 5 DAY), FALSE, 'Admin'),
('Test', 'Upcoming Test', 'Unit Test 1 for Class 6 Mathematics scheduled in 5 days', DATE_ADD(CURDATE(), INTERVAL 5 DAY), FALSE, 'All'),
('Homework', 'Homework Due', 'Chapter 5 Exercises due in 3 days', DATE_ADD(CURDATE(), INTERVAL 3 DAY), FALSE, 'Students'),
('Attendance', 'Low Attendance Alert', '3 students have attendance below 75%', CURDATE(), FALSE, 'Admin'),
('General', 'PTM Reminder', 'Parent-Teacher Meeting scheduled for May 20', '2026-05-20', FALSE, 'All');
