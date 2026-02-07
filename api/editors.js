import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const result = await query("SELECT data FROM public.system WHERE key = '_editors'");
        if (result.rows.length === 0) return res.json([]);
        
        res.status(200).json(result.rows[0].data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch editors" });
    }
}