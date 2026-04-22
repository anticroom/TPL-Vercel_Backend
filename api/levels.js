import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const listType = req.query.type || 'TPCL';
        const tableName = listType === 'TPL' ? 'public.levels_2' : 'public.levels';
        const levelId = req.query.id;
        const full = req.query.full === 'true';

        if (levelId) {
            const result = await query(`SELECT data->'records' AS records FROM ${tableName} WHERE id = $1`, [levelId]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Level not found" });
            return res.status(200).json(result.rows[0].records || []);
        }

        const selectData = full ? 'data' : "data - 'records' AS data";
        const result = await query(`SELECT id, name, rank, ${selectData} FROM ${tableName} ORDER BY rank ASC`);
        
        const levels = result.rows.map(row => ({
            ...row.data,
            _id: row.id,
            name: row.name,       
            rank: row.rank        
        }));

        return res.status(200).json(levels);

    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
}