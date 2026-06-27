// stores/Microsoft/todoStore.js
//
// Estado do módulo To Do PESSOAL. O Microsoft é a fonte de verdade do conteúdo;
// o backend devolve as tarefas de todas as listas em /todo/my, já enriquecidas
// com anexos locais e vínculo de reunião. Aqui só orquestramos a UI.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/utils/Microsoft/apiTodo';

const dueOf = (t) => (t?.dueDateTime?.dateTime ? new Date(t.dueDateTime.dateTime) : null);
const isDone = (t) => t?.status === 'completed';
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const useTodoStore = defineStore('todo', () => {

    // ── Estado ──────────────────────────────────────────────────────────────────
    const lists          = ref([]);     // listas do To Do
    const tasks          = ref([]);     // tarefas (flat de todas as listas) com listId/listName
    const selectedListId = ref(null);   // null = "Minhas tarefas" (todas)
    const search         = ref('');
    const showCompleted  = ref(false);

    const loading   = ref(false);
    const error     = ref(null);

    const openTask    = ref(null);      // detalhe completo p/ o drawer (com checklistItems, localAttachments)
    const loadingTask = ref(false);
    const savingTask  = ref(false);

    // ── Derivados ────────────────────────────────────────────────────────────────
    const defaultListId = computed(() =>
        lists.value.find((l) => l.wellknownListName === 'defaultList')?.id || lists.value[0]?.id || null
    );

    // Listas + contagem de tarefas em aberto.
    const listsWithCounts = computed(() =>
        lists.value.map((l) => ({
            ...l,
            openCount: tasks.value.filter((t) => t.listId === l.id && !isDone(t)).length,
        }))
    );

    // Tarefas visíveis conforme lista selecionada, busca e filtro de concluídas.
    const visibleTasks = computed(() => {
        const q = search.value.trim().toLowerCase();
        let arr = tasks.value;
        if (selectedListId.value) arr = arr.filter((t) => t.listId === selectedListId.value);
        if (!showCompleted.value) arr = arr.filter((t) => !isDone(t));
        if (q) arr = arr.filter((t) => (t.title || '').toLowerCase().includes(q));
        return [...arr].sort((a, b) => {
            // abertas antes de concluídas
            if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
            const da = dueOf(a); const db = dueOf(b);
            if (da && db) return da - db;     // por prazo
            if (da) return -1;
            if (db) return 1;
            // importância alta primeiro
            const imp = (x) => (x.importance === 'high' ? 0 : 1);
            return imp(a) - imp(b);
        });
    });

    // Cards do dashboard (escopados pela lista selecionada).
    const counts = computed(() => {
        const today = startOfToday();
        const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
        let scope = tasks.value;
        if (selectedListId.value) scope = scope.filter((t) => t.listId === selectedListId.value);
        const open = scope.filter((t) => !isDone(t));
        const out = { today: 0, overdue: 0, upcoming: 0, completed: 0, open: open.length };
        for (const t of scope) {
            if (isDone(t)) { out.completed++; continue; }
            const d = dueOf(t);
            if (!d) continue;
            if (d < today) out.overdue++;
            else if (d.toDateString() === today.toDateString()) out.today++;
            else if (d <= in7) out.upcoming++;
        }
        return out;
    });

    // ── Carregamento ──────────────────────────────────────────────────────────────
    async function loadMy() {
        loading.value = true; error.value = null;
        try {
            const data = await api.getMyTasks();
            lists.value = data.lists || [];
            tasks.value = data.tasks || [];
        } catch (err) {
            error.value = err.message || 'Falha ao carregar o To Do.';
        } finally {
            loading.value = false;
        }
    }

    function selectList(id) { selectedListId.value = id; }

    // Atualiza/insere uma tarefa na lista flat, preservando listId/listName.
    function _mergeTask(task, listId, listName) {
        const i = tasks.value.findIndex((t) => t.id === task.id);
        const enriched = { ...task, listId, listName };
        if (i !== -1) tasks.value[i] = { ...tasks.value[i], ...enriched };
        else tasks.value.push(enriched);
    }

    // ── Tarefas ──────────────────────────────────────────────────────────────────
    async function createTask(payload, listId = null) {
        const target = listId || selectedListId.value || defaultListId.value;
        if (!target) throw new Error('Nenhuma lista disponível.');
        savingTask.value = true;
        try {
            const task = await api.createTask(target, payload);
            const listName = lists.value.find((l) => l.id === target)?.displayName || '';
            _mergeTask(task, target, listName);
            return task;
        } finally { savingTask.value = false; }
    }

    async function toggleComplete(task) {
        const next = !isDone(task);
        // otimista
        const i = tasks.value.findIndex((t) => t.id === task.id);
        if (i !== -1) tasks.value[i] = { ...tasks.value[i], status: next ? 'completed' : 'notStarted' };
        try {
            const updated = await api.completeTask(task.listId, task.id, next);
            if (i !== -1) tasks.value[i] = { ...tasks.value[i], ...updated, listId: task.listId, listName: task.listName };
            if (openTask.value?.id === task.id) openTask.value = { ...openTask.value, status: updated.status };
        } catch (err) {
            if (i !== -1) tasks.value[i] = { ...tasks.value[i], status: next ? 'notStarted' : 'completed' }; // reverte
            throw err;
        }
    }

    async function patchTask(task, patch) {
        savingTask.value = true;
        try {
            const updated = await api.updateTask(task.listId, task.id, patch);
            _mergeTask(updated, task.listId, task.listName);
            if (openTask.value?.id === task.id) openTask.value = { ...openTask.value, ...updated };
            return updated;
        } finally { savingTask.value = false; }
    }

    async function removeTask(task) {
        await api.deleteTask(task.listId, task.id);
        tasks.value = tasks.value.filter((t) => t.id !== task.id);
        if (openTask.value?.id === task.id) closeDetail();
    }

    // ── Drawer / detalhe ───────────────────────────────────────────────────────────
    async function openDetail(task) {
        loadingTask.value = true;
        openTask.value = { ...task }; // mostra algo enquanto carrega
        try {
            const full = await api.getTask(task.listId, task.id);
            openTask.value = { ...full, listId: task.listId, listName: task.listName };
        } catch (err) {
            error.value = err.message;
        } finally { loadingTask.value = false; }
    }

    function closeDetail() { openTask.value = null; }

    async function _refreshOpen() {
        if (!openTask.value) return;
        const { listId, listName, id } = openTask.value;
        const full = await api.getTask(listId, id);
        openTask.value = { ...full, listId, listName };
        _mergeTask(full, listId, listName);
    }

    // ── Etapas (subtarefas) ─────────────────────────────────────────────────────────
    async function addStep(displayName) {
        if (!openTask.value || !displayName?.trim()) return;
        await api.createStep(openTask.value.listId, openTask.value.id, displayName.trim());
        await _refreshOpen();
    }
    async function toggleStep(step) {
        await api.updateStep(openTask.value.listId, openTask.value.id, step.id, { isChecked: !step.isChecked });
        await _refreshOpen();
    }
    async function removeStep(step) {
        await api.deleteStep(openTask.value.listId, openTask.value.id, step.id);
        await _refreshOpen();
    }

    // ── Anexos (URL / arquivo / SharePoint) ──────────────────────────────────────────
    async function addAttachment({ webUrl, displayName, kind }) {
        if (!openTask.value || !webUrl) return;
        await api.addLink(openTask.value.listId, openTask.value.id, { webUrl, displayName, kind });
        await _refreshOpen();
    }
    async function removeAttachment(linkId) {
        await api.deleteLink(openTask.value.listId, openTask.value.id, linkId);
        await _refreshOpen();
    }

    // ── Reunião / Teams ──────────────────────────────────────────────────────────────
    async function createMeeting({ subject, start, end, attendees }) {
        if (!openTask.value) return;
        await api.createMeeting(openTask.value.listId, openTask.value.id, { subject, start, end, attendees });
        await _refreshOpen();
    }
    async function linkMeeting(meeting) {
        if (!openTask.value) return;
        await api.linkMeeting(openTask.value.listId, openTask.value.id, {
            eventId: meeting.eventId, joinUrl: meeting.joinUrl, subject: meeting.subject,
        });
        await _refreshOpen();
    }
    async function unlinkMeeting() {
        if (!openTask.value) return;
        await api.unlinkMeeting(openTask.value.listId, openTask.value.id);
        await _refreshOpen();
    }
    function fetchAvailableMeetings(days = 14) {
        return api.availableMeetings(days);
    }

    // ── Listas ──────────────────────────────────────────────────────────────────────
    async function addList(displayName) {
        const list = await api.createList(displayName);
        lists.value.push(list);
        return list;
    }
    async function renameList(listId, displayName) {
        const updated = await api.updateList(listId, displayName);
        const i = lists.value.findIndex((l) => l.id === listId);
        if (i !== -1) lists.value[i] = { ...lists.value[i], ...updated, displayName };
    }
    async function removeList(listId) {
        await api.deleteList(listId);
        lists.value = lists.value.filter((l) => l.id !== listId);
        tasks.value = tasks.value.filter((t) => t.listId !== listId);
        if (selectedListId.value === listId) selectedListId.value = null;
    }

    function reset() {
        lists.value = []; tasks.value = []; selectedListId.value = null;
        search.value = ''; showCompleted.value = false; openTask.value = null; error.value = null;
    }

    return {
        // state
        lists, tasks, selectedListId, search, showCompleted, loading, error,
        openTask, loadingTask, savingTask,
        // derived
        defaultListId, listsWithCounts, visibleTasks, counts,
        // helpers (exportados p/ a view)
        dueOf, isDone,
        // actions
        loadMy, selectList,
        createTask, toggleComplete, patchTask, removeTask,
        openDetail, closeDetail,
        addStep, toggleStep, removeStep,
        addAttachment, removeAttachment,
        createMeeting, linkMeeting, unlinkMeeting, fetchAvailableMeetings,
        addList, renameList, removeList,
        reset,
    };
});
