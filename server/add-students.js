require('dotenv').config();
const { Client } = require('pg');

async function addStudents() {
    const db = new Client({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: parseInt(process.env.DB_PORT) });
    await db.connect();

    // Batch IDs reference:
    // Class 3: Math=11, Sci=12, Eng=13, Hindi=14, SS=15
    // Class 5: Math=21, Sci=22, Eng=23, Hindi=24, SS=25
    // Class 6: Math=26, Sci=27
    // Class 8: Math=30, Sci=31
    // Class 9: Math=32, Sci=33
    // Class 10: Math=34, Sci=35
    // Class 11: Math=36, Sci=37

    const students = [
        // Class 10 - Maths only
        { name: 'Aayasha',   cls: '10th', batch: 34 },
        { name: 'Aarti',     cls: '10th', batch: 34 },
        { name: 'Janvi',     cls: '10th', batch: 34 },
        { name: 'Vanshika',  cls: '10th', batch: 34 },
        { name: 'Kanishka',  cls: '10th', batch: 34 },
        { name: 'Moksha',    cls: '10th', batch: 34 },
        { name: 'Kavyansh',  cls: '10th', batch: 34 },
        { name: 'Elash',     cls: '10th', batch: 34 },
        { name: 'Mayanak',   cls: '10th', batch: 34 },
        // Class 9 - Maths & Science (primary batch = Maths)
        { name: 'Nishu',     cls: '9th',  batch: 32 },
        { name: 'Ansh',      cls: '9th',  batch: 32 },
        { name: 'Mahek',     cls: '9th',  batch: 32 },
        { name: 'Twinkle',   cls: '9th',  batch: 32 },
        // Class 8 - Maths & Science
        { name: 'Kartik',    cls: '8th',  batch: 30 },
        { name: 'Souravh',   cls: '8th',  batch: 30 },
        { name: 'Tanisha',   cls: '8th',  batch: 30 },
        { name: 'Aayush',    cls: '8th',  batch: 30 },
        // Class 9 - Maths only
        { name: 'Virddhi',   cls: '9th',  batch: 32 },
        // Class 3 - All subjects (primary batch = Maths)
        { name: 'Krishna',   cls: '3rd',  batch: 11 },
        // Class 11 - Maths & Science
        { name: 'Yuvraj',    cls: '11th', batch: 36 },
        { name: 'Vanshika',  cls: '11th', batch: 36 },
        // Class 5 - Maths & Science
        { name: 'Ishika',    cls: '5th',  batch: 21 },
        // Class 8 - Maths & Science
        { name: 'Yash',      cls: '8th',  batch: 30 },
        // Class 3 - All subjects
        { name: 'Harshit',   cls: '3rd',  batch: 11 },
        // Class 8 - Maths & Science
        { name: 'Rohan',     cls: '8th',  batch: 30 },
        // Class 6 - Maths & Science
        { name: 'Vedita',    cls: '6th',  batch: 26 },
    ];

    let added = 0;
    for (const s of students) {
        const clsNum = s.cls.replace(/[^0-9]/g, '');
        const username = s.name + '@' + clsNum;
        const password = s.name + '@123';
        try {
            await db.query(
                'INSERT INTO students (FullName, Class, BatchId, Username, Password, Status) VALUES ($1,$2,$3,$4,$5,$6)',
                [s.name, s.cls, s.batch, username, password, 'Active']
            );
            added++;
            console.log('  +', s.name, '(' + s.cls + ') ->', username);
        } catch (e) {
            console.log('  SKIP', s.name, '-', e.message.substring(0, 60));
        }
    }

    console.log('\nDone! Added ' + added + ' students.');
    await db.end();
}

addStudents().catch(e => { console.error(e.message); process.exit(1); });
