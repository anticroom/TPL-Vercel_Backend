import { query } from './_db.js';
import { verifyToken } from './_utils.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const isVip = req.query.vip === 'true';
    const dbKey = isVip ? '_vips' : '_editors';

    if (req.method === 'GET') {
        try {
            const result = await query("SELECT data FROM public.system WHERE key = $1", [dbKey]);
            if (result.rows.length === 0) return res.json([]);
            res.status(200).json(result.rows[0].data); 
        } catch (error) {
            res.status(500).json({ error: `Failed to fetch ${isVip ? 'VIPs' : 'editors'}` });
        }
        return;
    }

    if (req.method === 'POST') {
        try {
            const decoded = await verifyToken(req);
            
            if (isVip) {
                if (!decoded || (decoded.role !== 'management' && decoded.role !== 'admin')) {
                    return res.status(403).json({ error: "Only admins and owners can edit the VIP members list" });
                }
            } else {
                if (!decoded || decoded.role !== 'management') {
                    return res.status(403).json({ error: "Only owners can edit the editors list" });
                }
            }

            const dataPayload = req.body;
            
            await query(
                "INSERT INTO public.system (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2",
                [dbKey, JSON.stringify(dataPayload)]
            );
            
            res.status(200).json({ success: true, message: `${isVip ? 'VIPs' : 'Editors'} list saved` });
        } catch (error) {
            console.error("Save error:", error);
            res.status(500).json({ error: `Failed to save ${isVip ? 'VIPs' : 'editors'}`, details: error.message });
        }
        return;
    }

    res.status(405).json({ error: "Method not allowed" });
}