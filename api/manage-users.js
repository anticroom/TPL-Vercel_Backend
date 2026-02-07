import { verifyToken, auditLog, getLogins } from './_utils.js';
import { query } from './_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const decoded = verifyToken(req);
        const loginsData = await getLogins();

        const currentManagement = loginsData.management || [];
        const currentAdmins = loginsData.admins || [];
        
        const liveUser = currentManagement.find(u => u.username.toLowerCase() === decoded.username.toLowerCase()) || 
                         currentAdmins.find(u => u.username.toLowerCase() === decoded.username.toLowerCase());

        if (!liveUser) {
            console.log(`[SECURITY] Blocked deleted user: ${decoded.username}`);
            return res.status(401).json({ error: "Session expired: User no longer exists." });
        }

        if (decoded.role === 'management' && !currentManagement.some(u => u.username.toLowerCase() === decoded.username.toLowerCase())) {
            return res.status(403).json({ error: "Access Denied: Your privileges have changed." });
        }

        if (decoded.role !== 'management') {
            await auditLog(decoded, "UNAUTHORIZED_ACCESS", { target: "User Management" });
            return res.status(403).json({ error: "Access Denied." });
        }

        const isDeveloper = decoded.username.toLowerCase() === 'anticroom';

        if (req.method === 'GET') {
            const response = {
                admins: loginsData.admins || []
            };

            if (isDeveloper) {
                response.management = loginsData.management || [];
            } else {
                response.management = (loginsData.management || []).map(u => {
                    const { password, ...safeUser } = u;
                    return { ...safeUser, password: null };
                });
            }
            
            return res.status(200).json(response);
        }

        if (req.method === 'POST') {
            let newAdmins = req.body.admins || req.body.users || [];
            let newManagement = req.body.management || loginsData.management || []; 

            if (!Array.isArray(newAdmins)) return res.status(400).json({ error: 'Invalid admin data' });

            if (req.body.management && !isDeveloper) {
                return res.status(403).json({ error: "Only the Developer can modify Management users." });
            }

            const allUsers = [...newManagement, ...newAdmins];
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
            
            if (isDeveloper) {
                // Ensure Developer is never accidentally deleted
                const devExists = newManagement.some(u => u.username.toLowerCase() === 'anticroom');
                if (!devExists && loginsData.management) {
                    const originalDev = loginsData.management.find(u => u.username.toLowerCase() === 'anticroom');
                    if (originalDev) newManagement.unshift(originalDev);
                }
                loginsData.management = newManagement;
            }

            await query(
                `INSERT INTO public.system (key, data)
                 VALUES ('_logins', $1)
                 ON CONFLICT (key) DO UPDATE SET data = $1`,
                [loginsData]
            );

            // Log
            await auditLog(decoded, "UPDATE_ADMINS", { count: allUsers.length });
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}