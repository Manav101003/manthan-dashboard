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
-- Seed data intentionally omitted.
-- Create the admin login with: npm run setup-db
