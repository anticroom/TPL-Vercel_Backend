import jwt from 'jsonwebtoken';
import { query } from './_db.js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_UPDATE_WEBHOOK_URL = process.env.DISCORD_UPDATE_WEBHOOK_URL;
const DISCORD_COMPLETION_WEBHOOK_URL = process.env.DISCORD_COMPLETION_WEBHOOK_URL;

export async function getLogins() {
    try {
        const result = await query("SELECT data FROM public.system WHERE key = '_logins'");
        
        if (result.rows.length === 0) {
            console.warn("Warning: '_logins' key not found in public.system table.");
            return { management: [], admins: [] };
        }
        
        return result.rows[0].data;
    } catch (err) {
        console.error("Failed to fetch logins from DB:", err);
        return { management: [], admins: [] };
    }
}

export function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}

export async function auditLog(decodedUser, action, details) {
    const pingsrole = "<@&1415163645431644210>";
    if (!decodedUser || !decodedUser.username) return;

    if (DISCORD_UPDATE_WEBHOOK_URL) {
        let publicMsg = null;
        
        switch (action) {
            case "ADD_LEVEL":
                if (details.level && details.placement) {
                    publicMsg = `'${details.level.name}' Added **#${details.placement}**\n${pingsrole}`;
                }
                break;
            case "DELETE_LEVEL":
                if (details.level) {
                    const rankStr = details.rank ? ` **#${details.rank}**` : "";
                    publicMsg = `'${details.level.name}' Removed${rankStr}\n${pingsrole}`;
                }
                break;
            case "LEVEL_REORDER":
                if (details.level && details.oldPos && details.newPos) {
                    publicMsg = `'${details.level}' Moved from **#${details.oldPos}** to **#${details.newPos}**\n${pingsrole}`;
                }
                break;
        }

        if (publicMsg) {
            try {
                await fetch(DISCORD_UPDATE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        content: publicMsg,
                        username: "LIST UPDATES",
                        avatar_url: "https://thepisslist.com/list_icon.png"
                    })
                });
            } catch (e) { console.error("Updates webhook failed!", e); }
        }
    }

    if (DISCORD_COMPLETION_WEBHOOK_URL && action === "EDIT_LEVEL") {
        try {
            const oldRecs = details.oldLevel.records || [];
            const newRecs = details.newLevel.records || [];
            const levelName = details.newLevel.name || "Unknown Level";
            const rankStr = details.rank ? `#${details.rank}` : "#???";

            const oldMap = new Map(oldRecs.map(r => [r.user.toLowerCase(), r.user]));
            const newMap = new Map(newRecs.map(r => [r.user.toLowerCase(), r.user]));

            const addedUsers = [];
            const removedUsers = [];

            newRecs.forEach(r => {
                if (!oldMap.has(r.user.toLowerCase())) {
                    addedUsers.push(r.user);
                }
            });

            oldRecs.forEach(r => {
                if (!newMap.has(r.user.toLowerCase())) {
                    removedUsers.push(r.user);
                }
            });

            const messages = [];

            if (addedUsers.length > 0 && removedUsers.length === 0) {
                messages.push(`Added ${addedUsers.join(', ')}'s record for ${levelName} **${rankStr}**`);
            } 
            else if (removedUsers.length > 0 && addedUsers.length === 0) {
                messages.push(`Removed ${removedUsers.join(', ')}'s record for ${levelName} **${rankStr}**`);
            }

            if (messages.length > 0) {
                const finalContent = messages.join('\n');
                await fetch(DISCORD_COMPLETION_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        content: finalContent,
                        username: "TPL Completion Updates",
                        avatar_url: "https://thepisslist.com/list_icon.png"
                    })
                });
            }

        } catch (e) { console.error("Completion webhook failed!", e); }
    }

    if (!DISCORD_WEBHOOK_URL) return;

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" });
    console.log(`[AUDIT] ${decodedUser.username} (${action})`);

    let embedColor = 0xFFA500; 
    let displayTitle = `Admin Action: ${action}`;
    let displayFields = [];
    let fileAttachment = null;
    let fileName = null;

    const userRoleLabel = decodedUser.username.toLowerCase() === 'anticroom' 
        ? 'Developer' 
        : (decodedUser.role === 'management' ? 'Owner' : 'Admin');

    const userField = { 
        name: "User", 
        value: `${decodedUser.username} (${userRoleLabel})`, 
        inline: true 
    };

    switch (action) {
        case "ADD_LEVEL":
            embedColor = 0x00FF00;
            displayTitle = `New Level Added at #${details.placement}`;
            const lvl = details.level || {};
            const vid = lvl.verification || lvl.video || lvl.verificationVid || "N/A";
            
            let victorsText = "None";
            const victorList = lvl.records || lvl.list || [];
            
            if (Array.isArray(victorList) && victorList.length > 0) {
                const names = victorList.map(v => v.user || v.name || "Unknown");
                victorsText = names.join(', ');
                if (victorsText.length > 1000) victorsText = victorsText.substring(0, 1000) + "...";
            }

            displayFields = [
                userField,
                { name: "Level Name", value: lvl.name || "N/A", inline: true },
                { name: "Creator", value: lvl.author || "N/A", inline: true },
                { name: "Verifier", value: lvl.verifier || "N/A", inline: true },
                { name: "Verification", value: vid, inline: false },
                { name: "Victors", value: victorsText, inline: false }
            ];
            break;

        case "EDIT_LEVEL":
            embedColor = 0xFFA500;
            displayTitle = "Level Edited";
            const oldLvl = details.oldLevel || {};
            const newLvl = details.newLevel || {};
            let changesList = [];
            
            const allKeys = new Set([...Object.keys(oldLvl), ...Object.keys(newLvl)]);
            
            for (const key of allKeys) {
                if (['id', 'position', 'rank', 'filename'].includes(key)) continue;
                const oldVal = oldLvl[key];
                const newVal = newLvl[key];
                
                if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

                if (key === 'records' || key === 'list') {
                    const oldRecs = Array.isArray(oldVal) ? oldVal : [];
                    const newRecs = Array.isArray(newVal) ? newVal : [];
                    const recordDiffs = [];
                    
                    const oldMap = new Map(oldRecs.map(r => [r.user.toLowerCase(), r]));
                    const newMap = new Map(newRecs.map(r => [r.user.toLowerCase(), r]));

                    newMap.forEach((r, u) => {
                        if (!oldMap.has(u)) recordDiffs.push(`+ Added record for **${r.user}**`);
                        else if (JSON.stringify(r) !== JSON.stringify(oldMap.get(u))) recordDiffs.push(`~ Updated record for **${r.user}**`);
                    });
                    oldMap.forEach((r, u) => { if (!newMap.has(u)) recordDiffs.push(`- Removed record for **${r.user}**`); });

                    if (recordDiffs.length > 0) changesList.push(`**${key}:**\n${recordDiffs.join('\n')}`);
                } else {
                    const formatVal = (v) => typeof v === 'string' ? v : JSON.stringify(v);
                    changesList.push(`**${key}:** Changed to "${formatVal(newVal)}" from "${formatVal(oldVal)}"`);
                }
            }
            if (changesList.length === 0) changesList.push("No specific changes detected.");
            displayFields = [
                userField,
                { name: "Level Name", value: newLvl.name || "Unknown", inline: true },
                { name: "Changes", value: changesList.join('\n').substring(0, 1024), inline: false }
            ];
            break;

        case "DELETE_LEVEL":
            embedColor = 0xFF0000;
            displayTitle = "Level Deleted";
            const delLvl = details.level || {};
            displayFields = [
                userField,
                { name: "Level Name", value: delLvl.name || "Unknown", inline: true },
                { name: "Previous Rank", value: details.rank ? `#${details.rank}` : "Unknown", inline: true },
                { name: "Creator", value: delLvl.author || "Unknown", inline: true },
                { name: "Backup", value: "The full JSON data of this level is attached below.", inline: false }
            ];
            fileAttachment = JSON.stringify(delLvl, null, 2);
            fileName = `${delLvl.name ? delLvl.name.replace(/[^a-z0-9]/gi, '_') : 'level'}_backup.json`;
            break;

        case "LEVEL_REORDER":
            embedColor = 0x3498DB; 
            displayTitle = "List Order Changed";
            displayFields = [
                userField,
                { name: "Level", value: details.level, inline: true },
                { name: "Movement", value: `Moved from #${details.oldPos} to #${details.newPos}`, inline: false }
            ];
            break;

        case "UPDATE_ADMINS":
            embedColor = 0xFF00FF; 
            displayTitle = "Staff Access Updated";
            
            let changeLog = "No specific changes detected.";
            if (details.changes && details.changes.length > 0) {
                changeLog = details.changes.join('\n');
            } else if (details.count) {
                changeLog = `List synced. Total active accounts: ${details.count}`;
            }

            displayFields = [
                userField,
                { name: "Changes", value: changeLog, inline: false }
            ];
            break;

        case "UPDATE_RULES":
            embedColor = 0x0099FF;
            displayTitle = "Rules Updated";
            
            let ruleChanges = "No changes found!";
            if (details.changes && details.changes.length > 0) {
                ruleChanges = details.changes.join('\n\n');
            }

            if (ruleChanges.length > 1000) {
                ruleChanges = ruleChanges.substring(0, 1000) + "... (Too long for Discord)";
            }

            displayFields = [
                userField,
                { name: "Changelog", value: ruleChanges, inline: false }
            ];
            break;

        case "UNAUTHORIZED_ACCESS":
            embedColor = 0x000000;
            displayTitle = "Unauthorized Access Attempt";
            displayFields = [
                userField,
                { name: "Target", value: details.target || "Unknown Endpoint", inline: true },
                { name: "Warning", value: `User attempted to access ${details.target || "restricted area"} without privileges.`, inline: false }
            ];
            break;

        default:
            displayFields = [
                userField,
                { name: "Raw Data", value: `\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`` }
            ];
            break;
    }

    const payloadJson = {
        username: "TPL Staff Logging",
        avatar_url: "https://thepisslist.com/list_icon.png",
        embeds: [{
            title: displayTitle,
            color: embedColor,
            fields: displayFields,
            footer: { text: `TPL Audit Logs • ${timestamp} UTC` }
        }]
    };

    try {
        if (fileAttachment) {
            const formData = new FormData();
            formData.append('payload_json', JSON.stringify(payloadJson));
            const blob = new Blob([fileAttachment], { type: 'application/json' });
            formData.append('file', blob, fileName);
            await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', body: formData });
        } else {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadJson)
            });
        }
    } catch (err) { console.error("Webhook failed:", err); }
}