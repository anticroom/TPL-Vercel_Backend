import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchRules } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="list-header" style="margin-bottom: 10px; padding: 0 10px;">
                    <input 
                        v-model="searchQuery" 
                        type="text" 
                        placeholder="Search levels..." 
                        class="search-input" 
                    />
                </div>

                <table class="list" v-if="list">
                    <tr v-for="(item, i) in filteredList" :key="item.originalIndex">
                        <td class="rank">
                            <p class="type-label-lg">
                                <span :class="item.originalIndex + 1 <= 150 ? 'goldhighlight' : ''" 
                                      :style="item.originalIndex + 1 > 150 ? 'color: var(--color-text-legacy)' : ''">
                                    #{{ item.originalIndex + 1 }}
                                </span>
                            </p>
                        </td>
                        <td class="level" :class="{ 'active': selected == item.originalIndex, 'error': !item.level }">
                            <button @click="selected = item.originalIndex">
                                <span class="type-label-lg">{{ item.level?.name || \`Error (ID: \${item.err})\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <p class="warning-lable">WARNING! Levels AND videos may be epileptic</p>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    
                    <p v-if="selected + 1 <= 150"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else><strong>100%</strong> to qualify (Legacy)</p>
                    
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>Uh Oh! It seems there's an error loading the level :/ Please contact Antiroom (Developer) to fix it.</p>
                </div>
            </div>
            
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>

                    <p style="margin-bottom: 20px; font-size: 0.9rem; opacity: 0.8;">
                        Our List is open source! 
                        <a href="https://github.com/anticroom/TPL-Vercel_Backend" target="_blank" style="text-decoration: underline; color: inherit;">Press To View Repo <3</a>
                    </p>

                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}-dark.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                  
                    <p></p>
                    <h3>Level Submission Rules</h3>
                    <div v-if="rules && rules.level_rules">
                        <div class="rule-text" v-for="(rule, index) in rules.level_rules" :key="'lvl-'+index" v-html="parseRule(rule)"></div>
                    </div>
                    <p v-else-if="rulesError" class="error">Uh oh! Failed to load the level submission rules :/ Please contact Antiroom (Developer) to fix it.</p>
                    <p v-else>Loading rules...</p>

                    <p></p>
                    <h3>Record Submission Rules</h3>
                    <div v-if="rules && rules.record_rules">
                        <div class="rule-text" v-for="(rule, index) in rules.record_rules" :key="'rec-'+index" v-html="parseRule(rule)"></div>
                    </div>
                    <p v-else-if="rulesError" class="error">Uh oh! Failed to load the record submission rules :/ Please contact Antiroom (Developer) to fix it.</p>
                    <p v-else>Loading rules...</p>
                    </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        rules: null,
        rulesError: false,
        loading: true,
        selected: 0,
        searchQuery: "", 
        errors: [],
        roleIconMap,
        store,
        toggledShowcase: false,
    }),
    computed: {
        filteredList() {
            if (!this.list) return [];

            const mappedList = this.list.map(([level, err], index) => ({
                level,
                err,
                originalIndex: index
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
        level() {
            return this.list[this.selected] && this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.rules = await fetchRules();

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level (ID: ${err})`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
            if (!this.rules) {
                this.rulesError = true;
                this.errors.push("Failed to load rules.");
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        parseRule(text) {
            if (!text) return "";
            
            let content = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            let tag = 'p';
            let classes = 'type-body';
            let styles = 'margin:0;';

            if (content.startsWith('### ')) {
                tag = 'h5';
                classes = 'type-title-md';
                styles = 'margin-top: 10px; margin-bottom: 5px;';
                content = content.substring(4);
            } else if (content.startsWith('# ')) {
                tag = 'h3';
                classes = 'type-headline-sm';
                styles = 'margin-top: 15px; margin-bottom: 8px;';
                content = content.substring(2);
            } else if (content.startsWith('-# ')) {
                tag = 'p';
                classes = 'type-label-sm';
                styles = 'opacity: 0.7; margin-bottom: 5px;';
                content = content.substring(3);
            }

            let isBullet = false;
            let isNested = false;

            if (content.match(/^\s{2,}\*\s/)) {
                isBullet = true;
                isNested = true;
                content = content.replace(/^\s{2,}\*\s/, '');
            } else if (content.startsWith('* ')) {
                isBullet = true;
                content = content.substring(2);
            }

            content = content.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px; font-family:monospace;">$1</code>');
            content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--color-primary); text-decoration:underline;">$1</a>');
            content = content.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            content = content.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
            content = content.replace(/~~(.*?)~~/g, '<del>$1</del>');

            const textHTML = `<${tag} class="${classes}" style="${styles}">${content}</${tag}>`;

            if (isBullet) {
                const marginLeft = isNested ? '20px' : '0';
                return `<div style="display:flex; align-items:flex-start; margin-left:${marginLeft};">
                            <span style="margin-right: 8px; color: var(--color-primary); font-weight: 700; line-height: 1.5;">•</span>
                            <div style="flex: 1;">${textHTML}</div>
                        </div>`;
            } else {
                return textHTML;
            }
        }
    },
};