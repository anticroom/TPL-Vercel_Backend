import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const decoded = verifyToken(req);
        let { oldIndex, newIndex } = req.body;

        const oldRank = oldIndex + 1;
        const newRank = newIndex + 1;

        if (oldRank === newRank) return res.status(200).json({ success: true });

        const levelRes = await query(
            "SELECT id, name FROM public.levels WHERE rank = $1",
            [oldRank]
        );

        if (levelRes.rows.length === 0) return res.status(404).json({ error: "Level not found at that index" });

        const { id, name } = levelRes.rows[0];

        if (oldRank < newRank) {
            await query(
                'UPDATE public.levels SET rank = rank - 1 WHERE rank > $1 AND rank <= $2',
                [oldRank, newRank]
            );
        } else {
            await query(
                'UPDATE public.levels SET rank = rank + 1 WHERE rank >= $1 AND rank < $2',
                [newRank, oldRank]
            );
        }

        await query('UPDATE public.levels SET rank = $1 WHERE id = $2', [newRank, id]);

        await auditLog(decoded, "LEVEL_REORDER", {
            level: name,
            oldPos: oldRank,
            newPos: newRank
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Move Level Error:", error);
        res.status(500).json({ error: error.message });
    }
}