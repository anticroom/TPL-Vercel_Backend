import { verifyToken, auditLog } from './_utils.js';
import { query } from './_db.js';
import { randomUUID } from 'crypto';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const slurRegex = /\b(?:(?:ph|f)[a@]gg?(?:[i1]ng|[o0][t\+][s\$]?|[s\$])?|n+[i1]+[gq]+[e3]*r+[s\$]*|[s\$][l1]u[t\+][s\$]?|(?:c|k|ck|q)un[t\+](?:[s\$]?|[l1][i1](?:c|k|ck|q)(?:[e3]r|[i1]ng)?))\b/gi;
let isTableVerified = false;

function censorSlurs(text) {
    if (typeof text !== 'string') return text;
    return text.replace(slurRegex, (match) => '#'.repeat(match.length));
}

async function verifyTurnstileToken(token) {
    try {
        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token })
        });
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Turnstile Verification Error:", error);
        return false;
    }
}

function sanitizeRecords(records) {
    if (!Array.isArray(records)) return [];
    const unique = [];
    const seen = new Set();

    const sorted = [...records].sort((a, b) => (b.percent || 0) - (a.percent || 0));

    for (const r of sorted) {
        if (!r.user) continue;
        const userKey = r.user.toLowerCase().trim();
        if (!seen.has(userKey)) {
            seen.add(userKey);
            unique.push(r);
        }
    }
    return unique;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { action } = req.query;

        await ensureSubmissionsTable();

        if (action === 'submit') {
            return handleSubmitRecord(req, res);
        } else if (action === 'submit-level') {
            return handleSubmitLevel(req, res);
        } else if (action === 'public-view') {
            return handlePublicView(req, res);
        }

        const decoded = await verifyToken(req);

        if (action === 'view') {
            return handleGetSubmissions(req, res, decoded);
        } else if (action === 'process') {
            return handleProcessSubmission(req, res, decoded);
        } else if (action === 'bulk-process') {
            return handleBulkProcessSubmission(req, res, decoded);
        } else if (action === 'edit-submission') {
            return handleEditSubmission(req, res, decoded);
        } else if (!action || action === 'update') {
            return handleUpdateRecords(req, res, decoded);
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        res.status(error.message === 'No token provided' ? 401 : 500).json({ error: error.message });
    }
}

