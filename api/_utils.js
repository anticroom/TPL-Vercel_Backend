import jwt from 'jsonwebtoken';
import { query } from './_db.js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_UPDATE_WEBHOOK_URL = process.env.DISCORD_UPDATE_WEBHOOK_URL;
const DISCORD_UPDATE_WEBHOOK_URL_2 = process.env.DISCORD_UPDATE_WEBHOOK_URL_2;
const DISCORD_COMPLETION_WEBHOOK_URL = process.env.DISCORD_COMPLETION_WEBHOOK_URL;

function buildChangesDiff(oldData, newData) {
    let diffs = [];
    const oldObj = oldData || {};
    const newObj = newData || {};
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of keys) {
        if (key === 'records' || key === 'updated_at' || key === '_id') continue;

        const oldVal = oldObj[key];
        const newVal = newObj[key];

        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

        const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal);
        const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal);

        const isOldEmpty = oldVal === undefined || oldVal === null || oldVal === '';
        const isNewEmpty = newVal === undefined || newVal === null || newVal === '';

        if (isOldEmpty && !isNewEmpty) {
            diffs.push(`Added "${newStr}" to **${key}**`);
        } else if (!isOldEmpty && isNewEmpty) {
            diffs.push(`Removed "${oldStr}" from **${key}**`);
        } else {
            diffs.push(`Changed **${key}** "${oldStr}"\nto "${newStr}"`);
        }
    }
    return diffs.join('\n\n');
}

export async function getLogins() {
    try {
        const result = await query("SELECT data FROM public.system WHERE key = '_logins'");

        if (result.rows.length === 0) {
            return { management: [], admins: [] };
        }

        return result.rows[0].data;
    } catch (err) {
        console.error("Database Error (getLogins):", err);
        return { management: [], admins: [] };
    }
}

export async function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { management, admins, mods } = await getLogins();
        const allUsers = [...(management || []), ...(admins || []), ...(mods || [])];
        
        if (!allUsers.some(u => u.username.toLowerCase() === decoded.username.toLowerCase())) {
            throw new Error('User revoked');
        }
        
        return decoded;
    } catch (err) {
        throw new Error('Invalid or expired token');
    }
}

