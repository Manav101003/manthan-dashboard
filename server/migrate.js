// ─── Database migrations (idempotent) ───
// Works with both pg.Pool (server) and pg.Client (setup-db).

async function runMigrations(db) {
    // Missing core tables referenced by the server
    await db.query(`
        CREATE TABLE IF NOT EXISTS student_batches (
            StudentId INTEGER NOT NULL,
            BatchId INTEGER NOT NULL,
            UNIQUE(StudentId, BatchId)
        );
        CREATE TABLE IF NOT EXISTS notifications (
            NotifId SERIAL PRIMARY KEY,
            StudentId INTEGER,
            Type TEXT,
            Title TEXT,
            Message TEXT,
            IsRead INTEGER DEFAULT 0,
            CreatedAt TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS payment_requests (
            PaymentId SERIAL PRIMARY KEY,
            StudentId INTEGER,
            FeeId INTEGER,
            Amount REAL,
            TransactionId TEXT,
            PaymentScreenshot TEXT,
            Status TEXT DEFAULT 'Pending',
            SubmittedAt TIMESTAMP DEFAULT NOW(),
            VerifiedAt TIMESTAMP,
            VerifiedBy TEXT,
            UPITransactionId TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            SettingKey TEXT PRIMARY KEY,
            SettingValue TEXT
        );
    `);

    // Test enhancements: Drive link + online MCQ support
    await db.query(`
        ALTER TABLE tests ADD COLUMN IF NOT EXISTS DriveLink TEXT;
        ALTER TABLE tests ADD COLUMN IF NOT EXISTS TestType TEXT DEFAULT 'Paper';
        CREATE TABLE IF NOT EXISTS test_questions (
            QuestionId SERIAL PRIMARY KEY,
            TestId INTEGER REFERENCES tests(TestId) ON DELETE CASCADE,
            QuestionText TEXT NOT NULL,
            OptionA TEXT,
            OptionB TEXT,
            OptionC TEXT,
            OptionD TEXT,
            CorrectOption TEXT NOT NULL,
            Marks REAL DEFAULT 1,
            OrderIndex INTEGER DEFAULT 0,
            CreatedAt TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS test_attempts (
            AttemptId SERIAL PRIMARY KEY,
            TestId INTEGER REFERENCES tests(TestId) ON DELETE CASCADE,
            StudentId INTEGER,
            Answers TEXT,
            Score REAL DEFAULT 0,
            TotalMarks REAL DEFAULT 0,
            CorrectCount INTEGER DEFAULT 0,
            TotalQuestions INTEGER DEFAULT 0,
            SubmittedAt TIMESTAMP DEFAULT NOW(),
            UNIQUE(StudentId, TestId)
        );
    `);

    // Fees: UPI transaction reference used when approving a submitted payment
    await db.query(`
        ALTER TABLE fees ADD COLUMN IF NOT EXISTS UPITransactionId TEXT;
    `);

    // Backfill the junction table from the primary BatchId
    await db.query(`
        INSERT INTO student_batches (StudentId, BatchId)
        SELECT s.StudentId, s.BatchId FROM students s
        WHERE s.BatchId IS NOT NULL
        ON CONFLICT DO NOTHING
    `);

    // Default settings (never overwrite existing values)
    const defaults = [
        ['instituteName', 'Mathan Institute of Career Development'],
        ['address', 'Main Branch, City'],
        ['phone', '+91 98765 43210'],
        ['email', 'info@manthaninstitute.com'],
        ['upiId', process.env.UPI_ID || ''],
        ['upiName', process.env.UPI_NAME || 'Mathan Institute'],
        ['qrImage', '']
    ];
    for (const [k, v] of defaults) {
        await db.query('INSERT INTO settings (SettingKey, SettingValue) VALUES ($1,$2) ON CONFLICT (SettingKey) DO NOTHING', [k, v]);
    }
}

module.exports = { runMigrations };
