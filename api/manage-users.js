import { verifyToken, auditLog, getLogins } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const decoded = await verifyToken(req);
        const loginsData = await getLogins();

        const currentManagement = loginsData.management || [];
        const currentAdmins = loginsData.admins || [];
        const currentMods = loginsData.mods || [];
        
        const liveUser = currentManagement.find(u => u.username.toLowerCase() === decoded.username.toLowerCase()) || 
                         currentAdmins.find(u => u.username.toLowerCase() === decoded.username.toLowerCase()) ||
                         currentMods.find(u => u.username.toLowerCase() === decoded.username.toLowerCase());

        if (!liveUser) {
            console.log(`[SECURITY] Blocked deleted user: ${decoded.username}`);
            return res.status(401).json({ error: "Session expired: User no longer exists." });
        }

        if (decoded.role === 'management' && !currentManagement.some(u => u.username.toLowerCase() === decoded.username.toLowerCase())) {
            return res.status(403).json({ error: "Access Denied: Your privileges have changed." });
        }

        if (decoded.role !== 'management') {
            await auditLog(decoded, "UNAUTHORIZED_ACCESS", { target: "User Management" });
            return res.status(403).json({ error: "Access Denied: Only owners/developers can manage users." });
        }

        if (req.method === 'GET') {
            const response = {
                admins: loginsData.admins || [],
                mods: loginsData.mods || [],
                management: loginsData.management || []
            };
                return res.status(200).json(response);
        }

        if (req.method === 'POST') {
            let newAdmins = req.body.admins || [];
            let newMods = req.body.mods || [];
            let newManagement = req.body.management || loginsData.management || [];

            if (!Array.isArray(newAdmins)) return res.status(400).json({ error: 'Invalid admin data' });
            if (!Array.isArray(newMods)) return res.status(400).json({ error: 'Invalid mod data' });

            const allUsers = [...newManagement, ...newAdmins, ...newMods];
            const seenUsernames = new Set();
            const seenEmails = new Set();

            for (const user of allUsers) {
                if (!user.username || !user.email) continue;
                const lowerName = user.username.toLowerCase();
                const lowerEmail = user.email.toLowerCase();

                if (seenUsernames.has(lowerName)) return res.status(400).json({ error: `Username "${user.username}" is already taken.` });
                if (seenEmails.has(lowerEmail)) return res.status(400).json({ error: `Email "${user.email}" is already in use.` });

                seenUsernames.add(lowerName);
                seenEmails.add(lowerEmail);
            }

            loginsData.admins = newAdmins;
            loginsData.mods = newMods;
            
            const devExists = newManagement.some(u => u.username.toLowerCase() === 'anticroom');
            if (!devExists && loginsData.management) {
                const originalDev = loginsData.management.find(u => u.username.toLowerCase() === 'anticroom');
                if (originalDev) newManagement.unshift(originalDev);
            }
            loginsData.management = newManagement;

            await query(
                `INSERT INTO public.system (key, data)
                 VALUES ('_logins', $1)
                 ON CONFLICT (key) DO UPDATE SET data = $1`,
                [loginsData]
            );

            await auditLog(decoded, "UPDATE_USERS", { admins: newAdmins.length, mods: newMods.length });
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}