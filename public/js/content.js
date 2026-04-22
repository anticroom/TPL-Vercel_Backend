import { round, score } from './score.js';

const MEMORY_CACHE = {
    listLite: { TPCL: null, TPL: null },
    listFull: { TPCL: null, TPL: null },
    packs: { TPCL: null, TPL: null },
    rules: { TPCL: null, TPL: null },
    editors: null,
    records: {}
};

const shouldBypassCache = () => {
    const hash = window.location.hash || '';
    return hash.includes('/admin') || hash.includes('/manage');
};

export async function fetchList(type = 'TPCL', full = false) {
    const bypass = shouldBypassCache();
    
    if (!bypass) {
        if (full && MEMORY_CACHE.listFull[type]) {
            return MEMORY_CACHE.listFull[type];
        }
        if (!full) {
            if (MEMORY_CACHE.listLite[type]) return MEMORY_CACHE.listLite[type];
            if (MEMORY_CACHE.listFull[type]) return MEMORY_CACHE.listFull[type]; 
        }
    }

    try {
        const url = `/api/levels?type=${type}${full ? '&full=true' : ''}${bypass ? `&_t=${Date.now()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error ${response.status}`);
        const list = await response.json();
        
        const result = list.map((level) => {
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
                        author: Array.isArray(sanitized.author) ? sanitized.author.join(', ') : (sanitized.author || 'Unknown'),
                        creators: sanitized.creators || [], 
                        verifier: sanitized.verifier || null,
                        verification: sanitized.verification || null,
                        records: sanitized.records ? sanitized.records.sort((a, b) => b.percent - a.percent) : [],
                        _recordsFetched: full || !!sanitized.records,
                        _id: sanitized._id || null,
                    },
                    null,
                ];
            } catch (e) {
                return [null, level._id || level.id];
            }
        });

        const cacheCat = full ? 'listFull' : 'listLite';
        MEMORY_CACHE[cacheCat][type] = result;
        return result;
    } catch (err) {
        return null;
    }
}

export async function fetchRecords(dbId, type = 'TPCL') {
    const bypass = shouldBypassCache();
    if (!bypass && MEMORY_CACHE.records[dbId]) {
        return MEMORY_CACHE.records[dbId];
    }

    try {
        const url = `/api/levels?type=${type}&id=${dbId}${bypass ? `&_t=${Date.now()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const records = await response.json();
        const sorted = records.sort((a, b) => b.percent - a.percent);
        
        MEMORY_CACHE.records[dbId] = sorted;
        return sorted;
    } catch {
        return [];
    }
}

export async function fetchPacks(type = 'TPCL') {
    const bypass = shouldBypassCache();
    if (!bypass && MEMORY_CACHE.packs[type]) {
        return MEMORY_CACHE.packs[type];
    }

    try {
        const url = `/api/packs?type=${type}${bypass ? `&_t=${Date.now()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        
        MEMORY_CACHE.packs[type] = data;
        return data;
    } catch {
        return [];
    }
}

export async function fetchRules(type = 'TPCL') {
    const bypass = shouldBypassCache();
    if (!bypass && MEMORY_CACHE.rules[type]) {
        return MEMORY_CACHE.rules[type];
    }

    try {
        const url = `/api/rules?type=${type}${bypass ? `&_t=${Date.now()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        
        MEMORY_CACHE.rules[type] = data.rules || null;
        return data.rules || null;
    } catch {
        return null;
    }
}

export async function fetchEditors() {
    const bypass = shouldBypassCache();
    if (!bypass && MEMORY_CACHE.editors) {
        return MEMORY_CACHE.editors;
    }

    try {
        const url = `/api/editors${bypass ? `?_t=${Date.now()}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        
        MEMORY_CACHE.editors = data;
        return data;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard(type = 'TPCL') {
    try {
        const [list, packsData] = await Promise.all([fetchList(type, true), fetchPacks(type)]);
        if (!list) return [[], []];

        const scoreMap = {};
        const errs = [];
        const levelWeights = {};
        const allLevels = [];

        const initUser = (rawUser) => {
            const user = rawUser.trim();
            const userKey = user.toLowerCase();
            if (!scoreMap[userKey]) {
                scoreMap[userKey] = {
                    displayName: user,
                    verified: [],
                    completed: [],
                    progressed: [],
                    packs: [],
                    completedDbIds: new Set()
                };
            }
            return userKey; 
        };

        list.forEach(([level, err], rank) => {
            if (err) {
                errs.push(err);
                return;
            }

            const dbId = String(level._id);
            const levelScore = score(rank + 1, 100, level.percentToQualify);
            levelWeights[dbId] = levelScore;
            
            allLevels.push({
                id: level.id,
                _id: level._id,
                rank: rank + 1,
                name: level.name,
                points: levelScore
            });

            const verifierName = level.verifier ? level.verifier.trim() : null;

            if (verifierName) {
                const vKey = initUser(verifierName);
                
                scoreMap[vKey].verified.push({
                    rank: rank + 1,
                    level: level.name,
                    score: levelScore,
                    link: level.verification,
                    id: level.id,
                    _id: level._id,
                    percent: 100,
                    hz: 'N/A'
                });
                scoreMap[vKey].completedDbIds.add(dbId);
            }

            level.records.forEach(record => {
                const userName = record.user ? record.user.trim() : "Unknown";
                const uKey = initUser(userName);

                const rScore = score(rank + 1, record.percent, level.percentToQualify);
                const recordData = {
                    rank: rank + 1,
                    level: level.name,
                    score: rScore,
                    link: record.link,
                    id: level.id,
                    _id: level._id,
                    percent: record.percent,
                    hz: record.hz
                };

                if (verifierName && userName.toLowerCase() === verifierName.toLowerCase() && record.percent === 100) {
                    const existingVerified = scoreMap[uKey].verified.find(v => v._id === dbId);
                    if (existingVerified) {
                        existingVerified.hz = record.hz;
                        existingVerified.link = record.link || existingVerified.link;
                    }
                    return; 
                }

                if (record.percent === 100) {
                    scoreMap[uKey].completed.push(recordData);
                    scoreMap[uKey].completedDbIds.add(dbId);
                } else {
                    scoreMap[uKey].progressed.push(recordData);
                }
            });
        });

        Object.keys(scoreMap).forEach(userKey => {
            const userObj = scoreMap[userKey];
            
            packsData.forEach(pack => {
                const packLevels = pack.levels || [];
                if (packLevels.length === 0) return;
                
                const isPackComplete = packLevels.every(id => userObj.completedDbIds.has(String(id)));

                if (isPackComplete) {
                    let packTotalPoints = 0;
                    packLevels.forEach(id => {
                        const weight = levelWeights[String(id)];
                        if (weight) packTotalPoints += weight;
                    });
                    const bonus = packTotalPoints * 0.33;
                    userObj.packs.push({ name: pack.name, score: bonus, color: pack.color });
                }
            });
            
            userObj.uncompleted = allLevels
            .filter(lvl => !userObj.completedDbIds.has(String(lvl._id)))
            .map(lvl => ({
                rank: lvl.rank,
                level: lvl.name,
                id: lvl.id,
                _id: lvl._id,
                score: lvl.points 
            }));
        });

        const res = Object.values(scoreMap).map((scores) => {
            let total = [...scores.verified, ...scores.completed, ...scores.progressed]
                .reduce((prev, cur) => prev + cur.score, 0);
            
            const packBonus = scores.packs.reduce((prev, cur) => prev + cur.score, 0);
            total += packBonus;

            return { user: scores.displayName, total: round(total), ...scores };
        });

        return [res.sort((a, b) => b.total - a.total), errs];
    } catch (err) {
        console.error(err);
        return [[], []];
    }
}