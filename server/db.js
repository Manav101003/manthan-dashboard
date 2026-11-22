require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'manthan_institute',
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 10
});

pool.on('connect', () => console.log('✅ PostgreSQL Connected'));
pool.on('error', (err) => console.error('❌ PG Error:', err.message));

module.exports = pool;
