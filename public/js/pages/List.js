import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchRules, fetchPacks } from "../content.js";
import { renderMarkdown } from "../markdown.js";

import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { LevelAuthors },
    template: `
        <transition name="fade" mode="out-in">
            <main v-if="loading" key="loading" class="page-list" :class="'mobile-state-' + mobileView">
                
                <div class="list-container" style="overflow-y: hidden;">
                    <div class="list-header" style="margin-bottom: 10px; padding: 0 10px; display: flex;">
                        <div class="search-input type-label-lg" style="flex: 1; border-color: transparent; padding: 0; background: transparent;">
                            <span class="skeleton" style="height: 42px; width: 100%; border-radius: 0.7rem; display: block;"></span>
                        </div>
                        <button class="mobile-rules-btn" style="border-color: transparent; padding: 0; background: transparent;">
                            <span class="skeleton" style="height: 42px; width: 80px; border-radius: 0 0.7rem 0.7rem 0; display: block; margin-left: -10px;"></span>
                        </button>
                    </div>
                    
                    <table class="list" style="width: 100%;">
                        <tr v-for="n in 19" :key="n">
                            <td class="rank">
                                <p class="type-label-lg">
                                    <span class="skeleton" style="height: 20px; width: 30px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                </p>
                            </td>
                            <td class="level" style="width: 100%;">
                                <button style="width: 100%;">
                                    <span class="type-label-lg" style="display: block;">
                                        <span class="skeleton" :style="{ height: '20px', width: (40 + (n % 4) * 15) + '%', borderRadius: '4px', display: 'inline-block', verticalAlign: 'middle' }"></span>
                                    </span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div class="level-container" style="overflow-y: hidden;">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to List</button>
                    <div class="level">
                        <h1 class="type-h1">
                            <span class="skeleton" style="height: 52px; width: 70%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h1>
                        
                        <div class="level-authors" style="display: grid; grid-template-columns: max-content 1fr; gap: 1rem;">
                            <span class="skeleton" style="height: 20px; width: 60px; border-radius: 4px;"></span>
                            <span class="skeleton" style="height: 20px; width: 150px; border-radius: 4px;"></span>
                        </div>
                        
                        <div class="pack-tags" style="display: flex; gap: 10px; margin: 15px 0;">
                            <span class="type-label-md" style="padding: 6px 12px; border-radius: 99px; border: 1px solid transparent;">
                                <span class="skeleton" style="height: 18px; width: 60px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                            </span>
                            <span class="type-label-md" style="padding: 6px 12px; border-radius: 99px; border: 1px solid transparent;">
                                <span class="skeleton" style="height: 18px; width: 80px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                            </span>
                        </div>

                        <p class="warning-lable type-label-md">
                            <span class="skeleton" style="height: 18px; width: 40%; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                        </p>
                        
                        <div class="video-container skeleton" style="aspect-ratio: 16/9; width: 100%; border-radius: 12px;"></div>

                        <ul class="stats">
                            <li v-for="n in 3" :key="'stat'+n">
                                <div class="type-title-sm">
                                    <span class="skeleton" style="height: 24px; width: 100px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                                </div>
                                <p class="type-body">
                                    <span class="skeleton" style="height: 28px; width: 60px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                                </p>
                            </li>
                        </ul>
                        
                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 40px; width: 30%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        
                        <p class="type-body">
                            <span class="skeleton" style="height: 28px; width: 40%; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                        </p>
                        
                        <div style="overflow: hidden;">
                            <table class="records" style="width: 100%;">
                                <tr v-for="n in 5" :key="'rec'+n" class="record">
                                    <td class="percent">
                                        <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 40px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span></p>
                                    </td>
                                    <td class="user" style="width: 100%;">
                                        <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 40%; border-radius: 4px; display: inline-block; vertical-align: middle;"></span></p>
                                    </td>
                                    <td class="mobile"></td>
                                    <td class="hz">
                                        <p class="type-label-lg"><span class="skeleton" style="height: 20px; width: 50px; border-radius: 4px; display: inline-block; vertical-align: middle; float: right;"></span></p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="meta-container" style="overflow-y: hidden;">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to List</button>
                    <div class="meta">
                        <div class="meta-top-text">
                            <p class="type-body" style="margin-bottom: 20px;">
                                <span class="skeleton" style="height: 20px; width: 60%; border-radius: 4px; display: block;"></span>
                            </p>
                        </div>

                        <div class="editors-section">
                            <h3 class="type-headline-sm" style="margin-bottom: 1.5rem;">
                                <span class="skeleton" style="height: 28px; width: 150px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                            </h3>
                            <ol class="editors">
                                <li v-for="n in 14" :key="'ed'+n" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <span class="skeleton" style="height: 25px; width: 25px; border-radius: 25%;"></span>
                                    
                                    <p class="type-label-lg" style="flex: 1; margin: 0;">
                                        <span class="skeleton" 
                                            :style="{ 
                                                height: '20px', 
                                                width: ['45%', '70%', '35%', '60%', '50%'][n % 5], 
                                                borderRadius: '4px', 
                                                display: 'inline-block', 
                                                verticalAlign: 'middle' 
                                            }">
                                        </span>
                                    </p>
                                </li>
                            </ol>
                        </div>

                        <div class="rules-section">
                            <h3 class="type-headline-sm" style="margin-top: 40px; margin-bottom: 20px;">
                                <span class="skeleton" style="height: 28px; width: 250px; border-radius: 4px; display: inline-block; vertical-align: top;"></span>
                            </h3>
                            <div class="rule-text" v-for="n in 2" :key="'rule'+n">
                                <p class="type-body" style="width: 100%;">
                                <span class="skeleton" style="height: 20px; width: 100%; border-radius: 4px; display: block; margin-bottom: 10px;"></span>
                                <span class="skeleton" style="height: 20px; width: 92%; border-radius: 4px; display: block; margin-bottom: 10px;"></span>
                                <span class="skeleton" style="height: 20px; width: 96%; border-radius: 4px; display: block; margin-bottom: 10px;"></span>
                                <span class="skeleton" style="height: 20px; width: 65%; border-radius: 4px; display: block; margin-bottom: 24px;"></span>

                                <span class="skeleton" style="height: 14px; width: 30%; border-radius: 4px; display: block; margin-bottom: 8px;"></span>
                                <span class="skeleton" style="height: 14px; width: 45%; border-radius: 4px; display: block; margin-bottom: 20px;"></span>

                                <span class="skeleton" style="height: 32px; width: 55%; border-radius: 6px; display: block; margin-bottom: 12px;"></span>

                                <span class="skeleton" style="height: 24px; width: 88%; border-radius: 4px; display: block; margin-bottom: 8px;"></span>
                                <span class="skeleton" style="height: 24px; width: 70%; border-radius: 4px; display: block;"></span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <main v-else key="content" class="page-list" :class="'mobile-state-' + mobileView">
                <div class="list-container">
                    <div class="list-header" style="margin-bottom: 10px; padding: 0 10px; display: flex;">
                        <input v-model="searchQuery" type="text" placeholder="Search levels..." class="search-input type-label-lg" style="flex: 1;" />
                        <button class="mobile-rules-btn" @click="mobileView = 'meta'; scrollToTop();">Rules</button>
                    </div>
                    <table class="list" v-if="list">
                        <tr v-for="(item, i) in filteredList" :key="item.originalIndex">
                            <td class="rank">
                                <p class="type-label-lg">
                                    <span :class="item.originalIndex + 1 <= 150 ? 'goldhighlight' : ''" 
                                          :style="item.originalIndex + 1 > 150 ? 'color: var(--color-text-legacy); font-weight: 700;' : ''">
                                        #{{ item.originalIndex + 1 }}
                                    </span>
                                </p>
                            </td>
                            <td class="level" :class="{ 'active': selected == item.originalIndex, 'error': !item.level }">
                                <button @click="selected = item.originalIndex; mobileView = 'detail'; scrollToTop();">
                                    <span class="type-label-lg">{{ item.level?.name || \`Error (ID: \${item.err})\` }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div class="level-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to List</button>
                    <div class="level" v-if="level">
                        <h1 class="type-h1">{{ level.name }}</h1>
                        
                        <LevelAuthors :author="level.author" :creators="level.creators || []" :verifier="level.verifier"></LevelAuthors>
                        
                        <div class="pack-tags" v-if="currentLevelPacks.length > 0" style="display: flex; gap: 10px; flex-wrap: wrap; margin: 15px 0;">
                            <span v-for="pack in currentLevelPacks" 
                                  :key="pack.id" 
                                  class="type-label-md" 
                                  :style="getPackStyle(pack)">
                                {{ pack.name }}
                            </span>
                        </div>

                        <p class="warning-lable type-label-md">WARNING! Levels AND videos may be epileptic</p>
                        
                        <div class="video-container" v-html="video"></div>

                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed</div>
                                <p class="type-body">{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p class="type-body">{{ level.id }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p class="type-body">{{ level.password || 'Free to Copy' }}</p>
                            </li>
                        </ul>
                        <h2 class="type-headline-md">Records</h2>
                        
                        <p class="type-body" v-if="selected + 1 <= 150"><strong>{{ level.percentToQualify || 100 }}%</strong> or better to qualify</p>
                        <p class="type-body" v-else><strong>100%</strong> to qualify (Legacy)</p>                    
                        
                        <div ref="recordsWrapper" style="overflow: hidden;">
                            <table v-if="loadingRecords" class="records" style="width: 100%;">
                                <tr v-for="n in 5" :key="'rec-load-'+n" class="record">
                                    <td class="percent">
                                        <p class="type-label-lg">
                                            <span class="skeleton" style="height: 20px; width: 40px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                        </p>
                                    </td>
                                    <td class="user" style="width: 100%;">
                                        <p class="type-label-lg">
                                            <span class="skeleton" :style="{ height: '20px', width: (30 + (n % 3) * 20) + '%', borderRadius: '4px', display: 'inline-block', verticalAlign: 'middle' }"></span>
                                        </p>
                                    </td>
                                    <td class="mobile"></td>
                                    <td class="hz">
                                        <p class="type-label-lg">
                                            <span class="skeleton" style="height: 20px; width: 50px; border-radius: 4px; display: inline-block; vertical-align: middle; float: right;"></span>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <table v-else class="records">
                                <tr v-for="record in level.records" class="record">
                                    <td class="percent">
                                        <p class="type-label-lg" style="color: var(--color-text-record-gold);">{{ record.percent }}%</p>
                                    </td>
                                    <td class="user">
                                        <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                                    </td>
                                    <td class="mobile">
                                        <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                    </td>
                                    <td class="hz">
                                        <p class="type-label-lg">{{ record.hz }}Hz</p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                        <p class="type-body">Select a level to view details</p>
                    </div>
                </div>
                
                <div class="meta-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to List</button>
                    <div class="meta">
                        <div class="meta-top-text">
                            <div class="errors" v-show="errors.length > 0">
                                <p class="error type-body" v-for="error of errors">{{ error }}</p>
                            </div>
                            <p class="type-body" style="margin-bottom: 20px; font-size: 0.9rem; opacity: 0.9;">
                                This is a fork of the TPL
                                <a href="https://thepisslist.com/" target="_blank" style="text-decoration: underline; color: inherit;">Check them out!</a>
                            </p>
                        </div>

                        <div class="editors-section">
                            <template v-if="editors">
                                <h3 class="type-headline-sm" style="margin-bottom: 1.5rem;">List Editors</h3>
                                <ol class="editors">
                                    <li v-for="editor in editors">
                                        <img :src="\`/assets/\${roleIconMap[editor.role]}-dark.svg\`" :alt="editor.role">
                                        <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                        <p class="type-label-lg" v-else>{{ editor.name }}</p>
                                    </li>
                                </ol>
                            </template>
                        </div>

                        <div class="rules-section">
                            <div v-if="normalizedRules.length > 0">
                                <div v-for="(section, sIdx) in normalizedRules" :key="sIdx">
                                    <template v-if="section.visible !== false">
                                        <h3 class="type-headline-sm" style="margin-top: 40px; margin-bottom: 20px;">{{ section.header }}</h3>
                                        <div class="rule-text" v-for="(rule, rIdx) in section.rules" :key="sIdx+'-'+rIdx" v-html="parseRule(rule)"></div>
                                    </template>
                                </div>
                            </div>
                            <p v-else-if="rulesError" class="error type-body">Uh oh! Failed to load rules.</p>
                            <p class="type-body" v-else>Loading rules...</p>
                        </div>
                    </div>
                </div>
            </main>
        </transition>
    `,
    data: () => ({
        list: [],
        packs: [],
        editors: [],
        rules: null,
        rulesError: false,
        loading: true,
        loadingRecords: false,
        selected: 0,
        mobileView: 'list',
        searchQuery: "",
        errors: [],
        roleIconMap,
        store,
        toggledShowcase: false,
    }),

    watch: {
        'store.listType': async function (newType) {
            this.mobileView = 'list';
            this.searchQuery = "";
            await this.loadData();

            const [firstItem] = this.list || [];
            const [firstLevel] = firstItem || [];

            if (firstLevel) {
                const targetId = firstLevel._id || firstLevel.id;
                this.$router.replace({ path: `/${newType}/${targetId}`, query: this.$route.query }).catch(() => { });
            } else {
                this.$router.replace({ path: `/`, query: this.$route.query }).catch(() => { });
            }
        },
        selected: async function (newVal) {
            await this.loadRecordsForSelected();

            const item = this.list[newVal];
            if (item) {
                const [lvl] = item;
                if (lvl) {
                    const currentType = this.store.listType;
                    const targetId = String(lvl._id || lvl.id);
                    if (String(this.$route.params.id) !== targetId) {
                        this.$router.replace({ path: `/${currentType}/${targetId}`, query: this.$route.query }).catch(() => { });
                    }
                }
            }
        },
        '$route.params': async function (newParams) {
            if (newParams.type) {
                const newType = newParams.type.toUpperCase();
                if (this.store.listType !== newType) {
                    this.store.setListType(newType);
                } else {
                    const item = this.list[this.selected];
                    const lvl = item ? item : null;
                    const currentId = lvl ? String(lvl._id || lvl.id) : null;

                    if (currentId !== String(newParams.id)) {
                        this.syncSelectionFromUrl();
                    }
                }
            }
        },
        searchQuery: function (newVal, oldVal) {
            const query = { ...this.$route.query };
            if (newVal) {
                query.q = newVal;
            } else {
                delete query.q;
            }

            if (this.$route.query.q !== query.q) {
                this.$router.replace({ query }).catch(() => { });
            }

            if (oldVal && !newVal && this.selected !== null && this.mobileView === 'list') {
                this.$nextTick(() => {
                    const activeCell = document.querySelector('.list td.active');
                    if (activeCell && activeCell.parentElement) {
                        activeCell.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            }
        }
    },

    computed: {
        currentLevelPacks() {
            if (!this.level || !this.packs) return [];
            return this.packs.filter(pack => pack.levels.includes(String(this.level._id || this.level.id)));
        },
        filteredList() {
            if (!this.list) return [];
            const mappedList = this.list.map(([level, err], index) => ({
                level, err, originalIndex: index
            }));
            if (!this.searchQuery) return mappedList;
            const query = this.searchQuery.toLowerCase();
            return mappedList.filter(item => {
                const level = item.level;
                if (!level) return false;
                return (
                    level.name.toLowerCase().includes(query) ||
                    level.author.toLowerCase().includes(query) ||
                    String(level.id).includes(query)
                );
            });
        },
        normalizedRules() {
            if (!this.rules) return [];

            if (this.rules.rules && Array.isArray(this.rules.rules)) {
                return this.rules.rules;
            }

            if (Array.isArray(this.rules)) {
                return this.rules;
            }

            const sections = [];
            if (this.rules.level_rules && this.rules.level_rules.length) {
                sections.push({ header: "Level Submission Rules", rules: this.rules.level_rules, visible: true });
            }
            if (this.rules.record_rules && this.rules.record_rules.length) {
                sections.push({ header: "Record Submission Rules", rules: this.rules.record_rules, visible: true });
            }
            return sections;
        },
        level() {
            const item = this.list[this.selected];
            if (!item) return null;
            const [lvl] = item;
            return lvl;
        },
        video() {
            if (!this.level || !this.level.verification) return '';
            if (!this.level.showcase) return embed(this.level.verification);
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
    },
    async mounted() {
        const style = document.createElement('style');
        style.textContent = `
            .list-btn { background: transparent; border: 1px solid var(--color-text-secondary); color: var(--color-text-secondary); padding: 8px 16px; cursor: pointer; border-radius: 4px; font-family: 'Lexend Deca', sans-serif; }
            .active-list-btn { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }
            .rule-text a { color: var(--color-primary); text-decoration: underline; }
            .rule-text code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            
            /* Global Page Transition */
            .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
            .fade-enter, .fade-leave-to { opacity: 0; }
            .fade-enter-from, .fade-leave-to { opacity: 0; }
        `;
        document.head.appendChild(style);

        if (this.$route.query.q) {
            this.searchQuery = this.$route.query.q;
        }

        if (this.$route.params.type) {
            const routeType = this.$route.params.type.toUpperCase();
            if ((routeType === 'TPCL' || routeType === 'TPL') && this.store.listType !== routeType) {
                this.store.setListType(routeType);
            }
        }

        await this.loadData();
    },
    methods: {
        embed,
        score,
        scrollToTop() {
            window.scrollTo(0, 0);
        },
        parseRule(text) {
            return renderMarkdown(text);
        },
        syncSelectionFromUrl() {
            const dbIdFromUrl = this.$route.params.id;
            if (dbIdFromUrl && this.list && this.list.length > 0) {
                const targetDbId = String(dbIdFromUrl);
                const foundIndex = this.list.findIndex(item => {
                    const [lvl] = item;
                    return lvl && (String(lvl._id) === targetDbId || String(lvl.id) === targetDbId);
                });

                if (foundIndex !== -1) {
                    if (this.selected !== foundIndex) {
                        this.selected = foundIndex;
                        this.mobileView = 'detail';
                    }
                } else {
                    if (this.selected !== 0) this.selected = 0;
                }
            } else {
                if (this.selected !== 0) this.selected = 0;
            }
        },
        async loadData() {
            const [listData, packsData, editorsData, rulesData] = await Promise.all([
                fetchList(this.store.listType, false),
                fetchPacks(this.store.listType),
                fetchEditors(),
                fetchRules(this.store.listType)
            ]);

            this.list = listData;
            this.packs = packsData;
            this.editors = editorsData;
            this.rules = rulesData;

            this.errors = [];
            if (!this.list) {
                this.errors.push("Failed to load list. Retry in a few minutes or notify list staff.");
            } else {
                this.errors.push(
                    ...this.list.filter(([_, err]) => err).map(([_, err]) => `Failed to load level (ID: ${err})`)
                );
                if (!this.editors) this.errors.push("Failed to load list editors.");
                if (!this.rules) {
                    this.rulesError = true;
                    this.errors.push("Failed to load rules.");
                }
            }

            this.syncSelectionFromUrl();
            await this.loadRecordsForSelected();
            this.loading = false;
        },
        async loadRecordsForSelected() {
            const levelItem = this.list[this.selected];
            if (!levelItem) return;

            const [level] = levelItem;
            if (!level || level._recordsFetched) return;

            this.loadingRecords = true;
            import('../content.js').then(async ({ fetchRecords }) => {
                const records = await fetchRecords(level._id, this.store.listType);
                level.records = records;
                level._recordsFetched = true;

                const wrapper = this.$refs.recordsWrapper;

                if (wrapper) {
                    const startHeight = wrapper.offsetHeight;
                    wrapper.style.height = startHeight + 'px';

                    this.loadingRecords = false;

                    this.$nextTick(() => {
                        wrapper.style.height = 'auto';
                        const targetHeight = wrapper.offsetHeight;

                        wrapper.style.height = startHeight + 'px';
                        wrapper.offsetHeight;

                        wrapper.style.transition = 'height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
                        wrapper.style.height = targetHeight + 'px';

                        setTimeout(() => {
                            wrapper.style.height = 'auto';
                            wrapper.style.transition = '';
                        }, 600);
                    });
                } else {
                    this.loadingRecords = false;
                }
            });
        },
        getPackStyle(pack) {
            const hex = pack.color || '#ffffff';
            const contrast = this.getContrastColor(hex);
            const darker = this.adjustColor(hex, -40);

            return {
                backgroundColor: hex,
                color: contrast,
                border: `1px solid ${darker}`,
                borderRadius: '99px',
                padding: '6px 12px',
                fontWeight: 'bold',
                textShadow: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            };
        },
        getContrastColor(hex) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#000000' : '#ffffff';
        },
        adjustColor(color, amount) {
            return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
        }
    },
};