export async function auditLog(decodedUser, action, details) {
    if (!decodedUser || !decodedUser.username) return;

    const listType = details.list || 'TPCL';
    const tableName = listType === 'TPL' ? 'public.levels_2' : 'public.levels';

    const updateWebhook = listType === 'TPL' ? DISCORD_UPDATE_WEBHOOK_URL_2 : DISCORD_UPDATE_WEBHOOK_URL;

    if (updateWebhook) {
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
                console.error("Database Error (getNeighbors):", e);
                return "";
            }
        };

        switch (action) {
            case "ADD_LEVEL":
            case "APPROVE_LEVEL_SUBMISSION":
            case "APPROVE_SUBMISSION":
                if (action === "APPROVE_SUBMISSION" && details.type !== 'level' && !details.rank) break;

                const targetPlacement = details.placement || details.rank;
                const targetName = details.level?.name || details.levelName || details.level || details.name;

                if (targetName && targetPlacement) {
                    const neighbors = await getNeighbors(targetPlacement);
                    publicMsg = `## ${listType} List Update\n- **${targetName}** has been placed at **#${targetPlacement}**${neighbors}`;
                }
                break;

            case "DELETE_LEVEL":
                if (details.level) {
                    const name = details.level.name || details.level;
                    const rankStr = details.rank ? ` (was **#${details.rank}**)` : "";
                    publicMsg = `## ${listType} List Update\n- **${name}** has been removed from the list${rankStr}`;
                }
                break;

            case "LEVEL_REORDER":
                if (details.level && details.oldPos && details.newPos) {
                    const neighbors = await getNeighbors(details.newPos);
                    const name = details.level.name || details.level;
                    publicMsg = `## ${listType} List Update\n- **${name}** has been moved to **#${details.newPos}**${neighbors}\n(Previously #${details.oldPos})`;
                }
                break;

            case "BULK_PROCESS":
                if (details.action === 'approve') {
                    for (const sub of details.submissions) {
                        if (sub.type === 'level') {
                            const rank = sub.rank || sub.placement;
                            const name = sub.name || sub.levelName;
                            if (name && rank) {
                                const neighbors = await getNeighbors(rank);
                                const targetList = sub.list || listType;
                                const msg = `## ${targetList} List Update\n- **${name}** has been placed at **#${rank}**${neighbors}`;

                                try {
                                    const targetHook = targetList === 'TPL' ? DISCORD_UPDATE_WEBHOOK_URL_2 : DISCORD_UPDATE_WEBHOOK_URL;
                                    await fetch(targetHook, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            content: msg,
                                            username: "LIST UPDATES",
                                            avatar_url: "https://denouementdl.vercel.app/list_icon.png"
                                        })
                                    });
                                } catch (e) { console.error("Webhook Error (Bulk Level):", e); }
                            }
                        }
                    }
                }
                break;
        }

        if (publicMsg) {
            try {
                await fetch(updateWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: publicMsg,
                        username: "LIST UPDATES",
                        avatar_url: "https://denouementdl.vercel.app/list_icon.png"
                    })
                });
            } catch (e) {
                console.error("Webhook Error (Update Webhook):", e);
            }
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

                const oldMap = new Map(oldRecs.map(r => [r.user?.toLowerCase(), r.user]));
                const newMap = new Map(newRecs.map(r => [r.user?.toLowerCase(), r.user]));

                const addedUsers = [];
                const removedUsers = [];

                newRecs.forEach(r => {
                    if (!oldMap.has(r.user?.toLowerCase())) addedUsers.push(r.user);
                });

                oldRecs.forEach(r => {
                    if (!newMap.has(r.user?.toLowerCase())) removedUsers.push(r.user);
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
            } catch (e) {
                console.error("Webhook Error (EDIT_LEVEL Diff):", e);
            }
        }
        else if (action === "APPROVE_RECORD_SUBMISSION" || action === "APPROVE_SUBMISSION") {
            if (details.username && details.percent !== undefined) {
                completionMsg = `Added **${details.username}**'s record for **${details.levelName}** (${details.percent}%)`;
            }
        }
        else if (action === "DENY_SUBMISSION" && details.type !== 'level') {
            completionMsg = `Denied **${details.username}**'s record for **${details.name}** (${details.percent}%)\nReason: ${details.reason}`;
        }
        else if (action === "BULK_PROCESS") {
            const actionVerb = details.action === 'approve' ? 'Approved' : 'Denied';
            const reasonStr = details.reason ? `\n\nReason: ${details.reason}` : '';

            // Filter to ONLY include records
            const recordsOnly = details.submissions.filter(s => s.type !== 'level');

            if (recordsOnly.length > 0) {
                const lines = recordsOnly.map(s => {
                    return `Record: ${s.username} on ${s.levelName || s.name} (${s.percent}%)`;
                });

                let list = lines.join('\n');
                if (list.length > 1500) list = list.substring(0, 1490) + '...';

                completionMsg = `**Records ${actionVerb}:**\n${list}${reasonStr}`;
            }
        }

        if (completionMsg) {
            try {
                await fetch(DISCORD_COMPLETION_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: completionMsg,
                        username: "Completion Updates",
                        avatar_url: "https://denouementdl.vercel.app/list_icon.png"
                    })
                });
            } catch (e) {
                console.error("Webhook Error (Completion Webhook):", e);
            }
        }
    }

    if (!DISCORD_WEBHOOK_URL) return;

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" });
    let embedColor = 0xFFA500;
    let displayTitle = `Admin Action: ${action}`;
    let displayFields = [];
    let fileAttachment = null;
    let fileName = null;

    const userRoleLabel = decodedUser.username.toLowerCase() === 'anticroom'
        ? 'Developer'
        : (decodedUser.role === 'management' ? 'Owner' : (decodedUser.role === 'admin' ? 'Admin' : 'mod'));

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
                ? `Submission Approved: Level Added (${listType})`
                : `New Level Added (${listType})`;

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
            displayTitle = "Level Edited Manually";
            displayFields = [
                userField,
                { name: "Level Name", value: details.newLevel?.name || "Unknown", inline: true },
                { name: "List", value: listType, inline: true }
            ];

            const levelDiff = buildChangesDiff(details.oldLevel, details.newLevel);
            if (levelDiff) {
                const safeDiff = levelDiff.length > 1000 ? levelDiff.substring(0, 995) + "..." : levelDiff;
                displayFields.push({ name: "Changes", value: safeDiff, inline: false });
            }

            if (details.reason) displayFields.push({ name: "Reason", value: details.reason, inline: false });
            break;

        case "ADD_STAFF":
        case "EDIT_STAFF":
            displayTitle = action === "ADD_STAFF" ? "Staff Member Added" : "Staff Member Edited";
            embedColor = 0x9B59B6;
            displayFields = [
                userField,
                { name: "Target User", value: details.targetUser || "Unknown", inline: true }
            ];

            if (details.oldData || details.newData) {
                const staffDiff = buildChangesDiff(details.oldData, details.newData);
                if (staffDiff) {
                    const safeDiff = staffDiff.length > 1000 ? staffDiff.substring(0, 995) + "..." : staffDiff;
                    displayFields.push({ name: "Changes", value: safeDiff, inline: false });
                }
            } else if (details.role) {
                displayFields.push({ name: "Role Added/Changed", value: details.role, inline: false });
            }
            break;

        case "DELETE_LEVEL":
            embedColor = 0xFF0000;
            displayTitle = "Level Deleted";
            displayFields = [
                userField,
                { name: "Level Name", value: details.level?.name || "Unknown", inline: true },
                { name: "Rank", value: `#${details.rank || "???"}`, inline: true }
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

        case "BULK_PROCESS":
            embedColor = details.action === 'approve' ? 0x00AA00 : 0xFF3333;
            displayTitle = `Bulk Submission ${details.action === 'approve' ? 'Approved' : 'Denied'}`;

            const lines = details.submissions.map(s => {
                if (s.type === 'level') return `- Level: ${s.name}`;
                return `- Record: ${s.username} on ${s.levelName || s.name} (${s.percent}%)`;
            });

            let chunk = lines.join('\n');
            if (chunk.length > 1000) chunk = chunk.substring(0, 995) + '...';

            displayFields = [
                userField,
                { name: "Items Processed", value: `${details.submissions.length} items`, inline: true }
            ];

            if (details.reason) {
                displayFields.push({ name: "Reason", value: details.reason, inline: false });
            }

            displayFields.push({ name: "Details", value: chunk || "No details", inline: false });
            break;

        default:
            displayFields = [
                userField,
                { name: "Level info", value: `\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`` }
            ];
            break;
    }

    const payloadJson = {
        username: "TPL Staff Logs",
        avatar_url: "https://thepisslist.com/list_icon.png",
        embeds: [{
            title: displayTitle,
            color: embedColor,
            fields: displayFields,
            footer: { text: `TPL Audit • ${timestamp} UTC` }
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
    } catch (err) {
        console.error("Webhook Error (Main Discord Payload):", err);
    }
}