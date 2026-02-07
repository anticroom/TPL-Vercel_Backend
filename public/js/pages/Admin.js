import { store } from '../main.js';
import { fetchList, fetchRules, fetchPacks } from '../content.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>

        <main v-else-if="!isAuthenticated" class="page-login">
            <div class="login-card">
                <h2>Admin Access</h2>
                <form @submit.prevent="handleLogin" class="admin-form">
                    <div class="form-group"><label>Username</label><input v-model="loginUsername" type="text" required /></div>
                    <div class="form-group"><label>Email</label><input v-model="loginEmail" type="email" required /></div>
                    <div class="form-group"><label>Password</label><input v-model="loginPassword" type="password" required /></div>
                    <button type="submit" class="btn-submit" :disabled="isLoggingIn">{{ isLoggingIn ? 'Verifying...' : 'Login' }}</button>
                    <div v-if="loginError" class="message error-message">{{ loginError }}</div>
                </form>
            </div>
        </main>

        <main v-else class="page-admin">
            
            <aside class="admin-sidebar">
                <div class="sidebar-header">
                    <h2>Admin Panel</h2>
                    <button @click="logout" class="btn-logout">Logout</button>
                </div>
                
                <div class="sidebar-tabs">
                    <button :class="{ active: currentTab === 'levels' }" @click="currentTab = 'levels'">Levels</button>
                    <button :class="{ active: currentTab === 'packs' }" @click="currentTab = 'packs'">Packs</button>
                </div>

                <div v-if="currentTab === 'levels'">
                    <button @click="openRulesModal" class="btn-toggle" style="margin-bottom: 1.5rem;">Edit Rules</button>
                    <h3 style="border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Add Level</h3>
                    <form @submit.prevent="submitLevel" class="admin-form" style="margin-top: 1rem;">
                        <div class="form-group"><label>Name</label><input v-model="formData.name" type="text" required /></div>
                        <div class="form-group"><label>ID</label><input v-model.number="formData.id" type="number" required /></div>
                        <div class="form-group"><label>Author</label><input v-model="formData.author" type="text" placeholder="Name, Name2..." required /></div>
                        <div class="form-group"><label>Verifier</label><input v-model="formData.verifier" type="text" required /></div>
                        <div class="form-group"><label>Video</label><input v-model="formData.verification" type="text" placeholder="https://youtu.be/..." required /></div>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1"><label>Percent</label><input v-model.number="formData.percentToQualify" type="number" min="0" max="100" required /></div>
                            <div style="flex:1"><label>Placement</label><input v-model.number="formData.placement" type="number" :placeholder="'Max: ' + maxPlacement" /></div>
                        </div>
                        <button type="button" @click="toggleRecordSection" class="btn-toggle">{{ showRecords ? '▼ Hide Records' : '► Add Initial Records' }}</button>
                        <div v-if="showRecords" class="records-section">
                            <div v-for="(record, index) in formData.records" :key="index" class="record-item">
                                <div class="record-header"><span>Record {{ index + 1 }}</span><button type="button" @click="removeRecord(index)" class="btn-remove">Remove</button></div>
                                <input v-model="record.user" placeholder="User" style="margin-bottom:5px;" required />
                                <input v-model="record.link" placeholder="Link" style="margin-bottom:5px;" required />
                                <div class="record-row">
                                    <input v-model.number="record.percent" placeholder="%" />
                                    <input v-model.number="record.hz" placeholder="Hz" />
                                </div>
                            </div>
                            <button type="button" @click="addRecord" class="btn-add-record">+ Add Record</button>
                        </div>
                        <button type="submit" class="btn-submit" :disabled="isSubmitting">{{ isSubmitting ? 'Saving...' : 'Add Level' }}</button>
                        <div v-if="successMessage" class="message success-message">✓ {{ successMessage }}</div>
                        <div v-if="errorMessage" class="message error-message">✗ {{ errorMessage }}</div>
                    </form>
                </div>

                <div v-if="currentTab === 'packs'">
                    <button @click="createNewPack" class="btn-submit" style="margin-bottom: 1.5rem;">+ Create New Pack</button>
                    
                    <h3 style="border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">All Packs</h3>
                    <div style="display:flex; flex-direction:column; gap: 8px; margin-top: 1rem;">
                        <div v-if="packsList.length === 0" style="color:var(--color-text-secondary); font-style:italic;">No packs yet.</div>
                        <div v-for="pack in packsList" :key="pack.id" 
                             class="pack-card-mini" 
                             :class="{ active: editingPack.original_id === pack.id }"
                             @click="selectPack(pack)">
                            <div class="pack-info">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <div :style="{width:'10px', height:'10px', borderRadius:'50%', background: pack.color || '#fff'}"></div>
                                    <strong>{{ pack.name }}</strong>
                                </div>
                                <small>{{ pack.levels ? pack.levels.length : 0 }} Levels</small>
                            </div>
                            <button class="btn-icon-sm" @click.stop="deletePack(pack)">🗑</button>
                        </div>
                    </div>
                </div>
                <div style="margin-top: auto;">
                    <button class="btn-goto-admin" onclick="window.location.href='/#/manage'">
                        Go To Management Page
                    </button>
                </div>
            </aside>

            <section class="admin-content">
                <div v-if="currentTab === 'levels'" class="levels-list">
                    <div class="list-header">
                        <h2>Current Levels ({{ levelsList.length }})</h2>
                        <input v-model="searchQuery" type="text" placeholder="Search levels..." class="search-input" />
                    </div>
                    
                    <div class="table-container" ref="tableContainer">
                        <table class="levels-table">
                            <thead><tr><th>Rank</th><th>Name</th><th>Records</th><th>Actions</th></tr></thead>
                            <tbody>
                                <tr v-for="(level, index) in filteredLevels" 
                                    :key="level._id" 
                                    class="level-row" 
                                    :draggable="!searchQuery" 
                                    @dragstart="onDragStart($event, index)" 
                                    @dragover.prevent="onDragOver($event, index)" 
                                    @drop.prevent="onDrop"
                                    @dragend="onDragEnd"
                                    :class="{ 'is-dragging': draggedItem === level }"
                                >
                                    <td>
                                        <div class="rank-display-wrapper">
                                            <span :class="index + 1 <= 150 ? 'goldhighlight' : ''" 
                                                  :style="index + 1 > 150 ? 'color: var(--color-text-legacy)' : ''"
                                                  style="font-size: 1.2rem; font-weight: bold;">
                                                #{{ index + 1 }}
                                            </span>
                                            <span class="drag-handle" v-if="!searchQuery">::</span>
                                        </div>
                                    </td>
                                    <td style="font-weight:700;">{{ level.name }}</td>
                                    <td>{{ level.records?.length || 0 }}</td>
                                    <td class="actions">
                                        <button class="btn-icon" @click.stop="openEditRecordsModal(level)">✎</button>
                                        <button class="btn-icon" @click.stop="deleteLevel(level)">🗑</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="currentTab === 'packs'" class="pack-workspace">
                    <div class="pack-header-bar">
                        <div class="pack-meta-inputs">
                            <div style="flex: 2;">
                                <label>Pack Name</label>
                                <input v-model="editingPack.name" type="text" placeholder="e.g. Map Pack 1" />
                            </div>
                            <div style="flex: 0 0 100px;">
                                <label>Color</label>
                                <input v-model="editingPack.color" type="color" style="height: 43px; padding: 2px; cursor: pointer;" />
                            </div>
                        </div>
                        <div style="margin-left: 2rem;">
                            <button @click="savePack" class="btn-submit" :disabled="isSavingPack" style="width: auto; padding: 12px 30px;">
                                {{ isSavingPack ? 'Saving...' : 'Save Pack' }}
                            </button>
                        </div>
                    </div>
                    <div v-if="packMessage" :class="packError ? 'error-message' : 'success-message'" style="margin-bottom: 1rem;">{{ packMessage }}</div>

                    <div class="pack-drag-container">
                        <div class="drag-column">
                            <h3>Levels In Pack ({{ editingPack.levels.length }})</h3>
                            
                            <div class="drag-list" ref="packListContainer" @dragover.prevent @drop="onDropToPack($event)">
                                <div v-if="editingPack.levels.length === 0" style="text-align:center; color:var(--color-text-secondary); padding:2rem; font-style:italic; border: 2px dashed var(--color-border); border-radius: 8px;">
                                    Drag levels here from the right list
                                </div>
                                <div v-for="(lvl, idx) in editingPack.levels" :key="'p-'+lvl._id" 
                                     class="drag-item" 
                                     draggable="true"
                                     @dragstart="onDragStartPack($event, idx)" 
                                     @dragover.prevent="onDragOverPack($event, idx)" 
                                     @drop.stop
                                     :class="{ 'is-dragging': draggedPackIndex === idx }">
                                    <span>{{ lvl.name }}</span>
                                    <button @click="removeFromPack(idx)" class="btn-icon-sm">✕</button>
                                </div>
                            </div>
                        </div>
                        <div class="drag-column">
                            <h3>Available Levels</h3>
                            <input v-model="packSearch" placeholder="Search levels..." style="margin-bottom: 1rem;" />
                            <div class="drag-list">
                                <div v-for="lvl in filteredAvailableLevels" :key="'a-'+lvl._id" 
                                     class="drag-item source" draggable="true"
                                     @dragstart="onDragStartSource($event, lvl)" @click="addToPack(lvl)">
                                    <div>
                                        <span :class="getOriginalIndex(lvl) <= 150 ? 'goldhighlight' : ''" 
                                              :style="getOriginalIndex(lvl) > 150 ? 'color: var(--color-text-legacy)' : ''"
                                              style="margin-right:8px;">
                                            #{{ getOriginalIndex(lvl) }}
                                        </span> 
                                        {{ lvl.name }}
                                    </div>
                                    <span class="goldhighlight">+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div v-if="showRulesModal" class="modal-overlay" @click="closeRulesModal">
                <div class="polished-modal rules-modal" @click.stop style="max-width: 95vw; height: 90vh; display: flex; flex-direction: column;">
                    <div class="modal-header">
                        <h1>Edit Rules</h1>
                        <button class="modal-close-btn" @click="closeRulesModal">✕</button>
                    </div>
                    
                    <div class="rules-tabs-nav">
                        <button :class="{ active: rulesTab === 'level' }" @click="rulesTab = 'level'">Level Rules</button>
                        <button :class="{ active: rulesTab === 'record' }" @click="rulesTab = 'record'">Record Rules</button>
                    </div>

                    <div class="rules-split-body">
                        <div class="rules-pane editor-pane">
                            <h4 style="color: #aaa; margin-bottom: 5px;">Rules MD (One rule per line)</h4>
                            <textarea 
                                v-if="rulesTab === 'level'"
                                v-model="rulesEditText.level" 
                                class="rules-textarea" 
                                placeholder="Enter each level rule on a new line..."
                            ></textarea>
                            <textarea 
                                v-else
                                v-model="rulesEditText.record" 
                                class="rules-textarea" 
                                placeholder="Enter each record rule on a new line..."
                            ></textarea>
                        </div>

                        <div class="rules-pane preview-pane">
                            <h4 style="color: #aaa; margin-bottom: 5px;">Preview</h4>
                            <div class="markdown-preview-box">
                                <div v-for="(line, idx) in (rulesTab === 'level' ? previewLevelRules : previewRecordRules)" 
                                     :key="idx" 
                                     class="preview-line"
                                     v-html="renderMarkdown(line)">
                                </div>
                                <div v-if="(rulesTab === 'level' ? previewLevelRules.length : previewRecordRules.length) === 0" style="color:#666; font-style:italic;">
                                    No rules entered.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <div v-if="rulesMessage" :class="rulesError ? 'message error-message' : 'message success-message'" style="margin-right: auto; margin-left: 20px;">
                            {{ rulesMessage }}
                        </div>
                        <button @click="saveRules" class="btn-submit" :disabled="isSavingRules">
                            {{ isSavingRules ? 'Saving...' : 'Save All Rules' }}
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="editingRecordsLevel" class="modal-overlay" @click="closeEditRecordsModal">
                <div class="polished-modal" @click.stop style="max-width: 800px;">
                    <div class="modal-header"><h1>Edit: {{ editingLevel.name }}</h1><button class="modal-close-btn" @click="closeEditRecordsModal">✕</button></div>
                    <div class="modal-scroll-area">
                        <div class="admin-form">
                            <div><label>Name</label><input v-model="editingLevel.name"></div>
                            <div><label>Author</label><input v-model="editingLevel.author" placeholder="Name, Name2..."></div>
                            <div><label>Verifier</label><input v-model="editingLevel.verifier"></div>
                            <div><label>Video</label><input v-model="editingLevel.verification"></div>
                            <div><label>Percent</label><input v-model.number="editingLevel.percentToQualify"></div>
                        </div>
                        <h3 style="margin-top:2rem;">Records</h3>
                        <div v-for="(record, index) in editingLevel.records" :key="index" style="display:flex; gap:5px; margin-bottom:5px;">
                            <input v-model="record.user" placeholder="User" style="flex:1">
                            <input v-model="record.link" placeholder="Link" style="flex:1">
                            <input v-model.number="record.percent" placeholder="%" style="width:60px">
                            <input v-model.number="record.hz" placeholder="Hz" style="width:60px">
                            <button @click="editingLevel.records.splice(index, 1)" class="btn-icon-sm" style="font-size:1.2rem;">✕</button>
                        </div>
                        <button @click="addEditingRecord" class="btn-toggle" style="margin-top:5px;">+ Add Record</button>
                    </div>
                    <div class="modal-footer"><button @click="saveEditLevel" class="btn-submit">Save Changes</button></div>
                </div>
            </div>

        </main>
    `,
    data() {
        return {
            store, loading: true, isAuthenticated: false, currentTab: 'levels',
            loginUsername: '', loginEmail: '', loginPassword: '', isLoggingIn: false, loginError: '', token: null,
            levelsList: [], searchQuery: '', formData: { id: null, name: '', author: '', verifier: '', verification: '', percentToQualify: 100, password: 'free Copyable', records: [], creators: [], placement: null },
            showRecords: false, isSubmitting: false, successMessage: '', errorMessage: '',

            packsList: [],
            editingPack: { name: '', pack_id: '', original_id: null, color: '#d4c217', levels: [] },
            packSearch: '', isSavingPack: false, packMessage: '', packError: false, draggedSourceLevel: null, draggedPackIndex: null,

            authInterval: null,

            showRulesModal: false, 
            rulesTab: 'level', 
            rulesEditText: { level: '', record: '' }, 
            rulesMessage: '',
            rulesError: false,
            isSavingRules: false,

            editingRecordsLevel: null, editingLevel: null, isSavingRecords: false, recordsSuccessMessage: '', 
            
            draggedItem: null,
            dragStartIndex: null,
            scrollInterval: null,
        };
    },
    computed: {
        maxPlacement() { return this.levelsList.length + 1; },
        filteredLevels() {
            if (!this.searchQuery) return this.levelsList;
            const q = this.searchQuery.toLowerCase();
            return this.levelsList.filter(l => l.name.toLowerCase().includes(q) || String(l.id).toLowerCase().includes(q));
        },
        filteredAvailableLevels() {
            const q = this.packSearch.toLowerCase();
            const inPackIds = new Set(this.editingPack.levels.map(l => l._id));
            return this.levelsList.filter(l => (l.name.toLowerCase().includes(q)) && !inPackIds.has(l._id));
        },
        previewLevelRules() {
            return this.rulesEditText.level.split('\n').filter(line => line.trim() !== '');
        },
        previewRecordRules() {
            return this.rulesEditText.record.split('\n').filter(line => line.trim() !== '');
        }
    },
    async mounted() {
        const rulesStyle = document.createElement('style');
        rulesStyle.textContent = `
            .rules-tabs-nav { display: flex; gap: 10px; padding: 10px 20px; border-bottom: 1px solid var(--color-border); }
            .rules-tabs-nav button { background: none; border: none; padding: 10px 20px; cursor: pointer; color: var(--color-text-secondary); font-weight: bold; font-size: 1.1rem; border-bottom: 3px solid transparent; }
            .rules-tabs-nav button.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
            
            .rules-split-body { display: flex; flex: 1; min-height: 0; }
            .rules-pane { flex: 1; display: flex; flex-direction: column; padding: 20px; }
            .editor-pane { border-right: 1px solid var(--color-border); }
            
            .rules-textarea { flex: 1; resize: none; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); color: #fff; padding: 15px; font-family: monospace; line-height: 1.5; border-radius: 4px; }
            .rules-textarea:focus { outline: none; border-color: var(--color-primary); }
            
            .markdown-preview-box { flex: 1; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--color-border); padding: 20px; border-radius: 4px; }
            .preview-line { margin-bottom: 8px; line-height: 1.4; min-height: 1rem; }
            .is-dragging { opacity: 0.5; background: rgba(255,255,255,0.1); }
        `;
        document.head.appendChild(rulesStyle);

        if (!document.querySelector('link[href="/css/pages/admin.css"]')) {
            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/css/pages/admin.css'; document.head.appendChild(link);
        }

        const storedToken = localStorage.getItem('admin_token');
        if (storedToken) {
            this.token = storedToken;
            this.isAuthenticated = true;
            await this.refreshLevels();
            await this.refreshPacks();
            this.startAuthCheck();
        } else {
            this.loading = false;
        }
    },
    beforeUnmount() {
        this.stopAuthCheck();
    },
    methods: {
        async handleLogin() {
            this.isLoggingIn = true;
            try {
                const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: this.loginUsername, email: this.loginEmail, password: this.loginPassword }) });
                const data = await res.json();
                if (res.ok && data.success) {
                    this.token = data.token;
                    localStorage.setItem('admin_token', data.token);
                    this.isAuthenticated = true;
                    await this.refreshLevels();
                    await this.refreshPacks();
                    this.startAuthCheck();
                } else {
                    this.loginError = data.error || 'Failed';
                }
            } catch (e) { this.loginError = 'Error'; } finally { this.isLoggingIn = false; }
        },
        logout() {
            this.stopAuthCheck();
            this.isAuthenticated = false;
            this.token = null;
            localStorage.removeItem('admin_token');
        },
        getAuthHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }; },

        startAuthCheck() {
            this.stopAuthCheck();
            this.checkToken();
            this.authInterval = setInterval(() => this.checkToken(), 15000);
        },
        stopAuthCheck() {
            if (this.authInterval) { clearInterval(this.authInterval); this.authInterval = null; }
        },
        async checkToken() {
            if (!this.token) return;
            try {
                const res = await fetch('/api/login', { method: 'GET', headers: this.getAuthHeaders() });
                if (res.status === 401) { this.logout(); }
            } catch (e) { console.error("Auth check failed"); }
        },

        async refreshLevels() { const list = await fetchList(); if (list) this.levelsList = list.map(([l]) => l).filter(l => l); this.loading = false; },
        async refreshPacks() { const packs = await fetchPacks(); if (packs) this.packsList = packs; },

        createNewPack() {
            this.editingPack = { name: '', pack_id: '', original_id: null, color: '#d4c217', levels: [] };
            this.packMessage = '';
        },
        selectPack(pack) {
            const fullLevels = (pack.levels || []).map(gdId => this.levelsList.find(l => String(l.id) === String(gdId))).filter(l => l);
            this.editingPack = {
                name: pack.name,
                pack_id: pack.id,
                original_id: pack.id,
                color: pack.color || '#d4c217',
                levels: fullLevels
            };
            this.packMessage = '';
        },

        async savePack() {
            this.isSavingPack = true; this.packMessage = '';

            let finalId = this.editingPack.original_id;
            if (!finalId && this.editingPack.name) {
                finalId = this.editingPack.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            }
            if (!finalId) { this.packMessage = 'Name required'; this.packError = true; this.isSavingPack = false; return; }

            try {
                const res = await fetch('/api/packs', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        action: 'save',
                        id: finalId,
                        name: this.editingPack.name,
                        color: this.editingPack.color,
                        levels: this.editingPack.levels.map(l => String(l.id))
                    })
                });

                if (res.status === 401) { this.logout(); return; }

                if (res.ok) {
                    this.packMessage = 'Saved!';
                    await this.refreshPacks();
                    this.editingPack.original_id = finalId;
                } else {
                    this.packMessage = 'Failed'; this.packError = true;
                }
            } catch (e) { this.packMessage = 'Error'; this.packError = true; }
            finally { this.isSavingPack = false; }
        },
        async deletePack(pack) {
            if (!confirm(`Delete ${pack.name}?`)) return;
            try {
                const res = await fetch('/api/packs', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ action: 'delete', id: pack.id })
                });
                if (res.status === 401) { this.logout(); return; }
                await this.refreshPacks();
                this.createNewPack();
            } catch (e) { }
        },

        handleAutoScroll(event, container) {
            if (!container) return;
            const threshold = 60; 
            const speed = 15; 
            const rect = container.getBoundingClientRect();
            const y = event.clientY;

            if (y < rect.top + threshold) { container.scrollTop -= speed; }
            else if (y > rect.bottom - threshold) { container.scrollTop += speed; }
        },

        onDragStart(event, index) {
            if (this.searchQuery) { event.preventDefault(); return; }
            this.draggedItem = this.levelsList[index];
            this.dragStartIndex = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index);
        },
        
        onDragOver(event, index) {
            this.handleAutoScroll(event, this.$refs.tableContainer);
            const draggedIdx = this.levelsList.indexOf(this.draggedItem);
            if (draggedIdx === -1 || draggedIdx === index) return;
            const item = this.levelsList.splice(draggedIdx, 1)[0];
            this.levelsList.splice(index, 0, item);
        },

        onDragEnd() { this.draggedItem = null; },

        async onDrop() {
            if (this.draggedItem === null || this.dragStartIndex === null) return;
            const newIndex = this.levelsList.indexOf(this.draggedItem);
            if (newIndex !== this.dragStartIndex) {
                try {
                    const res = await fetch('/api/move-level', { 
                        method: 'POST', 
                        headers: this.getAuthHeaders(), 
                        body: JSON.stringify({ oldIndex: this.dragStartIndex, newIndex: newIndex }) 
                    });
                    if (res.status === 401) { this.logout(); }
                } catch (e) { await this.refreshLevels(); }
            }
            this.draggedItem = null;
            this.dragStartIndex = null;
        },

        onDragStartSource(evt, level) {
            this.draggedSourceLevel = level;
            this.draggedPackIndex = null;
            evt.dataTransfer.effectAllowed = 'copy';
        },
        onDragStartPack(evt, index) {
            this.draggedPackIndex = index;
            this.draggedSourceLevel = null;
            evt.dataTransfer.effectAllowed = 'move';
        },
        onDragOverPack(evt, index) {
            this.handleAutoScroll(evt, this.$refs.packListContainer);
            
            if (this.draggedPackIndex === null) return;
            const fromIndex = this.draggedPackIndex;
            
            if (fromIndex === index) return;

            const item = this.editingPack.levels.splice(fromIndex, 1)[0];
            this.editingPack.levels.splice(index, 0, item);
            
            this.draggedPackIndex = index; 
        },
        
        onDropToPack(evt) {
            if (this.draggedSourceLevel) {
                const exists = this.editingPack.levels.find(l => l._id === this.draggedSourceLevel._id);
                if (!exists) this.editingPack.levels.push(this.draggedSourceLevel);
                this.draggedSourceLevel = null;
            }
            this.draggedPackIndex = null;
        },
        
        onDropReorderPack(evt, targetIndex) {
            this.draggedPackIndex = null;
        },

        addToPack(level) { const exists = this.editingPack.levels.find(l => l._id === level._id); if (!exists) this.editingPack.levels.push(level); },
        removeFromPack(index) { this.editingPack.levels.splice(index, 1); },

        getOriginalIndex(level) { return this.levelsList.indexOf(level) + 1; },
        toggleRecordSection() { this.showRecords = !this.showRecords; },
        addRecord() { this.formData.records.push({ user: '', link: '', percent: 100, hz: 240 }); },
        removeRecord(index) { this.formData.records.splice(index, 1); },

        async submitLevel() {
            this.isSubmitting = true; this.errorMessage = '';
            
            let levelData = { ...this.formData };
            const authors = levelData.author.split(',').map(a => a.trim()).filter(a => a);

            if (authors.length > 1) {
                levelData.creators = authors;
                levelData.author = authors[0];
            }

            const payload = { levelData: levelData, placement: this.formData.placement };
            delete payload.levelData.placement;

            try {
                const res = await fetch('/api/add-level', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(payload) });
                if (res.status === 401) { this.logout(); return; }
                if (res.ok) { this.successMessage = "Added!"; this.formData = { id: null, name: '', author: '', verifier: '', verification: '', percentToQualify: 100, password: 'free Copyable', records: [], placement: null }; await this.refreshLevels(); } else { this.errorMessage = "Failed"; }
            } catch (e) { this.errorMessage = "Error"; } finally { this.isSubmitting = false; }
        },
        async deleteLevel(level) {
            if (!confirm(`Delete?`)) return;
            try {
                const res = await fetch('/api/delete-level', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify({ id: level._id }) });
                if (res.status === 401) { this.logout(); return; }
                await this.refreshLevels();
            } catch (e) { }
        },

        async openRulesModal() { 
            this.showRulesModal = true; 
            this.rulesMessage = '';
            this.rulesError = false;

            const rules = await fetchRules(); 
            
            if (rules && typeof rules === 'object') {
                if (rules.level_rules && Array.isArray(rules.level_rules)) {
                    this.rulesEditText.level = rules.level_rules.join('\n');
                } else {
                    this.rulesEditText.level = '';
                }

                if (rules.record_rules && Array.isArray(rules.record_rules)) {
                    this.rulesEditText.record = rules.record_rules.join('\n');
                } else {
                    this.rulesEditText.record = '';
                }
            } else {
                this.rulesEditText.level = '';
                this.rulesEditText.record = '';
            }
        },
        closeRulesModal() { this.showRulesModal = false; },

        renderMarkdown(text) {
            if (!text) return '';
            let content = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            let tag = 'p';
            let classes = 'type-body';
            let styles = 'margin:0;';

            if (content.startsWith('### ')) { tag = 'h5'; classes = 'type-title-md'; styles = 'margin-top: 10px; margin-bottom: 5px;'; content = content.substring(4); } 
            else if (content.startsWith('# ')) { tag = 'h3'; classes = 'type-headline-sm'; styles = 'margin-top: 15px; margin-bottom: 8px;'; content = content.substring(2); } 
            else if (content.startsWith('-# ')) { tag = 'p'; classes = 'type-label-sm'; styles = 'opacity: 0.7; margin-bottom: 5px;'; content = content.substring(3); }

            let isBullet = false;
            let isNested = false;

            if (content.match(/^\s{2,}\*\s/)) { isBullet = true; isNested = true; content = content.replace(/^\s{2,}\*\s/, ''); } 
            else if (content.startsWith('* ')) { isBullet = true; content = content.substring(2); }

            content = content.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px; font-family:monospace;">$1</code>');
            content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--color-primary); text-decoration:underline;">$1</a>');
            content = content.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            content = content.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
            content = content.replace(/~~(.*?)~~/g, '<del>$1</del>');

            const textHTML = `<${tag} class="${classes}" style="${styles}">${content}</${tag}>`;

            if (isBullet) {
                const marginLeft = isNested ? '20px' : '0';
                return `<div style="display:flex; align-items:flex-start; margin-left:${marginLeft};"><span style="margin-right: 8px; color: var(--color-primary); font-weight: 700; line-height: 1.5;">•</span><div style="flex: 1;">${textHTML}</div></div>`;
            } else { return textHTML; }
        },

        async saveRules() {
            this.isSavingRules = true; this.rulesMessage = ''; this.rulesError = false;
            const levelRulesArray = this.rulesEditText.level.split('\n').filter(line => line.trim() !== '');
            const recordRulesArray = this.rulesEditText.record.split('\n').filter(line => line.trim() !== '');
            const rulesPayload = { level_rules: levelRulesArray, record_rules: recordRulesArray };

            try {
                const res = await fetch('/api/rules', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify({ rules: rulesPayload }) });
                if (res.status === 401) { this.logout(); return; }
                if (res.ok) { this.rulesMessage = "Rules Updated Successfully!"; } else { this.rulesMessage = "Failed to save rules."; this.rulesError = true; }
            } catch (e) { this.rulesMessage = "Error connecting to server."; this.rulesError = true; } finally { this.isSavingRules = false; }
        },

        openEditRecordsModal(level) { this.editingRecordsLevel = level; this.editingLevel = JSON.parse(JSON.stringify(level)); if (!this.editingLevel.records) this.editingLevel.records = []; },
        closeEditRecordsModal() { this.editingRecordsLevel = null; },
        addEditingRecord() { this.editingLevel.records.push({ user: '', link: '', percent: 100, hz: 240 }); },

        async saveEditLevel() {
            this.isSavingRecords = true;
            let newLevelData = { ...this.editingLevel };
            delete newLevelData._id; delete newLevelData.rank;
            const authors = newLevelData.author.split(',').map(a => a.trim()).filter(a => a);
            if (authors.length > 1) { newLevelData.creators = authors; newLevelData.author = authors[0]; } else { delete newLevelData.creators; }

            try {
                const res = await fetch('/api/update-records', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify({ oldLevelId: this.editingRecordsLevel._id, newLevelData: newLevelData }) });
                if (res.status === 401) { this.logout(); return; }
                if (res.ok) { await this.refreshLevels(); this.closeEditRecordsModal(); }
            } catch (e) { } finally { this.isSavingRecords = false; }
        }
    }
};