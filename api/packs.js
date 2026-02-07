import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        try {
            const result = await query("SELECT * FROM public.packs ORDER BY name ASC");
            return res.status(200).json(result.rows);
        } catch (error) {
            console.error("Failed to fetch packs:", error);
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const decoded = verifyToken(req);
            const { action } = req.body;

            if (action === 'save') {
                const { id, name, color, levels } = req.body;
                if (!id || !name) return res.status(400).json({ error: "Missing fields" });

                await query(
                    `INSERT INTO public.packs (id, name, color, levels)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO UPDATE 
                     SET name = $2, color = $3, levels = $4`,
                    [id, name, color, levels]
                );

                await auditLog(decoded, "UPDATE_PACK", { pack: name, levels: levels.length });
                return res.status(200).json({ success: true });
            }

            if (action === 'delete') {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: "Missing ID" });

                await query("DELETE FROM public.packs WHERE id = $1", [id]);
                await auditLog(decoded, "DELETE_PACK", { id });
                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ error: "Invalid action" });

        } catch (error) {
            console.error("Pack Admin Error:", error);
            return res.status(401).json({ error: "Unauthorized or Server Error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}