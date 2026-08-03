// stores/Comercial/EventPlan/eventPlanStore.js
//
// Estado do Plano de Eventos. A tela é uma só: o que muda é o papel do usuário
// (gestor propõe, Comercial valida, Marketing aceita), e o papel vem do backend
// em /permissions — nunca de localStorage.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/EventPlan/api.js';

export const PLAN_STATUS_LABEL = {
    draft: 'Rascunho',
    pending_comercial: 'Aguardando Comercial',
    pending_marketing: 'Aguardando Marketing',
    returned: 'Devolvido para ajuste',
    approved: 'Aprovado',
    closed: 'Mês fechado',
};

export const PRIORITY_LABEL = {
    ESSENCIAL: 'Essencial',
    IMPORTANTE: 'Importante',
    DESEJAVEL: 'Desejável',
};

export const useEventPlanStore = defineStore('eventPlan', () => {
    const plans = ref([]);
    const current = ref(null);
    // Consolidado do mês: agenda de todos os empreendimentos no escopo mais a
    // lista de compras agrupada por categoria. É a visão que o Marketing usa
    // para negociar volume em vez de item solto.
    const consolidated = ref(null);
    const permissions = ref({ isAdmin: false, decidableStages: [], canDecide: false });

    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    // Rascunho local das decisões enquanto o aprovador percorre a lista. Só vai
    // ao servidor quando ele confirma — é o que permite o contador ao vivo.
    // { [eventId]: { decision, comment, items: { [itemId]: {...} } } }
    const draftDecisions = ref({});

    const currentEvents = computed(() => current.value?.events || []);

    /** Etapa que este plano está aguardando, se for uma que o usuário decide. */
    const activeStage = computed(() => {
        const status = current.value?.status;
        if (status === 'pending_comercial') return 'COMERCIAL';
        if (status === 'pending_marketing') return 'MARKETING';
        return null;
    });

    const canDecideNow = computed(() => {
        const stage = activeStage.value;
        return Boolean(stage && permissions.value.decidableStages?.includes(stage));
    });

    const statusField = computed(() => (activeStage.value === 'MARKETING' ? 'marketing_status' : 'comercial_status'));

    /**
     * Fila prioritária primeiro (evento que acontece antes do prazo de aprovação
     * fechar), depois por prioridade, depois por data. É a ordem em que o
     * aprovador precisa ver.
     */
    const eventsForReview = computed(() => {
        const weight = { ESSENCIAL: 0, IMPORTANTE: 1, DESEJAVEL: 2 };
        return [...currentEvents.value].sort((a, b) => {
            if (a.priority_window !== b.priority_window) return a.priority_window ? -1 : 1;
            const w = (weight[a.priority] ?? 9) - (weight[b.priority] ?? 9);
            if (w) return w;
            return String(a.event_date).localeCompare(String(b.event_date));
        });
    });

    /**
     * Total que ficaria aprovado com as marcações atuais — o contador ao vivo do
     * topo da tela. Espelha a regra do servidor: item aprovado sem corte vale o
     * proposto; evento reprovado zera os itens dele.
     */
    const liveApprovedTotal = computed(() => {
        let total = 0;
        for (const ev of currentEvents.value) {
            const draft = draftDecisions.value[ev.id];
            const decision = draft?.decision ?? ev[statusField.value];
            if (decision === 'REJECTED' || decision === 'RETURNED') continue;
            if (decision === 'PENDING' && !draft) continue;

            for (const item of (ev.items || [])) {
                const itemDraft = draft?.items?.[item.id];
                const itemDecision = itemDraft?.decision ?? item[statusField.value];
                if (itemDecision === 'REJECTED' || itemDecision === 'RETURNED') continue;
                if (itemDecision === 'PENDING' && !itemDraft) continue;

                const cut = itemDraft?.approved_value;
                total += Number(
                    cut != null && cut !== ''
                        ? cut
                        : (item.approved_value ?? item.proposed_value ?? 0)
                );
            }
        }
        return Math.round(total * 100) / 100;
    });

    const proposedTotal = computed(() => Number(current.value?.totals?.proposed || 0));

    // ── Carregamento ─────────────────────────────────────────────────────────

    async function loadPermissions() {
        try {
            permissions.value = await api.permissions();
        } catch {
            permissions.value = { isAdmin: false, decidableStages: [], canDecide: false };
        }
        return permissions.value;
    }

    async function loadPlans(params = {}) {
        loading.value = true; error.value = null;
        try {
            const query = new URLSearchParams(
                Object.entries(params).filter(([, v]) => v !== '' && v != null)
            ).toString();
            plans.value = await api.list(query ? `?${query}` : '');
        } catch (e) { error.value = e.message; } finally { loading.value = false; }
        return plans.value;
    }

    async function loadConsolidated(month) {
        loading.value = true; error.value = null;
        try {
            consolidated.value = await api.consolidated(month);
        } catch (e) { error.value = e.message; consolidated.value = null; } finally { loading.value = false; }
        return consolidated.value;
    }

    async function loadPlan(id) {
        loading.value = true; error.value = null;
        draftDecisions.value = {};
        try {
            current.value = await api.get(id);
        } catch (e) { error.value = e.message; current.value = null; } finally { loading.value = false; }
        return current.value;
    }

    async function refresh() {
        if (current.value?.id) await loadPlan(current.value.id);
    }

    // ── Escrita do gestor ────────────────────────────────────────────────────

    async function createPlan(payload) {
        saving.value = true; error.value = null;
        try {
            const plan = await api.create(payload);
            await loadPlan(plan.id);
            return plan;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function saveEvent(payload) {
        saving.value = true; error.value = null;
        try {
            const planId = current.value.id;
            const saved = payload.id
                ? await api.updateEvent(planId, payload.id, payload)
                : await api.addEvent(planId, payload);
            await refresh();
            return saved;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function removeEvent(eventId) {
        saving.value = true; error.value = null;
        try {
            await api.removeEvent(current.value.id, eventId);
            await refresh();
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function saveItem(eventId, payload) {
        saving.value = true; error.value = null;
        try {
            const planId = current.value.id;
            const saved = payload.id
                ? await api.updateItem(planId, payload.id, payload)
                : await api.addItem(planId, eventId, payload);
            await refresh();
            return saved;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function removeItem(itemId) {
        saving.value = true; error.value = null;
        try {
            await api.removeItem(current.value.id, itemId);
            await refresh();
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function submitPlan() {
        saving.value = true; error.value = null;
        try {
            await api.submit(current.value.id);
            await refresh();
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    // ── Decisão ──────────────────────────────────────────────────────────────

    function setEventDecision(eventId, patch) {
        const previous = draftDecisions.value[eventId] || { items: {} };
        draftDecisions.value = {
            ...draftDecisions.value,
            [eventId]: { ...previous, ...patch, items: previous.items || {} },
        };
    }

    function setItemDecision(eventId, itemId, patch) {
        const previous = draftDecisions.value[eventId] || { items: {} };
        const items = { ...(previous.items || {}) };
        items[itemId] = { ...(items[itemId] || {}), ...patch };
        draftDecisions.value = { ...draftDecisions.value, [eventId]: { ...previous, items } };
    }

    function clearDecisions() {
        draftDecisions.value = {};
    }

    /** Monta o payload do lote no formato que o backend valida. */
    function buildDecisionPayload() {
        const events = [];
        for (const ev of currentEvents.value) {
            const draft = draftDecisions.value[ev.id];
            if (!draft?.decision) continue;
            events.push({
                id: ev.id,
                decision: draft.decision,
                comment: draft.comment || null,
                items: Object.entries(draft.items || {})
                    .filter(([, v]) => v?.decision)
                    .map(([itemId, v]) => ({
                        id: Number(itemId),
                        decision: v.decision,
                        comment: v.comment || null,
                        approved_value: v.approved_value === '' || v.approved_value == null
                            ? null
                            : Number(v.approved_value),
                        reclassify_necessity: Boolean(v.reclassify_necessity),
                    })),
            });
        }
        return { stage: activeStage.value, events };
    }

    async function submitDecisions() {
        saving.value = true; error.value = null;
        try {
            const result = await api.decide(current.value.id, buildDecisionPayload());
            clearDecisions();
            await refresh();
            return result;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function returnPlan(comment) {
        saving.value = true; error.value = null;
        try {
            const result = await api.decide(current.value.id, {
                stage: activeStage.value, return_plan: true, plan_comment: comment,
            });
            clearDecisions();
            await refresh();
            return result;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    async function closePlan(note) {
        saving.value = true; error.value = null;
        try {
            const result = await api.close(current.value.id, { confirmation: 'FECHAR', note });
            await refresh();
            return result;
        } catch (e) { error.value = e.message; throw e; } finally { saving.value = false; }
    }

    return {
        plans, current, consolidated, permissions, loading, saving, error, draftDecisions,
        currentEvents, eventsForReview, activeStage, canDecideNow, statusField,
        liveApprovedTotal, proposedTotal,
        loadPermissions, loadPlans, loadConsolidated, loadPlan, refresh, createPlan,
        saveEvent, removeEvent, saveItem, removeItem, submitPlan,
        setEventDecision, setItemDecision, clearDecisions, buildDecisionPayload,
        submitDecisions, returnPlan, closePlan,
    };
});
