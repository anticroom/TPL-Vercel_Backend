import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const type = (req.query.type || req.body.type || 'TPCL').toUpperCase();
        const dbKey = type === 'TPL' ? 'rules_TPL' : 'rules_TPCL';

        if (req.method === 'GET') {
            const result = await query("SELECT data FROM public.system WHERE key = $1", [dbKey]);
            const rules = result.rows.length > 0 ? result.rows[0].data : [];
            return res.status(200).json({ rules, type });
        }

        if (req.method === 'POST') {
            const decoded = await verifyToken(req);
            const { rules } = req.body;

            if (decoded.role !== 'admin' && decoded.role !== 'management') {
                await auditLog(decoded, "UNAUTHORIZED_ACCESS", { target: "Rules Management" });
                return res.status(403).json({ error: 'Only admins and owners can edit rules' });
            }

            if (!Array.isArray(rules)) {
                return res.status(400).json({ error: "Invalid rules format. Expected an array of sections." });
            }

            const oldResult = await query("SELECT data FROM public.system WHERE key = $1", [dbKey]);
            let oldData = oldResult.rows.length > 0 ? oldResult.rows[0].data : [];

            const flattenRules = (data) => {
                if (!data) return [];
                if (Array.isArray(data)) {
                    return data.flatMap(section => {
                        const prefix = `[${section.header || 'Unnamed Section'}]`;
                        return (section.rules || []).map(r => `${prefix} ${r.trim()}`);
                    });
                }
                const levels = (data.level_rules || []).map(r => `[Level Rules] ${r.trim()}`);
                const records = (data.record_rules || []).map(r => `[Record Rules] ${r.trim()}`);
                return [...levels, ...records];
            };

            const oldLines = flattenRules(oldData);
            const newLines = flattenRules(rules);

            const added = newLines.filter(x => !oldLines.includes(x));
            const removed = oldLines.filter(x => !newLines.includes(x));
            
            let changeSummary = [];
            if (added.length > 0) added.forEach(line => changeSummary.push(`**Added:** "${line}"`));
            if (removed.length > 0) removed.forEach(line => changeSummary.push(`**Removed:** "${line}"`));

            if (changeSummary.length === 0) changeSummary.push("Rules updated.");

            await query(
                `INSERT INTO public.system (key, data) 
                 VALUES ($1, $2::jsonb) 
                 ON CONFLICT (key) DO UPDATE SET data = $2::jsonb`,
                [dbKey, JSON.stringify(rules)] 
            );

            await auditLog(decoded, "UPDATE_RULES", { changes: changeSummary, list: type });

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}