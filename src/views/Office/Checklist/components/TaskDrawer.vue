<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import { fieldBase, labelBase } from '@/components/UI/_classes';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import AttachmentViewerModal from './AttachmentViewerModal.vue';
import AttachModal from './AttachModal.vue';

const props = defineProps({ taskId: { type: Number, required: true } });
const emit = defineEmits(['close', 'changed']);

const store = useChecklistStore();
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const commentText = ref('');
const uploading = ref(false);

// Edição bufferizada: nada é persistido (nem notificado) até clicar em Salvar.
const EDITABLE = ['title', 'status_id', 'priority', 'assignee_user_id', 'assignee_label', 'value', 'value_kind', 'contracted_at', 'due_date', 'description', 'category'];
const draft = ref({});
const loaded = ref({}); // baseline normalizado p/ diff confiável

const data = computed(() => store.currentTask);
const statuses = computed(() => store.current?.statuses || []);

// Notificação por tarefa (vale para o Salvar e para o Cobrar).
const notifyOn = ref(false);
const channels = ref({ inapp: true, email: true, whatsapp: false });

watch(() => props.taskId, load, { immediate: true });
onMounted(() => { if (!store.users.length) store.loadUsers(); });

// Normaliza cada campo para um valor canônico (datas "" -> null; valor número-ou-null;
// ids número-ou-null). Sem isto, "" em campo numérico quebra o save no Postgres e a
// data editada se perde junto.
function norm(k, v) {
    if (v === '' || v === undefined) return null;
    if (k === 'value') { const n = Number(v); return (v === null || Number.isNaN(n)) ? null : n; }
    if (k === 'status_id' || k === 'assignee_user_id') { return (v === null) ? null : Number(v); }
    return v ?? null;
}
function currentNorm() { const o = {}; for (const k of EDITABLE) o[k] = norm(k, draft.value[k]); return o; }
const changedKeys = computed(() => { const c = currentNorm(); return EDITABLE.filter((k) => c[k] !== loaded.value[k]); });
const dirty = computed(() => changedKeys.value.length > 0);

async function load() {
    loading.value = true;
    try {
        await store.openTask(props.taskId);
        const t = store.currentTask?.task || {};
        draft.value = EDITABLE.reduce((o, k) => { o[k] = t[k] ?? null; return o; }, {});
        loaded.value = currentNorm();
    } finally { loading.value = false; }
}

async function save() {
    saving.value = true;
    try {
        const c = currentNorm();
        const patch = {};
        for (const k of changedKeys.value) patch[k] = c[k];          // só o que mudou
        if (notifyOn.value) { patch.notify = true; patch.channels = { ...channels.value }; }
        else if (Object.keys(patch).length) patch.notify = false;
        if (!Object.keys(patch).length) return;                      // nada a fazer
        await store.saveTask(props.taskId, patch);
        loaded.value = c;
        emit('changed');
        toast.success(notifyOn.value ? 'Tarefa salva e responsável notificado.' : 'Tarefa salva.');
    } catch (e) { toast.error(e.message); }
    finally { saving.value = false; }
}
async function saveAndClose() { await save(); if (!dirty.value) emit('close'); }

function tryClose() { if (dirty.value && !confirm('Há alterações não salvas. Descartar?')) return; emit('close'); }
function onBackdrop() { if (dirty.value) { toast.info('Salve ou descarte as alterações primeiro.'); return; } emit('close'); }

