import pg from 'pg';

// use the pooler url
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // required for Supabase
});

export const query = (text, params) => pool.query(text, params);