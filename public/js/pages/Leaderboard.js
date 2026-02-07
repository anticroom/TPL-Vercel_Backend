import { fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
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
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player">
                        <h1><span class="goldhighlight">#{{ selected + 1 }} </span> {{ entry.user }}</h1>
                        <h3>{{ localize(entry.total) }}</h3>
                        
                        <h2 v-if="entry.packs && entry.packs.length > 0">Packs Completed ({{ entry.packs.length }})</h2>
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
                                    <p><span class="typle-label-pluspoint">+{{ localize(pack.score) }}</span></p>
                                </td>
                            </tr>
                        </table>

                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                        
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'typle-label-pluspoint' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-minus)' : ''">
                                            +{{ localize(score.score) }}
                                        </span>
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <h2 v-if="entry.uncompleted && entry.uncompleted.length > 0" style="opacity: 0.7;">
                            Uncompleted ({{ entry.uncompleted.length }})
                        </h2>
                        <table class="table" v-if="entry.uncompleted && entry.uncompleted.length > 0" style="opacity: 0.7;">
                            <tr v-for="score in entry.uncompleted">
                                <td class="rank">
                                    <p>
                                        <span :class="score.rank <= 150 ? 'goldhighlight' : ''" 
                                              :style="score.rank > 150 ? 'color: var(--color-text-legacy)' : ''">
                                            #{{ score.rank }}
                                        </span>
                                    </p>
                                </td>
                                <td class="level">
                                    <span class="type-label-lg">{{ score.level }}</span>
                                </td>
                                <td class="score">
                                    <p style="color: var(--color-text-minus);">+{{ localize(score.score) }}</p>
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
        const [leaderboard, err] = await fetchLeaderboard();
        this.leaderboard = leaderboard;
        this.err = err;
        this.loading = false;
    },
    methods: {
        localize,
    },
};