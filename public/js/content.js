import { round, score } from './score.js';

export async function fetchList() {
    try {
        const response = await fetch('/api/levels');
        if (!response.ok) throw new Error(`API Error ${response.status}`);
        const list = await response.json();
        
        return list.map((level) => {
            try {
                const sanitized = { ...level };
                Object.keys(sanitized).forEach(key => {
                    if (sanitized[key] === "" || sanitized[key] === undefined || sanitized[key] === null) {
                        sanitized[key] = null;
                    }
                });

                return [
                    {
                        ...sanitized,
                        
                        creators: sanitized.creators || [], 
                        verifier: sanitized.verifier || null,
                        verification: sanitized.verification || null,
                        
                        records: (sanitized.records || []).sort((a, b) => b.percent - a.percent),
                        
                        _id: sanitized._id || null,
                    },
                    null,
                ];
            } catch (e) {
                return [null, level._id || level.id];
            }
        });
    } catch (err) {
        return null;
    }
}

export async function fetchPacks() {
    try {
        const response = await fetch('/api/packs');
        if (!response.ok) return [];
        return await response.json();
    } catch {
        return [];
    }
}

export async function fetchEditors() {
    try {
        const response = await fetch('/api/editors');
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

export async function fetchRules() {
    try {
        const response = await fetch('/api/rules');
        if (!response.ok) return null;
        const data = await response.json();
        return data.rules || { level_rules: [], record_rules: [] };
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const listData = await fetchList();
    const packsData = await fetchPacks();

    if (!listData) return [null, ["Failed to load list"]];

    const scoreMap = {};
    const errs = [];
    const levelWeights = {};
    const allLevels = [];

    listData.forEach(([level, err], rankIndex) => {
        if (err) { errs.push(err); return; }

        const rank = rankIndex + 1;
        const points = score(rank, 100, level.percentToQualify);

        if (level.id) {
            levelWeights[String(level.id)] = points;
        }

        allLevels.push({
            id: String(level.id),
            _id: String(level._id),
            rank: rank,
            name: level.name,
            points: points
        });

        const findUser = (u) => Object.keys(scoreMap).find(k => k.toLowerCase() === u.toLowerCase()) || u;
        const initUser = (u) => {
            const normalized = findUser(u);
            scoreMap[normalized] ??= { 
                verified: [], 
                completed: [], 
                progressed: [], 
                packs: [],
                uncompleted: [] 
            };
            return normalized;
        };

        if (level.verifier) {
            const verifier = initUser(level.verifier);
            scoreMap[verifier].verified.push({
                rank: rank,
                level: level.name,
                score: points,
                link: level.verification,
                id: String(level.id),
                _id: String(level._id)
            });
        }

        (level.records || []).forEach((record) => {
            const user = initUser(record.user);
            const entry = {
                rank: rank,
                level: level.name,
                link: record.link,
                id: String(level.id),
                _id: String(level._id)
            };

            if (record.percent === 100) {
                entry.score = points;
                scoreMap[user].completed.push(entry);
            } else {
                entry.percent = record.percent;
                entry.score = score(rank, record.percent, level.percentToQualify);
                scoreMap[user].progressed.push(entry);
            }
        });
    });

    for (const user in scoreMap) {
        const userObj = scoreMap[user];
        
        const completedGDIds = new Set([
            ...userObj.verified.map(r => r.id),
            ...userObj.completed.map(r => r.id)
        ]);

        if (packsData && packsData.length > 0) {
            packsData.forEach(pack => {
                const packLevels = pack.levels || [];
                if (packLevels.length === 0) return;

                const isPackComplete = packLevels.every(id => completedGDIds.has(String(id)));

                if (isPackComplete) {
                    let packTotalPoints = 0;
                    packLevels.forEach(id => {
                        const weight = levelWeights[String(id)];
                        if (weight) packTotalPoints += weight;
                    });

                    const bonus = packTotalPoints * 0.33;

                    userObj.packs.push({
                        name: pack.name,
                        score: bonus,
                        color: pack.color
                    });
                }
            });
        }

        userObj.uncompleted = allLevels
            .filter(lvl => !completedGDIds.has(lvl.id))
            .map(lvl => ({
                rank: lvl.rank,
                level: lvl.name,
                id: lvl.id,
                _id: lvl._id,
                score: lvl.points 
            }));
    }

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        let total = [...scores.verified, ...scores.completed, ...scores.progressed]
            .reduce((prev, cur) => prev + cur.score, 0);
        
        const packBonus = scores.packs.reduce((prev, cur) => prev + cur.score, 0);
        total += packBonus;

        return { user, total: round(total), ...scores };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}