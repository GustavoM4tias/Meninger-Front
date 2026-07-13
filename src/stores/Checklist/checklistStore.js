// stores/Checklist/checklistStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/Checklist/api.js';

export const useChecklistStore = defineStore('checklist', () => {
    // ── Home ──
    const checklists = ref([]);
    const dashboard = ref({ summary: {}, checklists: [], myTasks: [] });
    const templates = ref([]);
    const statusesCatalog = ref([]);
    const users = ref([]);
    const enterprises = ref([]);
    // ── Autorização / aprovação ──
    const approvalMe = ref({ isApprover: false, profiles: [] }); // perfis do usuário atual
    const authProfiles = ref([]);        // catálogo de perfis (admin)
    const pendingApprovals = ref([]);    // tarefas aguardando minha decisão
    const approvalPrompt = ref(null);    // { taskId } quando um status barrado foi bloqueado

    // ── Detalhe atual ──
    const current = ref(null);   // { checklist, sections, statuses, tasks }
    const currentTask = ref(null); // { task, attachments, comments, activity, subtasks }
    const selectedIds = ref([]);   // seleção múltipla (edição em cascata)

    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    const statusById = computed(() => {
        const map = new Map();
        (current.value?.statuses || []).forEach((s) => map.set(s.id, s));
        return map;
    });

    function tasksOfSection(sectionId, parentId = null) {
        return (current.value?.tasks || [])
            .filter((t) => t.section_id === sectionId && (t.parent_task_id || null) === parentId)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    // ── Home ──
    async function loadHome() {
        loading.value = true; error.value = null;
        try {
            const [dash, tpls, me] = await Promise.all([
                api.dashboard(),
                api.templates(),
                api.approvalMe().catch(() => ({ isApprover: false, profiles: [] })),
            ]);
            dashboard.value = dash || { summary: {}, checklists: [], myTasks: [] };
            checklists.value = dash?.checklists || [];
            templates.value = tpls || [];
            approvalMe.value = me || { isApprover: false, profiles: [] };
        } catch (e) { error.value = e.message; } finally { loading.value = false; }
    }

    async function loadTemplates() {
        try { templates.value = await api.templates(); } catch (e) { error.value = e.message; }
        return templates.value;
    }

    async function loadUsers() {
        if (users.value.length) return users.value;
        try { users.value = await api.users(); } catch (e) { error.value = e.message; }
        return users.value;
    }

    async function loadEnterprises() {
        if (enterprises.value.length) return enterprises.value;
        try { enterprises.value = await api.enterprises(); } catch (e) { error.value = e.message; }
        return enterprises.value;
    }

    async function importExcel(file) {
        saving.value = true; error.value = null;
        try { return await api.importExcel(file); }
        finally { saving.value = false; }
    }

    async function loadStatusesCatalog(templateId) {
        try { statusesCatalog.value = await api.statuses(templateId); } catch (e) { error.value = e.message; }
        return statusesCatalog.value;
    }

    async function createFromTemplate(templateId, payload) {
        saving.value = true; error.value = null;
        try { return await api.instantiate(templateId, payload); }
        finally { saving.value = false; }
    }

    async function createBlank(payload) {
        saving.value = true; error.value = null;
        try { return await api.create(payload); }
        finally { saving.value = false; }
    }

    // ── Detalhe ──
    async function openChecklist(id) {
        loading.value = true; error.value = null;
        try { current.value = await api.get(id); }
        catch (e) { error.value = e.message; current.value = null; }
        finally { loading.value = false; }
        return current.value;
    }

    async function refreshCurrent() {
        if (!current.value?.checklist?.id) return;
        try { current.value = await api.get(current.value.checklist.id); } catch (e) { error.value = e.message; }
    }

    async function updateChecklist(payload) {
        if (!current.value?.checklist?.id) return;
        saving.value = true;
        try { current.value = await api.update(current.value.checklist.id, payload); }
        finally { saving.value = false; }
    }

    async function archiveChecklist(id) { return api.archive(id); }

    // ── Seções ──
    async function addSection(name) {
        if (!current.value?.checklist?.id) return;
        await api.addSection(current.value.checklist.id, { name });
        await refreshCurrent();
    }
    async function updateSection(id, payload) { await api.updateSection(id, payload); await refreshCurrent(); }
    async function removeSection(id) { await api.removeSection(id); await refreshCurrent(); }

    // ── Tarefas ──
    async function createTask(sectionId, payload = {}) {
        if (!current.value?.checklist?.id) return;
        saving.value = true;
        try {
            await api.createTask(current.value.checklist.id, { section_id: sectionId, ...payload });
            await refreshCurrent();
        } finally { saving.value = false; }
    }

    // Patch leve: aplica no estado local e persiste (sem refetch completo).
    async function patchTask(taskId, payload) {
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        if (t) Object.assign(t, payload);
        try {
            await api.updateTask(taskId, payload);
        } catch (e) { error.value = e.message; await refreshCurrent(); return; }
        // progresso depende do backend; atualiza cache do header sem travar a UI
        recomputeLocalProgress();
    }

    async function setTaskStatus(taskId, statusId) {
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        const prev = t ? t.status_id : null;
        if (t) { t.status_id = statusId; t.state_class = statusById.value.get(statusId)?.state_class || 'TODO'; }
        try {
            await api.setTaskStatus(taskId, statusId);
        } catch (e) {
            // Reverte o otimista e reage ao gating de autorização.
            if (t) { t.status_id = prev; t.state_class = statusById.value.get(prev)?.state_class || 'TODO'; }
            if (e.code === 'APPROVAL_REQUIRED') { approvalPrompt.value = { taskId }; return; }
            error.value = e.message; await refreshCurrent(); return;
        }
        recomputeLocalProgress();
    }

    async function setAssignee(taskId, userId) {
        const u = users.value.find((x) => x.id === userId);
        const assignee = u ? { id: u.id, username: u.username } : null;
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        if (t) { t.assignee_user_id = userId || null; t.assignee = assignee; }
        if (currentTask.value?.task?.id === taskId) {
            currentTask.value.task.assignee_user_id = userId || null;
            currentTask.value.task.assignee = assignee;
        }
        try { await api.updateTask(taskId, { assignee_user_id: userId || null }); }
        catch (e) { error.value = e.message; await refreshCurrent(); }
    }

    async function removeTask(taskId) {
        await api.removeTask(taskId);
        if (current.value) current.value.tasks = current.value.tasks.filter((t) => t.id !== taskId && t.parent_task_id !== taskId);
        recomputeLocalProgress();
    }

    async function nudge(taskId, message, channels) { return api.nudgeTask(taskId, message, channels); }

    // Salva a tarefa de uma vez (drawer bufferizado). patch pode trazer notify/channels.
    async function saveTask(taskId, patch) {
        saving.value = true;
        try {
            const res = await api.updateTask(taskId, patch);
            if (currentTask.value?.task?.id === taskId) currentTask.value = res;
            await refreshCurrent();
            return res;
        } finally { saving.value = false; }
    }

    async function deleteChecklist(id) { return api.remove(id); }
    async function cloneChecklist(id, title) { return api.clone(id, title); }

    // ── Autorização / aprovação ──
    async function loadAuthProfiles() {
        try { authProfiles.value = await api.authProfiles(); } catch (e) { error.value = e.message; }
        return authProfiles.value;
    }
    async function saveAuthProfile(payload) {
        const res = payload.id ? await api.updateAuthProfile(payload.id, payload) : await api.createAuthProfile(payload);
        await loadAuthProfiles();
        return res;
    }
    async function removeAuthProfile(id) { const r = await api.removeAuthProfile(id); await loadAuthProfiles(); return r; }
    async function loadApprovalMe() {
        try { approvalMe.value = await api.approvalMe(); } catch (e) { error.value = e.message; }
        return approvalMe.value;
    }
    async function loadPendingApprovals() {
        try { pendingApprovals.value = await api.pendingApprovals(); } catch (e) { error.value = e.message; }
        return pendingApprovals.value;
    }
    async function submitForApproval(taskId) {
        const res = await api.submitApproval(taskId);
        if (currentTask.value?.task?.id === taskId) currentTask.value = res;
        approvalPrompt.value = null;
        await refreshCurrent();
        return res;
    }
    async function decideApproval(taskId, payload) {
        const res = await api.decideApproval(taskId, payload);
        if (currentTask.value?.task?.id === taskId) currentTask.value = res;
        await refreshCurrent();
        await loadPendingApprovals();
        return res;
    }
    async function cancelApproval(taskId) {
        const res = await api.cancelApproval(taskId);
        if (currentTask.value?.task?.id === taskId) currentTask.value = res;
        await refreshCurrent();
        await loadPendingApprovals();
        return res;
    }
    function clearApprovalPrompt() { approvalPrompt.value = null; }

    // ── Seleção múltipla / edição em cascata ──
    function isSelected(id) { return selectedIds.value.includes(id); }
    function toggleSelect(id) {
        const i = selectedIds.value.indexOf(id);
        if (i >= 0) selectedIds.value.splice(i, 1); else selectedIds.value.push(id);
    }
    function selectMany(ids, on = true) {
        if (on) { const set = new Set(selectedIds.value); ids.forEach((id) => set.add(id)); selectedIds.value = [...set]; }
        else { const rm = new Set(ids); selectedIds.value = selectedIds.value.filter((id) => !rm.has(id)); }
    }
    function clearSelection() { selectedIds.value = []; }
    async function bulkApply(patch) {
        if (!selectedIds.value.length) return;
        saving.value = true;
        try { await api.bulkTasks([...selectedIds.value], patch); await refreshCurrent(); clearSelection(); }
        finally { saving.value = false; }
    }
    // Edição em lote sobre um conjunto explícito (ex.: seleção de uma seção).
    async function bulkApplyTo(ids, patch) {
        if (!ids?.length) return;
        saving.value = true;
        try { await api.bulkTasks([...ids], patch); await refreshCurrent(); selectMany(ids, false); }
        finally { saving.value = false; }
    }

    // ── Régua por checklist ──
    async function loadChecklistCobranca() {
        if (!current.value?.checklist?.id) return null;
        return api.getChecklistCobranca(current.value.checklist.id);
    }
    async function saveChecklistCobranca(payload) {
        if (!current.value?.checklist?.id) return null;
        const res = await api.saveChecklistCobranca(current.value.checklist.id, payload);
        if (current.value?.checklist) current.value.checklist.reminder_mode = res.mode;
        return res;
    }

    // ── Tarefa (drawer) ──
    async function openTask(id) {
        currentTask.value = null;
        try { currentTask.value = await api.getTask(id); } catch (e) { error.value = e.message; }
        return currentTask.value;
    }
    function closeTask() { currentTask.value = null; }

    async function addComment(taskId, payload) {
        const c = await api.addComment(taskId, payload);
        if (currentTask.value?.task?.id === taskId) currentTask.value.comments.push(c);
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        if (t) t.comments_count = (t.comments_count || 0) + 1;
        return c;
    }

    async function addAttachment(taskId, payload) {
        const a = await api.addAttachment(taskId, payload);
        if (currentTask.value?.task?.id === taskId) currentTask.value.attachments.unshift(a);
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        if (t) t.attachments_count = (t.attachments_count || 0) + 1;
        return a;
    }
    async function removeAttachment(id, taskId) {
        await api.removeAttachment(id);
        if (currentTask.value?.attachments) currentTask.value.attachments = currentTask.value.attachments.filter((a) => a.id !== id);
        const t = (current.value?.tasks || []).find((x) => x.id === taskId);
        if (t && t.attachments_count) t.attachments_count -= 1;
    }

    // Recalcula o anel de progresso localmente (espelha o backend).
    function recomputeLocalProgress() {
        if (!current.value) return;
        const tasks = current.value.tasks || [];
        const today = new Date().toISOString().slice(0, 10);
        let total = 0, done = 0, overdue = 0;
        for (const t of tasks) {
            const sc = t.state_class || (t.status_id ? statusById.value.get(t.status_id)?.state_class : 'TODO') || 'TODO';
            if (sc === 'CANCELLED') continue;
            total++;
            if (sc === 'DONE') done++;
            if (t.due_date && sc !== 'DONE' && String(t.due_date) < today) overdue++;
        }
        current.value.checklist.progress = { total, done, overdue, pct: total ? Math.round((done / total) * 100) : 0 };
    }

    // Reordena/move tarefas (drag-and-drop). items: [{ id, position, category?, section_id? }].
    // Aplica otimista no estado local e persiste; em erro, refaz do servidor.
    async function reorderTasks(items) {
        if (!items?.length) return;
        const byId = new Map(items.map((i) => [i.id, i]));
        for (const t of (current.value?.tasks || [])) {
            const it = byId.get(t.id);
            if (!it) continue;
            if ('position' in it) t.position = it.position;
            if ('category' in it) t.category = it.category;
            if ('section_id' in it) t.section_id = it.section_id;
        }
        try { await api.reorderTasks(items); }
        catch (e) { error.value = e.message; await refreshCurrent(); }
    }

    return {
        checklists, dashboard, templates, statusesCatalog, users, enterprises, current, currentTask, selectedIds,
        approvalMe, authProfiles, pendingApprovals, approvalPrompt,
        loading, saving, error, statusById, tasksOfSection,
        loadHome, loadTemplates, loadUsers, loadEnterprises, loadStatusesCatalog, createFromTemplate, createBlank, importExcel,
        openChecklist, refreshCurrent, updateChecklist, archiveChecklist,
        addSection, updateSection, removeSection,
        createTask, patchTask, setTaskStatus, setAssignee, removeTask, nudge, saveTask, deleteChecklist, cloneChecklist, reorderTasks,
        isSelected, toggleSelect, selectMany, clearSelection, bulkApply, bulkApplyTo,
        loadChecklistCobranca, saveChecklistCobranca,
        openTask, closeTask, addComment, addAttachment, removeAttachment,
        loadAuthProfiles, saveAuthProfile, removeAuthProfile, loadApprovalMe, loadPendingApprovals, submitForApproval, decideApproval, cancelApproval, clearApprovalPrompt,
    };
});
