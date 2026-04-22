import { store } from '../main.js';
import { fetchList, fetchRules, fetchPacks } from '../content.js';
import { renderMarkdown } from '../markdown.js';

export default {
template: `
    <main v-if="loading" class="page-admin">
        <div class="admin-nav-bar">
            <div class="admin-nav-top">
                <div class="skeleton skel-title" style="width: 200px; height: 32px; margin: 0;"></div>
                <div style="display:flex; gap:10px;">
                    <div class="skeleton" style="width: 80px; height: 32px; border-radius: 4px;"></div>
                    <div class="skeleton" style="width: 80px; height: 32px; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="sidebar-tabs">
                <div class="skeleton" style="width: 120px; height: 36px; border-radius: 4px 4px 0 0;"></div>
                <div class="skeleton" style="width: 120px; height: 36px; border-radius: 4px 4px 0 0;"></div>
                <div class="skeleton" style="width: 120px; height: 36px; border-radius: 4px 4px 0 0;"></div>
            </div>
        </div>

        <div class="admin-workspace">
            <aside class="admin-sidebar" style="opacity: 0.7;">
                <div class="skeleton" style="width: 100px; height: 32px; border-radius: 4px; margin-bottom: 1.5rem;"></div>
                <div class="skeleton skel-text" style="width: 50%; height: 20px; margin-bottom: 1rem;"></div>
                <div v-for="n in 6" :key="n" style="margin-bottom: 1rem;">
                    <div class="skeleton skel-text" style="width: 30%; height: 12px; margin-bottom: 0.5rem;"></div>
                    <div class="skeleton" style="width: 100%; height: 38px; border-radius: 4px;"></div>
                </div>
            </aside>

            <section class="admin-content" style="opacity: 0.7;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div class="skeleton skel-title" style="width: 300px; height: 32px; margin: 0;"></div>
                    <div style="display: flex; gap: 10px;">
                        <div class="skeleton" style="width: 90px; height: 32px; border-radius: 4px;"></div>
                        <div class="skeleton" style="width: 90px; height: 32px; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="skeleton" style="width: 100%; height: 40px; border-radius: 4px; margin-bottom: 8px;"></div>
                <div v-for="n in 8" :key="n" class="skeleton skel-table-row" style="height: 48px;"></div>
            </section>
        </div>
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
        <div class="admin-nav-bar">
            <div class="admin-nav-top">
                <h2>{{ userRole === 'mod' ? 'Mod Panel' : 'Admin Panel' }}</h2>
                <div class="admin-nav-actions">
                    <button class="btn-goto-admin-sm" onclick="window.location.href='/#/manage'">Manage</button>
                    <button @click="logout" class="btn-logout">Logout</button>
                </div>
            </div>
            <div class="sidebar-tabs">
                <button :class="{ active: currentTab === 'submissions' }" @click="currentTab = 'submissions'">Submissions</button>
                <button :class="{ active: currentTab === 'levels' }" @click="currentTab = 'levels'">Levels</button>
                <button v-if="userRole !== 'mod'" :class="{ active: currentTab === 'packs' }" @click="currentTab = 'packs'">Packs</button>
            </div>
        </div>

        <div class="admin-workspace">
            <div class="mobile-sidebar-overlay" v-if="isMobileSidebarOpen" @click="closeEditRecordsModal"></div>
            
            <button v-if="currentTab !== 'submissions'" class="mobile-fab-btn" @click="isMobileSidebarOpen = true">
                <i class="fa-solid fa-plus"></i>
            </button>

            <aside class="admin-sidebar" v-show="currentTab !== 'submissions' || isMovingRankMobile || isEditingLevelMobile" :class="{ 'is-open': isMobileSidebarOpen }">
                <div class="mobile-sidebar-header">
                    <h3>
                        {{ isEditingLevelMobile ? 'Edit Level' : (isMovingRankMobile ? 'Move Level' : (currentTab === 'levels' ? 'Add Level' : 'Pack Options')) }}
                    </h3>
                    <button class="btn-close-sidebar" @click="closeEditRecordsModal">✕</button>
                </div>

                <div v-if="isMovingRankMobile">
                    <p style="margin-bottom: 1.5rem; color: var(--color-text-secondary);">
                        Move <strong>{{ movingToRankLevel[0]?.name }}</strong> to a new position.
                    </p>
                    <div class="admin-form">
                        <div class="form-group">
                            <label>Target Rank (1 - {{ levelsList.length }})</label>
                            <input v-model.number="targetRank" type="number" :min="1" :max="levelsList.length" placeholder="Enter rank..." />
                        </div>
                        <button @click="confirmMove" class="btn-submit" style="margin-top: 1rem;">Confirm Move</button>
                    </div>
                </div>

                <div v-else-if="isEditingLevelMobile && editingLevel">
                    <div class="admin-form">
                        <div class="form-group"><label>Name</label><input v-model="editingLevel.name"></div>
                        <div class="form-group"><label>Author</label><input v-model="editingLevel.author"></div>
                        <div class="form-group"><label>Verifier</label><input v-model="editingLevel.verifier"></div>
                        <div class="form-group"><label>ID</label><input v-model.number="editingLevel.id"></div>
                        <div class="form-group"><label>Video</label><input v-model="editingLevel.verification"></div>
                        <div class="form-group"><label>Percent</label><input v-model="editingLevel.percentToQualify"></div>
                        
                        <h3 style="margin-top:1.5rem; font-size: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Records</h3>
                        <div v-for="(record, index) in editingLevel.records" :key="index" class="edit-record-row">
                            <input v-model="record.user" placeholder="User">
                            <input v-model="record.link" placeholder="Link">
                            <div style="display:flex; gap:10px;">
                                <input v-model.number="record.percent" placeholder="%" style="flex:1">
                                <input v-model.number="record.hz" placeholder="Hz" style="flex:1">
                                <button @click="editingLevel.records.splice(index, 1)" class="btn-remove" style="color: var(--color-error);">Remove</button>
                            </div>
                        </div>
                        <button @click="addEditingRecord" class="btn-toggle">+ Add Record</button>
                        <button @click="saveEditLevel" class="btn-submit" :disabled="isSavingRecords" style="margin-top: 2rem;">{{ isSavingRecords ? 'Saving...' : 'Save Changes' }}</button>
                        <div v-if="editRecordsMessage" :class="editRecordsError ? 'message error-message' : 'message success-message'" style="margin-top: 1rem;">{{ editRecordsMessage }}</div>
                    </div>
                </div>

                <div v-else>
                    <div v-if="currentTab === 'levels'">
                        <button v-if="userRole !== 'mod'" @click="openRulesModal" class="btn-toggle" style="margin-bottom: 1.5rem;">Edit Rules</button>
                        <h3 class="desktop-sidebar-title" style="border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Add Level to {{ store.listType }}</h3>
                        <form @submit.prevent="submitLevel" class="admin-form" style="margin-top: 1rem;" :style="userRole === 'mod' ? 'opacity: 0.5; pointer-events: none;' : ''">
                            <div v-if="userRole === 'mod'" style="background: rgba(255, 183, 0, 0.1); border-left: 3px solid #ffb700; padding: 10px; margin-bottom: 1.5rem; border-radius: 4px; font-size: 0.9rem; pointer-events: auto;">
                                <strong>Mods cannot add levels D:</strong><br>
                                Only Admins and above can add new levels!
                            </div>
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
                        <button @click="createNewPack" class="btn-submit" style="margin-bottom: 1.5rem; width: 100%;">+ Create New Pack</button>
                        <h3 class="desktop-sidebar-title" style="border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">{{ store.listType }} Packs</h3>
                        <div style="display:flex; flex-direction:column; gap: 8px; margin-top: 1rem;">
                            <div v-if="packsList.length === 0" style="color:var(--color-text-secondary); font-style:italic;">No packs yet.</div>
                            <div v-for="pack in packsList" :key="pack.id" 
                                class="pack-card-mini" 
                                :class="{ active: editingPack.original_id === pack.id }"
                                @click="selectPack(pack)">
                                <div class="pack-info">
                                    <strong>{{ pack.name }}</strong>
                                    <small>{{ pack.levels ? pack.levels.length : 0 }} Levels</small>
                                </div>
                                <button class="btn-icon-sm" @click.stop="deletePack(pack)">🗑</button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <section class="admin-content">
                <div v-if="currentTab === 'submissions'" class="submissions-list">
                    <div class="list-header-block">
                        <div class="list-header-top">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <h2>Pending Submissions ({{ filteredSubmissions.length }})</h2>
                                <button v-if="userRole !== 'mod'" @click="openVipsModal" class="btn-toggle" style="margin:0; padding: 4px 10px; font-size: 0.85rem; width: auto; border: 1px solid #ffd700; color: #ffd700; background: rgba(255, 215, 0, 0.05);">★ Manage VIP Members</button>
                            </div>
                            <div class="submission-tabs">
                                <button @click="submissionViewType = 'record'" :class="{ active: submissionViewType === 'record' }">Records</button>
                                <button @click="submissionViewType = 'level'" :disabled="userRole === 'mod'" :class="{ active: submissionViewType === 'level' }">Levels</button>
                            </div>
                        </div>
                        <div class="mass-select-toolbar">
                            <input v-model="adminSubmissionSearch" type="text" placeholder="Search..." class="inline-input search-sub-input" />
                            <div v-if="massSelectMode" class="mass-actions-container">
                                <span class="mass-selected-count">{{ selectedSubmissions.length }} Selected</span>
                                <button @click="bulkApprove" class="btn-approve-sm">✓ Approve</button>
                                <button @click="openBulkDeny" class="btn-deny-sm">✕ Deny</button>
                                <button @click="cancelMassSelect" class="btn-cancel-sm">Cancel</button>
                            </div>
                        </div>
                    </div>

                    <div v-if="filteredSubmissions.length === 0" class="no-submissions">
                        <p>No pending submissions match this view.</p>
                    </div>

                    <div v-else class="submissions-container" style="overflow-x: auto;">
                        <table class="submissions-table">
                            <thead>
                                <tr>
                                    <th v-if="massSelectMode">✓</th>
                                    <th>{{ submissionViewType === 'record' ? 'Level' : 'Level Name' }}</th>
                                    <th>{{ submissionViewType === 'record' ? 'Player' : 'ID' }}</th>
                                    <th v-if="submissionViewType === 'record'">Discord</th>
                                    <th>{{ submissionViewType === 'record' ? 'Percent' : 'Author' }}</th>
                                    <th>{{ submissionViewType === 'record' ? 'FPS' : 'Verifier' }}</th>
                                    
                                    <th v-if="submissionViewType === 'level'">Placement Opinion</th>
                                    
                                    <th>Video</th>
                                    <th>Notes</th>
                                    <th v-if="!massSelectMode">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="submission in filteredSubmissions" :key="submission.id" class="submission-row" @contextmenu.prevent="enableMassSelect(submission)" :class="{ 'selected-row': selectedSubmissions.includes(submission.id), 'vip-row': submission.is_vip }">
                                    <td v-if="massSelectMode" style="text-align: center;">
                                        <input type="checkbox" :checked="selectedSubmissions.includes(submission.id)" @change="toggleSelection(submission.id)" />
                                    </td>

                                    <td v-if="submissionViewType === 'record'">
                                        <span v-if="submission.is_vip" class="vip-badge" title="VIP Member">VIP</span>
                                        <strong>{{ submission.level_name }}</strong>
                                        <span v-if="isDuplicate(submission)" class="duplicate-badge">DUPE</span>
                                    </td>
                                    <td v-else><input v-model="submission.name" class="inline-input" /></td>
                                    
                                    <td v-if="submissionViewType === 'record'">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <input v-model="submission.username" class="inline-input" style="flex:1;" />
                                        </div>
                                    </td>
                                    <td v-else><input v-model.number="submission.id_gd" type="number" class="inline-input" /></td>
                                    
                                    <td v-if="submissionViewType === 'record'"><input v-model="submission.discord" class="inline-input" /></td>
                                    
                                    <td v-if="submissionViewType === 'record'"><input v-model.number="submission.percent" type="number" class="inline-input" /></td>
                                    <td v-else><input v-model="submission.author" class="inline-input" /></td>
                                    
                                    <td v-if="submissionViewType === 'record'"><input v-model.number="submission.hz" type="number" class="inline-input" /></td>
                                    <td v-else><input v-model="submission.verifier" class="inline-input" /></td>

                                    <td v-if="submissionViewType === 'level'">
                                        <input v-model="submission.placement_suggestion" class="inline-input" style="width: 80px;" placeholder="e.g. 30-40" />
                                    </td>
                                    
                                    <td>
                                        <div class="input-with-icon">
                                            <input v-if="submissionViewType === 'record'" v-model="submission.video_link" class="inline-input" />
                                            <input v-else v-model="submission.verification" class="inline-input" />
                                            
                                            <a :href="submissionViewType === 'record' ? submission.video_link : submission.verification" 
                                            target="_blank" 
                                            class="icon-link-out" 
                                            title="Open video in new tab">
                                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                            </a>
                                        </div>
                                    </td>

                                    <td><input v-model="submission.notes" class="inline-input" /></td>

                                    <td class="actions" v-if="!massSelectMode">
                                        <button @click="approveSubmission(submission)" class="btn-approve">✓</button>
                                        <button @click="openDenyModal(submission)" class="btn-deny">✕</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="currentTab === 'levels'">
                    <div class="list-header">
                        <h2>{{ store.listType }} Levels ({{ levelsList.length }})</h2>
                        <input v-model="searchQuery" type="text" placeholder="Search..." class="search-input" />
                    </div>
                    <div class="table-container" ref="tableContainer">
                        <table class="levels-table">
                            <thead><tr><th>Rank</th><th>Name</th><th>Records</th><th>Actions</th></tr></thead>
                            <tbody>
                                <tr v-for="(level, index) in filteredLevels" :key="level._id" class="level-row" 
                                    :draggable="!searchQuery && userRole !== 'mod'" 
                                    @dragstart="onDragStart($event, index)" @dragover.prevent="onDragOver($event, index)" @drop.prevent="onDrop">
                                    <td data-label="Level">
                                        <div class="rank-display-wrapper">
                                            <span 
                                                :class="getOriginalIndex(level) <= 150 ? 'goldhighlight' : ''" 
                                                :style="getOriginalIndex(level) > 150 ? 'color: var(--color-text-legacy)' : ''"
                                            >
                                                #{{ getOriginalIndex(level) }}
                                            </span>
                                            <span class="mobile-name-inline"><strong>{{ level.name }}</strong></span>
                                            <span class="drag-handle" v-if="!searchQuery && userRole !== 'mod'">::</span>
                                        </div>
                                    </td>
                                    <td data-label="Name"><strong>{{ level.name }}</strong></td>
                                    <td data-label="Records">{{ level.records?.length || 0 }}</td>
                                    <td class="actions">
                                        <button v-if="userRole !== 'mod' && !searchQuery" class="btn-icon mobile-order-btn" @click.stop="moveLevelUp(index)" :disabled="index === 0">↑</button>
                                        <button v-if="userRole !== 'mod' && !searchQuery" class="btn-icon mobile-order-btn" @click.stop="moveLevelDown(index)" :disabled="index === levelsList.length - 1">↓</button>
                                        <button v-if="userRole !== 'mod'" class="btn-icon" @click.stop="openMoveMobile(level)" title="Move Level">
                                            <i class="fa-solid fa-hashtag"></i>
                                        </button>
                                        <button class="btn-icon" @click.stop="openEditRecordsModal(level)">✎</button>
                                        <button v-if="userRole !== 'mod'" class="btn-icon" @click.stop="deleteLevel(level)">🗑</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="currentTab === 'packs'" class="pack-workspace">
                    <div class="pack-header-bar">
                        <div class="pack-meta-inputs">
                            <div style="flex: 2;"><label>Name</label><input v-model="editingPack.name" /></div>
                            <div style="flex: 0 0 100px;"><label>Color</label><input v-model="editingPack.color" type="color" /></div>
                        </div>
                        <button @click="savePack" class="btn-submit" :disabled="isSavingPack">Save Pack</button>
                    </div>
                    <div class="pack-drag-container">
                        <div class="drag-column">
                            <h3>Levels In Pack</h3>
                            <div class="drag-list" ref="packListContainer" @dragover.prevent @drop="onDropToPack">
                                <div v-for="(lvl, idx) in editingPack.levels" :key="lvl._id" class="drag-item" draggable="true" @dragstart="onDragStartPack($event, idx)" @dragover.prevent="onDragOverPack($event, idx)">
                                    <span>{{ lvl.name }}</span>
                                    <button @click="removeFromPack(idx)" class="btn-icon-sm">✕</button>
                                </div>
                            </div>
                        </div>
                        <div class="drag-column">
                            <h3>Available Levels</h3>
                            <input v-model="packSearch" placeholder="Search..." />
                            <div class="drag-list">
                                <div v-for="lvl in filteredAvailableLevels" :key="lvl._id" class="drag-item source" draggable="true" @dragstart="onDragStartSource($event, lvl)" @click="addToPack(lvl)">
                                    <span>{{ lvl.name }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div v-if="showRulesModal" class="modal-overlay">
            <div class="polished-modal rules-modal" @click.stop>
                <header class="modal-header">
                    <h1>Edit Rules</h1>
                    <button class="close-modal" @click="closeRulesModal" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;">✕</button>
                </header>
                <div class="rules-container">
                    <div v-for="(section, idx) in rulesSections" :key="idx" class="rule-section-card">
                        <div class="section-header-row">
                            <input v-model="section.header" class="header-input" placeholder="Section Header" />
                            <div class="section-controls">
                                <label class="toggle-switch">
                                    <span class="label-text">Visible</span>
                                    <input type="checkbox" v-model="section.visible" class="checkboxswitch">
                                    <span class="slider"></span>
                                </label>
                                <button @click="removeRuleSection(idx)" class="btn-remove">Remove</button>
                            </div>
                        </div>
                        <div class="section-body">
                            <div class="editor-column">
                                <label>Markdown Editor</label>
                                <textarea v-model="section.text" class="rules-textarea" placeholder="Type rules here..."></textarea>
                            </div>
                            <div class="preview-column">
                                <label>Live Preview</label>
                                <div class="markdown-preview-box">
                                    <h3 class="type-headline-sm" style="color: var(--color-primary); margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem;">{{ section.header }}</h3>
                                    <div v-html="parseRule(section.text)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button @click="addRuleSection" class="btn-toggle">+ Add New Section</button>
                </div>
                <footer class="modal-footer">
                    <p v-if="rulesMessage" :class="rulesError ? 'status-msg error' : 'status-msg success'">{{ rulesMessage }}</p>
                    <div class="footer-buttons" style="display:flex; gap:10px; margin-left:auto;">
                        <button @click="closeRulesModal" class="btn-text" style="background:transparent; border:1px solid var(--color-border); padding:0.5rem 1rem; border-radius:4px; color:var(--color-on-background); cursor:pointer;">Cancel</button>
                        <button @click="saveRules" class="btn-submit" :disabled="isSavingRules" style="margin-top: 0;">
                            {{ isSavingRules ? 'Saving...' : 'Save Rules' }}
                        </button>
                    </div>
                </footer>
            </div>
        </div>

        <div v-if="editingRecordsLevel && !isEditingLevelMobile" class="modal-overlay" @click="closeEditRecordsModal">
            <div class="polished-modal" @click.stop style="max-width: 800px;">
                <div class="modal-header"><h1>Edit: {{ editingLevel.name }}</h1><button @click="closeEditRecordsModal">✕</button></div>
                <div class="modal-scroll-area">
                    <div class="admin-form">
                        <div><label>Name</label><input v-model="editingLevel.name"></div>
                        <div><label>Author</label><input v-model="editingLevel.author"></div>
                        <div><label>Verifier</label><input v-model="editingLevel.verifier"></div>
                        <div><label>ID</label><input v-model.number="editingLevel.id"></div>
                        <div><label>Video</label><input v-model="editingLevel.verification"></div>
                        <div><label>Percent</label><input v-model="editingLevel.percentToQualify"></div>
                    </div>
                    <h3 style="margin-top:2rem;">Records</h3>
                    <div v-for="(record, index) in editingLevel.records" :key="index" class="edit-record-row">
                        <input v-model="record.user" placeholder="User" style="flex:1">
                        <input v-model="record.link" placeholder="Link" style="flex:1">
                        <input v-model.number="record.percent" placeholder="%" style="width:60px">
                        <input v-model.number="record.hz" placeholder="Hz" style="width:60px">
                        <button @click="editingLevel.records.splice(index, 1)" class="btn-icon-sm">✕</button>
                    </div>
                    <button @click="addEditingRecord" class="btn-toggle">+ Record</button>
                </div>
                <div class="modal-footer"><button @click="saveEditLevel" class="btn-submit">Save Changes</button></div>
            </div>
        </div>

        <div v-if="denyingSubmission" class="modal-overlay" @click="closeDenyModal">
            <div class="polished-modal" @click.stop style="max-width: 500px;">
                <div class="modal-header"><h1>Deny</h1><button @click="closeDenyModal">✕</button></div>
                <div class="modal-scroll-area"><textarea v-model="denyReason" rows="6"></textarea></div>
                <div class="modal-footer"><button @click="confirmDeny" class="btn-deny">Confirm Deny</button></div>
            </div>
        </div>

        <div v-if="showVipsModal" class="modal-overlay" @click="closeVipsModal">
            <div class="polished-modal vip-modal" @click.stop>
                <header class="modal-header">
                    <h1>Manage VIPs</h1>
                    <button class="close-modal" @click="closeVipsModal">✕</button>
                </header>
                <div class="modal-scroll-area">
                    <p class="vip-hint">
                        Add in the list username of our VIP members who get submission priority.
                    </p>
                    
                    <div class="vip-input-group">
                        <input v-model="vipInput" @keyup.enter="addVip" placeholder="Type username..." class="inline-input" />
                        <button @click="addVip" class="btn-submit">Add</button>
                    </div>
                    
                    <h3 class="vip-list-title">Current VIPs</h3>
                    
                    <div class="vip-list">
                        <div v-for="(vip, idx) in vipsList" :key="idx" class="vip-list-item">
                            <strong>{{ vip }}</strong>
                            <button @click="vipsList.splice(idx, 1)" class="btn-remove">Remove</button>
                        </div>
                        <div v-if="vipsList.length === 0" class="vip-empty-state">
                            No VIPs added yet.
                        </div>
                    </div>
                </div>
                <footer class="modal-footer">
                    <button @click="saveVips" class="btn-submit" :disabled="isSavingVips">
                        {{ isSavingVips ? 'Saving...' : 'Save VIPs' }}
                    </button>
                </footer>
            </div>
        </div>
    </main>
`,
    data() {
        return {
            store, loading: true, isAuthenticated: false, currentTab: 'submissions',
            loginUsername: '', loginEmail: '', loginPassword: '', isLoggingIn: false, loginError: '', token: null, userRole: null,

            submissions: [],
            submissionViewType: 'record',
            isProcessing: false,
            denyingSubmission: null,
            denyReason: '',
            optimisticallyRemovedIds: new Set(),

            adminSubmissionSearch: '',
            massSelectMode: false,
            selectedSubmissions: [],
            bulkDenyMode: false,

            isMobileSidebarOpen: false,
            isFetching: false,
            lastPollTime: 0, 
            isMovingLevel: false, 
            isMovingRankMobile: false,
            movingToRankLevel: null,
            targetRank: null,
            isEditingLevelMobile: false,

            levelsList: [], searchQuery: '', formData: { id: null, name: '', author: '', verifier: '', verification: '', percentToQualify: 100, password: 'free Copyable', records: [], creators: [], placement: null },
            showRecords: false, isSubmitting: false, successMessage: '', errorMessage: '',

            packsList: [],
            editingPack: { name: '', pack_id: '', original_id: null, color: '#ff69e1', levels: [] },
            packSearch: '', isSavingPack: false, packMessage: '', packError: false, draggedSourceLevel: null, draggedPackIndex: null,

            authInterval: null,

            showRulesModal: false,
            rulesSections: [],
            rulesMessage: '',
            rulesError: false,
            isSavingRules: false,

            editingRecordsLevel: null, editingLevel: null, isSavingRecords: false, recordsSuccessMessage: '', editRecordsMessage: '', editRecordsError: false, draggedItem: null, dragStartIndex: null, scrollInterval: null,
            pollingInterval: null, lastSubmissionCount: 0, lastLevelCount: 0,

            showVipsModal: false,
            vipsList: [],
            vipInput: '',
            isSavingVips: false,
        };
    },
    watch: {
        'store.listType': async function () {
            if (this.isAuthenticated) {
                this.loading = true;
                this.cancelMassSelect();
                this.createNewPack();
                await this.refreshLevels();
                await this.loadSubmissions();
                await this.refreshPacks();
                this.loading = false;
            }
        },
        submissionViewType() {
            this.cancelMassSelect();
        },
        currentTab() {
            this.isMobileSidebarOpen = false;
            this.cancelMassSelect();
        }
    },
    computed: {
        maxPlacement() {
            return (this.levelsList && this.levelsList.length ? this.levelsList.length : 0) + 1;
        },
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
        filteredSubmissions() {
            let filtered = this.submissions.filter(s => {
                const type = s.submission_type || 'record';
                return type === this.submissionViewType;
            });

            if (this.adminSubmissionSearch) {
                const q = this.adminSubmissionSearch.toLowerCase();
                filtered = filtered.filter(s =>
                    (s.level_name && s.level_name.toLowerCase().includes(q)) ||
                    (s.username && s.username.toLowerCase().includes(q)) ||
                    (s.discord && s.discord.toLowerCase().includes(q)) ||
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.author && s.author.toLowerCase().includes(q)) ||
                    (s.notes && s.notes.toLowerCase().includes(q))
                );
            }
            return filtered;
        }
    },
    async mounted() {
        if (!document.querySelector('style#inline-input-styles')) {
            const style = document.createElement('style');
            style.id = 'inline-input-styles';
            style.innerHTML = `
                .inline-input {
                    padding: 4px 6px;
                    border: 1px solid var(--color-border);
                    border-radius: 4px;
                    background: var(--color-bg-secondary);
                    color: var(--color-text);
                    font-family: inherit;
                    box-sizing: border-box;
                }
                .inline-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
            `;
            document.head.appendChild(style);
        }

        if (!document.querySelector('link[href="/css/pages/admin.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/pages/admin.css';
            document.head.appendChild(link);
        }

        if (!document.querySelector('style#admin-markdown-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-markdown-styles';
            style.innerHTML = `
                .preview-line a { color: var(--color-primary); text-decoration: underline; }
                .preview-line code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            `;
            document.head.appendChild(style);
        }

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && this.isAuthenticated) {
                this.pollForUpdates();
            }
        });

        try {
            const storedToken = localStorage.getItem('admin_token');
            const storedRole = localStorage.getItem('admin_role');
            if (storedToken) {
                this.token = storedToken;
                this.userRole = storedRole;
                this.isAuthenticated = true;

                await this.refreshLevels();
                await this.loadSubmissions();
                await this.refreshPacks();

                this.startAuthCheck();
                this.startPolling();
            }
        } catch (e) {
        } finally {
            this.loading = false;
        }
    },
    beforeUnmount() {
        this.stopAuthCheck();
        this.stopPolling();
    },
    methods: {
        parseRule(text) {
            if (!text) return '';
            return text.split('\n').map(line => renderMarkdown(line)).join('');
        },

        async handleLogin() {
            this.isLoggingIn = true;
            try {
                const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: this.loginUsername, email: this.loginEmail, password: this.loginPassword }) });
                const data = await res.json();
                if (res.ok && data.success) {
                    this.token = data.token;
                    this.userRole = data.role;
                    localStorage.setItem('admin_token', data.token);
                    localStorage.setItem('admin_role', data.role);
                    this.isAuthenticated = true;

                    await this.refreshLevels();
                    await this.loadSubmissions();
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
            this.userRole = null;
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_role');
        },
        getAuthHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }; },

        startAuthCheck() {
            this.stopAuthCheck();
            this.checkToken();
            this.authInterval = setInterval(() => this.checkToken(), 20000);
        },
        stopAuthCheck() {
            if (this.authInterval) { clearInterval(this.authInterval); this.authInterval = null; }
        },
        async checkToken() {
            if (!this.token) return;
            try {
                const res = await fetch('/api/login', { method: 'GET', headers: this.getAuthHeaders() });
                if (res.status === 401) { this.logout(); }
            } catch (e) { }
        },

        startPolling() {
            this.stopPolling();
            this.pollingInterval = setInterval(() => this.pollForUpdates(), 60000);
        },
        stopPolling() {
            if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
        },
        async pollForUpdates() {
            if (!this.isAuthenticated || document.hidden || this.isFetching) return;

            const now = Date.now();
            if (now - this.lastPollTime < 10000) return;

            this.isFetching = true; 

            try {
                const subRes = await fetch(`/api/update-records?action=view&listType=${this.store.listType}&_t=${now}`, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });

                if (subRes.ok) {
                    const subData = await subRes.json();
                    const newSubCount = subData.submissions?.length || 0;
                    if (newSubCount !== this.lastSubmissionCount) {
                        this.processIncomingSubmissions(subData.submissions || []);
                        this.lastSubmissionCount = newSubCount;
                    }
                    this.lastPollTime = Date.now();
                }

                if (this.currentTab === 'levels' && !this.draggedItem) {
                    await this.refreshLevels();
                }
            } catch (e) {
                console.error("Polling error:", e);
            } finally {
                this.isFetching = false; 
            }
        },

        processIncomingSubmissions(rawSubmissions) {
            const max = this.maxPlacement || 1;

            const validSubmissions = rawSubmissions.filter(sub => !this.optimisticallyRemovedIds.has(sub.id));

            this.submissions = validSubmissions.map(sub => {
                try {
                    if (sub.submission_type === 'level') {
                        sub.original_placement_suggestion = sub.placement_suggestion;
                        let parsed = parseInt(sub.placement_suggestion);
                        if (isNaN(parsed) || parsed < 1) parsed = max;
                        if (parsed > max) parsed = max;
                        sub.placement_suggestion = parsed;
                    }
                } catch (e) {
                    sub.placement_suggestion = max;
                }
                return sub;
            });
        },

        async loadSubmissions() {
            try {
                const res = await fetch(`/api/update-records?action=view&listType=${this.store.listType}&_t=${Date.now()}`, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    this.processIncomingSubmissions(data.submissions || []);
                }
            } catch (error) {
            }
        },
        openMoveMobile(level) { this.movingToRankLevel = level; this.targetRank = this.levelsList.findIndex(l => (l[0]?._id || l._id) === (level[0]?._id || level._id)) + 1; this.isMovingRankMobile = true; this.isMobileSidebarOpen = true; },

        closeMobileSidebar() {
            this.isMobileSidebarOpen = false;
            setTimeout(() => {
                this.isMovingRankMobile = false;
                this.movingToRankLevel = null;
            }, 350);
        },

        async confirmMove() {
            if (!this.targetRank || this.targetRank < 1 || this.targetRank > this.levelsList.length) {
                alert("Invalid rank.");
                return;
            }

            const oldIndex = this.levelsList.findIndex(l => (l._id) === (this.movingToRankLevel._id || this.movingToRankLevel[0]?._id));
            const newIndex = this.targetRank - 1;

            if (oldIndex === newIndex) {
                this.closeMobileSidebar();
                return;
            }

            const item = this.levelsList.splice(oldIndex, 1)[0];
            this.levelsList.splice(newIndex, 0, item);

            this.closeMobileSidebar();
            await this.saveLevelMove(oldIndex, newIndex);
        },
        isDuplicate(sub) {
            if ((sub.submission_type || 'record') !== 'record') return false;
            const levelName = (sub.level_name || '').toLowerCase();
            const userName = (sub.username || '').toLowerCase();
            const level = this.levelsList.find(l => l.name.toLowerCase() === levelName);
            if (!level || !level.records) return false;
            return level.records.some(r => r.user.toLowerCase() === userName);
        },

        enableMassSelect(sub) {
            if (this.massSelectMode) return;
            this.massSelectMode = true;
            this.selectedSubmissions = [sub.id];
        },

        cancelMassSelect() {
            this.massSelectMode = false;
            this.selectedSubmissions = [];
            this.bulkDenyMode = false;
        },

        toggleSelection(id) {
            const idx = this.selectedSubmissions.indexOf(id);
            if (idx > -1) this.selectedSubmissions.splice(idx, 1);
            else this.selectedSubmissions.push(id);
        },

        async performBulkAction(action, reason = '') {
            if (this.selectedSubmissions.length === 0) return;
            this.isProcessing = true;

            const subsToProcess = this.submissions.filter(s => this.selectedSubmissions.includes(s.id));

            const payloadArray = subsToProcess.map(submission => {
                let finalPlacement = submission.placement_suggestion;
                if (submission.submission_type === 'level') {
                    finalPlacement = parseInt(finalPlacement);
                    if (isNaN(finalPlacement) || finalPlacement < 1) finalPlacement = this.maxPlacement;
                    if (finalPlacement > this.maxPlacement) finalPlacement = this.maxPlacement;
                }
                return {
                    id: submission.id,
                    username: submission.username,
                    discord: submission.discord,
                    percent: submission.percent,
                    hz: submission.hz,
                    video_link: submission.video_link,
                    name: submission.name,
                    id_gd: submission.id_gd,
                    author: submission.author,
                    verifier: submission.verifier,
                    verification: submission.verification,
                    percent_to_qualify: submission.percent_to_qualify,
                    placement_suggestion: finalPlacement,
                    notes: submission.notes,
                    submission_type: submission.submission_type || 'record',
                    level_name: submission.level_name
                };
            });

            try {
                const res = await fetch('/api/update-records?action=bulk-process', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        action: action,
                        reason: reason,
                        submissions: payloadArray
                    })
                });

                if (res.ok) {
                    for (const sub of subsToProcess) {
                        this.optimisticallyRemovedIds.add(sub.id);
                        const idx = this.submissions.findIndex(s => s.id === sub.id);
                        if (idx !== -1) this.submissions.splice(idx, 1);
                    }
                    if (action === 'approve') {
                        this.refreshLevels();
                    }
                }
            } catch (e) { }

            this.isProcessing = false;
            this.cancelMassSelect();
        },

        async bulkApprove() {
            if (this.selectedSubmissions.length === 0) return;
            if (!confirm(`Approve ${this.selectedSubmissions.length} selected submissions?`)) return;
            await this.performBulkAction('approve');
        },

        openBulkDeny() {
            if (this.selectedSubmissions.length === 0) return;
            this.bulkDenyMode = true;
            this.denyingSubmission = {
                username: `Multiple Users (${this.selectedSubmissions.length})`,
                name: `Mass Selection`
            };
            this.denyReason = '';
        },

        async approveSubmission(submission) {
            this.isProcessing = true;

            const index = this.submissions.findIndex(s => s.id === submission.id);
            if (index === -1) {
                this.isProcessing = false;
                return;
            }
            this.optimisticallyRemovedIds.add(submission.id);
            const backupSubmission = { ...this.submissions[index] };
            this.submissions.splice(index, 1);

            try {
                let finalPlacement = submission.placement_suggestion;
                if (submission.submission_type === 'level') {
                    finalPlacement = parseInt(finalPlacement);
                    if (isNaN(finalPlacement) || finalPlacement < 1) finalPlacement = this.maxPlacement;
                    if (finalPlacement > this.maxPlacement) finalPlacement = this.maxPlacement;
                }

                const payload = {
                    id: submission.id,
                    action: 'approve',
                    username: submission.username,
                    discord: submission.discord,
                    percent: submission.percent,
                    hz: submission.hz,
                    video_link: submission.video_link,
                    name: submission.name,
                    id_gd: submission.id_gd,
                    author: submission.author,
                    verifier: submission.verifier,
                    verification: submission.verification,
                    percent_to_qualify: submission.percent_to_qualify,
                    placement_suggestion: finalPlacement,
                    notes: submission.notes
                };

                const res = await fetch('/api/update-records?action=process', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    this.refreshLevels(); 
                } else {
                    throw new Error('Server rejected the approval.');
                }
            } catch (error) {
                this.optimisticallyRemovedIds.delete(submission.id);
                this.submissions.splice(index, 0, backupSubmission);
                alert('Failed to approve submission: ' + error.message);
            } finally {
                this.isProcessing = false;
            }
        },

        openDenyModal(submission) {
            this.denyingSubmission = submission;
            this.denyReason = '';
            this.bulkDenyMode = false;
        },
        closeDenyModal() {
            this.denyingSubmission = null;
            this.denyReason = '';
            this.bulkDenyMode = false;
        },

        async confirmDeny() {
            if (!this.denyingSubmission) return;

            if (this.bulkDenyMode) {
                await this.performBulkAction('deny', this.denyReason);
                this.closeDenyModal();
                return;
            }

            this.isProcessing = true;

            const submissionIdToDeny = this.denyingSubmission.id;
            const denyReasonToSend = this.denyReason;

            const index = this.submissions.findIndex(s => s.id === submissionIdToDeny);
            let backupSubmission = null;
            if (index !== -1) {
                this.optimisticallyRemovedIds.add(submissionIdToDeny);
                backupSubmission = { ...this.submissions[index] };
                this.submissions.splice(index, 1);
            }

            this.closeDenyModal();

            try {
                const res = await fetch('/api/update-records?action=process', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        id: submissionIdToDeny,
                        action: 'deny',
                        reason: denyReasonToSend
                    })
                });

                if (!res.ok) {
                    throw new Error('Server rejected the denial.');
                }
            } catch (error) {
                if (backupSubmission && index !== -1) {
                    this.optimisticallyRemovedIds.delete(submissionIdToDeny);
                    this.submissions.splice(index, 0, backupSubmission);
                }
                alert('Failed to deny submission: ' + error.message);
            } finally {
                this.isProcessing = false;
            }
        },

        async refreshLevels() {
            try {
                const list = await fetchList(this.store.listType, true);
                if (list) this.levelsList = list.map((l) => l[0]).filter(l => l);
            } catch (e) {
            }
        },
        async refreshPacks() {
            try {
                const packs = await fetchPacks(this.store.listType);
                if (packs) this.packsList = packs;
            } catch (e) { }
        },

        createNewPack() {
            this.editingPack = { name: '', pack_id: '', original_id: null, color: '#d4c217', levels: [] };
            this.packMessage = '';
        },
        selectPack(pack) {
            const fullLevels = (pack.levels || []).map(dbId => {
                const found = this.levelsList.find(l => String(l._id) === String(dbId));
                if (found) return found;
                return { id: dbId, name: `[Unknown List]`, _id: dbId };
            });

            this.editingPack = {
                name: pack.name || null,
                pack_id: pack.id,
                original_id: pack.id,
                color: pack.color || '#ff2cc0',
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
                        type: this.store.listType,
                        id: finalId,
                        name: this.editingPack.name,
                        color: this.editingPack.color,
                        levels: this.editingPack.levels.map(l => String(l._id))
                    })
                });

                if (res.status === 401) { this.logout(); return; }

                if (res.ok) {
                    this.packMessage = 'Saved!';
                    await this.refreshPacks();
                    this.editingPack.original_id = finalId;
                    this.isMobileSidebarOpen = false;
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
                    body: JSON.stringify({ action: 'delete', type: this.store.listType, id: pack.id })
                });
                if (res.status === 401) { this.logout(); return; }
                await this.refreshPacks();
                this.createNewPack();
                this.isMobileSidebarOpen = false;
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
            setTimeout(() => {
                this.levelsList[index].isDragging = true;
            }, 0);
        },

        onDragOver(event, index) {
            this.handleAutoScroll(event, this.$refs.tableContainer);
            if (!this.draggedItem) return;

            const draggedIdx = this.levelsList.findIndex(l => l._id === this.draggedItem._id);

            if (draggedIdx !== -1 && draggedIdx !== index) {
                const item = this.levelsList.splice(draggedIdx, 1)[0];
                this.levelsList.splice(index, 0, item);
            }
        },

        onDragEnd() {
            this.draggedItem = null;
            this.dragStartIndex = null;
        },

        async onDrop() {
            if (this.draggedItem === null || this.dragStartIndex === null) return;

            const finalIndex = this.levelsList.findIndex(l => l._id === this.draggedItem._id);

            if (finalIndex !== -1 && finalIndex !== this.dragStartIndex) {
                await this.saveLevelMove(this.dragStartIndex, finalIndex);
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
            const item = this.editingPack.levels.splice(fromIndex, 1);
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

        async moveLevelUp(index) { if (index <= 0) return; const item = this.levelsList.splice(index, 1)[0]; this.levelsList.splice(index - 1, 0, item); await this.saveLevelMove(index, index - 1); },

        async moveLevelDown(index) {
            if (index >= this.levelsList.length - 1) return;
            const item = this.levelsList[index];
            this.levelsList.splice(index, 1)[0];
            this.levelsList.splice(index + 1, 0, item);
            await this.saveLevelMove(index, index + 1);
        },

        async saveLevelMove(oldIndex, newIndex) {
            this.isMovingLevel = true; 

            try {
                const res = await fetch('/api/move-level', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        oldIndex: oldIndex,
                        newIndex: newIndex,
                        type: this.store.listType
                    })
                });

                if (res.status === 401) { this.logout(); }

                setTimeout(() => {
                    this.isMovingLevel = false;
                }, 2000);

            } catch (e) {
                await this.refreshLevels();
                this.isMovingLevel = false;
            }
        },
        movePackLevelUp(index) {
            if (index <= 0) return;
            const item = this.editingPack.levels[index];
            this.editingPack.levels.splice(index, 1);
            this.editingPack.levels.splice(index - 1, 0, item);
        },

        movePackLevelDown(index) {
            if (index >= this.editingPack.levels.length - 1) return;
            const item = this.editingPack.levels[index];
            this.editingPack.levels.splice(index, 1);
            this.editingPack.levels.splice(index + 1, 0, item);
        },

        addToPack(level) { const exists = this.editingPack.levels.find(l => l._id === level._id); if (!exists) this.editingPack.levels.push(level); },
        removeFromPack(index) { this.editingPack.levels.splice(index, 1); },

        getOriginalIndex(level) { return this.levelsList.findIndex(l => l._id === level._id) + 1; },
        toggleRecordSection() { this.showRecords = !this.showRecords; },
        addRecord() { this.formData.records.push({ user: '', link: '', percent: 100, hz: 60 }); },
        removeRecord(index) { this.formData.records.splice(index, 1); },

        async submitLevel() {
            this.isSubmitting = true; this.errorMessage = '';

            let levelData = { ...this.formData };
            const authors = levelData.author.split(',').map(a => a.trim()).filter(a => a);

            if (authors.length > 1) {
                levelData.creators = authors;
                levelData.author = authors;
            }

            const payload = {
                levelData: levelData,
                placement: this.formData.placement,
                type: this.store.listType
            };
            delete payload.levelData.placement;

            try {
                const res = await fetch('/api/add-level', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(payload) });
                if (res.status === 401) { this.logout(); return; }
                if (res.ok) {
                    this.successMessage = "Added!";
                    this.formData = { id: null, name: '', author: '', verifier: '', verification: '', percentToQualify: 100, password: 'free Copyable', records: [], creators: [], placement: null };
                    await this.refreshLevels();
                    this.isMobileSidebarOpen = false;
                } else {
                    this.errorMessage = "Failed";
                }
            } catch (e) { this.errorMessage = "Error"; } finally { this.isSubmitting = false; }
        },
        async deleteLevel(level) {
            if (!confirm(`Delete?`)) return;
            try {
                const res = await fetch('/api/delete-level', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        id: level._id,
                        type: this.store.listType
                    })
                });
                if (res.status === 401) { this.logout(); return; }
                await this.refreshLevels();
            } catch (e) { }
        },

        async openRulesModal() {
            this.showRulesModal = true;
            this.rulesMessage = '';
            this.rulesError = false;

            try {
                const res = await fetch(`/api/rules?type=${this.store.listType}`);
                const data = await res.json();
                let fetchedRules = data.rules;

                if (!Array.isArray(fetchedRules)) {
                    const sections = [];
                    if (fetchedRules.level_rules && fetchedRules.level_rules.length) {
                        sections.push({
                            header: "Level Submission Rules",
                            visible: true,
                            text: fetchedRules.level_rules.join('\n')
                        });
                    }
                    if (fetchedRules.record_rules && fetchedRules.record_rules.length) {
                        sections.push({
                            header: "Record Submission Rules",
                            visible: true,
                            text: fetchedRules.record_rules.join('\n')
                        });
                    }
                    if (sections.length === 0) {
                        sections.push({ header: "New Rule Section", visible: true, text: "" });
                    }
                    this.rulesSections = sections;
                } else {
                    this.rulesSections = fetchedRules.map(s => ({
                        header: s.header,
                        visible: s.visible !== false,
                        text: Array.isArray(s.rules) ? s.rules.join('\n') : ""
                    }));
                }
            } catch (e) {
                this.rulesSections = [{ header: "Error Loading Rules", visible: true, text: "" }];
            }
        },

        closeRulesModal() { this.showRulesModal = false; },

        addRuleSection() {
            this.rulesSections.push({ header: "New Section", visible: true, text: "" });
        },

        removeRuleSection(index) {
            if (confirm("Delete this rule section?")) {
                this.rulesSections.splice(index, 1);
            }
        },

        getPreviewLines(text) {
            return text ? text.split('\n').filter(line => line.trim() !== '') : [];
        },

        async saveRules() {
            this.isSavingRules = true; this.rulesMessage = ''; this.rulesError = false;

            const payload = this.rulesSections.map(s => ({
                header: s.header,
                visible: s.visible,
                rules: s.text.split('\n').filter(line => line.trim() !== '')
            }));

            try {
                const res = await fetch('/api/rules', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({
                        rules: payload,
                        type: this.store.listType
                    })
                });
                if (res.status === 401) { this.logout(); return; }
                if (res.ok) { this.rulesMessage = "Rules Updated Successfully!"; } else { this.rulesMessage = "Failed to save rules."; this.rulesError = true; }
            } catch (e) { this.rulesMessage = "Error connecting to server."; this.rulesError = true; } finally { this.isSavingRules = false; }
        },

        openEditRecordsModal(level) {
            this.editingRecordsLevel = level;
            this.editingLevel = JSON.parse(JSON.stringify(level));
            if (!this.editingLevel.records) this.editingLevel.records = [];
            
            if (window.innerWidth <= 1024) {
                this.isEditingLevelMobile = true;
                this.isMobileSidebarOpen = true;
            }
        },

        closeEditRecordsModal() {
            this.editingRecordsLevel = null;
            this.editRecordsMessage = '';
            this.editRecordsError = false;
            this.isMobileSidebarOpen = false;
            
            setTimeout(() => {
                this.isEditingLevelMobile = false;
                this.isMovingRankMobile = false;
            }, 350);
        },

        addEditingRecord() { this.editingLevel.records.push({ user: '', link: '', percent: 100, hz: 60 }); },
        async saveEditLevel() { this.isSavingRecords = true; this.editRecordsMessage = ''; this.editRecordsError = false; let newLevelData = { ...this.editingLevel }; delete newLevelData._id; delete newLevelData.rank; const authors = newLevelData.author.split(',').map(a => a.trim()).filter(a => a); if (authors.length > 1) { newLevelData.creators = authors; newLevelData.author = authors; } else { delete newLevelData.creators; } try { const res = await fetch('/api/update-records', { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify({ oldLevelId: this.editingRecordsLevel._id, newLevelData: newLevelData, type: this.store.listType }) }); if (res.status === 401) { this.logout(); return; } const data = await res.json(); if (res.ok) { this.editRecordsMessage = data.message || '✓ Level updated successfully'; this.editRecordsError = false; await new Promise(resolve => setTimeout(resolve, 1500)); await this.refreshLevels(); this.closeEditRecordsModal(); } else { this.editRecordsMessage = data.error || 'Failed to update level'; this.editRecordsError = true; } } catch (e) { this.editRecordsMessage = e.message || 'An error occurred'; this.editRecordsError = true; } finally { this.isSavingRecords = false; } },

        async openVipsModal() {
            this.showVipsModal = true;
            try {
                const res = await fetch('/api/editors?vip=true', { headers: this.getAuthHeaders() });
                const data = await res.json();
                this.vipsList = Array.isArray(data) ? data : [];
            } catch(e) {
                this.vipsList = [];
            }
        },
        closeVipsModal() { 
            this.showVipsModal = false; 
            this.vipInput = ''; 
        },
        addVip() {
            const val = this.vipInput.trim();
            if (val && !this.vipsList.includes(val)) {
                this.vipsList.push(val);
                this.vipInput = '';
            }
        },
        async saveVips() {
            this.isSavingVips = true;
            try {
                const res = await fetch('/api/editors?vip=true', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.vipsList)
                });
                if (res.ok) {
                    this.closeVipsModal();
                    await this.loadSubmissions();
                } else {
                    alert("Failed to save VIPs.");
                }
            } catch (e) {
                alert("Server error while saving VIPs.");
            } finally {
                this.isSavingVips = false;
            }
        }
    }
};