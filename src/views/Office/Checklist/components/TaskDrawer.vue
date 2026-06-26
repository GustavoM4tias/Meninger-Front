<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useToast } from 'vue-toastification';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import { fieldBase, labelBase } from '@/components/UI/_classes';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import UserAvatar from '@/components/UI/UserAvatar.vue';
import UserAvatarStack from '@/components/UI/UserAvatarStack.vue';
import UserInfoModal from '@/components/UI/UserInfoModal.vue';
import AttachmentViewerModal from './AttachmentViewerModal.vue';
import AttachmentPicker from '@/views/Office/Comercial/Conditions/components/AttachmentPicker.vue';
import ImageAnnotator from './ImageAnnotator.vue';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const props = defineProps({ taskId: { type: Number, required: true } });
const emit = defineEmits(['close', 'changed']);

const store = useChecklistStore();
const toast = useToast();
const microsoftStore = useMicrosoftStore();
const auth = useAuthStore();
const myId = computed(() => auth.user?.id ?? null);

const loading = ref(false);
const saving = ref(false);
const commentText = ref('');

// Edição bufferizada: nada é persistido (nem notificado) até clicar em Salvar.
const EDITABLE = ['title', 'status_id', 'priority', 'assignee_user_ids', 'assignee_label', 'value', 'value_kind', 'contracted_at', 'due_date', 'description', 'category', 'checklist_items', 'needs_authorization', 'auth_profile_ids'];
const draft = ref({});
const loaded = ref({}); // baseline normalizado p/ diff confiável

const data = computed(() => store.currentTask);
const statuses = computed(() => store.current?.statuses || []);

// Notificação por tarefa (vale para o Salvar e para o Cobrar).
const notifyOn = ref(false);
const channels = ref({ inapp: true, email: true, whatsapp: false });

watch(() => props.taskId, load, { immediate: true });
onMounted(() => {
    if (!store.users.length) store.loadUsers();
    if (!microsoftStore.connected) microsoftStore.fetchStatus?.(); // habilita a aba SharePoint do AttachmentPicker
    if (!store.authProfiles.length) store.loadAuthProfiles();      // opções de perfis p/ a flag de autorização
    if (!store.approvalMe?.profiles?.length) store.loadApprovalMe(); // p/ saber se posso decidir
});

// Normaliza cada campo para um valor canônico (datas "" -> null; valor número-ou-null;
// ids número-ou-null). Sem isto, "" em campo numérico quebra o save no Postgres e a
// data editada se perde junto.
function norm(k, v) {
    if (k === 'needs_authorization') return !!v;
    if (k === 'auth_profile_ids' || k === 'assignee_user_ids') return Array.isArray(v) ? [...v].map(Number).filter(Boolean).sort((a, b) => a - b) : [];
    if (k === 'checklist_items') return Array.isArray(v) ? v : [];
    if (v === '' || v === undefined) return null;
    if (k === 'value') { const n = Number(v); return (v === null || Number.isNaN(n)) ? null : n; }
    if (k === 'status_id' || k === 'assignee_user_id') { return (v === null) ? null : Number(v); }
    return v ?? null;
}
function currentNorm() { const o = {}; for (const k of EDITABLE) o[k] = norm(k, draft.value[k]); return o; }
const changedKeys = computed(() => { const c = currentNorm(); return EDITABLE.filter((k) => JSON.stringify(c[k]) !== JSON.stringify(loaded.value[k])); });
const dirty = computed(() => changedKeys.value.length > 0);

async function load() {
    loading.value = true;
    try {
        await store.openTask(props.taskId);
        const t = store.currentTask?.task || {};
        draft.value = EDITABLE.reduce((o, k) => { o[k] = t[k] ?? null; return o; }, {});
        for (const k of ['assignee_user_ids', 'auth_profile_ids', 'checklist_items']) if (!Array.isArray(draft.value[k])) draft.value[k] = [];
        // Contratação não preenchida = data de criação da tarefa (baseline, não marca "não salva").
        if (!draft.value.contracted_at) { const created = whenOf(t); if (created && dayjs(created).isValid()) draft.value.contracted_at = dayjs(created).format('YYYY-MM-DD'); }
        loaded.value = currentNorm();
    } finally { loading.value = false; }
}

async function save() {
    // Concluir é terminal: avisa que depois não volta para outras etapas.
    if (!doneWarned.value && changedKeys.value.includes('status_id') && isDoneStatus(draft.value.status_id) && !isDoneStatus(loaded.value.status_id)) {
        confirmState.value = {
            title: 'Concluir tarefa',
            message: 'Ao concluir, a tarefa NÃO poderá voltar para outras etapas depois. Deseja concluir?',
            confirmLabel: 'Concluir', variant: 'primary', icon: 'fas fa-flag-checkered',
            onConfirm: async () => { doneWarned.value = true; try { await save(); } finally { doneWarned.value = false; } },
        };
        return;
    }
    saving.value = true;
    try {
        const c = currentNorm();
        const patch = {};
        for (const k of changedKeys.value) patch[k] = c[k];          // só o que mudou
        if (notifyOn.value) { patch.notify = true; patch.channels = { ...channels.value }; }
        else if (Object.keys(patch).length) patch.notify = false;
        // Permite salvar sem alterações quando o objetivo é só notificar (switch ligado).
        if (!Object.keys(patch).length) { toast.info('Sem alterações para salvar.'); return; }
        await store.saveTask(props.taskId, patch);
        loaded.value = c;
        emit('changed');
        toast.success(notifyOn.value ? 'Tarefa salva e responsável notificado.' : 'Tarefa salva.');
    } catch (e) {
        if (e.code === 'APPROVAL_REQUIRED') {
            confirmState.value = {
                title: 'Autorização necessária',
                message: 'Esta tarefa precisa passar por autorização antes de avançar para esse status. Enviar para aprovação agora?',
                confirmLabel: 'Enviar para aprovação',
                variant: 'primary', icon: 'fas fa-paper-plane',
                onConfirm: async () => { await store.submitForApproval(props.taskId); await load(); emit('changed'); },
            };
        } else if (e.code === 'DONE_LOCKED') { draft.value.status_id = loaded.value.status_id; toast.error(e.message); }
        else { toast.error(e.message); }
    }
    finally { saving.value = false; }
}
async function saveAndClose() { await save(); if (!dirty.value) emit('close'); }

