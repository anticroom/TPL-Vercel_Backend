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
    if (!decodedUser || !decodedUser.username) return;

    const tableName = 'public.levels';
    const pingRole = "<@&1415163645431644210>";

    if (DISCORD_UPDATE_WEBHOOK_URL) {
        let publicMsg = null;
        
        const getNeighbors = async (rank) => {
            try {
                const res = await query(
                    `SELECT rank, name FROM ${tableName} WHERE rank = $1 OR rank = $2`, 
                    [rank - 1, rank + 1]
                );
                
                const levelBelowThis = res.rows.find(r => r.rank === rank - 1)?.name;
                const levelAboveThis = res.rows.find(r => r.rank === rank + 1)?.name;
                
                const parts = [];
                if (levelAboveThis) parts.push(`above **${levelAboveThis}**`);
                if (levelBelowThis) parts.push(`below **${levelBelowThis}**`);
                
                if (parts.length > 0) return `, ${parts.join(' and ')}`;
                return "";
            } catch (e) {
                console.error("Failed to fetch neighbors", e);
                return "";
            }
        };

        switch (action) {
            case "ADD_LEVEL":
            case "APPROVE_LEVEL_SUBMISSION":
                const targetPlacement = details.placement || details.rank;
                const targetName = details.level?.name || details.levelName || details.level;
                
                if (targetName && targetPlacement) {
                    const neighbors = await getNeighbors(targetPlacement);
                    publicMsg = `## List Update\n- **${targetName}** has been placed at **#${targetPlacement}**${neighbors}\n${pingRole}`;
                }
                break;

            case "DELETE_LEVEL":
                if (details.level) {
                    const name = details.level.name || details.level;
                    const rankStr = details.rank ? ` (was **#${details.rank}**)` : "";
                    publicMsg = `## List Update\n- **${name}** has been removed from the list${rankStr}\n${pingRole}`;
                }
                break;

            case "LEVEL_REORDER":
                if (details.level && details.oldPos && details.newPos) {
                    const neighbors = await getNeighbors(details.newPos);
                    const name = details.level.name || details.level;
                    publicMsg = `## List Update\n- **${name}** has been moved to **#${details.newPos}**${neighbors}\n(Previously #${details.oldPos})\n${pingRole}`;
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

    if (DISCORD_COMPLETION_WEBHOOK_URL) {
        let completionMsg = null;

        if (action === "EDIT_LEVEL") {
            try {
                const oldRecs = details.oldLevel?.records || [];
                const newRecs = details.newLevel?.records || [];
                const levelName = details.newLevel?.name || "Unknown Level";
                const rankStr = details.rank ? `#${details.rank}` : "#???";

                const oldMap = new Map(oldRecs.map(r => [r.user.toLowerCase(), r.user]));
                const newMap = new Map(newRecs.map(r => [r.user.toLowerCase(), r.user]));

                const addedUsers = [];
                const removedUsers = [];

                newRecs.forEach(r => {
                    if (!oldMap.has(r.user.toLowerCase())) addedUsers.push(r.user);
                });

                oldRecs.forEach(r => {
                    if (!newMap.has(r.user.toLowerCase())) removedUsers.push(r.user);
                });

                const messages = [];
                if (addedUsers.length > 0) {
                    const userList = addedUsers.length > 1 
                        ? addedUsers.slice(0, -1).join(', ') + ', and ' + addedUsers[addedUsers.length - 1]
                        : addedUsers[0];
                    messages.push(`Added ${userList}'s record${addedUsers.length > 1 ? 's' : ''} for ${levelName} **${rankStr}**`);
                }
                if (removedUsers.length > 0) {
                    const userList = removedUsers.length > 1 
                        ? removedUsers.slice(0, -1).join(', ') + ', and ' + removedUsers[removedUsers.length - 1]
                        : removedUsers[0];
                    messages.push(`Removed ${userList}'s record${removedUsers.length > 1 ? 's' : ''} from ${levelName} **${rankStr}**`);
                }
                if (messages.length > 0) completionMsg = messages.join('\n');
            } catch (e) { console.error("Error calculating record diff", e); }
        } 
        else if (action === "APPROVE_RECORD_SUBMISSION" || action === "APPROVE_SUBMISSION") {
            completionMsg = `Added **${details.username}**'s record for **${details.levelName}** (${details.percent}%)`;
        }

        if (completionMsg) {
            try {
                await fetch(DISCORD_COMPLETION_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        content: completionMsg,
                        username: "TPL Completion Updates",
                        avatar_url: "https://thepisslist.com/list_icon.png"
                    })
                });
            } catch (e) { console.error("Completion webhook failed!", e); }
        }
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
        : (decodedUser.role === 'management' ? 'Owner' : (decodedUser.role === 'mod' ? 'Mod' : 'Admin'));

    const userField = { 
        name: "User", 
        value: `${decodedUser.username} (${userRoleLabel})`, 
        inline: true 
    };

    switch (action) {
        case "ADD_LEVEL":
        case "APPROVE_LEVEL_SUBMISSION":
            embedColor = 0x00FF00;
            displayTitle = action === "APPROVE_LEVEL_SUBMISSION" 
                ? `Submission Approved: Level Added`
                : `New Level Added`;
            
            displayFields = [
                userField,
                { name: "Level Name", value: details.level?.name || details.levelName || "N/A", inline: true },
                { name: "Rank", value: `#${details.placement || details.rank || "???"}`, inline: true },
                { name: "Creator", value: details.level?.author || details.author || "N/A", inline: true }
            ];
            break;

        case "APPROVE_SUBMISSION":
        case "APPROVE_RECORD_SUBMISSION":
            embedColor = 0x00AA00;
            displayTitle = "Submission Approved: Record Added";
            displayFields = [
                userField,
                { name: "Level", value: details.levelName || "Unknown", inline: true },
                { name: "Player", value: details.username || "Unknown", inline: true },
                { name: "Percent", value: `${details.percent || 0}%`, inline: true }
            ];
            break;

        case "EDIT_LEVEL":
            embedColor = 0xFFA500;
            displayTitle = "Level Edited Manually";
            displayFields = [
                userField,
                { name: "Level Name", value: details.newLevel?.name || "Unknown", inline: true }
            ];
            if (details.reason) displayFields.push({ name: "Reason", value: details.reason, inline: false });
            break;

        case "DELETE_LEVEL":
            embedColor = 0xFF0000;
            displayTitle = "Level Deleted";
            displayFields = [
                userField,
                { name: "Level Name", value: details.level?.name || "Unknown", inline: true },
                { name: "Rank", value: `#${details.rank || "???"}`, inline: true },
                { name: "Backup", value: "The full JSON data of this level is attached below.", inline: false }
            ];
            fileAttachment = JSON.stringify(details.level, null, 2);
            fileName = `backup_${(details.level?.name || 'level').replace(/[^a-z0-9]/gi, '_')}.json`;
            break;

        case "DENY_SUBMISSION":
            embedColor = 0xFF3333;
            displayTitle = "Submission Denied";
            displayFields = [
                userField,
                { name: "Level/Record", value: details.name || details.levelName || "Unknown", inline: true },
                { name: "Submitter", value: details.username || "Unknown", inline: true },
                { name: "Reason", value: details.reason || "No reason provided", inline: false }
            ];
            break;

        case "LEVEL_REORDER":
            embedColor = 0x3498DB; 
            displayTitle = "Level Placement Changed";
            displayFields = [
                userField,
                { name: "Level", value: details.level?.name || details.level || "N/A", inline: true },
                { name: "Movement", value: `#${details.oldPos} ➔ #${details.newPos}`, inline: true }
            ];
            break;

        case "UPDATE_ADMINS":
        case "UPDATE_USERS":
            embedColor = 0xFF00FF; 
            displayTitle = "Staff Access Updated";
            
            let changeLog = "No specific changes detected.";
            if (details.changes && details.changes.length > 0) {
                changeLog = details.changes.join('\n');
            } else if (details.count) {
                changeLog = `List synced. Total active accounts: ${details.count}`;
            } else if (details.admins !== undefined || details.mods !== undefined) {
                changeLog = `List synced. Admins: ${details.admins || 0}, Mods: ${details.mods || 0}`;
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
