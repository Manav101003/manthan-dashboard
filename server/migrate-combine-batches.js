require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
    const db = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'manthan_institute',
        port: parseInt(process.env.DB_PORT) || 5432
    });
    await db.connect();
    console.log('✅ Connected to database');

    const classes6to10 = ['6th', '7th', '8th', '9th', '10th'];

    for (const cls of classes6to10) {
        console.log(`\n═══ Processing Class ${cls} ═══`);

        // Find existing Mathematics and Science batches for this class
        const mathBatch = (await db.query("SELECT * FROM batches WHERE Class=$1 AND Subject='Mathematics'", [cls])).rows[0];
        const sciBatch = (await db.query("SELECT * FROM batches WHERE Class=$1 AND Subject='Science'", [cls])).rows[0];
        // Check if combined already exists
        const existingCombined = (await db.query("SELECT * FROM batches WHERE Class=$1 AND Subject='Maths + Science'", [cls])).rows[0];

        if (existingCombined) {
            console.log(`  ⏭️  Combined batch already exists (ID: ${existingCombined.batchid}), skipping.`);
            continue;
        }

        if (!mathBatch && !sciBatch) {
            console.log(`  ⏭️  No Math/Science batches found, skipping.`);
            continue;
        }

        // Use the math batch's fee/timing as base, or science if math doesn't exist
        const baseBatch = mathBatch || sciBatch;
        const fee = Math.max(
            parseFloat(mathBatch?.monthlyfee || 0),
            parseFloat(sciBatch?.monthlyfee || 0)
        );

        // Create the combined batch
        const combinedResult = await db.query(
            'INSERT INTO batches (BatchName, Class, Subject, Timing, TeacherId, MonthlyFee, Status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING BatchId',
            [`Class ${cls} - Maths + Science`, cls, 'Maths + Science', baseBatch.timing, baseBatch.teacherid, fee, 'Active']
        );
        const combinedId = combinedResult.rows[0].batchid;
        console.log(`  ✅ Created combined batch ID: ${combinedId}`);

        const oldBatchIds = [];
        if (mathBatch) oldBatchIds.push(mathBatch.batchid);
        if (sciBatch) oldBatchIds.push(sciBatch.batchid);
        console.log(`  📋 Old batch IDs to merge: ${oldBatchIds.join(', ')}`);

        // 1. Move students: update BatchId to combined batch
        for (const oldId of oldBatchIds) {
            const r = await db.query('UPDATE students SET BatchId=$1 WHERE BatchId=$2', [combinedId, oldId]);
            console.log(`  👨‍🎓 Moved ${r.rowCount} students from batch ${oldId}`);
        }

        // 2. Update student_batches junction table
        for (const oldId of oldBatchIds) {
            // First, get students in the old batch
            const sbRows = (await db.query('SELECT StudentId FROM student_batches WHERE BatchId=$1', [oldId])).rows;
            for (const sb of sbRows) {
                // Insert into combined batch (ignore if already there)
                await db.query('INSERT INTO student_batches (StudentId, BatchId) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sb.studentid, combinedId]);
            }
            // Delete old entries
            const r = await db.query('DELETE FROM student_batches WHERE BatchId=$1', [oldId]);
            console.log(`  🔗 Migrated ${sbRows.length} student_batches entries from batch ${oldId}`);
        }

        // 3. Update attendance records
        for (const oldId of oldBatchIds) {
            const r = await db.query('UPDATE attendance SET BatchId=$1 WHERE BatchId=$2', [combinedId, oldId]);
            console.log(`  📅 Moved ${r.rowCount} attendance records from batch ${oldId}`);
        }

        // 4. Update homework
        for (const oldId of oldBatchIds) {
            const r = await db.query('UPDATE homework SET BatchId=$1 WHERE BatchId=$2', [combinedId, oldId]);
            console.log(`  📝 Moved ${r.rowCount} homework entries from batch ${oldId}`);
        }

        // 5. Update tests
        for (const oldId of oldBatchIds) {
            const r = await db.query('UPDATE tests SET BatchId=$1 WHERE BatchId=$2', [combinedId, oldId]);
            console.log(`  📊 Moved ${r.rowCount} tests from batch ${oldId}`);
        }

        // 6. Update timetable
        for (const oldId of oldBatchIds) {
            const r = await db.query('UPDATE timetable SET BatchId=$1 WHERE BatchId=$2', [combinedId, oldId]);
            console.log(`  🕐 Moved ${r.rowCount} timetable entries from batch ${oldId}`);
        }

        // 7. Delete old separate batches
        for (const oldId of oldBatchIds) {
            await db.query('DELETE FROM batches WHERE BatchId=$1', [oldId]);
            console.log(`  🗑️  Deleted old batch ${oldId}`);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════');
    const allBatches = (await db.query("SELECT BatchId, BatchName, Class, Subject FROM batches ORDER BY Class")).rows;
    console.log('Final batch structure:');
    for (const b of allBatches) {
        console.log(`  ${b.batchname} (${b.class}) → ${b.subject}`);
    }

    await db.end();
    console.log('\n✅ Migration complete!');
}

migrate().catch(e => { console.error('❌ Migration error:', e.message); process.exit(1); });