function tryClose() { if (dirty.value && !confirm('Há alterações não salvas. Descartar?')) return; emit('close'); }
function onBackdrop() { if (dirty.value) { toast.info('Salve ou descarte as alterações primeiro.'); return; } emit('close'); }

// Menções: autocomplete (aceita nome com espaço) + destaque só de usuários REAIS.
const mentionMatches = ref([]);
const showMention = ref(false);
function onCommentInput() {
    const m = commentText.value.match(/@([^@]*)$/);   // tudo após o último @ (permite espaço)
    if (m) {
        const q = m[1].trim().toLowerCase();
        mentionMatches.value = (store.users || []).filter((u) => (u.username || '').toLowerCase().includes(q)).slice(0, 6);
        showMention.value = mentionMatches.value.length > 0;
    } else { showMention.value = false; }
}
function pickMention(u) {
    commentText.value = commentText.value.replace(/@([^@]*)$/, '@' + u.username + ' ');
    showMention.value = false;
}
// Varre o texto casando NOMES COMPLETOS de usuários (o mais longo primeiro). Só
// pessoas reais viram menção (azul) e entram na notificação — "@brun" solto não conta.
function scanMentions(body) {
    const text = body || '';
    const sorted = [...(store.users || [])].sort((a, b) => (b.username?.length || 0) - (a.username?.length || 0));
    const segments = [];
    const ids = new Set();
    const pushText = (ch) => { const last = segments[segments.length - 1]; if (last && !last.mention) last.text += ch; else segments.push({ text: ch, mention: false }); };
    let i = 0;
    while (i < text.length) {
        if (text[i] === '@') {
            const u = sorted.find((x) => x.username && text.slice(i + 1, i + 1 + x.username.length).toLowerCase() === x.username.toLowerCase());
            if (u) { segments.push({ text: '@' + u.username, mention: true }); ids.add(u.id); i += 1 + u.username.length; continue; }
        }
        pushText(text[i]); i++;
    }
    return { segments, ids: Array.from(ids) };
}
function renderBody(body) { return scanMentions(body).segments; }
async function sendComment() {
    const text = commentText.value.trim();
    if (!text) return;
    try {
        await store.addComment(props.taskId, { body: text, mentioned_user_ids: scanMentions(text).ids });
        commentText.value = ''; showMention.value = false;
    } catch (e) { toast.error(e.message); }
}
// ── Confirmação genérica (excluir tarefa / anexo) via modal. ──
const confirmState = ref(null); // { title, message, confirmLabel, onConfirm }
function confirmCancel() { confirmState.value = null; }
async function confirmOk() {
    const fn = confirmState.value?.onConfirm;
    confirmState.value = null;
    if (fn) { try { await fn(); } catch (e) { toast.error(e.message); } }
}
function doDelete() {
    confirmState.value = {
        title: 'Excluir tarefa',
        message: 'Excluir esta tarefa e suas subtarefas? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir tarefa',
        onConfirm: async () => { await store.removeTask(props.taskId); emit('changed'); emit('close'); },
    };
}
function askRemoveAttachment(a) {
    confirmState.value = {
        title: 'Excluir anexo',
        message: `Remover "${a.file_name}"? O vínculo do arquivo com a tarefa será desfeito.`,
        confirmLabel: 'Excluir anexo',
        onConfirm: () => store.removeAttachment(a.id, props.taskId),
    };
}

// ── Categoria: escolher existente ou criar nova. ──
const existingCategories = computed(() => {
    const set = new Set();
    (store.current?.tasks || []).forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set).sort();
});
const catMode = ref('existing');

// ── Anexos: vincular (URL/upload/SharePoint via AttachmentPicker) + mini-preview + visualizador. ──
const attachUrl = ref('');
const viewerAtt = ref(null);
function openViewer(a) { viewerAtt.value = a; }
function fileNameFromUrl(u) {
    try { const seg = decodeURIComponent(new URL(u, window.location.origin).pathname).split('/').filter(Boolean).pop(); return (seg || u).split('?')[0]; }
    catch { return u; }
}
function kindFromUrl(u) {
    if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(u)) return 'IMAGE';
    if (/sharepoint\.com|onedrive|1drv\.ms|drive\.google|docs\.google/i.test(u)) return 'LINK';
    if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?|$)/i.test(u)) return 'FILE';
    return 'LINK';
}
async function addAttach(explicitUrl) {
    if (locked.value) return;
    const url = (typeof explicitUrl === 'string' ? explicitUrl : attachUrl.value || '').trim();
    if (!url) return;
    try {
        await store.addAttachment(props.taskId, { url, file_name: fileNameFromUrl(url), kind: kindFromUrl(url) });
        attachUrl.value = '';
        toast.success('Anexo adicionado.');
        emit('changed');
    } catch (e) { toast.error(e.message); }
}
// Vindo do AttachmentPicker (upload/URL/SharePoint): URL completa = adiciona na hora.
// Digitação parcial não dispara (não casa http(s)://) — aí usa o botão "Adicionar".
function onAttachPicked(url) {
    attachUrl.value = url || '';
    // URL completa (http(s)://host.tld/...) = veio do modal (upload/SharePoint/confirmar) → adiciona já.
    if (/^https?:\/\/\S+\.\S+/i.test((url || '').trim())) addAttach(url);
}
function isImg(a) { return a.kind === 'IMAGE' || (a.mime_type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(a.url || ''); }
function attIcon(a) {
    const u = a.url || '';
    if (a.kind === 'LINK') return 'fas fa-link text-sky-500';
    if (/\.pdf(\?|$)/i.test(u)) return 'fas fa-file-pdf text-red-500';
    if (/\.docx?(\?|$)/i.test(u)) return 'fas fa-file-word text-blue-600';
    if (/\.xlsx?(\?|$)/i.test(u)) return 'fas fa-file-excel text-emerald-600';
    if (/\.pptx?(\?|$)/i.test(u)) return 'fas fa-file-powerpoint text-orange-500';
    return 'fas fa-file text-ink-subtle';
}

// Histórico começa recolhido (abre ao clicar).
const historyOpen = ref(false);

// ── Status/prioridade p/ os badges do cabeçalho. ──
const PRIORITY_PT = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };
const PRIORITY_VARIANT = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' };
const currentStatus = computed(() => statuses.value.find((s) => s.id === Number(draft.value.status_id)) || null);
// Concluído (state_class DONE) é terminal — usado p/ avisar antes de salvar.
const doneWarned = ref(false);
function isDoneStatus(id) { return statuses.value.find((s) => s.id === Number(id))?.state_class === 'DONE'; }
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

