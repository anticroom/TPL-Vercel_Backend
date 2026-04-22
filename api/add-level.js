import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

function sanitizeRecords(records) {
    if (!Array.isArray(records)) return [];
    const unique = [];
    const seen = new Set();
    
    const sorted = [...records].sort((a, b) => (b.percent || 0) - (a.percent || 0));
    
    for (const r of sorted) {
        if (!r.user) continue;
        const userKey = r.user.toLowerCase().trim();
        if (!seen.has(userKey)) {
            seen.add(userKey);
            unique.push(r);
        }
    }
    return unique;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const decoded = await verifyToken(req);
        const { levelData, placement, type } = req.body;

        if (!levelData || !levelData.name) return res.status(400).json({ error: 'Missing level data or name' });

        if (decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Only admins can add levels' });
        }

        const listName = type === 'TPL' ? 'TPL' : 'TPCL';
        const tableName = type === 'TPL' ? 'public.levels_2' : 'public.levels';
        const realName = levelData.name;

        if (levelData.records) {
            levelData.records = sanitizeRecords(levelData.records);
        }

        let targetRank = placement;

        if (!targetRank) {
            const maxResult = await query(`SELECT MAX(rank) as max_rank FROM ${tableName}`);
            targetRank = parseInt(maxResult.rows[0]?.max_rank || 0) + 1;
        }

        // Push everything down to make room
        await query(`UPDATE ${tableName} SET rank = rank + 1 WHERE rank >= $1`, [targetRank]);

        // Insert the new level
        await query(
            `INSERT INTO ${tableName} (name, rank, data) VALUES ($1, $2, $3)`,
            [realName, targetRank, levelData]
        );

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

        await auditLog(decoded, "ADD_LEVEL", {
            level: levelData,
            placement: targetRank,
            list: listName
        });

        res.status(200).json({ success: true, message: `Level added to ${listName}` });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}