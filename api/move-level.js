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
        let { oldIndex, newIndex, type } = req.body;

        if (decoded.role !== 'admin' && decoded.role !== 'management') {
            await auditLog(decoded, "UNAUTHORIZED_ACCESS", { target: "Move Level" });
            return res.status(403).json({ error: 'Only admins and owners can move levels' });
        }

        const listName = type === 'TPL' ? 'TPL' : 'TPCL';
        const tableName = type === 'TPL' ? 'public.levels_2' : 'public.levels';

        const oldRank = oldIndex + 1;
        const newRank = newIndex + 1;

        if (oldRank < 1 || newRank < 1) {
            return res.status(400).json({ error: "Invalid move indices" });
        }

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

        if (oldRank === newRank) return res.status(200).json({ success: true });

        const levelRes = await query(
            `SELECT id, name FROM ${tableName} WHERE rank = $1`,
            [oldRank]
        );

        if (levelRes.rows.length === 0) return res.status(404).json({ error: "Level not found at that index" });

        const { id, name } = levelRes.rows[0];

        if (oldRank < newRank) {
            await query(
                `UPDATE ${tableName} SET rank = rank - 1 WHERE rank > $1 AND rank <= $2`,
                [oldRank, newRank]
            );
        } else {
            await query(
                `UPDATE ${tableName} SET rank = rank + 1 WHERE rank >= $1 AND rank < $2`,
                [newRank, oldRank]
            );
        }

        await query(`UPDATE ${tableName} SET rank = $1 WHERE id = $2`, [newRank, id]);

        await query(normalizeQuery);

        await auditLog(decoded, "LEVEL_REORDER", {
            level: name,
            oldPos: oldRank,
            newPos: newRank,
            list: listName
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Move Level Error:", error);
        res.status(500).json({ error: error.message });
    }
}