// Menções: autocomplete ao digitar @ + destaque no texto exibido.
const mentionMatches = ref([]);
const showMention = ref(false);
function onCommentInput() {
    const m = commentText.value.match(/@([\w.\-]*)$/);
    if (m) {
        const q = m[1].toLowerCase();
        mentionMatches.value = (store.users || []).filter((u) => u.username.toLowerCase().includes(q)).slice(0, 6);
        showMention.value = mentionMatches.value.length > 0;
    } else { showMention.value = false; }
}
function pickMention(u) {
    commentText.value = commentText.value.replace(/@([\w.\-]*)$/, '@' + u.username + ' ');
    showMention.value = false;
}
function renderBody(body) {
    const out = []; const re = /(@[\w.\-]+)/g; let last = 0, m;
    while ((m = re.exec(body)) !== null) {
        if (m.index > last) out.push({ text: body.slice(last, m.index), mention: false });
        out.push({ text: m[0], mention: true });
        last = re.lastIndex;
    }
    if (last < (body || '').length) out.push({ text: body.slice(last), mention: false });
    return out;
}
async function sendComment() {
    const text = commentText.value.trim();
    if (!text) return;
    try { await store.addComment(props.taskId, text); commentText.value = ''; showMention.value = false; } catch (e) { toast.error(e.message); }
}
async function onFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    try {
        const fd = new FormData();
        fd.append('file', file); fd.append('context', 'checklist_attachment'); fd.append('referenceId', String(props.taskId));
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/uploads`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
        const up = await resp.json();
        if (!resp.ok) throw new Error(up?.message || 'Falha no upload');
        await store.addAttachment(props.taskId, { file_name: up.fileName, mime_type: up.mimeType, url: up.url, storage_path: up.path, size: up.size });
        toast.success('Anexo enviado.');
    } catch (e) { toast.error(e.message); }
    finally { uploading.value = false; ev.target.value = ''; }
}
async function doNudge() {
    try { await store.nudge(props.taskId, null, { ...channels.value }); toast.success('Cobrança enviada pelos canais marcados.'); }
    catch (e) { toast.error(e.message || 'Defina um responsável vinculado para cobrar.'); }
}
async function doDelete() {
    if (!confirm('Excluir esta tarefa?')) return;
    try { await store.removeTask(props.taskId); emit('changed'); emit('close'); } catch (e) { toast.error(e.message); }
}

// ── Categoria: escolher existente ou criar nova. ──
const existingCategories = computed(() => {
    const set = new Set();
    (store.current?.tasks || []).forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set).sort();
});
const catMode = ref('existing');

// ── Anexos: modal de vincular + visualizador. ──
const showAttachModal = ref(false);
const viewerAtt = ref(null);
function openViewer(a) { viewerAtt.value = a; }

// ── Status/prioridade p/ os badges do cabeçalho. ──
const PRIORITY_PT = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };
const PRIORITY_VARIANT = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' };
const currentStatus = computed(() => statuses.value.find((s) => s.id === Number(draft.value.status_id)) || null);
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

// ── Histórico/atividade legível (com from → to dos campos alterados). ──
const ACTION_PT = {
    'task.created': { label: 'criou a tarefa', icon: 'fas fa-plus' },
    'task.updated': { label: 'atualizou', icon: 'fas fa-pen' },
    'status_changed': { label: 'mudou o status', icon: 'fas fa-flag' },
    'comment.added': { label: 'comentou', icon: 'fas fa-comment' },
    'attachment.added': { label: 'anexou arquivo', icon: 'fas fa-paperclip' },
    'nudge.sent': { label: 'cobrou a entrega', icon: 'fas fa-bell' },
    'reminder.sent': { label: 'lembrete de cobrança', icon: 'fas fa-clock' },
    'task.bulk_updated': { label: 'edição em lote', icon: 'fas fa-layer-group' },
};
const FIELD_PT = { title: 'título', status_id: 'status', priority: 'prioridade', value: 'valor', value_kind: 'recorrência', due_date: 'prazo', contracted_at: 'contratação', started_at: 'início', assignee_user_id: 'responsável', assignee_label: 'responsável', description: 'anotações', category: 'categoria', section_id: 'seção', parent_task_id: 'subtarefa', position: 'ordem' };
function fmtFieldVal(field, v) {
    if (v === null || v === undefined || v === '') return '—';
    if (['due_date', 'contracted_at', 'started_at'].includes(field)) return dayjs(v).format('DD/MM/YYYY');
    if (field === 'status_id') return statuses.value.find((s) => s.id === Number(v))?.label || ('#' + v);
    if (field === 'assignee_user_id') return store.users.find((u) => u.id === Number(v))?.username || ('#' + v);
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

const fieldCls = `${fieldBase} px-3 py-2 text-sm rounded-lg`;
</script>

<template>
    <div class="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm animate-fade-in" @mousedown.self="onBackdrop">
        <div class="bg-surface-raised border-l border-line w-full max-w-lg h-full overflow-hidden shadow-overlay flex flex-col animate-slide-up">

            <!-- Cabeçalho -->
            <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Tarefa</span>
                    <Badge v-if="dirty" variant="warning" size="sm">não salva</Badge>
                </div>
                <div class="flex items-center gap-1">
                    <Button variant="ghost" size="sm" icon="fas fa-bell" @click="doNudge" class="!text-amber-600">Cobrar</Button>
                    <button @click="doDelete" title="Excluir tarefa" class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition"><i class="fas fa-trash text-sm"></i></button>
                    <button @click="tryClose" title="Fechar" class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition"><i class="fas fa-xmark"></i></button>
                </div>
            </div>

            <div v-if="loading || !data?.task" class="p-10 text-center text-ink-subtle"><i class="fas fa-spinner fa-spin text-lg"></i></div>

            <div v-else class="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
                <!-- Título + badges -->
                <div>
                    <input v-model="draft.title" placeholder="Título da tarefa"
                        class="w-full text-lg font-semibold bg-transparent text-ink focus:outline-none border-b border-transparent focus:border-accent-ring pb-1 transition-colors" />
                    <div class="flex items-center gap-1.5 mt-2">
                        <Badge v-if="currentStatus" variant="accent" size="sm" dot>{{ currentStatus.label }}</Badge>
                        <Badge :variant="PRIORITY_VARIANT[draft.priority] || 'neutral'" size="sm">{{ PRIORITY_PT[draft.priority] || draft.priority }}</Badge>
                    </div>
                </div>

                <!-- Detalhes -->
                <div class="grid grid-cols-2 gap-x-3 gap-y-4">
                    <div>
                        <label :class="labelBase">Status</label>
                        <select v-model.number="draft.status_id" :class="fieldCls">
                            <option :value="null">- sem status -</option>
                            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                        </select>
                    </div>
                    <div>
                        <label :class="labelBase">Prioridade</label>
                        <select v-model="draft.priority" :class="fieldCls">
                            <option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label :class="labelBase">Responsável</label>
                        <select v-model.number="draft.assignee_user_id" :class="fieldCls">
                            <option :value="null">- não vinculado -</option>
                            <option v-for="u in store.users" :key="u.id" :value="u.id">{{ u.username }}</option>
                        </select>
                        <input v-if="!draft.assignee_user_id" v-model="draft.assignee_label" placeholder="ou texto livre (ex.: AGÊNCIA, ADM)" :class="[fieldCls, 'mt-2']" />
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
                    <div>
                        <label :class="labelBase">Valor (R$)</label>
                        <input type="number" step="0.01" v-model.number="draft.value" placeholder="0,00" :class="fieldCls" />
                    </div>
                    <div>
                        <label :class="labelBase">Recorrência</label>
                        <select v-model="draft.value_kind" :class="fieldCls"><option :value="null">Avulso</option><option value="MONTHLY">Mensal</option></select>
                    </div>
                    <div>
                        <label :class="labelBase">Contratação</label>
                        <input type="date" v-model="draft.contracted_at" :class="fieldCls" />
                    </div>
                    <div>
                        <label :class="labelBase">Entrega</label>
                        <input type="date" v-model="draft.due_date" :class="fieldCls" />
                    </div>
                </div>

                <div>
                    <label :class="labelBase">Anotações</label>
                    <textarea v-model="draft.description" rows="3" :class="[fieldCls, 'resize-y']"></textarea>
                </div>

                <!-- Anexos -->
                <div class="border-t border-line pt-5">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Anexos</label>
                        <button @click="showAttachModal = true" class="text-xs text-accent hover:underline focus-ring rounded"><i class="fas fa-paperclip"></i> Vincular arquivo</button>
                    </div>
                    <div v-if="!data?.attachments?.length" class="text-xs text-ink-subtle">Nenhum anexo.</div>
                    <ul v-else class="space-y-1.5">
                        <li v-for="a in data.attachments" :key="a.id" class="flex items-center gap-2 text-sm bg-surface-sunken rounded-lg px-3 py-2">
                            <button @click="openViewer(a)" class="text-accent hover:underline truncate text-left flex-1 min-w-0"><i :class="a.kind === 'IMAGE' ? 'fas fa-image' : a.kind === 'LINK' ? 'fas fa-link' : 'fas fa-file'"></i> {{ a.file_name }}</button>
                            <a :href="a.url" target="_blank" rel="noopener" class="text-ink-subtle hover:text-accent" title="Abrir em nova aba"><i class="fas fa-arrow-up-right-from-square text-xs"></i></a>
                            <button @click="store.removeAttachment(a.id, taskId)" class="text-ink-subtle hover:text-red-500"><i class="fas fa-xmark"></i></button>
                        </li>
                    </ul>
                </div>

                <!-- Comentários -->
                <div class="border-t border-line pt-5">
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Comentários</label>
                    <div class="space-y-3 mt-3">
                        <div v-for="c in data?.comments || []" :key="c.id" class="text-sm">
                            <div class="flex items-baseline gap-2">
                                <span class="font-medium text-ink">{{ c.author?.username || 'Usuário' }}</span>
                                <span class="text-[11px] text-ink-subtle">{{ dayjs(c.created_at).format('DD/MM HH:mm') }}</span>
                            </div>
                            <p class="text-ink-muted whitespace-pre-wrap mt-0.5"><template v-for="(seg, i) in renderBody(c.body)" :key="i"><span v-if="seg.mention" class="text-accent font-medium">{{ seg.text }}</span><template v-else>{{ seg.text }}</template></template></p>
                        </div>
                        <p v-if="!data?.comments?.length" class="text-xs text-ink-subtle">Nenhum comentário ainda.</p>
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

                <!-- Histórico -->
                <div v-if="data?.activity?.length" class="border-t border-line pt-5">
                    <label class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Histórico</label>
                    <ul class="mt-3 space-y-3">
                        <li v-for="ev in data.activity.slice(0, 20)" :key="ev.id" class="flex gap-3 text-xs">
                            <span class="h-6 w-6 grid place-items-center rounded-full bg-surface-sunken text-ink-subtle shrink-0 mt-0.5"><i :class="actionMeta(ev.action).icon" class="text-[10px]"></i></span>
                            <div class="min-w-0 flex-1">
                                <p class="text-ink-muted">
                                    <span class="font-medium text-ink">{{ ev.actor?.username || 'Sistema' }}</span>
                                    {{ actionMeta(ev.action).label }}<span v-if="!changeLines(ev).length">{{ fallbackFields(ev) }}</span>
                                    <span class="text-ink-subtle"> · {{ dayjs(ev.created_at).format('DD/MM HH:mm') }}</span>
                                </p>
                                <ul v-if="changeLines(ev).length" class="mt-1 space-y-0.5">
                                    <li v-for="(ln, i) in changeLines(ev)" :key="i" class="text-ink-subtle">
                                        <span class="text-ink-muted">{{ ln.field }}:</span>
                                        <span class="line-through opacity-60">{{ ln.from }}</span>
                                        <i class="fas fa-arrow-right-long mx-1 text-[9px]"></i>
                                        <span class="text-ink font-medium">{{ ln.to }}</span>
                                    </li>
                                </ul>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Rodapé fixo: notificação + salvar -->
            <div v-if="data?.task" class="border-t border-line px-5 py-3.5 bg-surface shrink-0 space-y-3">
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
                    <Button :loading="saving" :disabled="!dirty" icon="fas fa-floppy-disk" @click="save">Salvar</Button>
                    <Button variant="outline" :disabled="saving || !dirty" @click="saveAndClose">Salvar e fechar</Button>
                    <span class="text-xs ml-auto" :class="dirty ? 'text-amber-500' : 'text-ink-subtle'">{{ dirty ? 'Alterações pendentes' : 'Tudo salvo' }}</span>
                </div>
            </div>
        </div>
        <AttachModal v-if="showAttachModal" :task-id="taskId" @close="showAttachModal = false" />
        <AttachmentViewerModal v-if="viewerAtt" :attachment="viewerAtt" @close="viewerAtt = null" />
    </div>
</template>