// ── Histórico/atividade legível (com from → to dos campos alterados). ──
const ACTION_PT = {
    'task.created': { label: 'criou a tarefa', icon: 'fas fa-plus' },
    'task.updated': { label: 'atualizou', icon: 'fas fa-pen' },
    'status_changed': { label: 'mudou o status', icon: 'fas fa-flag' },
    'comment.added': { label: 'comentou', icon: 'fas fa-comment' },
    'comment.annotated': { label: 'marcou uma imagem', icon: 'fas fa-pen-nib' },
    'comment.removed': { label: 'removeu um comentário', icon: 'fas fa-comment-slash' },
    'attachment.added': { label: 'anexou arquivo', icon: 'fas fa-paperclip' },
    'attachment.annotated': { label: 'anexou uma marcação', icon: 'fas fa-pen-nib' },
    'attachment.removed': { label: 'removeu um anexo', icon: 'fas fa-link-slash' },
    'nudge.sent': { label: 'cobrou a entrega', icon: 'fas fa-bell' },
    'reminder.sent': { label: 'enviou um lembrete', icon: 'fas fa-clock' },
    'approval.requested': { label: 'enviou para aprovação', icon: 'fas fa-paper-plane' },
    'approval.approved': { label: 'aprovou', icon: 'fas fa-check' },
    'approval.rejected': { label: 'reprovou', icon: 'fas fa-xmark' },
    'approval.cancelled': { label: 'voltou para ajuste (cancelou a autorização)', icon: 'fas fa-rotate-left' },
    'task.removed': { label: 'excluiu a tarefa', icon: 'fas fa-trash' },
    'task.bulk_updated': { label: 'edição em lote', icon: 'fas fa-layer-group' },
    'task.bulk_removed': { label: 'exclusão em lote', icon: 'fas fa-layer-group' },
    'checklist.created': { label: 'criou o checklist', icon: 'fas fa-list-check' },
    'checklist.updated': { label: 'atualizou o checklist', icon: 'fas fa-pen' },
    'checklist.archived': { label: 'arquivou o checklist', icon: 'fas fa-box-archive' },
    'checklist.imported': { label: 'importou do Excel', icon: 'fas fa-file-import' },
    'section.created': { label: 'criou uma seção', icon: 'fas fa-folder-plus' },
    'section.removed': { label: 'removeu uma seção', icon: 'fas fa-folder-minus' },
};
const FIELD_PT = { title: 'título', status_id: 'status', priority: 'prioridade', value: 'valor', value_kind: 'recorrência', due_date: 'prazo', contracted_at: 'contratação', started_at: 'início', assignee_user_id: 'responsável', assignee_user_ids: 'responsáveis', assignee_label: 'responsável', checklist_items: 'subtarefas', description: 'anotações', category: 'categoria', section_id: 'seção', parent_task_id: 'subtarefa', position: 'ordem' };
function fmtFieldVal(field, v) {
    if (v === null || v === undefined || v === '') return '—';
    if (['due_date', 'contracted_at', 'started_at'].includes(field)) return dayjs(v).format('DD/MM/YYYY');
    if (field === 'status_id') return statuses.value.find((s) => s.id === Number(v))?.label || ('#' + v);
    if (field === 'assignee_user_id') return store.users.find((u) => u.id === Number(v))?.username || ('#' + v);
    if (field === 'assignee_user_ids') return (Array.isArray(v) ? v : []).map((id) => store.users.find((u) => u.id === Number(id))?.username || ('#' + id)).join(', ') || '—';
    if (field === 'checklist_items') return (Array.isArray(v) ? v.length : 0) + ' subtarefa(s)';
    if (field === 'priority') return PRIORITY_PT[v] || v;
    if (field === 'value') return brl(v);
    if (field === 'value_kind') return v === 'MONTHLY' ? 'Mensal' : 'Avulso';
    const s = String(v); return s.length > 32 ? s.slice(0, 32) + '…' : s;
}
function actionMeta(a) { return ACTION_PT[a] || { label: a, icon: 'fas fa-circle' }; }
function changeLines(ev) {
    const ch = ev.meta?.changes;
    if (!ch || typeof ch !== 'object') return [];
    return Object.keys(ch).map((f) => ({ field: FIELD_PT[f] || f, from: fmtFieldVal(f, ch[f].from), to: fmtFieldVal(f, ch[f].to) }));
}
function fallbackFields(ev) {
    if (ev.action !== 'task.updated' || !ev.meta?.fields?.length) return '';
    return ' (' + [...new Set(ev.meta.fields.map((f) => FIELD_PT[f] || f))].join(', ') + ')';
}
// created_at chega como camelCase (underscored:true → atributo createdAt) no plain
// do Sequelize; o fallback evita dayjs(undefined) exibir a data/hora ATUAL.
function whenOf(o) { return o?.created_at || o?.createdAt || null; }
function fmtWhen(o) { const d = whenOf(o); return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'; }

// ── Comentários como chat: minhas à direita, de outros à esquerda, cor por autor. ──
const comments = computed(() => data.value?.comments || []);
function isMine(c) { const id = c.user_id ?? c.author?.id; return myId.value != null && id === myId.value; }
const AUTHOR_COLORS = ['text-sky-500', 'text-emerald-500', 'text-violet-500', 'text-amber-500', 'text-pink-500', 'text-teal-500', 'text-indigo-500', 'text-rose-500'];
function authorColor(c) { const id = Number(c.user_id ?? c.author?.id ?? 0) || 0; return AUTHOR_COLORS[Math.abs(id) % AUTHOR_COLORS.length]; }

// ── Autorização / aprovação ──
const locked = computed(() => data.value?.task?.approval_status === 'PENDING');
const approvalStatus = computed(() => data.value?.task?.approval_status || 'NONE');
const approvalRound = computed(() => data.value?.task?.approval_round || 0);
const requiredProfiles = computed(() => data.value?.authProfiles || []);
const approvals = computed(() => data.value?.approvals || []);
const myProfileIds = computed(() => (store.approvalMe?.profiles || []).map((p) => p.id));
const APPROVAL_BADGE = { PENDING: { l: 'Em aprovação', v: 'warning' }, APPROVED: { l: 'Aprovada', v: 'success' }, REJECTED: { l: 'Reprovada · em ajuste', v: 'danger' } };

// Catálogo de perfis p/ o seletor da flag.
const profileNames = computed(() => (store.authProfiles || []).filter((p) => p.is_active !== false).map((p) => p.name));
const profileById = (id) => (store.authProfiles || []).find((p) => p.id === id) || requiredProfiles.value.find((p) => p.id === id);
const selectedProfileNames = computed(() => (draft.value.auth_profile_ids || []).map((id) => profileById(id)?.name).filter(Boolean));
function onProfilesChange(names) {
    draft.value.auth_profile_ids = names.map((n) => (store.authProfiles || []).find((p) => p.name === n)?.id).filter(Boolean);
}

// Progresso por perfil no round atual (perfil OK = TODOS os membros aprovaram).
function profileProgress(p) {
    const members = (p.user_ids || []).map(Number);
    const round = approvalRound.value;
    const latest = new Map();
    approvals.value.filter((a) => a.profile_id === p.id && a.round === round).slice().reverse().forEach((a) => latest.set(Number(a.user_id), a));
    const byUser = members.map((uid) => ({ userId: uid, username: store.users.find((u) => u.id === uid)?.username || ('#' + uid), decision: latest.get(uid)?.decision || null, comment: latest.get(uid)?.comment || null }));
    const approved = byUser.filter((m) => m.decision === 'APPROVED').length;
    const rejected = byUser.some((m) => m.decision === 'REJECTED');
    return { byUser, approved, total: members.length, rejected, done: !rejected && members.length > 0 && approved === members.length };
}
function canDecide(p) {
    if (approvalStatus.value !== 'PENDING' || !myProfileIds.value.includes(p.id)) return false;
    const round = approvalRound.value;
    return !approvals.value.some((a) => a.profile_id === p.id && a.round === round && Number(a.user_id) === Number(myId.value));
}

const decideComment = ref({});
async function decide(profileId, decision) {
    try {
        await store.decideApproval(props.taskId, { profileId, decision, comment: decideComment.value[profileId] || '' });
        decideComment.value[profileId] = '';
        toast.success(decision === 'APPROVED' ? 'Aprovado.' : 'Reprovado - tarefa volta para ajuste.');
        emit('changed');
    } catch (e) { toast.error(e.message); }
}

// Marcação de imagem (proofing)
const annotateAtt = ref(null);

// Permissão: usuário normal edita só etapa, anotações, subtarefas, anexos e comentários.
const isAdmin = computed(() => auth.user?.role === 'admin' || (typeof auth.hasRole === 'function' && auth.hasRole('admin')));

// Voltar para ajuste (cancela o pedido de autorização) — executor/dono/admin, com aviso.
const iAmAssignee = computed(() => {
    const t = data.value?.task; if (!t) return false;
    const ids = (t.assignee_user_ids?.length ? t.assignee_user_ids : (t.assignee_user_id ? [t.assignee_user_id] : [])).map(Number);
    return ids.includes(Number(myId.value));
});
const canCancelApproval = computed(() => locked.value && (isAdmin.value || iAmAssignee.value));
function askCancelApproval() {
    confirmState.value = {
        title: 'Voltar para ajuste',
        message: 'Isto vai CANCELAR o pedido de autorização atual e devolver a tarefa para ajuste. As aprovações deste envio são descartadas e, para concluir, você precisará enviar novamente. Deseja continuar?',
        confirmLabel: 'Cancelar autorização e ajustar',
        variant: 'primary', icon: 'fas fa-rotate-left',
        onConfirm: async () => { await store.cancelApproval(props.taskId); await load(); emit('changed'); },
    };
}

// Múltiplos responsáveis (multiselect de usuários) — somente usuários, sem texto livre.
const userNames = computed(() => (store.users || []).map((u) => u.username));
const selectedAssigneeNames = computed(() => (draft.value.assignee_user_ids || []).map((id) => store.users.find((u) => u.id === id)?.username).filter(Boolean));
function onAssigneesChange(names) {
    draft.value.assignee_user_ids = names.map((n) => store.users.find((u) => u.username === n)?.id).filter(Boolean);
}
// Responsáveis resolvidos p/ as bolinhas (avatar). Usa o draft p/ refletir a edição.
const assignees = computed(() => {
    const ids = (draft.value.assignee_user_ids || []).length
        ? draft.value.assignee_user_ids
        : (data.value?.task?.assignee_user_id ? [data.value.task.assignee_user_id] : []);
    return ids.map((id) => (store.users || []).find((u) => u.id === Number(id))).filter(Boolean);
});
// Modal de info do colaborador (clique na bolinha) — estilo organograma.
const infoUser = ref(null);

// Subtarefas (checklist dentro da tarefa) — acompanha a evolução.
const newItemText = ref('');
function addChecklistItem() {
    const text = (newItemText.value || '').trim();
    if (!text) return;
    if (!Array.isArray(draft.value.checklist_items)) draft.value.checklist_items = [];
    draft.value.checklist_items.push({ text, done: false });
    newItemText.value = '';
}
function toggleItem(i) { const it = draft.value.checklist_items?.[i]; if (it) it.done = !it.done; }
function removeItem(i) { draft.value.checklist_items.splice(i, 1); }
const itemsDone = computed(() => (draft.value.checklist_items || []).filter((i) => i.done).length);

const fieldCls = `${fieldBase} px-3 py-2 text-sm rounded-lg`;
</script>

<template>
    <div class="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm animate-fade-in" @mousedown.self="onBackdrop">
        <div class="bg-surface-raised border-l border-line w-full max-w-lg h-full overflow-hidden shadow-overlay flex flex-col animate-slide-up">

            <!-- Cabeçalho -->
            <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    
                <!-- Título + badges -->
                <div class="mt-2">
                    <input v-model="draft.title" placeholder="Título da tarefa" :disabled="locked || !isAdmin"
                        class="w-full text-lg font-semibold bg-transparent text-ink focus:outline-none border-b border-transparent focus:border-accent-ring transition-colors disabled:opacity-70" />
                    <div class="flex items-center gap-1.5 mt-1">
                        <Badge v-if="currentStatus" variant="accent" size="sm" dot>{{ currentStatus.label }}</Badge>
                        <Badge :variant="PRIORITY_VARIANT[draft.priority] || 'neutral'" size="sm">{{ PRIORITY_PT[draft.priority] || draft.priority }}</Badge>
                    </div>
                </div>
                    <Badge class="truncate" v-if="dirty" variant="warning" size="sm">não salva</Badge>
                </div>
                <div class="flex items-center gap-1">
                    <button @click="doDelete" title="Excluir tarefa" class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition"><i class="fas fa-trash text-sm"></i></button>
                    <button @click="tryClose" title="Fechar" class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition"><i class="fas fa-xmark"></i></button>
                </div>
            </div>

            <div v-if="loading || !data?.task" class="p-10 text-center text-ink-subtle"><i class="fas fa-spinner fa-spin text-lg"></i></div>

            <div v-else class="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">

                <!-- Responsáveis (bolinhas; clique abre o card do colaborador) -->
                <div v-if="assignees.length" class="flex items-center gap-2.5">
                    <span class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Responsáveis</span>
                    <UserAvatarStack :users="assignees" :size="30" @select="infoUser = $event" />
                </div>

                <!-- Painel de autorização / aprovação -->
                <div v-if="approvalStatus !== 'NONE'" class="rounded-xl border p-3.5"
                    :class="approvalStatus === 'REJECTED' ? 'border-red-500/30 bg-red-500/5' : approvalStatus === 'APPROVED' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-user-shield text-ink-muted"></i>
                        <span class="text-sm font-semibold text-ink">Autorização</span>
                        <Badge :variant="APPROVAL_BADGE[approvalStatus]?.v || 'neutral'" size="sm">{{ APPROVAL_BADGE[approvalStatus]?.l || approvalStatus }}</Badge>
                        <span v-if="locked" class="ml-auto text-[11px] text-ink-subtle"><i class="fas fa-lock"></i> edição bloqueada</span>
                    </div>
                    <div class="space-y-2.5">
                        <div v-for="p in requiredProfiles" :key="p.id" class="rounded-lg bg-surface-raised border border-line p-2.5">
                            <div class="flex items-center gap-2 mb-1.5">
                                <span class="text-sm font-medium text-ink">{{ p.name }}</span>
                                <span v-if="profileProgress(p).rejected" class="text-xs text-red-500 font-semibold">reprovado</span>
                                <span v-else-if="profileProgress(p).done" class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">aprovado</span>
                                <span class="ml-auto text-[11px] text-ink-subtle">{{ profileProgress(p).approved }}/{{ profileProgress(p).total }} aprovaram</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                <span v-for="m in profileProgress(p).byUser" :key="m.userId"
                                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] border"
                                    :class="m.decision === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : m.decision === 'REJECTED' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' : 'text-ink-subtle border-line'"
                                    :title="m.comment || ''">
                                    <i :class="m.decision === 'APPROVED' ? 'fas fa-check' : m.decision === 'REJECTED' ? 'fas fa-xmark' : 'far fa-clock'"></i>{{ m.username }}
                                </span>
                            </div>
                            <!-- Ação do aprovador -->
                            <div v-if="canDecide(p)" class="mt-2 space-y-1.5">
                                <input v-model="decideComment[p.id]" :class="fieldCls" placeholder="Comentário / pontuação (opcional)" />
                                <div class="flex gap-2">
                                    <Button variant="primary" size="sm" icon="fas fa-check" @click="decide(p.id, 'APPROVED')">Aprovar</Button>
                                    <Button variant="danger" size="sm" icon="fas fa-xmark" @click="decide(p.id, 'REJECTED')">Reprovar</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Etapa / Status (editável por todos, exceto em aprovação) -->
                <fieldset :disabled="locked" class="min-w-0 disabled:opacity-70">
                    <label :class="labelBase">Etapa / Status</label>
                    <select v-model.number="draft.status_id" :class="fieldCls">
                        <option :value="null">- sem status -</option>
                        <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                    </select>
                </fieldset>

                <!-- Detalhes da tarefa (somente admin; desabilitado em aprovação) -->
                <fieldset v-if="isAdmin" :disabled="locked" class="grid grid-cols-2 gap-x-3 gap-y-4 min-w-0 disabled:opacity-70">
                    <div>
                        <label :class="labelBase">Prioridade</label>
                        <select v-model="draft.priority" :class="fieldCls">
                            <option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label :class="labelBase">Recorrência</label>
                        <select v-model="draft.value_kind" :class="fieldCls"><option :value="null">Avulso</option><option value="MONTHLY">Mensal</option></select>
                    </div>
                    <div class="col-span-2">
                        <label :class="labelBase">Responsáveis <span class="text-ink-subtle font-normal">(1 ou mais - tarefa em grupo)</span></label>
                        <MultiSelector :options="userNames" :model-value="selectedAssigneeNames" placeholder="Selecionar responsáveis..." @change="onAssigneesChange" />
                    </div>
                    <div class="col-span-2">
                        <label :class="labelBase">Categoria <span class="text-ink-subtle font-normal">(divisão dentro da seção)</span></label>
                        <div class="flex gap-2">
                            <select v-if="catMode === 'existing'" v-model="draft.category" :class="fieldCls">
                                <option :value="null">- sem categoria -</option>
                                <option v-for="c in existingCategories" :key="c" :value="c">{{ c }}</option>
                            </select>
                            <input v-else v-model="draft.category" placeholder="Nova categoria (ex.: Inauguração)" :class="fieldCls" />
                            <Button variant="outline" size="sm" class="shrink-0" @click="catMode = catMode === 'existing' ? 'new' : 'existing'">{{ catMode === 'existing' ? '+ nova' : 'lista' }}</Button>
                        </div>
                    </div>
                    <div><label :class="labelBase">Valor (R$)</label><input type="number" step="0.01" v-model.number="draft.value" placeholder="0,00" :class="fieldCls" /></div>
                    <div><label :class="labelBase">Contratação</label><input type="date" v-model="draft.contracted_at" :class="fieldCls" /></div>
                    <div><label :class="labelBase">Entrega</label><input type="date" v-model="draft.due_date" :class="fieldCls" /></div>

                    <!-- Autorização (proofing) -->
                    <div class="col-span-2 border-t border-line pt-3">
                        <label class="flex items-center gap-2.5 cursor-pointer">
                            <Switch v-model="draft.needs_authorization" size="sm" />
                            <span class="text-sm text-ink">Precisa de autorização para concluir</span>
                        </label>
                        <div v-if="draft.needs_authorization" class="mt-2">
                            <label :class="labelBase">Perfis que aprovam (todos os membros precisam aprovar)</label>
                            <MultiSelector :options="profileNames" :model-value="selectedProfileNames" placeholder="Selecionar perfis..." @change="onProfilesChange" />
                            <p v-if="!profileNames.length" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Nenhum perfil cadastrado - peça a um admin para criar na engrenagem do painel.</p>
                        </div>
                    </div>
                </fieldset>

                <div>
                    <label :class="labelBase">Anotações</label>
                    <textarea v-model="draft.description" rows="3" :disabled="locked" :class="[fieldCls, 'resize-y disabled:opacity-70']"></textarea>
                </div>

                <!-- Subtarefas (checklist dentro da tarefa — acompanha a evolução) -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Subtarefas</label>
                        <span v-if="(draft.checklist_items || []).length" class="text-[11px] text-ink-subtle">{{ itemsDone }}/{{ draft.checklist_items.length }} feitas</span>
                    </div>
                    <div v-if="(draft.checklist_items || []).length" class="h-1 rounded-full bg-surface-sunken overflow-hidden mb-2">
                        <div class="h-full bg-accent rounded-full transition-all" :style="{ width: (itemsDone / draft.checklist_items.length * 100) + '%' }"></div>
                    </div>
                    <div v-if="(draft.checklist_items || []).length" class="space-y-1 mb-2">
                        <div v-for="(it, i) in draft.checklist_items" :key="i" class="flex items-center gap-2 group">
                            <input type="checkbox" :checked="it.done" @change="toggleItem(i)" :disabled="locked" class="h-4 w-4 cursor-pointer rounded shrink-0" />
                            <span class="flex-1 text-sm break-words" :class="it.done ? 'line-through text-ink-subtle' : 'text-ink'">{{ it.text }}</span>
                            <button v-if="!locked" @click="removeItem(i)" class="text-ink-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition shrink-0"><i class="fas fa-xmark text-xs"></i></button>
                        </div>
                    </div>
                    <div v-if="!locked" class="flex items-center gap-2">
                        <input v-model="newItemText" @keyup.enter="addChecklistItem" placeholder="+ subtarefa (Enter)" :class="[fieldCls, 'text-sm']" />
                        <Button size="sm" variant="outline" icon="fas fa-plus" @click="addChecklistItem" class="shrink-0" />
                    </div>
                </div>

                <!-- Anexos -->
                <div class="border-t border-line pt-5">
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Anexos</label>

                    <!-- Vincular: Colar URL / Enviar Arquivo / SharePoint (bloqueado em aprovação) -->
                    <div v-if="!locked" class="flex items-start gap-2 mt-2">
                        <div class="flex-1 min-w-0">
                            <AttachmentPicker :model-value="attachUrl" @update:model-value="onAttachPicked" upload-context="checklist_attachment" :reference-id="taskId" resource-type="" compress-images placeholder="Cole o link, envie ou busque no SharePoint" />
                        </div>
                        <Button size="md" icon="fas fa-plus py-1" :disabled="!attachUrl" @click="addAttach()" class="shrink-0">Adicionar</Button>
                    </div>
                    <p v-else class="mt-2 text-[11px] text-amber-600 dark:text-amber-400"><i class="fas fa-lock"></i> Em aprovação - anexos bloqueados até a decisão.</p>

                    <!-- Mini-visualização (clique abre o visualizador) -->
                    <div v-if="data?.attachments?.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                        <div v-for="a in data.attachments" :key="a.id" class="group relative rounded-lg border border-line bg-surface-sunken overflow-hidden">
                            <button @click="openViewer(a)" class="block w-full text-left" :title="a.file_name">
                                <div class="h-20 flex items-center justify-center overflow-hidden">
                                    <img v-if="isImg(a)" :src="a.url" class="h-full w-full object-cover" loading="lazy" />
                                    <i v-else :class="attIcon(a)" class="text-2xl"></i>
                                </div>
                                <p class="text-[11px] text-ink-muted truncate px-2 py-1.5 border-t border-line">{{ a.file_name }}</p>
                            </button>
                            <div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button v-if="isImg(a)" @click.stop="annotateAtt = a" class="h-6 w-6 grid place-items-center rounded-md bg-surface-overlay/90 text-ink-subtle hover:text-accent shadow-soft" title="Marcar imagem (proofing)"><i class="fas fa-pen text-[10px]"></i></button>
                                <a :href="a.url" target="_blank" rel="noopener" @click.stop class="h-6 w-6 grid place-items-center rounded-md bg-surface-overlay/90 text-ink-subtle hover:text-accent shadow-soft" title="Abrir em nova aba"><i class="fas fa-arrow-up-right-from-square text-[10px]"></i></a>
                                <button v-if="!locked" @click.stop="askRemoveAttachment(a)" class="h-6 w-6 grid place-items-center rounded-md bg-surface-overlay/90 text-ink-subtle hover:text-red-500 shadow-soft" title="Remover"><i class="fas fa-xmark text-[10px]"></i></button>
                            </div>
                            <span v-if="a.annotated_from_id" class="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-accent text-white shadow-soft"><i class="fas fa-pen"></i> marcação</span>
                        </div>
                    </div>
                    <p v-else class="text-xs text-ink-subtle mt-2">Nenhum anexo.</p>
                </div>

                <!-- Comentários -->
                <div class="border-t border-line pt-5">
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Comentários</label>
                    <div class="space-y-2.5 mt-3 max-h-80 overflow-y-auto pr-1">
                        <div v-for="c in comments" :key="c.id" class="flex" :class="isMine(c) ? 'justify-end' : 'justify-start'">
                            <div class="max-w-[82%] min-w-0">
                                <div v-if="!isMine(c)" class="flex items-center gap-1.5 mb-0.5 px-1">
                                    <UserAvatar :name="c.author?.username || 'Usuário'" :size="18" :ring="false" />
                                    <span class="text-[11px] font-semibold truncate" :class="authorColor(c)">{{ c.author?.username || 'Usuário' }}</span>
                                </div>
                                <div class="rounded-2xl px-3 py-2 text-sm shadow-soft" :class="isMine(c) ? 'bg-accent text-white rounded-br-md' : 'bg-surface-sunken text-ink rounded-bl-md'">
                                    <p v-if="c.body" class="whitespace-pre-wrap break-words"><template v-for="(seg, i) in renderBody(c.body)" :key="i"><span v-if="seg.mention" :class="isMine(c) ? 'font-semibold underline decoration-white/50' : 'text-accent font-medium'">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template></p>
                                    <button v-if="c.image_url" type="button" @click="viewerAtt = { url: c.image_url, file_name: c.annotated_from_id ? 'Marcação' : 'Imagem', kind: 'IMAGE' }" class="block" :class="c.body ? 'mt-1.5' : ''">
                                        <img :src="c.image_url" class="max-h-44 rounded-lg border border-black/10" loading="lazy" />
                                        <span v-if="c.annotated_from_id" class="block text-[10px] mt-0.5 opacity-80"><i class="fas fa-pen"></i> marcação sobre anexo</span>
                                    </button>
                                </div>
                                <p class="text-[10px] text-ink-subtle mt-0.5 px-1" :class="isMine(c) ? 'text-right' : 'text-left'">{{ fmtWhen(c) }}</p>
                            </div>
                        </div>
                        <p v-if="!comments.length" class="text-xs text-ink-subtle text-center py-3">Nenhum comentário ainda. Comece a conversa.</p>
                    </div>
                    <div class="relative mt-3">
                        <div class="flex gap-2">
                            <input v-model="commentText" @input="onCommentInput" @keyup.enter="sendComment" placeholder="Comentário... (@ para mencionar)" :class="fieldCls" />
                            <Button icon="fas fa-paper-plane" @click="sendComment" class="shrink-0" />
                        </div>
                        <div v-if="showMention" class="absolute bottom-full left-0 mb-1 w-56 bg-surface-overlay border border-line rounded-lg shadow-overlay z-10 overflow-hidden">
                            <button v-for="u in mentionMatches" :key="u.id" @click="pickMention(u)" class="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken">@{{ u.username }}</button>
                        </div>
                    </div>
                </div>

                <!-- Histórico (recolhido por padrão) -->
                <div v-if="data?.activity?.length" class="border-t border-line pt-5">
                    <button @click="historyOpen = !historyOpen" type="button" class="w-full flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wide focus-ring rounded">
                        <span><i class="fas fa-clock-rotate-left text-ink-subtle mr-1.5"></i>Histórico <span class="normal-case font-normal text-ink-subtle">({{ data.activity.length }})</span></span>
                        <i class="fas fa-chevron-down text-ink-subtle transition-transform duration-200" :class="{ 'rotate-180': historyOpen }"></i>
                    </button>
                    <ul v-show="historyOpen" class="mt-3 space-y-3">
                        <li v-for="ev in data.activity.slice(0, 20)" :key="ev.id" class="flex gap-3 text-xs">
                            <UserAvatar v-if="ev.actor?.username" :name="ev.actor.username" :size="24" :ring="false" class="mt-0.5" />
                            <span v-else class="h-6 w-6 grid place-items-center rounded-full bg-surface-sunken text-ink-subtle shrink-0 mt-0.5"><i :class="actionMeta(ev.action).icon" class="text-[10px]"></i></span>
                            <div class="min-w-0 flex-1">
                                <p class="text-ink-muted">
                                    <i :class="actionMeta(ev.action).icon" class="text-ink-subtle text-[10px] mr-1"></i>
                                    <span class="font-medium text-ink">{{ ev.actor?.username || 'Sistema' }}</span>
                                    {{ actionMeta(ev.action).label }}<span v-if="!changeLines(ev).length">{{ fallbackFields(ev) }}</span>
                                    <span class="text-ink-subtle"> · {{ fmtWhen(ev) }}</span>
                                </p>
                                <ul v-if="changeLines(ev).length" class="mt-1 space-y-0.5">
                                    <li v-for="(ln, i) in changeLines(ev)" :key="i" class="text-ink-subtle">
                                        <span class="text-ink-muted">{{ ln.field }}:</span>
                                        <span class="line-through opacity-60">{{ ln.from }}</span>
                                        <i class="fas fa-arrow-right-long mx-1 text-[9px]"></i>
                                        <span class="text-ink font-medium">{{ ln.to }}</span>
                                    </li>
                                </ul>
                                <p v-if="ev.meta?.comment" class="mt-0.5 text-ink-subtle italic break-words">"{{ ev.meta.comment }}"</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Rodapé: em aprovação fica bloqueado -->
            <div v-if="data?.task && locked" class="border-t border-line px-5 py-3.5 bg-surface shrink-0 space-y-2 text-center">
                <p class="text-sm text-amber-600 dark:text-amber-400 font-medium"><i class="fas fa-lock"></i> Em aprovação - edição bloqueada até a decisão.</p>
                <Button v-if="canCancelApproval" variant="outline" size="sm" icon="fas fa-rotate-left" @click="askCancelApproval">Voltar para ajuste (cancela a autorização)</Button>
            </div>

            <!-- Rodapé fixo: notificação + salvar -->
            <div v-else-if="data?.task" class="border-t border-line px-5 py-3.5 bg-surface shrink-0 space-y-3">
                <div class="flex items-center gap-3 flex-wrap">
                    <Switch v-model="notifyOn" size="sm" label="Notificar ao salvar" />
                    <template v-if="notifyOn">
                        <button v-for="ch in [{ k: 'inapp', l: 'Sino', i: 'fas fa-bell' }, { k: 'email', l: 'E-mail', i: 'fas fa-envelope' }, { k: 'whatsapp', l: 'WhatsApp', i: 'fab fa-whatsapp' }]" :key="ch.k"
                            @click="channels[ch.k] = !channels[ch.k]" type="button"
                            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition"
                            :class="channels[ch.k] ? 'bg-accent-soft text-accent border-accent/30' : 'text-ink-subtle border-line hover:bg-surface-sunken'">
                            <i :class="ch.i"></i> {{ ch.l }}
                        </button>
                    </template>
                </div>
                <div class="flex items-center gap-2">
                    <Button :loading="saving" :disabled="saving || (!dirty && !notifyOn)" icon="fas fa-floppy-disk" @click="save">Salvar</Button>
                    <Button variant="outline" :disabled="saving || (!dirty && !notifyOn)" @click="saveAndClose">Salvar e fechar</Button>
                    <span class="text-xs ml-auto" :class="dirty ? 'text-amber-500' : 'text-ink-subtle'">{{ dirty ? 'Alterações pendentes' : (notifyOn ? 'Salvar p/ notificar' : 'Tudo salvo') }}</span>
                </div>
            </div>
        </div>
        <AttachmentViewerModal v-if="viewerAtt" :attachment="viewerAtt" @close="viewerAtt = null" />
        <ImageAnnotator v-if="annotateAtt" :attachment="annotateAtt" :task-id="taskId" @close="annotateAtt = null" />
        <UserInfoModal v-if="infoUser" :user="infoUser" @close="infoUser = null" />

        <!-- Confirmação (excluir tarefa / anexo) -->
        <Modal :open="!!confirmState" size="sm" :title="confirmState?.title" @close="confirmCancel">
            <div class="flex items-start gap-3">
                <span class="h-9 w-9 grid place-items-center rounded-full shrink-0" :class="confirmState?.variant === 'primary' ? 'bg-accent-soft text-accent' : 'bg-red-500/10 text-red-500'">
                    <i :class="confirmState?.variant === 'primary' ? 'fas fa-paper-plane' : 'fas fa-triangle-exclamation'"></i>
                </span>
                <p class="text-sm text-ink-muted">{{ confirmState?.message }}</p>
            </div>
            <template #footer>
                <Button variant="ghost" size="sm" @click="confirmCancel">Cancelar</Button>
                <Button :variant="confirmState?.variant || 'danger'" size="sm" :icon="confirmState?.icon || 'fas fa-trash'" @click="confirmOk">{{ confirmState?.confirmLabel || 'Confirmar' }}</Button>
            </template>
        </Modal>
    </div>
</template>
