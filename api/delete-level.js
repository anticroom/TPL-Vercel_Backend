import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const decoded = await verifyToken(req);
        const { id, type } = req.body; 

        if (decoded.role !== 'admin' && decoded.role !== 'management') {
            await auditLog(decoded, "UNAUTHORIZED_ACCESS", { target: "Delete Level" });
            return res.status(403).json({ error: 'Only admins and owners can delete levels' });
        }

        if (!id) return res.status(400).json({ error: 'Level ID is required' });

        const listName = type === 'TPCL' ? 'TPL' : 'TPCL';
        const tableName = type === 'TPL' ? 'public.levels_2' : 'public.levels';

        const fetchRes = await query(`SELECT rank, data, name FROM ${tableName} WHERE id = $1`, [id]);
        
        if (fetchRes.rows.length === 0) {
            return res.status(404).json({ error: "Level not found" });
        }

        const { rank, data, name } = fetchRes.rows[0];

        // Delete the level
        await query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);

        const normalizeQuery = `
            WITH RankedLevels AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY rank ASC, id ASC) as expected_rank
                FROM ${tableName}
            )
            UPDATE ${tableName}
            SET rank = RankedLevels.expected_rank
            FROM RankedLevels
            WHERE ${tableName}.id = RankedLevels.id AND ${tableName}.rank IS DISTINCT FROM RankedLevels.expected_rank;
        `;
        await query(normalizeQuery);

        await auditLog(decoded, "DELETE_LEVEL", { 
            level: { ...data, name: name },
            rank: rank,
            list: listName
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("DELETE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
}