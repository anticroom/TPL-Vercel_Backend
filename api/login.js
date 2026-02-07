import jwt from 'jsonwebtoken';
import { getLogins, verifyToken } from './_utils.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            try {
                // verifyToken throws an error if token is invalid/expired
                verifyToken(req);
                return res.status(200).json({ success: true, message: "Token valid" });
            } catch (error) {
                return res.status(401).json({ success: false, error: "Invalid or expired token" });
            }
        }

        if (req.method === 'POST') {
            const { username, email, password } = req.body;
            const { management, admins } = await getLogins();

            if (!management || management.length === 0) {
                console.error("[CRITICAL ERROR] Management list is empty.");
            }

            // Check Management
            let user = management.find(u => 
                u.username.toLowerCase() === username.toLowerCase() && 
                u.email.toLowerCase() === email.toLowerCase() &&
                u.password === password
            );
            let role = 'management';

            // Check Admins if not found
            if (!user) {
                user = admins.find(u => 
                    u.username.toLowerCase() === username.toLowerCase() && 
                    u.email.toLowerCase() === email.toLowerCase() && 
                    u.password === password
                );
                role = 'admin';
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { 
                    username: user.username, 
                    email: user.email,
                    role: role 
                }, 
                process.env.JWT_SECRET, 
                { expiresIn: '7d' }
            );

            return res.status(200).json({ success: true, token, role });
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error("[LOGIN SERVER ERROR]", error);
        return res.status(500).json({ error: 'Server Error' });
    }
}