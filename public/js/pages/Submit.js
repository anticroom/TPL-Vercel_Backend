import { store } from '../main.js';
import { fetchList } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data() {
        return {
            store,
            submissionType: 'record',
            formData: {
                levelName: '',
                username: '',
                percent: '',
                hz: '',
                discord: '',
                videoLink: '',
                notes: '',
                listType: ''
            },
            levelFormData: {
                name: '',
                id: '',
                author: '',
                verifier: '',
                verification: '',
                percentToQualify: 100,
                placementSuggestion: '',
                notes: ''
            },
            turnstileToken: null,
            turnstileWidgetId: null,
            turnstileError: '',
            isSubmitting: false,
            successMessage: '',
            errorMessage: '',
            levels: [],
            levelSearchInput: '',
            minPercent: 0,
            isLoadingLevels: false,
            isSidebarOpen: false,
            isLoadingSidebar: false,
            sidebarSubmissions: [],
            expandedSubmissions: [],
            currentPage: 1,
            totalPages: 1,

            sidebarSearch: '',
            sidebarStatus: 'all'
        };
    },
    computed: {
        filteredLevels() {
            const search = this.levelSearchInput.toLowerCase();
            
            if (!search) return this.levels;

            return this.levels.filter(level =>
                level && 
                level[0] && 
                level[0].name && 
                level[0].name.toLowerCase().includes(search)
            );
        }
    },
    watch: {
        submissionType() {
            if (window.turnstile && this.turnstileWidgetId !== null) {
                try {
                    window.turnstile.remove(this.turnstileWidgetId);
                } catch (e) { }
            }
            this.turnstileError = '';
            this.renderTurnstile();

            this.sidebarSearch = '';
            this.sidebarStatus = 'all';
            this.currentPage = 1;
            this.expandedSubmissions = [];
            this.sidebarSubmissions = [];
            if (this.isSidebarOpen) this.fetchSidebarSubmissions();
        },
        'store.listType': async function () {
            this.levelSearchInput = '';
            this.levels = [];
            this.formData.levelName = '';
            this.formData.percent = '';
            this.formData.hz = '';
            this.formData.videoLink = '';
            this.formData.notes = '';
            this.successMessage = '';
            this.errorMessage = '';

            await this.loadLevels();

            this.sidebarSearch = '';
            this.sidebarStatus = 'all';
            this.currentPage = 1;
            this.expandedSubmissions = [];
            this.sidebarSubmissions = [];
            if (this.isSidebarOpen) this.fetchSidebarSubmissions();
        }
    },
    template: `
        <main class="page-submit">
            <div class="submit-container">
                <div class="submit-header-top">
                    <div class="submit-header-left">
                        <h1 class="type-headline-lg">Submit to the List</h1>
                        <p class="type-body submit-intro">
                            Choose what you'd like to submit: a record on an existing level or a brand new level to be added to the list.
                        </p>
                        <button @click="toggleSidebar" class="btn-view-history">
                            <i class="fa-solid fa-file-lines"></i> View Submissions
                        </button>
                    </div>
                    <div class="submit-type-toggle">
                        <button @click="submissionType = 'record'" 
                                :class="{ active: submissionType === 'record' }"
                                class="type-toggle-btn">
                            Submit Records
                        </button>
                        <button @click="submissionType = 'level'" 
                                :class="{ active: submissionType === 'level' }"
                                class="type-toggle-btn">
                            Submit Levels
                        </button>
                    </div>
                </div>

                <div class="submit-content">
                    <div class="submit-section" v-if="submissionType === 'record'">
                        <h2 class="type-headline-md">Submit a Record</h2>
                        <p class="type-body submit-intro sub-text">
                            Complete the form below to submit your verified record. Staff will review and approve or deny your submission but PLEASE make sure to put your username exactly as it is with your other records or it'll treat it like another user!
                        </p>
                        <form @submit.prevent="submitRecord" class="submit-form">
                            <div class="level-selection-container">
                                <div class="level-search-column">
                                    <label class="type-label-lg">Level Name *</label>
                                    <input 
                                        v-model="levelSearchInput" 
                                        type="text" 
                                        class="level-search-input type-label-lg"
                                        placeholder="Search levels..." 
                                        aria-controls="level-listbox"
                                    />
                                    <div v-if="formData.levelName" class="level-selected type-label-md">
                                        <i class="fa-solid fa-check" style="margin-right: 5px;"></i> Selected: {{ formData.levelName }}
                                    </div>
                                </div>
                                
                                <div class="level-list" id="level-listbox" role="listbox">
                                    <template v-if="isLoadingLevels">
                                        <div v-for="i in 6" :key="'skel-' + i" class="level-item" style="cursor: default;">
                                            <div class="skeleton skel-text"></div>
                                            <div class="skeleton skel-text skel-text-short" style="opacity: 0.5;"></div>
                                        </div>
                                    </template>

                                    <template v-else>
                                        <div v-if="filteredLevels.length === 0" class="no-results type-label-md">
                                            No levels found! If this is incorrect, please ping Anticroom about this issue! Sorry D:
                                        </div>
                                        <div 
                                            v-for="(level, index) in filteredLevels" 
                                            :key="store.listType + '-' + (level[0]?.id || level[0]?._id || '') + '-' + index"
                                            @click="selectLevel(level)"
                                            :class="{ active: formData.levelName === level[0]?.name }"
                                            class="level-item type-label-md"
                                            role="option"
                                        >
                                            <div class="level-item-name">{{ level[0]?.name }}</div>
                                            <div class="level-item-author">{{ level[0]?.author }}</div>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="type-label-lg">Your Username *</label>
                                    <input v-model="formData.username" type="text" class="type-label-lg" placeholder="Your list username" required />
                                </div>
                                <div class="form-group">
                                    <label class="type-label-lg">Percent Achieved *</label>
                                    <input v-model.number="formData.percent" type="number" class="type-label-lg" :min="minPercent" max="100" :placeholder="\`\${minPercent}-100\`" required />
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="type-label-lg">FPS / HZ *</label>
                                    <input v-model.number="formData.hz" type="number" class="type-label-lg" min="60" placeholder="60, 120, etc." required />
                                </div>
                                <div class="form-group">
                                <label class="type-label-lg">
                                Discord Username 
                                <span style="opacity: 0.5; display: inline-block;">(Optional)</span>
                                </label>
                                <input v-model="formData.discord" type="text" class="type-label-lg" placeholder="e.g. anticroom. or corno927.3" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="type-label-lg">Video Link *</label>
                                <input v-model="formData.videoLink" type="url" class="type-label-lg" placeholder="https://youtu.be/..." required />
                            </div>

                            <div class="form-group">
                                <label class="type-label-lg">Additional Notes</label>
                                <textarea v-model="formData.notes" class="type-label-lg" placeholder="Any other details about your submission..." rows="4"></textarea>
                            </div>

                            <div class="captcha-container">
                                <div id="turnstile-record"></div>
                                <div v-if="turnstileError" class="error-text" style="color: #ff4444; margin-top: 5px; font-weight: bold;">
                                    <i class="fa-solid fa-triangle-exclamation"></i> {{ turnstileError }}
                                </div>
                            </div>

                            <button type="submit" class="btn-submit-record" :disabled="isSubmitting">
                                <i v-if="isSubmitting" class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                                {{ isSubmitting ? 'Submitting...' : 'Submit Record' }}
                            </button>

                            <div v-if="successMessage" class="success-message">
                                <i class="fa-solid fa-check-circle"></i> {{ successMessage }}
                            </div>
                            <div v-if="errorMessage" class="error-message">
                                <i class="fa-solid fa-circle-xmark"></i> {{ errorMessage }}
                            </div>
                        </form>
                    </div>

                    <div class="submit-section" v-if="submissionType === 'level'">
                        <h2 class="type-headline-md">Submit a New Level</h2>
                        <p class="type-body submit-intro sub-text">
                            Have a level you verified that you want placed? Submit them here and we'll accept them in time!
                        </p>
                        <form @submit.prevent="submitLevel" class="submit-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="type-label-lg">Level Name *</label>
                                    <input v-model="levelFormData.name" type="text" class="type-label-lg" placeholder="Denoue..." required />
                                </div>
                                <div class="form-group">
                                    <label class="type-label-lg">Level ID *</label>
                                        <input 
                                        v-model.number="levelFormData.id"
                                        type="number"
                                        class="type-label-lg"
                                        placeholder="10000049475"
                                        required
                                        />
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="type-label-lg">Creator/Author *</label>
                                    <input v-model="levelFormData.author" type="text" class="type-label-lg" placeholder="Creator or Creator1, Creator2..." required />
                                </div>
                                <div class="form-group">
                                    <label class="type-label-lg">Verifier *</label>
                                    <input v-model="levelFormData.verifier" type="text" class="type-label-lg" placeholder="wPopo..." />
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="type-label-lg">Verification Video *</label>
                                <input v-model="levelFormData.verification" type="url" class="type-label-lg" placeholder="https://youtu.be/..." required />
                            </div>

                            <div class="form-group">
                                <label class="type-label-lg">Placement opinion *</label>
                                <input v-model="levelFormData.placementSuggestion" type="text" class="type-label-lg" placeholder="67 - 74" required />
                            </div>

                            <div class="form-group">
                                <label class="type-label-lg">Additional Notes</label>
                                <textarea v-model="levelFormData.notes" class="type-label-lg" placeholder="Any other details about this level..." rows="4"></textarea>
                            </div>

                            <div class="captcha-container">
                                <div id="turnstile-level"></div>
                                <div v-if="turnstileError" class="error-text" style="color: #ff4444; margin-top: 5px; font-weight: bold;">
                                    <i class="fa-solid fa-triangle-exclamation"></i> {{ turnstileError }}
                                </div>
                            </div>

                            <button type="submit" class="btn-submit-record" :disabled="isSubmitting">
                                <i v-if="isSubmitting" class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                                {{ isSubmitting ? 'Submitting...' : 'Submit Level' }}
                            </button>

                            <div v-if="successMessage" class="success-message">
                                <i class="fa-solid fa-check-circle"></i> {{ successMessage }}
                            </div>
                            <div v-if="errorMessage" class="error-message">
                                <i class="fa-solid fa-circle-xmark"></i> {{ errorMessage }}
                            </div>
                        </form>
                    </div>
                </div>

                <div class="sidebar-overlay" v-if="isSidebarOpen" @click="toggleSidebar"></div>
                <aside class="submissions-sidebar" :class="{ 'is-open': isSidebarOpen }">
                    <div class="sidebar-header">
                        <div>
                            <h3 class="type-headline-sm">Submission History</h3>
                            <p class="type-label-sm" style="opacity:0.7; margin-top:0.25rem;">
                                {{ store.listType }} - {{ submissionType === 'record' ? 'Records' : 'Levels' }}
                            </p>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn-icon-sidebar" @click="refreshSidebar" :disabled="isLoadingSidebar" title="Refresh list">
                                <i class="fa-solid fa-rotate-right" :class="{'fa-spin': isLoadingSidebar}"></i>
                            </button>
                            <button class="btn-icon-sidebar" @click="toggleSidebar" title="Close sidebar">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>

                    <div class="sidebar-filters">
                        <input v-model="sidebarSearch" type="text" placeholder="Search user or level..." class="sidebar-search-input" @keyup.enter="applySidebarFilters" />
                        <select v-model="sidebarStatus" class="sidebar-status-select">
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                        </select>
                        <button @click="applySidebarFilters" class="btn-sidebar-search">Search</button>
                    </div>
                    
                    <div class="sidebar-content">
                        <div v-if="isLoadingSidebar" class="loading-spinner">
                            <Spinner></Spinner>
                        </div>
                        <div v-else-if="sidebarSubmissions.length === 0" class="no-submissions type-body">
                            <p>No submissions found.</p>
                        </div>
                        <div v-else class="sidebar-table-container">
                            <div class="sidebar-table-header type-label-sm">
                                <div class="col-level">Level</div>
                                <div class="col-user">{{ submissionType === 'record' ? 'Player' : 'Creator' }}</div>
                                <div class="col-video">Link</div>
                                <div class="col-status">Status</div>
                                <div class="col-toggle"></div>
                            </div>
                            
                            <div class="sidebar-table-body">
                                <div v-for="sub in sidebarSubmissions" :key="sub.id" class="sidebar-row-group">
                                    <div class="sidebar-row-main" @click="toggleExpand(sub.id)">
                                        <div class="col-level" :title="submissionType === 'record' ? sub.level_name : sub.name">
                                            {{ submissionType === 'record' ? sub.level_name : sub.name }}
                                        </div>
                                        <div class="col-user" :title="submissionType === 'record' ? sub.username : sub.author">
                                            {{ submissionType === 'record' ? sub.username : sub.author }}
                                        </div>
                                        <div class="col-video">
                                            <a v-if="submissionType === 'record' ? sub.video_link : sub.verification" 
                                               :href="submissionType === 'record' ? sub.video_link : sub.verification" 
                                               target="_blank" @click.stop title="Watch Video" class="video-hyperlink">
                                               <i class="fa-solid fa-play"></i>
                                            </a>
                                        </div>
                                        <div class="col-status">
                                            <span class="status-indicator" :class="sub.status.toLowerCase()" :title="sub.status"></span>
                                        </div>
                                        <div class="col-toggle" :class="{ 'is-expanded': expandedSubmissions.includes(sub.id) }">
                                            <i class="fa-solid fa-chevron-down"></i>
                                        </div>
                                    </div>
                                    
                                    <div v-if="expandedSubmissions.includes(sub.id)" class="sidebar-row-details">
                                        <div v-if="submissionType === 'record'" class="detail-grid">
                                            <div><strong>Percent:</strong> {{ sub.percent }}%</div>
                                            <div><strong>FPS/Hz:</strong> {{ sub.hz || 'N/A' }}</div>
                                            <div><strong>Date:</strong> {{ formatDate(sub.created_at) }}</div>
                                            <div><strong>Status:</strong> <span style="text-transform: capitalize;">{{ sub.status }}</span></div>
                                            <div v-if="sub.notes" class="full-width-cell"><strong>Notes:</strong> {{ sub.notes }}</div>
                                        </div>
                                        
                                        <div v-if="submissionType === 'level'" class="detail-grid">
                                            <div><strong>ID:</strong> {{ sub.id_gd || 'N/A' }}</div>
                                            <div><strong>Verifier:</strong> {{ sub.verifier || 'N/A' }}</div>
                                            <div><strong>Placement:</strong> {{ sub.placement_suggestion || 'N/A' }}</div>
                                            <div><strong>Date:</strong> {{ formatDate(sub.created_at) }}</div>
                                            <div v-if="sub.notes" class="full-width-cell"><strong>Notes:</strong> {{ sub.notes }}</div>
                                        </div>
                                        
                                        <div v-if="sub.status === 'denied' && sub.denial_reason" class="denial-reason-box full-width-cell">
                                            <strong>Denial Reason:</strong> {{ sub.denial_reason }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="sidebar-footer">
                        <button @click="prevPage" :disabled="currentPage === 1 || isLoadingSidebar" class="btn-page">
                            <i class="fa-solid fa-arrow-left"></i> Prev
                        </button>
                        <span class="type-label-md">Page {{ currentPage }} of {{ totalPages }}</span>
                        <button @click="nextPage" :disabled="currentPage >= totalPages || isLoadingSidebar" class="btn-page">
                            Next <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </aside>
            </div>
        </main>
    `,
    methods: {
        renderTurnstile() {
            if (!window.turnstile) return;

            this.turnstileToken = null;
            this.turnstileWidgetId = null;

            const SITEKEY = '0x4AAAAAAClZM2Ug4vdAxfJI';

            this.$nextTick(() => {
                const targetId = this.submissionType === 'record' ? '#turnstile-record' : '#turnstile-level';
                const el = document.querySelector(targetId);

                if (el) {
                    el.innerHTML = '';
                    this.turnstileWidgetId = window.turnstile.render(el, {
                        sitekey: SITEKEY,
                        theme: 'dark',
                        callback: (token) => {
                            this.turnstileToken = token;
                            this.turnstileError = '';
                        },
                        'expired-callback': () => {
                            this.turnstileToken = null;
                            if (this.turnstileWidgetId !== null) {
                                window.turnstile.reset(this.turnstileWidgetId);
                            }
                        },
                        'error-callback': () => {
                            this.turnstileToken = null;
                            this.turnstileError = 'Security check failed. Please refresh the page.';
                        }
                    });
                }
            });
        },
        selectLevel(level) {
            this.formData.levelName = level[0]?.name;
            this.minPercent = level[0]?.percentToQualify || 0;
            this.formData.percent = this.minPercent;
        },
        getTurnstileToken() {
            return new Promise((resolve) => {
                if (this.turnstileToken) {
                    resolve(this.turnstileToken);
                } else {
                    if (window.turnstile && this.turnstileWidgetId !== null) {
                        try {
                            window.turnstile.execute(this.turnstileWidgetId);
                            this.turnstileError = 'Verifying connection... Please click submit again in just a moment.';
                        } catch (e) {
                            this.turnstileError = 'Security check error. Please refresh the page.';
                        }
                        resolve(null);
                    } else {
                        this.turnstileError = 'Security check is still verifying. Please wait a second and try again.';
                        resolve(null);
                    }
                }
            });
        },
        async submitRecord() {
            this.turnstileError = '';

            const turnstileToken = await this.getTurnstileToken();
            if (!turnstileToken) return;

            this.isSubmitting = true;
            this.errorMessage = '';
            this.successMessage = '';

            try {
                const submissionData = {
                    ...this.formData,
                    listType: this.store.listType,
                    turnstileToken
                };

                const response = await fetch('/api/update-records?action=submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to submit record');
                }

                this.successMessage = 'Record submitted successfully! Staff will review it soon.';
                this.formData = {
                    levelName: '',
                    username: '',
                    percent: '',
                    hz: '',
                    discord: '',
                    videoLink: '',
                    notes: '',
                    listType: ''
                };
                this.levelSearchInput = '';

                if (window.turnstile && this.turnstileWidgetId !== null) {
                    window.turnstile.reset(this.turnstileWidgetId);
                    this.turnstileToken = null;
                }

                if (this.isSidebarOpen) this.refreshSidebar();
            } catch (error) {
                this.errorMessage = error.message;

                if (window.turnstile && this.turnstileWidgetId !== null) {
                    window.turnstile.reset(this.turnstileWidgetId);
                    this.turnstileToken = null;
                }
            } finally {
                this.isSubmitting = false;
            }
        },
        async submitLevel() {
            this.turnstileError = '';

            const turnstileToken = await this.getTurnstileToken();
            if (!turnstileToken) return;

            this.isSubmitting = true;
            this.errorMessage = '';
            this.successMessage = '';

            try {
                const submissionData = {
                    submission_type: 'level',
                    name: this.levelFormData.name,
                    id: String(this.levelFormData.id),
                    author: this.levelFormData.author,
                    verifier: this.levelFormData.verifier,
                    verification: this.levelFormData.verification,
                    percentToQualify: this.levelFormData.percentToQualify,
                    placementSuggestion: this.levelFormData.placementSuggestion,
                    notes: this.levelFormData.notes,
                    listType: this.store.listType,
                    turnstileToken
                };

                const response = await fetch('/api/update-records?action=submit-level', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to submit level');
                }

                this.successMessage = 'Level submitted successfully! Staff will review it soon.';
                this.levelFormData = {
                    name: '',
                    id: '',
                    author: '',
                    verifier: '',
                    verification: '',
                    percentToQualify: 100,
                    placementSuggestion: '',
                    notes: ''
                };

                if (window.turnstile && this.turnstileWidgetId !== null) {
                    window.turnstile.reset(this.turnstileWidgetId);
                    this.turnstileToken = null;
                }

                if (this.isSidebarOpen) this.refreshSidebar();
            } catch (error) {
                this.errorMessage = error.message;
                if (window.turnstile && this.turnstileWidgetId !== null) {
                    window.turnstile.reset(this.turnstileWidgetId);
                    this.turnstileToken = null;
                }
            } finally {
                this.isSubmitting = false;
            }
        },
        toggleSidebar() {
            this.isSidebarOpen = !this.isSidebarOpen;
            if (this.isSidebarOpen && this.sidebarSubmissions.length === 0) {
                this.fetchSidebarSubmissions();
            }
        },
        applySidebarFilters() {
            this.currentPage = 1;
            this.expandedSubmissions = [];
            this.fetchSidebarSubmissions();
        },
        refreshSidebar() {
            this.currentPage = 1;
            this.expandedSubmissions = [];
            this.fetchSidebarSubmissions();
        },
        toggleExpand(id) {
            const index = this.expandedSubmissions.indexOf(id);
            if (index > -1) {
                this.expandedSubmissions.splice(index, 1);
            } else {
                this.expandedSubmissions.push(id);
            }
        },
        async fetchSidebarSubmissions() {
            this.isLoadingSidebar = true;
            try {
                const response = await fetch(`/api/update-records?action=public-view&listType=${this.store.listType}&type=${this.submissionType}&page=${this.currentPage}&limit=50&search=${encodeURIComponent(this.sidebarSearch)}&status=${encodeURIComponent(this.sidebarStatus)}`);

                if (!response.ok) throw new Error('Failed to load history');

                const data = await response.json();
                this.sidebarSubmissions = data.submissions || [];
                this.totalPages = data.totalPages || 1;
            } catch (error) {
                console.error('Error loading sidebar submissions:', error);
                this.sidebarSubmissions = [];
            } finally {
                this.isLoadingSidebar = false;
            }
        },
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.expandedSubmissions = [];
                this.fetchSidebarSubmissions();
            }
        },
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.expandedSubmissions = [];
                this.fetchSidebarSubmissions();
            }
        },
        formatDate(dateString) {
            if (!dateString) return 'Unknown Date';
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        },
        async loadLevels() {
            this.isLoadingLevels = true;
            try {
                const list = await fetchList(this.store.listType);
                this.levels = list || [];
            } catch (error) {
                console.error('Error loading levels:', error);
                this.levels = [];
            }
            finally {
                this.isLoadingLevels = false;
            }
        }
    },
    mounted() {
        if (!window.turnstile) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.renderTurnstile();
            };
            document.head.appendChild(script);
        } else {
            this.$nextTick(() => {
                this.renderTurnstile();
            });
        }
        this.loadLevels();
    },
    beforeUnmount() {
        if (window.turnstile && this.turnstileWidgetId !== null) {
            try {
                window.turnstile.remove(this.turnstileWidgetId);
            } catch (e) { }
        }
    }
};