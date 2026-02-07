import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const result = await query('SELECT id, name, rank, data FROM public.levels ORDER BY rank ASC');
        
        const levels = result.rows.map(row => ({
            ...row.data,
            _id: row.id,
            name: row.name,       
            rank: row.rank        
        }));

        res.status(200).json(levels);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Failed to fetch levels" });
    }
}