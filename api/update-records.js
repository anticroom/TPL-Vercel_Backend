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
        const { oldLevelId, newLevelData } = req.body;

        if (!oldLevelId || !newLevelData) return res.status(400).json({ error: 'Missing Data' });

        const findRes = await query("SELECT id, name, rank, data FROM public.levels WHERE id = $1", [oldLevelId]);

        if (findRes.rows.length === 0) {
            return res.status(404).json({ error: 'Level not found' });
        }

        const currentDBRow = findRes.rows[0];
        const oldContent = currentDBRow.data;

        const updatedContent = {
            ...oldContent,
            ...newLevelData
        };

        const newName = updatedContent.name || currentDBRow.name;

        await query(
            'UPDATE public.levels SET data = $1, name = $2 WHERE id = $3',
            [updatedContent, newName, oldLevelId]
        );

        await auditLog(decoded, "EDIT_LEVEL", {
            oldLevel: oldContent,
            newLevel: updatedContent,
            rank: currentDBRow.rank
        });

        res.status(200).json({ success: true, level: updatedContent });

    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
}