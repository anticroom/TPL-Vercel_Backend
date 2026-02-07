import { fetchList } from '../content.js';
import { embed, shuffle } from '../util.js';

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
                <div class="roulette-layout">
                    
                    <aside class="roulette-controls">
                        <div class="control-card">
                            <div class="control-header">
                                <h3 class="type-headline-sm">Options</h3>
                            </div>
                            <div class="control-body">
                                <form class="toggles">
                                    <div class="check">
                                        <input type="checkbox" id="main" v-model="useMainList">
                                        <label for="main" class="type-label-lg">Main List (1-75)</label>
                                    </div>
                                    <div class="check">
                                        <input type="checkbox" id="extended" v-model="useExtendedList">
                                        <label for="extended" class="type-label-lg">Extended List (76-150)</label>
                                    </div>
                                    <div class="check">
                                        <input type="checkbox" id="legacy" v-model="useLegacyList">
                                        <label for="legacy" class="type-label-lg" style="color: var(--color-text-legacy)">Legacy List (151+)</label>
                                    </div>
                                    <Btn @click.native.prevent="onStart" class="btn-start">{{ isActive ? 'Restart' : 'Start' }}</Btn>
                                </form>
                                <p class="type-label-md" style="color: #aaa; margin-top: 12px;">
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
                                    <span class="tag type-label-sm">Level {{ progression.length + 1 }}</span>
                                    <h1 class="level-name type-headline-lg">{{ currentLevel.name }}</h1>
                                    <p class="type-label-md" style="opacity: 0.7; margin: 5px 0;">ID: {{ currentLevel.id }}</p>
                                    <p class="level-rank type-headline-sm">
                                        <span :class="currentLevel.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="currentLevel.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ currentLevel.rank }}
                                        </span>
                                    </p>
                                </div>
                                
                                <div class="video-wrapper">
                                    <iframe class="video-frame" :src="embed(currentLevel.video)" frameborder="0" allowfullscreen></iframe>
                                </div>

                                <div class="card-actions">
                                    <form class="actions-form" @submit.prevent>
                                        <input type="number" 
                                               v-model="percentage" 
                                               :placeholder="\`At least \${currentPercentage + 1}%\`" 
                                               class="percent-input type-headline-sm"
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
                                <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.native.prevent="showRemaining = !showRemaining" style="margin-top: 20px;">
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
                                            #{{ level.rank }}
                                        </span>
                                        <strong class="type-label-lg">{{ level.name }}</strong>
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
                                            #{{ level.rank }}
                                        </span>
                                        <strong class="type-label-lg">{{ level.name }}</strong>
                                    </div>
                                    <div class="level-percent type-label-lg" style="color: #2ecc71">{{ progression[progression.length - 1 - i] }}%</div>
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
        allLevels: [], 
        levels: [],
        progression: [],
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        useMainList: true,
        useExtendedList: true,
        useLegacyList: false, 
        toasts: [],
        fileInput: undefined,
    }),
    async mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        const fullList = await fetchList();
        if (fullList.filter(([_, err]) => err).length > 0) {
            this.showToast('Warning: Some levels failed to load.');
        }
        
        this.allLevels = fullList.map(([lvl, _], i) => ({
            rank: i + 1,
            id: lvl.id,
            name: lvl.name,
            video: lvl.verification || lvl.video,
        }));

        this.loading = false;

        const roulette = JSON.parse(localStorage.getItem('roulette'));
        if (roulette) {
            this.levels = roulette.levels;
            this.progression = roulette.progression;
        }
    },
    computed: {
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

            if (!this.useMainList && !this.useExtendedList && !this.useLegacyList) {
                this.showToast('Please select at least one list section.');
                return;
            }

            const list = [];
            if (this.useMainList) list.push(...this.allLevels.filter(l => l.rank <= 75));
            if (this.useExtendedList) list.push(...this.allLevels.filter(l => l.rank > 75 && l.rank <= 150));
            if (this.useLegacyList) list.push(...this.allLevels.filter(l => l.rank > 150));

            if (list.length === 0) {
                this.showToast('No levels found.');
                return;
            }

            this.levels = shuffle(list).slice(0, 100);
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
            this.fileInput.showPicker();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;
            const file = this.fileInput.files[0];
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
            a.download = 'tpl_roulette.json';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => this.toasts.shift(), 3000);
        },
    },
};