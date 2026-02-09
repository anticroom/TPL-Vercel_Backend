import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const decoded = verifyToken(req);
        const { levelData, placement } = req.body;

        if (!levelData || !levelData.name) return res.status(400).json({ error: 'Missing level data or name' });

        const realName = levelData.name;

        await query('BEGIN');

        try {
            let targetRank = placement;

            if (!targetRank) {
                const maxResult = await query('SELECT MAX(rank) as max_rank FROM public.levels');
                targetRank = (maxResult.rows[0]?.max_rank || 0) + 1;
            }

            await query('UPDATE public.levels SET rank = rank + 1 WHERE rank >= $1', [targetRank]);

            await query(
                'INSERT INTO public.levels (name, rank, data) VALUES ($1, $2, $3)',
                [realName, targetRank, levelData]
            );

            await query('COMMIT');

            await auditLog(decoded, "ADD_LEVEL", {
                level: levelData,
                placement: targetRank
            });

            res.status(200).json({ success: true, message: "Level added to database" });

        } catch (innerError) {
            await query('ROLLBACK');
            throw innerError;
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}