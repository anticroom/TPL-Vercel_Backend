import { store } from "../main.js";
import { fetchList } from "../content.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        
        <main v-else class="page-list-packs">
            <div class="packs-nav">
                <div class="packs-scroll">
                    <button 
                        v-for="(pack, index) in packs" 
                        :key="pack.id"
                        @click="selectPack(index)"
                        :class="['pack-tab', { active: selectedPackIndex === index }]"
                        :style="{ 
                            '--pack-color': pack.color || 'var(--color-primary)'
                        }"
                    >
                        {{ pack.name }}
                    </button>
                </div>
            </div>

            <div class="pack-content-grid">
                
                <div class="list-container">
                    <div class="pack-meta-header" v-if="selectedPack">
                        <h2 :style="{ color: selectedPack.color }">{{ selectedPack.name }}</h2>
                        <p class="pack-reward">
                            Reward: <strong>{{ selectedPackScore }}</strong> Points
                        </p>
                    </div>

                    <table class="list" v-if="selectedPack">
                        <tr v-for="(levelId, i) in selectedPack.levels" :key="levelId">
                            <td class="rank">
                                <span class="type-label-lg" 
                                      :class="{ 'goldhighlight': getGlobalRank(levelId) <= 150 }"
                                      :style="getGlobalRank(levelId) > 150 ? 'color: var(--color-text-legacy)' : ''">
                                    #{{ i + 1 }}
                                </span>
                            </td>
                            <td class="level" :class="{ 'active': selectedLevelIndex === i }">
                                <button @click="selectedLevelIndex = i">
                                    {{ getLevelName(levelId) }}
                                </button>
                            </td>
                        </tr>
                    </table>
                    <div v-else class="empty-state" style="padding: 2rem; text-align: center; color: #888;">
                        No pack selected
                    </div>
                </div>

                <div class="level-container">
                    <div class="level" v-if="selectedLevel">
                        <h1>{{ selectedLevel.name }}</h1>
                        
                            <div class="level-credits">
                                <span class="label">Creator & Verifier</span>
                                <span class="value">{{ selectedLevel.author }}</span>

                                <template v-if="selectedLevel.creators && selectedLevel.creators.length">
                                    <span class="label">Creators</span>
                                    <span class="value">{{ selectedLevel.creators.join(', ') }}</span>
                                </template>

                                <span class="label">Publisher</span>
                                <span class="value">{{ selectedLevel.verifier || selectedLevel.author }}</span>
                            </div>
                        
                        <p class="warning-lable" v-if="selectedLevel.epilepsyWarning">
                            WARNING! Levels AND videos may be epileptic
                        </p>
                        
                        <iframe 
                            class="video" 
                            id="videoframe" 
                            :src="embed(selectedLevel.showcase || selectedLevel.verification)" 
                            frameborder="0"
                            allowfullscreen
                        ></iframe>
                        
                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed</div>
                                <p :style="getGlobalRank(selectedLevel.id) > 150 ? 'color: var(--color-text-minus)' : ''">
                                    {{ getLevelScore(selectedLevel) }}
                                </p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p>{{ selectedLevel.id }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p>{{ selectedLevel.password || 'Free to Copy' }}</p>
                            </li>
                        </ul>

                        <h2>Records</h2>
                        
                        <p class="level-qualify-text">
                            <strong>{{ selectedLevel.percentToQualify }}%</strong> or better to qualify
                        </p>
                        
                        <table class="records">
                            <tr v-for="record in selectedLevel.records" :key="record.user" class="record">
                                <td class="percent">
                                    {{ record.percent }}%
                                </td>
                                <td class="user">
                                    <a :href="record.link" target="_blank">{{ record.user }}</a>
                                </td>
                                <td class="mobile">
                                    <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile" style="height: 18px;">
                                </td>
                                <td class="hz">
                                    {{ record.hz }}Hz
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div v-else class="level" style="height: 100%; display: flex; justify-content: center; align-items: center; color: #888;">
                        <p>Select a level to view details.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        list: [],
        selectedPackIndex: 0,
        selectedLevelIndex: 0,
        loading: true,
        store,
    }),
    computed: {
        selectedPack() {
            return this.packs[this.selectedPackIndex] || null;
        },
        selectedLevelGDId() {
            return this.selectedPack?.levels[this.selectedLevelIndex] || null;
        },
        selectedLevel() {
            return this.list.find(([lvl]) => String(lvl?.id) === String(this.selectedLevelGDId))?.[0] || null;
        },
        selectedPackScore() {
            if (!this.selectedPack || !this.list || this.list.length === 0) return 0;
            let totalPoints = 0;
            this.selectedPack.levels.forEach(gdId => {
                const index = this.list.findIndex(([lvl]) => String(lvl.id) === String(gdId));
                if (index !== -1) {
                    const levelObj = this.list[index][0];
                    const rank = index + 1;
                    totalPoints += score(rank, 100, levelObj.percentToQualify);
                }
            });
            return (totalPoints * 0.33).toFixed(2);
        }
    },
    async mounted() {
        const list = await fetchList();
        const packsData = await fetch("/api/packs").then((res) => res.json());

        this.list = list;
        this.packs = packsData;

        this.handleHashChange();
        window.addEventListener('hashchange', this.handleHashChange);

        this.loading = false;
    },
    beforeUnmount() {
        window.removeEventListener('hashchange', this.handleHashChange);
    },
    methods: {
        embed,
        score,
        selectPack(index) {
            this.selectedPackIndex = index;
            this.selectedLevelIndex = 0;
        },
        getGlobalRank(gdId) {
            if (!this.list) return 999;
            const index = this.list.findIndex(([lvl]) => String(lvl?.id) === String(gdId));
            return index === -1 ? 999 : index + 1;
        },
        getLevelName(gdId) {
            return this.list.find(([lvl]) => String(lvl?.id) === String(gdId))?.[0]?.name || 'Error';
        },
        getLevelScore(level) {
            const index = this.list.findIndex(([l]) => l._id === level._id);
            return score(index + 1, 100, level.percentToQualify);
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