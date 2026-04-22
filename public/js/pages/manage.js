import { store } from '../main.js';

export default {
    template: `
        <main v-if="loading" class="page-manage-dashboard">
            <div class="manage-nav-bar">
                <div class="manage-nav-top">
                    <div class="skeleton skel-title" style="width: 200px; height: 32px; margin: 0;"></div>
                    <div class="skeleton" style="width: 80px; height: 32px; border-radius: 4px;"></div>
                </div>
                <div class="tab-nav">
                    <div class="skeleton" style="width: 100px; height: 36px; border-radius: 4px 4px 0 0;"></div>
                    <div class="skeleton" style="width: 100px; height: 36px; border-radius: 4px 4px 0 0;"></div>
                    <div class="skeleton" style="width: 160px; height: 36px; border-radius: 4px 4px 0 0;"></div>
                </div>
            </div>

            <div class="manage-workspace">
                <aside class="manage-sidebar" style="opacity: 0.7;">
                    <div class="skeleton" style="width: 100%; height: 40px; border-radius: 4px; margin-bottom: 1.5rem;"></div>
                    <div class="skeleton skel-text" style="width: 60%; height: 16px; margin-bottom: 1rem;"></div>
                    <div v-for="n in 3" :key="n" style="margin-bottom: 1.5rem;">
                        <div class="skeleton skel-text" style="width: 30%; height: 14px; margin-bottom: 0.5rem;"></div>
                        <div class="skeleton" style="width: 100%; height: 40px; border-radius: 4px;"></div>
                    </div>
                </aside>

                <section class="manage-content" style="opacity: 0.7;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <div class="skeleton skel-title" style="width: 150px; height: 32px; margin: 0;"></div>
                        <div class="skeleton" style="width: 250px; height: 40px; border-radius: 4px;"></div>
                    </div>
                    <div class="skeleton" style="width: 100%; height: 48px; border-radius: 4px; margin-bottom: 8px;"></div>
                    <div v-for="n in 8" :key="'tr-'+n" class="skeleton skel-table-row" style="height: 54px;"></div>
                </section>
            </div>
        </main>

        <main v-else-if="!isAuthenticated" class="page-manage-auth">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>MANAGEMENT LOGIN</h1>
                    <p>Owner/Dev ONLY!</p>
                </div>
                <form @submit.prevent="handleLogin" class="auth-form">
                    <div class="input-group">
                        <label for="username">USERNAME</label>
                        <input v-model="loginUsername" type="text" id="username" placeholder="Username" required />
                    </div>
                    <div class="input-group">
                        <label for="email">EMAIL</label>
                        <input v-model="loginEmail" type="email" id="email" placeholder="name@example.com" required />
                    </div>
                    <div class="input-group">
                        <label for="password">PASSWORD</label>
                        <input v-model="loginPassword" type="password" id="password" placeholder="Password" required />
                    </div>
                    <button type="submit" class="btn-primary full-width" :disabled="isLoggingIn">
                        {{ isLoggingIn ? 'Verifying...' : 'Login' }}
                    </button>
                    <div v-if="loginError" class="status-msg error">
                        {{ loginError }}
                    </div>
                </form>
            </div>
        </main>

        <main v-else class="page-manage-dashboard">
            <div class="manage-nav-bar">
                <div class="manage-nav-top">
                    <h2>Login Management</h2>
                    <div class="manage-nav-actions">
                        <button @click="logout" class="btn-logout">LOGOUT</button>
                    </div>
                </div>
                <div class="tab-nav">
                    <button class="tab-btn" :class="{ active: currentTab === 'admin' }" @click="currentTab = 'admin'">Admins</button>
                    <button class="tab-btn" :class="{ active: currentTab === 'mod' }" @click="currentTab = 'mod'">Mods</button>
                    <button class="tab-btn" :class="{ active: currentTab === 'management' }" @click="currentTab = 'management'">Owners</button>
                </div>
            </div>

            <div class="manage-workspace">
                <div class="mobile-sidebar-overlay" v-if="isMobileSidebarOpen" @click="isMobileSidebarOpen = false"></div>
                
                <button class="mobile-fab-btn" @click="isMobileSidebarOpen = true">
                    <i class="fa-solid fa-user-plus" style="font-weight: 300;">+</i>
                </button>

                <aside class="manage-sidebar" :class="{ 'is-open': isMobileSidebarOpen }">
                    <div class="mobile-sidebar-header">
                        <h3>Management Menu</h3>
                        <button class="btn-close-sidebar" @click="isMobileSidebarOpen = false">✕</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                         <button @click="openEditorsModal" class="btn-goto-admin">
                            ✎ Edit Listed Editors
                         </button>
                    </div>

                    <h3 class="form-section-title" style="border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">
                        ADD NEW {{ currentTab === 'management' ? 'MANAGER' : currentTab === 'admin' ? 'ADMIN' : 'MOD' }}
                    </h3>
                    
                    <form @submit.prevent="addUser" class="create-form" style="margin-top: 1rem;">
                        <div class="input-group">
                            <label>Username</label>
                            <input v-model="formData.username" type="text" placeholder="Username" required />
                        </div>
                        
                        <div class="input-group">
                            <label>Email</label>
                            <input v-model="formData.email" type="email" placeholder="email@example.com" required />
                        </div>

                        <div class="input-group">
                            <label>Password</label>
                            <div class="password-input-wrapper">
                                <input 
                                    v-model="formData.password" 
                                    :type="showNewPassword ? 'text' : 'password'" 
                                    placeholder="Password" 
                                    required 
                                    style="padding-right: 40px;"
                                />
                                <button 
                                    type="button" 
                                    class="btn-icon-sm" 
                                    @click="showNewPassword = !showNewPassword" 
                                    :title="showNewPassword ? 'Hide Password' : 'Show Password'"
                                    style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-secondary);"
                                >
                                    {{ showNewPassword ? '✕' : '👁' }}
                                </button>
                            </div>
                        </div>

                        <div class="form-footer">
                            <button type="submit" class="btn-primary full-width" :disabled="isSaving">
                                {{ isSaving ? 'Saving...' : 'Add & Save Account' }}
                            </button>
                        </div>
                        
                        <p v-if="sidebarMessage" :class="sidebarError ? 'status-msg error' : 'status-msg success'">{{ sidebarMessage }}</p>
                    </form>
                    
                    <div style="margin-top: auto; padding-top: 2rem;">
                        <button class="btn-goto-admin" onclick="window.location.href='/#/admin'">
                            Go To Admin Page
                        </button>
                    </div>
                </aside>

                <section class="manage-content">
                    <div class="content-toolbar">
                        <div class="toolbar-top">
                            <div class="stats">
                                <h3>{{ currentTab === 'management' ? 'Managers' : currentTab === 'admin' ? 'Admins' : 'Mods' }}</h3>
                                <span class="badge">{{ currentList.length }}</span>
                            </div>
                            <div class="search-wrapper">
                                <input v-model="searchQuery" type="text" placeholder="Search users..." class="search-input" />
                            </div>
                        </div>
                    </div>

                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="col-user">User</th>
                                    <th class="col-email">Email</th>
                                    <th class="col-pass">Password</th>
                                    <th class="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(user, index) in filteredList" :key="index" class="data-row">
                                    <td class="col-user" data-label="User">
                                        <div class="user-name" :style="user.username.toLowerCase() === 'anticroom' ? 'color: #A020F0;' : ''">
                                            {{ user.username }}
                                            <span v-if="user.username.toLowerCase() === 'anticroom'" style="font-size: 0.7em; opacity: 0.7;">(DEV)</span>
                                        </div>
                                    </td>
                                    <td class="col-email" data-label="Email">
                                        <div class="credential-wrapper">
                                            <div class="user-email" :class="{'masked-text': !user.showCredentials}">
                                                {{ user.showCredentials ? user.email : '••••••••••••' }}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="col-pass" data-label="Password">
                                        <div class="credential-wrapper">
                                            <div class="user-pass mono" :class="{'masked-text': !user.showCredentials}">
                                                {{ user.showCredentials ? user.password : '••••••••' }}
                                            </div>
                                            <button class="btn-icon" @click="toggleVis(user)" :title="user.showCredentials ? 'Hide Credentials' : 'Show Credentials'">
                                                {{ user.showCredentials ? '✕' : '👁' }}
                                            </button>
                                        </div>
                                    </td>
                                    <td class="col-actions actions" data-label="Actions">
                                        <div class="action-group" v-if="user.username.toLowerCase() !== 'anticroom'">
                                            <button class="btn-icon" @click="openEditModal(user)" title="Edit User">✎</button>
                                            
                                            <button 
                                                v-if="isDeveloper"
                                                class="btn-icon warn" 
                                                @click="initiateRoleChange(user)" 
                                                title="Change Role"
                                            >
                                                ⇄
                                            </button>

                                            <button class="btn-icon danger" @click="removeUser(user)" title="Remove User">🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-if="filteredList.length === 0" class="empty-state">
                            No users found in {{ currentTab }}.
                        </div>
                    </div>
                </section>
            </div>

            <div v-if="editingUser" class="modal-overlay" @click="closeEditModal">
                <div class="polished-modal" @click.stop>
                    <header class="modal-header">
                        <h3>Edit Credentials</h3>
                        <button class="close-modal" @click="closeEditModal">✕</button>
                    </header>
                    <div class="modal-body">
                        <form @submit.prevent="saveEditUser" class="edit-form">
                            <div class="input-group">
                                <label>Username</label>
                                <input v-model="editFormData.username" type="text" required />
                            </div>
                            <div class="input-group">
                                <label>Email</label>
                                <input v-model="editFormData.email" type="email" required />
                            </div>
                            <div class="input-group">
                                <label>Password</label>
                                <input v-model="editFormData.password" type="text" required />
                            </div>
                        </form>
                    </div>
                    <footer class="modal-footer">
                        <p v-if="editMessage" :class="editError ? 'status-msg error' : 'status-msg success'">{{ editMessage }}</p>
                        <div class="footer-buttons">
                            <button @click="closeEditModal" class="btn-text">Cancel</button>
                            <button @click="saveEditUser" class="btn-primary" :disabled="isSaving">
                                {{ isSaving ? 'Saving...' : 'Save Changes' }}
                            </button>
                        </div>
                    </footer>
                </div>
            </div>

            <div v-if="roleChangeUser" class="modal-overlay" @click="closeRoleModal">
                <div class="polished-modal" @click.stop>
                    <header class="modal-header">
                        <h3 style="color: #f59e0b;">⚠ Confirm Role Change</h3>
                        <button class="close-modal" @click="closeRoleModal">✕</button>
                    </header>
                    <div class="modal-body">
                        <p style="font-size: 1.1rem; line-height: 1.5; color: var(--color-on-background);">
                            Change role for <strong>{{ roleChangeUser.username }}</strong>:
                        </p>
                        <div style="margin-top: 15px; display: flex; gap: 10px; flex-direction: column;">
                            <button 
                                v-if="currentTab !== 'admin'"
                                @click="changeToRole('admin')" 
                                class="btn-primary" 
                                :disabled="isSaving"
                                style="text-align: left; padding: 10px 15px;"
                            >
                                → Move to Admin
                            </button>
                            <button 
                                v-if="currentTab !== 'mod'"
                                @click="changeToRole('mod')" 
                                class="btn-primary" 
                                :disabled="isSaving"
                                style="text-align: left; padding: 10px 15px;"
                            >
                                → Move to Mod
                            </button>
                            <button 
                                v-if="currentTab !== 'management' && isDeveloper"
                                @click="changeToRole('management')" 
                                class="btn-primary" 
                                :disabled="isSaving"
                                style="text-align: left; padding: 10px 15px;"
                            >
                                → Move to Management
                            </button>
                        </div>
                    </div>
                    <footer class="modal-footer">
                        <div class="footer-buttons" style="width: 100%;">
                            <button @click="closeRoleModal" class="btn-text">Cancel</button>
                        </div>
                    </footer>
                </div>
            </div>

            <div v-if="showEditorsModal" class="modal-overlay" @click="closeEditorsModal">
                <div class="polished-modal" style="max-width: 900px;" @click.stop>
                    <header class="modal-header">
                        <h3>Edit Listed Editors to show on the list</h3>
                        <button class="close-modal" @click="closeEditorsModal">✕</button>
                    </header>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">                        
                        <div class="editor-list-container">
                            <div class="editor-header-row desktop-only">
                                <div style="width: 30px;"></div>
                                <div style="flex: 1;">Name</div>
                                <div style="flex: 2;">Channel Link</div>
                                <div style="width: 120px;">Role</div>
                                <div style="width: 40px;"></div>
                            </div>

                            <div 
                                v-for="(editor, index) in editorsList" 
                                :key="index"
                                class="editor-row"
                                draggable="true"
                                @dragstart="dragStartEditor($event, index)"
                                @dragover.prevent
                                @drop="dropEditor($event, index)"
                            >
                                <div class="drag-handle" title="Drag to reorder">::</div>

                                <div class="editor-col">
                                    <label class="mobile-only">Name</label>
                                    <input v-model="editor.name" type="text" placeholder="Name" class="table-input" />
                                </div>

                                <div class="editor-col" style="flex: 2;">
                                    <label class="mobile-only">Channel Link</label>
                                    <input v-model="editor.link" type="text" placeholder="https://youtube.com/..." class="table-input" />
                                </div>

                                <div class="editor-col" style="width: 120px;">
                                    <label class="mobile-only">Role</label>
                                    <select v-model="editor.role" class="dropdown-select">
                                        <option value="owner">Owner</option>
                                        <option value="admin">Admin</option>
                                        <option value="helper">Helper</option>
                                        <option value="dev">Dev</option>
                                        <option value="trial">Trial</option>
                                    </select>
                                </div>

                                <div class="editor-actions">
                                    <button @click="removeEditorRow(index)" class="btn-icon danger" title="Remove" style="font-size: 1.2rem;">🗑</button>
                                </div>
                            </div>
                        </div>

                        <button @click="addEditorRow" class="btn-add-staff" style="margin-top: 15px;">+ Add New Editor</button>
                    </div>
                    <footer class="modal-footer">
                        <p v-if="editorMessage" :class="editorError ? 'status-msg error' : 'status-msg success'">{{ editorMessage }}</p>
                        <div class="footer-buttons">
                            <button @click="closeEditorsModal" class="btn-text">Cancel</button>
                            <button @click="saveEditors" class="btn-primary" :disabled="isSavingEditors">
                                {{ isSavingEditors ? 'Saving...' : 'Save List' }}
                            </button>
                        </div>
                    </footer>
                </div>
            </div>

        </main>
    `,
    data() {
        return {
            store,
            loading: true,
            isAuthenticated: false,
            loginUsername: '', loginEmail: '', loginPassword: '',
            isLoggingIn: false, loginError: '',
            token: null,
            currentUser: '',

            adminList: [],
            modList: [],
            managementList: [],
            currentTab: 'admin',

            editingUser: null,
            editFormData: { username: '', email: '', password: '' },
            editMessage: '', editError: false,
            roleChangeUser: null,
            sidebarMessage: '', sidebarError: false,
            showNewPassword: false,
            isSaving: false,
            searchQuery: '',
            formData: { username: '', email: '', password: '' },

            showEditorsModal: false,
            editorsList: [],
            isSavingEditors: false,
            editorMessage: '',
            editorError: false,
            draggedEditorIndex: null,

            isMobileSidebarOpen: false
        };
    },
    computed: {
        isDeveloper() { return this.currentUser && this.currentUser.trim().toLowerCase() === 'anticroom'; },
        currentList() { 
            if (this.currentTab === 'management') return this.managementList;
            if (this.currentTab === 'admin') return this.adminList;
            return this.modList;
        },
        filteredList() {
            if (!this.searchQuery) return this.currentList;
            const query = this.searchQuery.toLowerCase();
            return this.currentList.filter(u => u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
        }
    },
    watch: {
        currentTab() {
            this.isMobileSidebarOpen = false;
        }
    },
    async mounted() {
        const styleId = 'custom-management-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .dropdown-select {
                    width: 100%;
                    padding: 8px 30px 8px 10px;
                    border: 1px solid var(--color-border);
                    border-radius: 4px;
                    background-color:rgba(0,0,0,0.2);
                    color: var(--color-text-main);
                    font-size: 0.9rem;
                    cursor: pointer;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 16px;
                }
                .dropdown-select:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    background-color: rgba(0,0,0,0.4);
                }
                .dropdown-select option {
                    background-color: var(--color-background);
                    border-color: var(--color-primary);
                    color: #fff;
                }
                .table-input {
                    width: 100%;
                    padding: 8px;
                    background: rgba(0,0,0,0.2);
                    border-color: var(--color-border);
                    color: var(--color-on-background);
                    border-radius: 4px;
                    font-family: inherit;
                    transition: border-color 0.2s;
                }
                .table-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
            `;
            document.head.appendChild(style);
        }

        if (!document.querySelector('link[href="/css/pages/manage.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/pages/manage.css';
            document.head.appendChild(link);
        }

        const storedToken = localStorage.getItem('admin_token');
        const storedUser = localStorage.getItem('admin_user');

        if (storedToken) {
            this.token = storedToken;
            let user = storedUser;
            if (!user) {
                const decoded = this.parseJwt(storedToken);
                if (decoded && decoded.username) {
                    user = decoded.username;
                    localStorage.setItem('admin_user', user);
                }
            }
            this.currentUser = user || '';
            this.isAuthenticated = true;
            await Promise.all([this.fetchUsers(), this.fetchEditors()]);
        } else {
            this.loading = false;
        }
    },
    methods: {
        parseJwt(token) {
            try {
                const base64Url = token.split('.');
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) { return null; }
        },
        async handleLogin() {
            this.isLoggingIn = true;
            this.loginError = '';
            const username = this.loginUsername.trim();
            const email = this.loginEmail.trim();

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password: this.loginPassword })
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    if (data.role !== 'management') {
                        this.loginError = 'Access Denied: management privileges required.';
                        this.isLoggingIn = false; return;
                    }
                    this.token = data.token;
                    this.currentUser = username;
                    localStorage.setItem('admin_token', data.token);
                    localStorage.setItem('admin_user', username);
                    this.isAuthenticated = true;
                    await Promise.all([this.fetchUsers(), this.fetchEditors()]);
                } else { this.loginError = data.error || 'Invalid credentials'; }
            } catch (error) { this.loginError = 'Login failed.'; } finally { this.isLoggingIn = false; }
        },
        logout() {
            this.isAuthenticated = false; this.token = null;
            this.adminList = []; this.managementList = []; this.editorsList = [];
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        },
        getAuthHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }; },
        toggleVis(user) { user.showCredentials = !user.showCredentials; this.$forceUpdate(); },
        async fetchUsers() {
            this.loading = true;
            try {
                const response = await fetch('/api/manage-users', { method: 'GET', headers: this.getAuthHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    this.adminList = (data.admins || []).map(u => ({ ...u, showCredentials: false }));
                    this.modList = (data.mods || []).map(u => ({ ...u, showCredentials: false }));
                    if (data.management) this.managementList = data.management.map(u => ({ ...u, showCredentials: false }));
                } else { this.logout(); }
            } catch (error) { console.error('Error:', error); } finally { this.loading = false; }
        },
        async fetchEditors() {
            try {
                const response = await fetch('/api/editors', { method: 'GET', headers: this.getAuthHeaders() });
                if (response.ok) this.editorsList = await response.json();
                else this.editorsList = [];
            } catch (e) { this.editorsList = []; }
        },
        async syncToRepo() {
            this.isSaving = true;
            const cleanAdmins = this.adminList.map(({ showCredentials, ...rest }) => rest);
            const cleanMods = this.modList.map(({ showCredentials, ...rest }) => rest);
            let payload = { admins: cleanAdmins, mods: cleanMods };
            if (this.isDeveloper) payload.management = this.managementList.map(({ showCredentials, ...rest }) => rest);
            try {
                const response = await fetch('/api/manage-users', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(payload) });
                if (!response.ok) throw new Error('Failed to save');
                return true;
            } catch (e) { return false; } finally { this.isSaving = false; }
        },
        async addUser() {
            this.sidebarMessage = ''; this.sidebarError = false;
            if (!this.formData.username || !this.formData.email || !this.formData.password) {
                this.sidebarMessage = 'All fields required'; this.sidebarError = true; return;
            }
            const newUser = { ...this.formData, showCredentials: false };
            if (this.currentTab === 'management') this.managementList.push(newUser);
            else if (this.currentTab === 'admin') this.adminList.push(newUser);
            else this.modList.push(newUser);

            const success = await this.syncToRepo();
            if (success) {
                this.sidebarMessage = 'User added & saved!';
                this.formData = { username: '', email: '', password: '' };
                this.showNewPassword = false;
                this.isMobileSidebarOpen = false;
                setTimeout(() => { this.sidebarMessage = '' }, 3000);
            } else {
                this.sidebarMessage = 'Failed to save.'; this.sidebarError = true; await this.fetchUsers();
            }
        },
        async removeUser(user) {
            if (!confirm(`Delete ${user.username}?`)) return;
            if (this.currentTab === 'management') this.managementList = this.managementList.filter(u => u !== user);
            else if (this.currentTab === 'admin') this.adminList = this.adminList.filter(u => u !== user);
            else this.modList = this.modList.filter(u => u !== user);
            const success = await this.syncToRepo();
            if (!success) { alert("Failed to delete."); await this.fetchUsers(); }
        },
        initiateRoleChange(user) { this.roleChangeUser = user; },
        closeRoleModal() { this.roleChangeUser = null; },
        async changeToRole(targetRole) {
            if (!this.roleChangeUser) return;
            const user = this.roleChangeUser;
            
            if (this.currentTab === 'admin') this.adminList = this.adminList.filter(u => u !== user);
            else if (this.currentTab === 'mod') this.modList = this.modList.filter(u => u !== user);
            else this.managementList = this.managementList.filter(u => u !== user);
            
            if (targetRole === 'admin') this.adminList.push(user);
            else if (targetRole === 'mod') this.modList.push(user);
            else this.managementList.push(user);
            
            const success = await this.syncToRepo();
            if (success) this.closeRoleModal(); 
            else { alert("Failed."); await this.fetchUsers(); }
        },
        async executeRoleChange() {
            if (!this.roleChangeUser) return;
            const user = this.roleChangeUser;
            if (this.currentTab === 'admin') { this.adminList = this.adminList.filter(u => u !== user); this.managementList.push(user); }
            else { this.managementList = this.managementList.filter(u => u !== user); this.adminList.push(user); }
            const success = await this.syncToRepo();
            if (success) this.closeRoleModal(); else { alert("Failed."); await this.fetchUsers(); }
        },
        openEditModal(user) { this.editingUser = user; const { showCredentials, ...userData } = user; this.editFormData = { ...userData }; this.editMessage = ''; },
        closeEditModal() { this.editingUser = null; this.editMessage = ''; },
        async saveEditUser() {
            this.editMessage = '';
            if (this.currentTab === 'management') this.managementList = this.managementList.map(u => u === this.editingUser ? { ...u, ...this.editFormData } : u);
            else if (this.currentTab === 'admin') this.adminList = this.adminList.map(u => u === this.editingUser ? { ...u, ...this.editFormData } : u);
            else this.modList = this.modList.map(u => u === this.editingUser ? { ...u, ...this.editFormData } : u);
            const success = await this.syncToRepo();
            if (success) { this.editMessage = 'Saved!'; setTimeout(() => { this.closeEditModal(); }, 1000); }
            else { this.editMessage = 'Failed.'; await this.fetchUsers(); }
        },
        openEditorsModal() { this.showEditorsModal = true; this.editorMessage = ''; this.isMobileSidebarOpen = false; },
        closeEditorsModal() { this.showEditorsModal = false; this.editorMessage = ''; this.draggedEditorIndex = null; },
        addEditorRow() { this.editorsList.push({ name: '', link: '', role: 'helper' }); },
        removeEditorRow(index) { this.editorsList.splice(index, 1); },
        dragStartEditor(event, index) { this.draggedEditorIndex = index; event.dataTransfer.effectAllowed = 'move'; },
        dropEditor(event, targetIndex) {
            const fromIndex = this.draggedEditorIndex;
            if (fromIndex === null || fromIndex === targetIndex) return;
            const item = this.editorsList.splice(fromIndex, 1)[0];
            this.editorsList.splice(targetIndex, 0, item);
            this.draggedEditorIndex = null;
        },
        async saveEditors() {
            this.isSavingEditors = true; this.editorMessage = ''; this.editorError = false;
            try {
                const response = await fetch('/api/editors', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(this.editorsList) });
                if (response.ok) { this.editorMessage = 'List Saved Successfully!'; setTimeout(() => { this.closeEditorsModal(); }, 1500); }
                else { throw new Error('Save failed'); }
            } catch (e) { this.editorMessage = 'Failed to save editors list.'; this.editorError = true; }
            finally { this.isSavingEditors = false; }
        }
    }
};