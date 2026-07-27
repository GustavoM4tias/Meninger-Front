// stores/Microsoft/plannerStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/utils/Microsoft/apiPlanner';
import { readDefaultPref, writeDefaultPref } from '@/utils/Microsoft/defaultPref';

export const usePlannerStore = defineStore('planner', () => {

    // ── Estado ────────────────────────────────────────────────────────────────
    const groups        = ref([]);
    const selectedGroup = ref(null);
    const plans         = ref([]);
    const selectedPlan  = ref(null);
    const buckets       = ref([]);
    const tasks         = ref([]);

    const loadingGroups  = ref(false);
    const loadingPlan    = ref(false);
    const savingTask     = ref(false);
    const error          = ref(null);

    // ── Computed ──────────────────────────────────────────────────────────────

    // Tasks indexadas por bucketId para o kanban
    const tasksByBucket = computed(() => {
        const map = {};
        for (const b of buckets.value) map[b.id] = [];
        for (const t of tasks.value) {
            if (!map[t.bucketId]) map[t.bucketId] = [];
            map[t.bucketId].push(t);
        }
        // Ordenação por orderHint (string lexicográfica do Planner)
        for (const key of Object.keys(map)) {
            map[key].sort((a, b) => (a.orderHint ?? '').localeCompare(b.orderHint ?? ''));
        }
        return map;
    });

    const bucketsOrdered = computed(() =>
        [...buckets.value].sort((a, b) => (a.orderHint ?? '').localeCompare(b.orderHint ?? ''))
    );

    // ── Grupos + Plans ────────────────────────────────────────────────────────

    async function fetchGroups() {
        loadingGroups.value = true;
        error.value = null;
        try {
            groups.value = await api.getGroups();
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingGroups.value = false;
        }
    }

    async function selectGroup(group) {
        selectedGroup.value = group;
        selectedPlan.value  = null;
        buckets.value = [];
        tasks.value   = [];
        plans.value   = [];
        loadingGroups.value = true;
        try {
            plans.value = await api.getGroupPlans(group.id);
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingGroups.value = false;
        }
    }

    async function selectPlan(plan) {
        selectedPlan.value = plan;
        buckets.value = [];
        tasks.value   = [];
        await _loadPlanFull(plan.id);
    }

    // ── Plano padrão (abre sempre neste) ──────────────────────────────────────
    const defaultPlan = ref(readDefaultPref('planner')); // { groupId, groupName, planId, planTitle }

    const isCurrentDefault = computed(() =>
        !!defaultPlan.value && defaultPlan.value.planId === selectedPlan.value?.id
    );

    function setDefaultPlan() {
        if (!selectedGroup.value || !selectedPlan.value) return;
        defaultPlan.value = {
            groupId:   selectedGroup.value.id,
            groupName: selectedGroup.value.displayName || selectedGroup.value.name || '',
            planId:    selectedPlan.value.id,
            planTitle: selectedPlan.value.title || '',
        };
        writeDefaultPref('planner', defaultPlan.value);
    }

    function clearDefaultPlan() {
        defaultPlan.value = null;
        writeDefaultPref('planner', null);
    }

    /**
     * Carrega os grupos e, havendo plano padrão, já abre nele.
     * Se o grupo/plano padrão sumiu (acesso removido, plano excluído), a
     * preferência é descartada em silêncio.
     */
    async function initWithDefault() {
        if (!groups.value.length) await fetchGroups();
        const pref = defaultPlan.value;
        if (!pref || selectedPlan.value) return;

        const group = groups.value.find(g => g.id === pref.groupId);
        if (!group) { clearDefaultPlan(); return; }

        await selectGroup(group);
        const plan = plans.value.find(p => p.id === pref.planId);
        if (!plan) { clearDefaultPlan(); return; }
        await selectPlan(plan);
    }

    async function _loadPlanFull(planId) {
        loadingPlan.value = true;
        error.value = null;
        try {
            const data = await api.getPlanFull(planId);
            buckets.value = data.buckets;
            tasks.value   = data.tasks;
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingPlan.value = false;
        }
    }

    async function refreshPlan() {
        if (selectedPlan.value) await _loadPlanFull(selectedPlan.value.id);
    }

    // ── Plans CRUD ────────────────────────────────────────────────────────────

    async function createPlan(groupId, title) {
        const plan = await api.createPlan(groupId, title);
        plans.value.push(plan);
        return plan;
    }

    async function deletePlan(plan) {
        await api.deletePlan(plan.id, plan['@odata.etag']);
        plans.value = plans.value.filter(p => p.id !== plan.id);
        if (selectedPlan.value?.id === plan.id) {
            selectedPlan.value = null;
            buckets.value = [];
            tasks.value   = [];
        }
    }

    // ── Buckets CRUD ──────────────────────────────────────────────────────────

    async function createBucket(name) {
        if (!selectedPlan.value) return;
        const bucket = await api.createBucket({ planId: selectedPlan.value.id, name });
        buckets.value.push(bucket);
        return bucket;
    }

    async function renameBucket(bucket, name) {
        const updated = await api.updateBucket(bucket.id, { name, etag: bucket['@odata.etag'] });
        const idx = buckets.value.findIndex(b => b.id === bucket.id);
        if (idx !== -1) buckets.value[idx] = { ...buckets.value[idx], ...updated, name };
    }

    async function deleteBucket(bucket) {
        await api.deleteBucket(bucket.id, bucket['@odata.etag']);
        buckets.value = buckets.value.filter(b => b.id !== bucket.id);
        tasks.value   = tasks.value.filter(t => t.bucketId !== bucket.id);
    }

    // ── Tasks CRUD ────────────────────────────────────────────────────────────

    async function createTask(data) {
        savingTask.value = true;
        try {
            const task = await api.createTask({ planId: selectedPlan.value.id, ...data });
            tasks.value.push(task);
            return task;
        } finally {
            savingTask.value = false;
        }
    }

    async function updateTask(taskId, data) {
        savingTask.value = true;
        try {
            const updated = await api.updateTask(taskId, data);
            const idx = tasks.value.findIndex(t => t.id === taskId);
            if (idx !== -1) tasks.value[idx] = { ...tasks.value[idx], ...updated };
            return tasks.value[idx] ?? updated;
        } finally {
            savingTask.value = false;
        }
    }

    async function moveTask(task, newBucketId) {
        return updateTask(task.id, { bucketId: newBucketId, etag: task['@odata.etag'] });
    }

    async function toggleTaskComplete(task) {
        const newPercent = task.percentComplete === 100 ? 0 : 100;
        return updateTask(task.id, { percentComplete: newPercent, etag: task['@odata.etag'] });
    }

    async function deleteTask(task) {
        await api.deleteTask(task.id, task['@odata.etag']);
        tasks.value = tasks.value.filter(t => t.id !== task.id);
    }

    async function getTaskDetails(taskId) {
        return api.getTaskDetails(taskId);
    }

    async function updateTaskDetails(taskId, data) {
        return api.updateTaskDetails(taskId, data);
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    function reset() {
        groups.value = []; selectedGroup.value = null;
        plans.value  = []; selectedPlan.value  = null;
        buckets.value = []; tasks.value = [];
        error.value = null;
    }

    return {
        groups, selectedGroup, plans, selectedPlan,
        buckets, bucketsOrdered, tasks, tasksByBucket,
        loadingGroups, loadingPlan, savingTask, error,
        fetchGroups, selectGroup, selectPlan, refreshPlan,
        defaultPlan, isCurrentDefault, setDefaultPlan, clearDefaultPlan, initWithDefault,
        createPlan, deletePlan,
        createBucket, renameBucket, deleteBucket,
        createTask, updateTask, moveTask, toggleTaskComplete, deleteTask,
        getTaskDetails, updateTaskDetails,
        reset,
    };
});
