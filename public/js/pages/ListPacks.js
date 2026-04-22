import { store } from "../main.js";
import { fetchList, fetchPacks, fetchRecords } from "../content.js";
import { embed } from "../util.js";
import { score } from "../score.js";

import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: { LevelAuthors },
    template: `
        <main v-if="loading" class="page-list-packs" :class="'mobile-state-' + mobileView">
            <div class="packs-nav" style="opacity: 0.7;">
                <div class="packs-scroll">
                    <button v-for="n in 4" :key="'tab'+n" class="pack-tab type-label-lg" style="border-color: transparent;">
                        <span class="skeleton" style="height: 3 0px; width: 150px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                    </button>
                </div>
            </div>

            <div class="pack-content-grid" style="opacity: 0.7;">
                
                <div class="list-container">
                    <div class="pack-meta-header">
                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 40px; width: 45%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        <p class="pack-reward type-body">
                            <span class="skeleton" style="height: 28px; width: 30%; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                        </p>
                    </div>

                    <table class="list">
                        <tr v-for="n in 10" :key="'list'+n">
                            <td class="rank">
                                <span class="type-label-lg">
                                    <span class="skeleton" style="height: 20px; width: 30px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                </span>
                            </td>
                            <td class="level" style="padding: 0;">
                                <button style="width: 100%; padding: 1.2rem 1rem; border: none; background: transparent; text-align: start;">
                                    <span class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 65%; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="level-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to Pack</button>
                    <div class="level">
                        
                        <h1 class="type-h1">
                            <span class="skeleton" style="height: 52px; width: 60%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h1>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <span class="skeleton" style="height: 20px; width: 40%; border-radius: 4px; display: inline-block;"></span>
                        </div>
                        
                        <div class="video skeleton" style="margin-bottom: 24px; border-radius: 12px;"></div>

                        <ul class="stats">
                            <li v-for="n in 3" :key="'stat'+n">
                                <div class="type-title-sm">
                                    <span class="skeleton" style="height: 24px; width: 90px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                                </div>
                                <p class="type-body">
                                    <span class="skeleton" style="height: 28px; width: 60px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                                </p>
                            </li>
                        </ul>
                        
                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 40px; width: 25%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        
                        <p class="level-qualify-text type-body">
                            <span class="skeleton" style="height: 28px; width: 35%; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                        </p>

                        <table class="records">
                            <tr v-for="n in 5" :key="'rec'+n" class="record">
                                <td class="percent">
                                    <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 40px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span></p>
                                </td>
                                <td class="user">
                                    <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 120px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span></p>
                                </td>
                                <td class="hz">
                                    <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 50px; border-radius: 4px; display: inline-block; vertical-align: middle; float: right;"></span></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
        
        <main v-else class="page-list-packs" :class="'mobile-state-' + mobileView">
            <div class="packs-nav">
                <div class="packs-scroll">
                    <button 
                        v-for="(pack, index) in packs" 
                        :key="pack.id"
                        @click="selectPack(index)"
                        :class="['pack-tab', 'type-label-lg', { active: selectedPackIndex === index }]"
                        :style="{ '--pack-color': pack.color || 'var(--color-primary)' }"
                    >
                        {{ pack.name }}
                    </button>
                </div>
            </div>

            <div class="pack-content-grid">
                <div class="list-container">
                    <div class="pack-meta-header" v-if="selectedPack">
                        <h2 class="type-headline-md" :style="{ color: selectedPack.color }">{{ selectedPack.name }}</h2>
                        <p class="pack-reward type-body">
                            Reward: <strong>{{ selectedPackScore }}</strong> Points
                        </p>
                    </div>

                    <table class="list" v-if="selectedPack && selectedPack.levels && selectedPack.levels.length > 0">
                        <tr v-for="(levelId, i) in selectedPack.levels" :key="levelId">
                            <td class="rank">
                                <span class="type-label-lg" 
                                      :class="{ 'goldhighlight': getLevelInfo(levelId).rank <= 150 }"
                                      :style="getLevelInfo(levelId).rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                    #{{ getLevelInfo(levelId).rank }}
                                </span>
                            </td>
                            <td class="level" :class="{ 'active': selectedLevelIndex === i }">
                                <button @click="selectedLevelIndex = i; mobileView = 'detail'; window.scrollTo(0,0);">
                                    <span class="type-label-lg">
                                        {{ getLevelInfo(levelId).name }}
                                        <span v-if="getLevelInfo(levelId).type && getLevelInfo(levelId).type !== store.listType" style="font-size: 0.7em; opacity: 0.6; margin-left: 5px;">
                                            ({{ getLevelInfo(levelId).type }})
                                        </span>
                                    </span>
                                </button>
                            </td>
                        </tr>
                    </table>
                    <div v-else class="empty-state" style="padding: 2rem; text-align: center; color: #888;">
                        <p class="type-body">No levels in this pack.</p>
                    </div>
                </div>

                <div class="level-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to Pack</button>
                    <div class="level" v-if="selectedLevel">
                        <h1 class="type-h1">{{ selectedLevel.name }}</h1>
                        
                        <LevelAuthors :author="selectedLevel.author" :creators="selectedLevel.creators || []" :verifier="selectedLevel.verifier"></LevelAuthors>
                        
                        <p class="warning-lable type-label-md" v-if="selectedLevel.epilepsyWarning">
                            WARNING! Levels AND videos may be epileptic
                        </p>
                        
                        <div v-html="embed(selectedLevel.showcase || selectedLevel.verification)"></div>
                        
                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed</div>
                                <p class="type-body" :style="getLevelInfo(selectedLevel._id).rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                    {{ getLevelScore(selectedLevel._id) }}
                                </p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p class="type-body">{{ selectedLevel.id }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p class="type-body">{{ selectedLevel.password || 'Free to Copy' }}</p>
                            </li>
                        </ul>

                        <h2 class="type-headline-md">Records</h2>
                        
                        <p class="level-qualify-text type-body">
                            <strong>{{ selectedLevel.percentToQualify }}%</strong> or better to qualify
                        </p>
                        
                        <p v-if="loadingRecords" class="type-body" style="color: var(--color-primary); padding: 20px 0;">Loading records...</p>

                        <table v-else class="records">
                            <tr v-for="record in (selectedLevel.records || [])" :key="record.user" class="record">
                                <td class="percent">
                                    <p class="type-label-lg">{{ record.percent }}%</p>
                                </td>
                                <td class="user">
                                    <a class="type-label-lg" :href="record.link" target="_blank">{{ record.user }}</a>
                                </td>
                                <td class="mobile">
                                    <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile" style="height: 18px;">
                                </td>
                                <td class="hz">
                                    <p class="type-label-lg">{{ record.hz }}Hz</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div v-else class="level" style="height: 100%; display: flex; justify-content: center; align-items: center; color: #888; flex-direction: column;">
                        <p class="type-body">Select a level to view details.</p>
                        <p class="type-label-sm" v-if="selectedPack && selectedPack.levels && selectedPack.levels.length > 0 && !selectedLevel" style="margin-top: 10px; opacity: 0.6;">
                            (If levels are missing, they may be on the other List)
                        </p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        tpclList: [],
        tplList: [],
        selectedPackIndex: 0,
        selectedLevelIndex: 0,
        loading: true,
        loadingRecords: false,
        mobileView: 'list',
        store,
    }),
    
    watch: {
        'store.listType': async function() {
            this.selectedPackIndex = 0;
            this.selectedLevelIndex = 0;
            this.mobileView = 'list';
            await this.loadData();
        },
        selectedLevelDbId: {
            immediate: true,
            handler: async function(newDbId) {
                if (newDbId) {
                    await this.loadLevelRecords(newDbId);
                }
            }
        }
    },

    computed: {
        selectedPack() { 
            return this.packs[this.selectedPackIndex] || null; 
        },
        selectedLevelDbId() { 
            return this.selectedPack?.levels?.[this.selectedLevelIndex] || null; 
        },
        selectedLevel() {
            const info = this.getLevelInfo(this.selectedLevelDbId);
            return info.level;
        },
        selectedPackScore() {
            if (!this.selectedPack || !this.selectedPack.levels) return 0;
            let totalPoints = 0;
            this.selectedPack.levels.forEach(dbId => {
                totalPoints += this.getLevelScore(dbId);
            });
            return (totalPoints * 0.33).toFixed(2);
        }
    },
    async mounted() {
        await this.loadData();
        this.handleHashChange();
        window.addEventListener('hashchange', this.handleHashChange);
    },
    beforeUnmount() {
        window.removeEventListener('hashchange', this.handleHashChange);
    },
    methods: {
        embed,
        score,
        async loadData() {
            this.loading = true;
            try {
                const [tpcl, tpl, packsData] = await Promise.all([
                    fetchList('TPCL', false), 
                    fetchList('TPL', false), 
                    fetchPacks(this.store.listType)
                ]);

                this.tpclList = tpcl || [];
                this.tplList = tpl || [];
                this.packs = packsData || [];
            } catch (e) {
                console.error("Failed to load pack data", e);
            }
            this.loading = false;
        },
        async loadLevelRecords(dbId) {
            const info = this.getLevelInfo(dbId);
            if (!info.level || info.level._recordsFetched) return;

            this.loadingRecords = true;
            try {
                const records = await fetchRecords(info.level._id, info.type);
                info.level.records = records;
                info.level._recordsFetched = true;
            } catch (e) {
                console.error("Failed to load records", e);
            } finally {
                this.loadingRecords = false;
            }
        },
        selectPack(index) {
            this.selectedPackIndex = index;
            this.selectedLevelIndex = 0;
            this.mobileView = 'list';
        },
        getLevelInfo(dbId) {
            if (!dbId) return { name: '', rank: 999, level: null, type: null };

            const primaryList = this.store.listType === 'TPL' ? this.tplList : this.tpclList;
            const secondaryList = this.store.listType === 'TPL' ? this.tpclList : this.tplList;
            const primaryType = this.store.listType;
            const secondaryType = this.store.listType === 'TPL' ? 'TPCL' : 'TPL';

            const primaryIndex = primaryList.findIndex(([lvl]) => String(lvl?._id) === String(dbId));
            if (primaryIndex !== -1) {
                return { 
                    name: primaryList[primaryIndex][0].name, 
                    rank: primaryIndex + 1, 
                    level: primaryList[primaryIndex][0],
                    type: primaryType
                };
            }

            const secondaryIndex = secondaryList.findIndex(([lvl]) => String(lvl?._id) === String(dbId));
            if (secondaryIndex !== -1) {
                return { 
                    name: secondaryList[secondaryIndex][0].name, 
                    rank: secondaryIndex + 1, 
                    level: secondaryList[secondaryIndex][0],
                    type: secondaryType
                };
            }

            return { name: `Unknown Level`, rank: 999, level: null, type: null };
        },
        getLevelScore(dbId) {
            const info = this.getLevelInfo(dbId);
            if (!info.level) return 0;
            return score(info.rank, 100, info.level.percentToQualify);
        },
        handleHashChange() {
            try {
                const hash = window.location.hash || '';
                const qIndex = hash.indexOf('?');
                if (qIndex !== -1) {
                    const params = new URLSearchParams(hash.slice(qIndex + 1));
                    const packId = params.get('pack');
                    if (packId) {
                        const idx = this.packs.findIndex((p) => p.id === packId);
                        if (idx !== -1) {
                            this.selectedPackIndex = idx;
                            this.selectedLevelIndex = 0;
                        }
                    }
                }
            } catch (e) { }
        }
    },
};