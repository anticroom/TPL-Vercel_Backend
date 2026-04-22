import { store } from '../main.js';
import { fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';

export default {
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        mobileView: 'list',
        err: [],
        store,
    }),
    
    watch: {
        'store.listType': async function() {
            this.mobileView = 'list';
            await this.loadLeaderboard();
        }
    },

    template: `
        <main v-if="loading" class="page-leaderboard-container" :class="'mobile-state-' + mobileView">
            <div class="page-leaderboard" style="opacity: 0.7;">
                <div class="board-container">
                    <table class="board">
                        <tr v-for="n in 20" :key="n">
                            <td class="rank">
                                <p class="type-label-lg">
                                    <span class="skeleton" style="height: 20px; width: 35px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                </p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">
                                    <span class="skeleton" style="height: 20px; width: 60px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                </p>
                            </td>
                            <td class="user">
                                <div style="border: 2px solid var(--color-border); border-radius: 0.5rem; padding: 1rem; width: 100%;">
                                    <span class="skeleton" style="height: 20px; width: 45%; border-radius: 4px; display: block;"></span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div class="player-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to Leaderboard</button>
                    <div class="player">
                        
                        <h1 class="type-h1">
                            <span class="skeleton" style="height: 52px; width: 60%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h1>
                        
                        <h3 class="type-headline-sm">
                            <span class="skeleton" style="height: 28px; width: 15%; border-radius: 6px; display: inline-block; vertical-align: top;"></span>
                        </h3>

                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 36px; width: 35%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        
                        <table class="table">
                            <tr v-for="n in 6" :key="'s1-'+n">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 18px; border-radius: 18px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="level">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 40%; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span class="skeleton" style="height: 20px; width: 60px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 36px; width: 45%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        
                        <table class="table">
                            <tr v-for="n in 5" :key="'s2-'+n">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 35px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="level">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 50%; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span class="skeleton" style="height: 20px; width: 50px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <h2 class="type-headline-md">
                            <span class="skeleton" style="height: 36px; width: 25%; border-radius: 8px; display: inline-block; vertical-align: top;"></span>
                        </h2>
                        
                        <table class="table">
                            <tr v-for="n in 3" :key="'s3-'+n">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 35px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="level">
                                    <p class="type-label-lg">
                                        <span class="skeleton" style="height: 20px; width: 75%; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span class="skeleton" style="height: 20px; width: 50px; border-radius: 4px; display: inline-block; vertical-align: middle;"></span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
        
        <main v-else class="page-leaderboard-container" :class="'mobile-state-' + mobileView">
            <div class="page-leaderboard">
                
                <div class="error-container">
                    <p class="error type-body" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <table class="board">
                        <tr v-for="(ientry, i) in leaderboard">
                            <td class="rank">
                                <p class="type-label-lg"><span class="goldhighlight">#{{ i + 1 }}</span></p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i; mobileView = 'detail'; window.scrollTo(0,0);">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <button class="mobile-back-btn" @click="mobileView = 'list'">← Back to Leaderboard</button>
                    <div class="player" v-if="entry">
                        <h1 class="type-h1"><span class="goldhighlight">#{{ selected + 1 }} </span> {{ entry.user }}</h1>
                        <h3 class="type-headline-sm">{{ localize(entry.total) }}</h3>
                        
                        <h2 class="type-headline-md" v-if="entry.packs && entry.packs.length > 0">Packs Completed ({{ entry.packs.length }})</h2>
                        <table class="table" v-if="entry.packs && entry.packs.length > 0">
                            <tr v-for="pack in entry.packs" :key="pack.name">
                                <td class="rank">
                                    <div :style="{
                                        width: '12px', 
                                        height: '12px', 
                                        borderRadius: '50%', 
                                        backgroundColor: pack.color || '#fff',
                                        display: 'inline-block'
                                    }"></div>
                                </td>
                                <td class="level">
                                    <span class="type-label-lg">{{ pack.name }}</span>
                                </td>
                                <td class="score">
                                    <p class="type-body"><span class="typle-label-pluspoint">+{{ localize(pack.score) }}</span></p>
                                </td>
                            </tr>
                        </table>

                        <h2 class="type-headline-md" v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table" v-if="entry.verified.length > 0">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy); font-weight: 700;' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <h2 class="type-headline-md" v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table" v-if="entry.completed.length > 0">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy); font-weight: 700;' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <h2 class="type-headline-md" v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table" v-if="entry.progressed.length > 0">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy); font-weight: 700;' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p class="type-body">
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <h2 class="type-headline-md" v-if="entry.uncompleted && entry.uncompleted.length > 0" style="opacity: 0.7;">
                            Uncompleted ({{ entry.uncompleted.length }})
                        </h2>
                        <table class="table" v-if="entry.uncompleted && entry.uncompleted.length > 0" style="opacity: 0.7;">
                            <tr v-for="score in entry.uncompleted">
                                <td class="rank">
                                    <p class="type-label-lg">
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy); font-weight: 700;' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <span class="type-label-lg">{{ score.level }}</span>
                                </td>
                                <td class="score">
                                    <p class="type-body" style="color: var(--color-text-minus);">+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },
    },
    async mounted() {
        await this.loadLeaderboard();
    },
    methods: {
        localize,
        async loadLeaderboard() {
            this.loading = true;
            this.leaderboard = [];
            const [leaderboard, err] = await fetchLeaderboard(this.store.listType);
            this.leaderboard = leaderboard;
            this.err = err;
            this.selected = 0;
            this.loading = false;
        }
    },
};