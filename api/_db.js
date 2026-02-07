import pg from 'pg';

// Use the Pooler URL
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

export const query = (text, params) => pool.query(text, params);