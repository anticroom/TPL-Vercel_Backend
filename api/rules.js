import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const result = await query("SELECT data FROM public.system WHERE key = 'rules'");
            const rules = result.rows.length > 0 ? result.rows[0].data : { level_rules: [], record_rules: [] };
            return res.status(200).json({ rules });
        }

        if (req.method === 'POST') {
            const decoded = verifyToken(req);
            const { rules } = req.body;

            const oldResult = await query("SELECT data FROM public.system WHERE key = 'rules'");
            let oldData = oldResult.rows.length > 0 ? oldResult.rows[0].data : { level_rules: [], record_rules: [] };

            if (typeof oldData === 'string') {
                oldData = { level_rules: oldData.split(/\r?\n/).filter(Boolean), record_rules: [] };
            }

            const flattenRules = (dataObj) => {
                if (!dataObj) return [];
                const levels = (dataObj.level_rules || []).map(r => `[Level] ${r.trim()}`);
                const records = (dataObj.record_rules || []).map(r => `[Record] ${r.trim()}`);
                return [...levels, ...records];
            };

            const oldLines = flattenRules(oldData);
            const newLines = flattenRules(rules);

            const added = newLines.filter(x => !oldLines.includes(x));
            const removed = oldLines.filter(x => !newLines.includes(x));
            
            let changeSummary = [];

            if (added.length > 0) added.forEach(line => changeSummary.push(`**Added:** "${line}"`));
            if (removed.length > 0) removed.forEach(line => changeSummary.push(`**Removed:** "${line}"`));

            if (changeSummary.length === 0) {
                changeSummary.push("Rules reordered or minor formatting updates.");
            }

            await query(
                `INSERT INTO public.system (key, data) 
                 VALUES ('rules', $1) 
                 ON CONFLICT (key) DO UPDATE SET data = $1`,
                [rules] 
            );

            // 4. Log the changes
            await auditLog(decoded, "UPDATE_RULES", { changes: changeSummary });

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}