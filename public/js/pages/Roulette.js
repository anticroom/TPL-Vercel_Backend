import { fetchList } from '../content.js';
import { embed, shuffle } from '../util.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette">
            <div class="roulette-wrapper">
                <div class="roulette-layout" :class="{ 'is-playing': isActive }">
                    
                    <aside class="roulette-controls">
                        <div class="control-card">
                            <div class="control-header">
                                <h3 class="type-headline-sm">Roulette Options</h3>
                            </div>
                            <div class="control-body">
                                <form class="toggles">
                                    <div class="list-group">
                                        <div class="check">
                                            <input type="checkbox" id="TPCL" v-model="useTPCL">
                                            <label for="TPCL" class="type-label-lg">Include TPCL</label>
                                        </div>
                                        <div class="sub-checks" v-if="useTPCL">
                                            <div class="check" v-if="hasTPCLMain">
                                                <input type="checkbox" id="TPCL_main" v-model="useTPCLMain">
                                                <label for="TPCL_main" class="type-label-md">Main List (1-75)</label>
                                            </div>
                                            <div class="check" v-if="hasTPCLExtended">
                                                <input type="checkbox" id="TPCL_ext" v-model="useTPCLExtended">
                                                <label for="TPCL_ext" class="type-label-md">Extended List (76-150)</label>
                                            </div>
                                            <div class="check" v-if="hasTPCLLegacy">
                                                <input type="checkbox" id="TPCL_leg" v-model="useTPCLLegacy">
                                                <label for="TPCL_leg" class="type-label-md">Legacy List (>150)</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="list-group">
                                        <div class="check">
                                            <input type="checkbox" id="TPL" v-model="useTPL">
                                            <label for="TPL" class="type-label-lg">Include TPL</label>
                                        </div>
                                        <div class="sub-checks" v-if="useTPL">
                                            <div class="check" v-if="hasTPLMain">
                                                <input type="checkbox" id="tpl_main" v-model="useTPLMain">
                                                <label for="tpl_main" class="type-label-md">Main List (1-75)</label>
                                            </div>
                                            <div class="check" v-if="hasTPLExtended">
                                                <input type="checkbox" id="tpl_ext" v-model="useTPLExtended">
                                                <label for="tpl_ext" class="type-label-md">Extended List (76-150)</label>
                                            </div>
                                            <div class="check" v-if="hasTPLLegacy">
                                                <input type="checkbox" id="tpl_leg" v-model="useTPLLegacy">
                                                <label for="tpl_leg" class="type-label-md">Legacy List (>150)</label>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Btn @click.native.prevent="onStart" class="btn-start" style="margin-top: 8px;">
                                        {{ isActive ? 'Restart' : 'Start' }}
                                    </Btn>
                                </form>
                                <p class="type-label-md" style="color: #aaa; margin-top: 12px; text-align: center;">
                                    The roulette saves automatically.
                                </p>
                            </div>
                        </div>

                        <div class="control-card">
                            <div class="control-header">
                                <h3 class="type-headline-sm">Manual Load/Save</h3>
                            </div>
                            <div class="control-body btns-row">
                                <Btn @click.native.prevent="onImport" class="btn-small">Import</Btn>
                                <Btn :disabled="!isActive" @click.native.prevent="onExport" class="btn-small">Export</Btn>
                            </div>
                        </div>
                    </aside>

                    <section class="roulette-game">
                        
                        <template v-if="isActive">
                            <div class="level-card current-level">
                                <div class="card-header">
                                    <span class="tag type-label-sm">
                                        Round {{ progression.length + 1 }}
                                    </span>
                                    <h1 class="level-name type-headline-lg">{{ currentLevel.name }}</h1>
                                    <p class="type-label-md" style="opacity: 0.7; margin: 5px 0;">ID: {{ currentLevel.id }}</p>
                                    <p class="level-rank type-headline-sm">
                                        <span class="type-label-sm" style="opacity: 0.8; margin-right: 5px;">{{ currentLevel.listType }}</span>
                                        <span :class="currentLevel.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="currentLevel.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ currentLevel.rank }}
                                        </span>
                                    </p>
                                </div>
                                
                                <div class="video-wrapper">
                                    <div class="video-container" v-html="embed(currentLevel.video)"></div>
                                </div>

                                <div class="card-actions">
                                    <form class="actions-form" @submit.prevent>
                                        <input type="number" 
                                               v-model="percentage" 
                                               :placeholder="\`At least \${currentPercentage + 1}%\`" 
                                               class="percent-input"
                                               :min="currentPercentage + 1" 
                                               max="100"
                                               @keyup.enter="onDone">
                                        <div class="action-btns">
                                            <Btn @click.native.prevent="onDone" class="btn-success">Done</Btn>
                                            <Btn @click.native.prevent="onGiveUp" class="btn-danger">Give Up</Btn>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <div class="results-card" v-if="hasCompleted || givenUp">
                                <h1 class="type-headline-lg">Results</h1>
                                <div class="stats-grid">
                                    <div class="stat">
                                        <span class="label type-label-sm">Number of levels</span>
                                        <span class="value type-headline-md">{{ progression.length }}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label type-label-sm">Highest percent</span>
                                        <span class="value type-headline-md">{{ currentPercentage }}%</span>
                                    </div>
                                </div>
                                <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.native.prevent="showRemaining = !showRemaining" style="margin-top: 24px; width: 100%;">
                                    {{ showRemaining ? 'Hide remaining levels' : 'Show remaining levels' }}
                                </Btn>
                            </div>

                            <div class="empty-state" v-else>
                                <div class="empty-icon">🎲</div>
                                <h2 class="type-headline-md">Ready to Play?</h2>
                                <p class="type-body">Select options on the left and click Start.</p>
                            </div>
                        </template>

                        <div class="lists-wrapper">
                            <div v-if="showRemaining && (givenUp || hasCompleted)" class="list-section">
                                <h3 class="type-headline-sm">Remaining Levels</h3>
                                <div class="level-list-item faded" v-for="(level, i) in levels.slice(progression.length + 1, levels.length - currentPercentage + progression.length)">
                                    <div class="level-info">
                                        <span class="rank-tag type-label-sm" 
                                              :class="level.rank <= 150 ? 'goldhighlight' : ''"
                                              :style="level.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            {{ level.listType }} #{{ level.rank }}
                                        </span>
                                        <strong class="type-label-lg">
                                            {{ level.name }} 
                                            <span style="font-size:0.7em; font-weight:normal; opacity:0.7;">{{ level.id }}</span>
                                        </strong>
                                    </div>
                                    <div class="level-req type-label-md" style="color: var(--color-error)">{{ currentPercentage + 2 + i }}%</div>
                                </div>
                            </div>

                            <div class="list-section" v-if="progression.length > 0">
                                <h3 class="type-headline-sm">Completed Levels</h3>
                                <div class="level-list-item completed" v-for="(level, i) in levels.slice(0, progression.length).reverse()">
                                    <div class="level-info">
                                        <span class="rank-tag type-label-sm"
                                              :class="level.rank <= 150 ? 'goldhighlight' : ''"
                                              :style="level.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            {{ level.listType }} #{{ level.rank }}
                                        </span>
                                        <strong class="type-label-lg">
                                            {{ level.name }}
                                            <span style="font-size:0.7em; font-weight:normal; opacity:0.7;">{{ level.id }}</span>
                                        </strong>
                                    </div>
                                    <div class="level-percent type-label-lg">{{ progression[progression.length - 1 - i] }}%</div>
                                </div>
                            </div>
                        </div>

                    </section>
                </div>
            </div>
            
            <div class="toasts-container">
                <div v-for="toast in toasts" class="toast">
                    <p class="type-label-md">{{ toast }}</p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: true, 
        
        TPCLLevels: [],
        TPLLevels: [],

        levels: [],
        progression: [],
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        
        useTPL: true,
        useTPL: false,

        useTPCLMain: true,
        useTPCLExtended: true,
        useTPCLLegacy: true,

        useTPLMain: true,
        useTPLExtended: true,
        useTPLLegacy: true,

        toasts: [],
        fileInput: undefined,
        store
    }),
    async mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        const [TPCLData, TPLData] = await Promise.all([
            fetchList('TPCL'),
            fetchList('TPL')
        ]);

        if (TPCLData) {
            this.TPCLLevels = TPCLData.map(([lvl], index) => {
                if (!lvl) return null;
                return {
                    ...lvl,
                    listType: 'TPCL',
                    rank: index + 1,
                    video: lvl.verification || lvl.video
                };
            }).filter(l => l);
        }

        if (TPLData) {
            this.TPLLevels = TPLData.map(([lvl], index) => {
                if (!lvl) return null;
                return {
                    ...lvl,
                    listType: 'TPL',
                    rank: index + 1,
                    video: lvl.verification || lvl.video
                };
            }).filter(l => l);
        }

        if (this.TPCLLevels.length === 0 && this.TPLLevels.length === 0) {
            this.showToast('Warning: Failed to load levels.');
        }
        
        if (this.store.listType === 'TPL') {
            this.useTPCL = false;
            this.useTPL = true;
        } else {
            this.useTPCL = true;
            this.useTPL = false;
        }

        this.loading = false;

        const roulette = JSON.parse(localStorage.getItem('roulette'));
        if (roulette) {
            this.levels = roulette.levels;
            this.progression = roulette.progression;
        }
    },
    computed: {
        hasTPCLMain() { return this.TPCLLevels.some(l => l.rank <= 75); },
        hasTPCLExtended() { return this.TPCLLevels.some(l => l.rank > 75 && l.rank <= 150); },
        hasTPCLLegacy() { return this.TPCLLevels.some(l => l.rank > 150); },

        hasTPLMain() { return this.TPLLevels.some(l => l.rank <= 75); },
        hasTPLExtended() { return this.TPLLevels.some(l => l.rank > 75 && l.rank <= 150); },
        hasTPLLegacy() { return this.TPLLevels.some(l => l.rank > 150); },

        currentLevel() {
            return this.levels[this.progression.length];
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        hasCompleted() {
            return (
                this.progression[this.progression.length - 1] >= 100 ||
                (this.levels.length > 0 && this.progression.length === this.levels.length)
            );
        },
        isActive() {
            return (
                this.levels.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
    },
    methods: {
        shuffle,
        embed,
        onStart() {
            if (this.isActive) {
                if (!confirm('Give up and restart?')) return;
            }

            if (!this.useTPCL && !this.useTPL) {
                this.showToast('Please select at least one list.');
                return;
            }

            const pool = [];

            if (this.useTPCL) {
                const TPCLSubset = this.TPCLLevels.filter(l => {
                    if (l.rank <= 75) return this.useTPCLMain;
                    if (l.rank <= 150) return this.useTPCLExtended;
                    return this.useTPCLLegacy;
                });
                pool.push(...TPCLSubset);
            }

            if (this.useTPL) {
                const TPLSubset = this.TPLLevels.filter(l => {
                    if (l.rank <= 75) return this.useTPLMain;
                    if (l.rank <= 150) return this.useTPLExtended;
                    return this.useTPLLegacy;
                });
                pool.push(...TPLSubset);
            }

            if (pool.length === 0) {
                this.showToast('No levels matching your criteria.');
                return;
            }

            this.levels = shuffle(pool).slice(0, 100);
            this.progression = [];
            this.percentage = undefined;
            this.givenUp = false;
            this.showRemaining = false;
            
            this.save();
        },
        save() {
            localStorage.setItem('roulette', JSON.stringify({
                levels: this.levels,
                progression: this.progression,
            }));
        },
        onDone() {
            if (!this.percentage) return;
            if (this.percentage <= this.currentPercentage || this.percentage > 100) {
                this.showToast('Invalid percentage.');
                return;
            }
            this.progression.push(this.percentage);
            this.percentage = undefined;
            this.save();
        },
        onGiveUp() {
            this.givenUp = true;
            localStorage.removeItem('roulette');
        },
        onImport() {
            this.fileInput.click();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;
            const file = this.fileInput.files;
            try {
                const roulette = JSON.parse(await file.text());
                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
            } catch {
                this.showToast('Invalid file.');
            }
            this.fileInput.value = '';
        },
        onExport() {
            const file = new Blob([JSON.stringify({ levels: this.levels, progression: this.progression })], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = `roulette-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => this.toasts.shift(), 3000);
        },
    },
};