async function handlePublicView(req, res) {
    try {
        const listType = req.query.listType || 'DDL';
        const type = req.query.type || 'record';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        let conditions = ['list_type = $1', 'submission_type = $2'];
        let values = [listType, type];
        let paramCount = 3;

        if (status !== 'all') {
            conditions.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (search) {
            conditions.push(`(username ILIKE $${paramCount} OR level_name ILIKE $${paramCount} OR name ILIKE $${paramCount} OR author ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.join(' AND ');

        const countResult = await query(
            `SELECT COUNT(*) FROM public.submissions WHERE ${whereClause}`,
            values
        );
        const totalCount = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalCount / limit) || 1;

        const queryValues = [...values, limit, offset];
        const result = await query(
            `SELECT id, submission_type, level_name, username, percent, hz, video_link, notes, status, denial_reason, created_at, name, id_gd, author, verifier, verification, placement_suggestion 
             FROM public.submissions 
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            queryValues
        );

        return res.status(200).json({
            success: true,
            submissions: result.rows || [],
            totalPages,
            currentPage: page
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleSubmitRecord(req, res) {
    try {
        const { levelName, username, percent, hz, discord, videoLink, notes, turnstileToken, listType } = req.body;

        if (!turnstileToken) {
            return res.status(400).json({ error: 'Security verification failed. Please try again.' });
        }

        const isValidToken = await verifyTurnstileToken(turnstileToken);
        if (!isValidToken) {
            return res.status(400).json({ error: 'Security verification failed. Please try again.' });
        }

        if (!levelName || !username || percent === undefined || !videoLink) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (discord && discord.length < 2) {
            return res.status(400).json({ error: 'Invalid Discord username format' });
        }

        if (percent < 0 || percent > 100) {
            return res.status(400).json({ error: 'Percent must be between 0 and 100' });
        }

        if (!videoLink.startsWith('http')) {
            return res.status(400).json({ error: 'Invalid video link' });
        }

        const submissionId = randomUUID();

        const safeLevelName = censorSlurs(levelName);
        const safeUsername = censorSlurs(username);
        const safeDiscord = censorSlurs(discord);
        const safeNotes = censorSlurs(notes);

        const result = await query(
            `INSERT INTO public.submissions (id, level_name, username, percent, hz, discord, video_link, notes, status, list_type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING *`,
            [submissionId, safeLevelName, safeUsername, percent, hz || null, safeDiscord, videoLink, safeNotes || null, 'pending', listType || 'DDL']
        );

        return res.status(201).json({
            success: true,
            message: 'Submission received successfully',
            submission: result.rows[0]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleSubmitLevel(req, res) {
    try {
        const { name, id, author, verifier, verification, percentToQualify, placementSuggestion, notes, turnstileToken, listType } = req.body;

        if (!turnstileToken) {
            return res.status(400).json({ error: 'Security verification failed. Please try again.' });
        }

        const isValidToken = await verifyTurnstileToken(turnstileToken);
        if (!isValidToken) {
            return res.status(400).json({ error: 'Security verification failed. Please try again.' });
        }

        if (!name || !id || !author || !verification) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!verification.startsWith('http')) {
            return res.status(400).json({ error: 'Invalid verification video link' });
        }

        const submissionId = randomUUID();

        const safeName = censorSlurs(name);
        const safeAuthor = censorSlurs(author);
        const safeVerifier = censorSlurs(verifier);
        const safePlacementSuggestion = censorSlurs(placementSuggestion);
        const safeNotes = censorSlurs(notes);

        const result = await query(
            `INSERT INTO public.submissions (id, submission_type, name, id_gd, author, verifier, verification, percent_to_qualify, placement_suggestion, notes, status, list_type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
             RETURNING *`,
            [submissionId, 'level', safeName, id, safeAuthor, safeVerifier || null, verification, percentToQualify || 100, safePlacementSuggestion || null, safeNotes || null, 'pending', listType || 'DDL']
        );

        return res.status(201).json({
            success: true,
            message: 'Level submission received successfully',
            submission: result.rows[0]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleGetSubmissions(req, res, decoded) {
    try {
        if (decoded.role !== 'mod' && decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const targetListType = req.query.listType || 'DDL';

        const result = await query(
            `SELECT * FROM public.submissions 
             WHERE status = 'pending' AND list_type = $1
             ORDER BY created_at ASC`,
            [targetListType]
        );

        const vipRes = await query("SELECT data FROM public.system WHERE key = '_vips'");
        const vips = vipRes.rows.length > 0 ? vipRes.rows[0].data : []; 
        const vipSet = new Set(vips.map(v => v.toLowerCase()));

        let submissions = result.rows || [];
        submissions = submissions.map(sub => {
            return {
                ...sub,
                is_vip: sub.username ? vipSet.has(sub.username.toLowerCase()) : false
            };
        });

        submissions.sort((a, b) => {
            if (a.is_vip && !b.is_vip) return -1;
            if (!a.is_vip && b.is_vip) return 1;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        return res.status(200).json({
            success: true,
            submissions: submissions,
            userRole: decoded.role
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function processSingleSubmission(submission, subAction, reason, overrides, decoded) {
    const submissionType = submission.submission_type || 'record';
    const targetList = submission.list_type || 'DDL';

    if (submissionType === 'level' && decoded.role === 'mod') {
        throw new Error('Mods cannot process level submissions');
    }

    if (subAction === 'approve') {
        if (submissionType === 'level') {
            const finalName = overrides.name !== undefined ? overrides.name : submission.name;
            const finalAuthorStr = overrides.author !== undefined ? overrides.author : submission.author;
            const finalVerifier = overrides.verifier !== undefined ? overrides.verifier : submission.verifier;
            const finalPercentToQualify = overrides.percent_to_qualify !== undefined ? parseInt(overrides.percent_to_qualify) : parseInt(submission.percent_to_qualify);
            const finalVerification = overrides.verification !== undefined ? overrides.verification : submission.verification;
            const finalPlacement = overrides.placement_suggestion !== undefined ? overrides.placement_suggestion : submission.placement_suggestion;
            const finalIdGd = overrides.id_gd !== undefined ? overrides.id_gd : submission.id_gd;

            const tableName = targetList === 'DCL' ? 'public.levels_2' : 'public.levels';

            const newLevelDbId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
            const newLevelUUID = randomUUID();
            const gdId = parseInt(finalIdGd) || null;

            let targetRank = parseInt(finalPlacement);

            if (isNaN(targetRank) || targetRank <= 0) {
                const rankRes = await query(`SELECT MAX(rank) as max_rank FROM ${tableName}`);
                targetRank = parseInt(rankRes.rows[0].max_rank || 0) + 1;
            } else {
                await query(`UPDATE ${tableName} SET rank = rank + 1 WHERE rank >= $1`, [targetRank]);
            }

            const creators = finalAuthorStr ? finalAuthorStr.split(',').map(a => a.trim()).filter(a => a) : [];
            const finalAuthor = creators.length > 0 ? creators[0] : finalAuthorStr;

            const newLevelData = {
                id: gdId,
                name: finalName,
                author: finalAuthor,
                creators: creators.length > 1 ? creators : [finalAuthor],
                verifier: finalVerifier || null,
                verification: finalVerification,
                percentToQualify: finalPercentToQualify || 100,
                password: "free Copyable",
                records: [],
                _id: newLevelUUID,
                rank: targetRank
            };

            await query(
                `INSERT INTO ${tableName} (id, name, rank, data) VALUES ($1, $2, $3, $4)`,
                [newLevelDbId, finalName, targetRank, newLevelData]
            );

            const normalizeQuery = `
                WITH RankedLevels AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY rank ASC, id ASC) as expected_rank
                    FROM ${tableName}
                )
                UPDATE ${tableName}
                SET rank = RankedLevels.expected_rank
                FROM RankedLevels
                WHERE ${tableName}.id = RankedLevels.id AND ${tableName}.rank IS DISTINCT FROM RankedLevels.expected_rank;
            `;
            await query(normalizeQuery);

            await query(
                `UPDATE public.submissions SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
                ['approved', decoded.username, submission.id]
            );

            return { type: 'level', name: finalName, rank: targetRank, list: targetList };

        } else {
            const finalUsername = overrides.username !== undefined ? overrides.username : submission.username;
            const finalPercent = overrides.percent !== undefined ? parseInt(overrides.percent) : submission.percent;
            const finalHz = overrides.hz !== undefined ? parseInt(overrides.hz) : submission.hz;
            const finalVideoLink = overrides.video_link !== undefined ? overrides.video_link : submission.video_link;

            let levelData = null;
            let tableName = null;

            const preferredTable = targetList === 'DCL' ? 'public.levels_2' : 'public.levels';

            let levelResult = await query(
                `SELECT id, data, name FROM ${preferredTable} WHERE name = $1`,
                [submission.level_name]
            );

            if (levelResult.rows.length > 0) {
                levelData = levelResult.rows[0];
                tableName = preferredTable;
            } else {
                const fallbackTable = preferredTable === 'public.levels' ? 'public.levels_2' : 'public.levels';
                levelResult = await query(
                    `SELECT id, data, name FROM ${fallbackTable} WHERE name = $1`,
                    [submission.level_name]
                );
                if (levelResult.rows.length > 0) {
                    levelData = levelResult.rows[0];
                    tableName = fallbackTable;
                }
            }

            if (levelData && tableName) {
                let records = levelData.data.records || [];

                const newRecord = {
                    user: finalUsername,
                    link: finalVideoLink,
                    percent: finalPercent,
                    hz: finalHz || 60
                };

                records.push(newRecord);
                records = sanitizeRecords(records);

                const updatedData = {
                    ...levelData.data,
                    records: records
                };

                await query(
                    `UPDATE ${tableName} SET data = $1 WHERE id = $2`,
                    [updatedData, levelData.id]
                );
            }

            await query(
                `UPDATE public.submissions SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
                ['approved', decoded.username, submission.id]
            );

            return { type: 'record', levelName: submission.level_name, username: finalUsername, percent: finalPercent };
        }

    } else if (subAction === 'deny') {
        await query(
            `UPDATE public.submissions SET status = $1, denial_reason = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4`,
            ['denied', reason || null, decoded.username, submission.id]
        );

        return { type: submissionType, name: submissionType === 'level' ? submission.name : submission.level_name, username: submission.username, percent: submission.percent };
    }
}

async function handleBulkProcessSubmission(req, res, decoded) {
    try {
        if (decoded.role !== 'mod' && decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { action: subAction, reason, submissions } = req.body;

        if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
            return res.status(400).json({ error: 'No submissions provided' });
        }
        if (subAction !== 'approve' && subAction !== 'deny') {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const processedDetails = [];

        for (const sub of submissions) {
            try {
                const submissionResult = await query('SELECT * FROM public.submissions WHERE id = $1', [sub.id]);
                if (submissionResult.rows.length === 0) continue;

                const dbSub = submissionResult.rows[0];
                const detail = await processSingleSubmission(dbSub, subAction, reason, sub, decoded);
                if (detail) processedDetails.push(detail);
            } catch (e) {
                console.error(`Error processing individual submission ${sub.id}:`, e);
            }
        }

        await auditLog(decoded, 'BULK_PROCESS', {
            action: subAction,
            reason: reason,
            submissions: processedDetails
        });

        return res.status(200).json({ success: true, message: `Bulk ${subAction} complete` });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleProcessSubmission(req, res, decoded) {
    try {
        if (decoded.role !== 'mod' && decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { id, action: subAction, reason, ...overrides } = req.body;

        if (!id || !subAction) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (subAction !== 'approve' && subAction !== 'deny') {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const submissionResult = await query('SELECT * FROM public.submissions WHERE id = $1', [id]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        const detail = await processSingleSubmission(submission, subAction, reason, overrides, decoded);

        if (subAction === 'approve') {
            if (detail.type === 'level') {
                await auditLog(decoded, 'APPROVE_LEVEL_SUBMISSION', {
                    submissionId: id,
                    levelName: detail.name,
                    rank: detail.rank,
                    list: detail.list
                });
            } else {
                await auditLog(decoded, 'APPROVE_RECORD_SUBMISSION', {
                    submissionId: id,
                    levelName: detail.levelName,
                    username: detail.username,
                    percent: detail.percent
                });
            }
        } else if (subAction === 'deny') {
            await auditLog(decoded, 'DENY_SUBMISSION', {
                submissionId: id,
                type: detail.type,
                name: detail.name,
                username: detail.username,
                percent: detail.percent,
                reason: reason || 'No reason provided'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Submission ${subAction}d successfully`
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleEditSubmission(req, res, decoded) {
    try {
        if (decoded.role !== 'mod' && decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { id, levelName, username, percent, hz, discord, videoLink, notes, placement_suggestion,
            name, id_gd, author, verifier, verification, percent_to_qualify } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Submission ID required' });
        }

        const submissionResult = await query('SELECT * FROM public.submissions WHERE id = $1', [id]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const originalSubmission = submissionResult.rows[0];

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (levelName !== undefined) { updates.push(`level_name = $${paramCount++}`); values.push(levelName); }
        if (username !== undefined) { updates.push(`username = $${paramCount++}`); values.push(username); }
        if (percent !== undefined) { updates.push(`percent = $${paramCount++}`); values.push(percent); }
        if (hz !== undefined) { updates.push(`hz = $${paramCount++}`); values.push(hz); }
        if (discord !== undefined) { updates.push(`discord = $${paramCount++}`); values.push(discord); }
        if (videoLink !== undefined) { updates.push(`video_link = $${paramCount++}`); values.push(videoLink); }
        if (notes !== undefined) { updates.push(`notes = $${paramCount++}`); values.push(notes); }

        if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
        if (id_gd !== undefined) { updates.push(`id_gd = $${paramCount++}`); values.push(id_gd); }
        if (author !== undefined) { updates.push(`author = $${paramCount++}`); values.push(author); }
        if (verifier !== undefined) { updates.push(`verifier = $${paramCount++}`); values.push(verifier); }
        if (verification !== undefined) { updates.push(`verification = $${paramCount++}`); values.push(verification); }
        if (percent_to_qualify !== undefined) { updates.push(`percent_to_qualify = $${paramCount++}`); values.push(percent_to_qualify); }
        if (placement_suggestion !== undefined) { updates.push(`placement_suggestion = $${paramCount++}`); values.push(placement_suggestion); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const updateQuery = `UPDATE public.submissions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await query(updateQuery, values);

        await auditLog(decoded, 'EDIT_SUBMISSION', {
            submissionId: id,
            originalData: originalSubmission,
            newData: result.rows[0]
        });

        return res.status(200).json({
            success: true,
            message: 'Submission updated successfully',
            submission: result.rows[0]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleUpdateRecords(req, res, decoded) {
    try {
        if (decoded.role !== 'mod' && decoded.role !== 'admin' && decoded.role !== 'management') {
            return res.status(403).json({ error: 'Only admins, mods, and owners can update records' });
        }

        const { oldLevelId, newLevelData, type } = req.body;
        const tableName = type === 'DCL' ? 'public.levels_2' : 'public.levels';

        if (!oldLevelId || !newLevelData) return res.status(400).json({ error: 'Missing Data' });

        const findRes = await query(`SELECT id, name, rank, data FROM ${tableName} WHERE id = $1`, [oldLevelId]);

        if (findRes.rows.length === 0) {
            return res.status(404).json({ error: 'Level not found' });
        }

        const currentDBRow = findRes.rows[0];
        const oldContent = currentDBRow.data;

        const updatedContent = {
            ...oldContent,
            ...newLevelData
        };

        if (updatedContent.records) {
            updatedContent.records = sanitizeRecords(updatedContent.records);
        }

        const newName = updatedContent.name || currentDBRow.name;

        await query(
            `UPDATE ${tableName} SET data = $1, name = $2 WHERE id = $3`,
            [updatedContent, newName, oldLevelId]
        );

        await auditLog(decoded, "EDIT_LEVEL", {
            oldLevel: oldContent,
            newLevel: updatedContent,
            rank: currentDBRow.rank,
            list: type || 'DDL',
            notes: newLevelData.editNotes || null,
            reason: newLevelData.editReason || null
        });

        res.status(200).json({ success: true, level: updatedContent });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function ensureSubmissionsTable() {
    if (isTableVerified) return;

    try {
        await query(`
            CREATE TABLE IF NOT EXISTS public.submissions (
                id UUID PRIMARY KEY,
                submission_type VARCHAR(50) DEFAULT 'record',
                level_name VARCHAR(255),
                username VARCHAR(255),
                percent INTEGER,
                hz INTEGER,
                discord VARCHAR(255),
                video_link TEXT,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                denial_reason TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                reviewed_by VARCHAR(255),
                reviewed_at TIMESTAMP,
                name VARCHAR(255),
                id_gd VARCHAR(255),
                author VARCHAR(255),
                verifier VARCHAR(255),
                verification TEXT,
                percent_to_qualify INTEGER,
                placement_suggestion TEXT,
                list_type VARCHAR(50) DEFAULT 'DDL'
            )
        `);

        const columnChecks = [
            { name: 'submission_type', def: "VARCHAR(50) DEFAULT 'record'" },
            { name: 'name', def: 'VARCHAR(255)' },
            { name: 'id_gd', def: 'VARCHAR(255)' },
            { name: 'author', def: 'VARCHAR(255)' },
            { name: 'verifier', def: 'VARCHAR(255)' },
            { name: 'verification', def: 'TEXT' },
            { name: 'percent_to_qualify', def: 'INTEGER' },
            { name: 'placement_suggestion', def: 'TEXT' },
            { name: 'list_type', def: "VARCHAR(50) DEFAULT 'DDL'" }
        ];

        for (const col of columnChecks) {
            try {
                await query(`ALTER TABLE public.submissions ADD COLUMN ${col.name} ${col.def}`);
            } catch (e) {
            }
        }

        try {
            await query(`ALTER TABLE public.submissions ALTER COLUMN level_name DROP NOT NULL`);
            await query(`ALTER TABLE public.submissions ALTER COLUMN username DROP NOT NULL`);
            await query(`ALTER TABLE public.submissions ALTER COLUMN percent DROP NOT NULL`);
            await query(`ALTER TABLE public.submissions ALTER COLUMN video_link DROP NOT NULL`);
            await query(`ALTER TABLE public.submissions ALTER COLUMN hz DROP NOT NULL`);
            await query(`ALTER TABLE public.submissions ALTER COLUMN discord DROP NOT NULL`);
        } catch (e) {
        }

        isTableVerified = true;
    } catch (error) {
        console.error("Critical Database Initialization Error:", error);
    }
}