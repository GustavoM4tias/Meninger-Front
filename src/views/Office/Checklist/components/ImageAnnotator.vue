<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import { canvasToCompressedFile } from '@/utils/Checklist/imageCompress.js';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    attachment: { type: Object, required: true }, // { id, url, file_name }
    taskId: { type: Number, required: true },
});
const emit = defineEmits(['close', 'saved']);

const store = useChecklistStore();
const toast = useToast();

const canvasRef = ref(null);
const loadError = ref(false);
const saving = ref(false);
const tool = ref('pen');                 // pen | text
const note = ref('');
const color = ref('#ef4444');
const penSize = ref(4);
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#111827', '#ffffff'];

// Tamanho do texto deriva do slider (mesmo controle, rótulo muda conforme a ferramenta).
const textSize = computed(() => Math.max(14, penSize.value * 5));

// Edição de texto NA TELA (sem prompt do navegador).
const textInput = ref(null);             // { x, y, size, color } enquanto digita
const textValue = ref('');
const textInputRef = ref(null);

let baseImg = null;
let ctx = null;
let drawing = false;
let last = null;
const actions = ref([]);                 // p/ desfazer: { type:'stroke'|'text', ... }

onMounted(() => {
    baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';     // necessário p/ exportar (toBlob) sem "tainted canvas"
    baseImg.onload = setup;
    baseImg.onerror = () => { loadError.value = true; };
    baseImg.src = props.attachment.url;
    window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function setup() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const natW = baseImg.naturalWidth || baseImg.width;
    const natH = baseImg.naturalHeight || baseImg.height;
    const maxW = Math.min(1280, Math.floor(window.innerWidth * 0.8));
    const maxH = Math.floor(window.innerHeight * 0.6);
    const scale = Math.min(1, maxW / natW, maxH / natH);
    canvas.width = Math.max(1, Math.round(natW * scale));
    canvas.height = Math.max(1, Math.round(natH * scale));
    ctx = canvas.getContext('2d');
    render();
}

function render() {
    if (!ctx) return;
    const c = canvasRef.value;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(baseImg, 0, 0, c.width, c.height);
    for (const a of actions.value) drawAction(a);
}
function drawAction(a) {
    if (a.type === 'stroke') {
        ctx.strokeStyle = a.color; ctx.lineWidth = a.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        a.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
    } else if (a.type === 'text') {
        ctx.fillStyle = a.color; ctx.font = `bold ${a.size}px Inter, sans-serif`; ctx.textBaseline = 'top';
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(2, a.size / 8);
        ctx.strokeText(a.text, a.x, a.y); ctx.fillText(a.text, a.x, a.y);
    }
}
function pos(e) {
    const c = canvasRef.value; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
}

// ── Texto na tela ──
function openText(p) {
    textInput.value = { x: p.x, y: p.y, size: textSize.value, color: color.value };
    textValue.value = '';
    nextTick(() => textInputRef.value?.focus());
}
function commitText() {
    const t = textInput.value;
    if (t && textValue.value.trim()) {
        actions.value.push({ type: 'text', x: t.x, y: t.y, text: textValue.value.trim(), color: t.color, size: t.size });
        render();
    }
    textInput.value = null; textValue.value = '';
}
function cancelText() { textInput.value = null; textValue.value = ''; }
function setTool(t) { commitText(); tool.value = t; }

function onDown(e) {
    if (loadError.value) return;
    const p = pos(e);
    if (tool.value === 'text') {
        if (textInput.value) commitText();   // fecha o anterior antes de abrir outro
        openText(p);
        return;
    }
    drawing = true; last = p;
    actions.value.push({ type: 'stroke', color: color.value, size: penSize.value, points: [p] });
    ctx.strokeStyle = color.value; ctx.lineWidth = penSize.value; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
}
function onMove(e) {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    actions.value[actions.value.length - 1].points.push(p);
    last = p;
}
function onUp() { drawing = false; last = null; }
function undo() { actions.value.pop(); render(); }
function clearAll() { actions.value = []; render(); }

// Ctrl+Z desfaz a marcação (a menos que esteja digitando no campo de texto — aí é nativo).
function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (textInput.value) return;
        e.preventDefault();
        undo();
    }
}

async function save() {
    if (loadError.value) { toast.error('A imagem não pôde ser carregada para marcação.'); return; }
    commitText(); // garante que um texto em digitação entre na imagem
    saving.value = true;
    try {
        const file = await canvasToCompressedFile(canvasRef.value, { fileName: `marcacao-${props.attachment.file_name || 'imagem'}` });
        const fd = new FormData();
        fd.append('file', file); fd.append('context', 'checklist_attachment'); fd.append('referenceId', String(props.taskId));
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/uploads`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
        const up = await resp.json();
        if (!resp.ok) throw new Error(up?.message || 'Falha ao enviar a marcação.');
        await store.addComment(props.taskId, { body: (note.value || '').trim(), image_url: up.url, annotated_from_id: props.attachment.id });
        toast.success('Marcação enviada no comentário.');
        emit('saved'); emit('close');
    } catch (e) {
        toast.error(e?.name === 'SecurityError' ? 'O provedor da imagem bloqueou a exportação (CORS).' : (e.message || 'Erro ao salvar marcação.'));
    } finally { saving.value = false; }
}
</script>

<template>
    <Modal :open="true" size="full" title="Marcar imagem (proofing)" :subtitle="attachment.file_name" @close="emit('close')">
        <div class="space-y-3">
            <!-- Ferramentas -->
            <div class="flex flex-wrap items-center gap-2.5 p-2 rounded-lg bg-surface-sunken border border-line">
                <div class="inline-flex rounded-lg border border-line overflow-hidden">
                    <button @click="setTool('pen')" class="px-3 h-8 text-sm focus-ring" :class="tool === 'pen' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-pen"></i> Caneta</button>
                    <button @click="setTool('text')" class="px-3 h-8 text-sm focus-ring" :class="tool === 'text' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-font"></i> Texto</button>
                </div>
                <div class="flex items-center gap-1.5">
                    <button v-for="c in COLORS" :key="c" @click="color = c" class="h-6 w-6 rounded-full border-2 transition" :style="{ background: c }" :class="color === c ? 'border-ink ring-2 ring-accent-ring/40 scale-110' : 'border-line'"></button>
                </div>
                <label class="inline-flex items-center gap-1.5 text-xs text-ink-muted">{{ tool === 'text' ? 'Tamanho do texto' : 'Espessura' }}
                    <input type="range" min="2" max="16" v-model.number="penSize" class="w-24" />
                </label>
                <div class="ml-auto inline-flex items-center gap-1.5">
                    <Button variant="outline" size="sm" icon="fas fa-rotate-left" :disabled="!actions.length" @click="undo">Desfazer <span class="opacity-60 text-[10px] ml-1">Ctrl+Z</span></Button>
                    <Button variant="ghost" size="sm" icon="fas fa-eraser" :disabled="!actions.length" @click="clearAll">Limpar</Button>
                </div>
            </div>
            <p v-if="tool === 'text'" class="text-[11px] text-ink-subtle"><i class="fas fa-circle-info"></i> Clique na imagem onde quer o texto e digite direto na tela. Enter confirma, Esc cancela. Ajuste o tamanho no controle acima antes de clicar.</p>

            <!-- Tela -->
            <div class="flex justify-center bg-surface-sunken/60 rounded-lg p-3 overflow-auto max-h-[64vh]">
                <div v-if="loadError" class="text-center text-ink-subtle py-16">
                    <i class="fas fa-image text-3xl mb-2 block opacity-50"></i>
                    Não foi possível carregar a imagem para marcação.
                    <a :href="attachment.url" target="_blank" rel="noopener" class="block mt-2 text-accent hover:underline">Abrir original</a>
                </div>
                <div v-else class="relative inline-block">
                    <canvas ref="canvasRef"
                        class="block rounded-md shadow-soft bg-white touch-none"
                        :class="tool === 'text' ? 'cursor-text' : 'cursor-crosshair'"
                        @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp"></canvas>
                    <input v-if="textInput" ref="textInputRef" v-model="textValue" type="text" placeholder="texto"
                        :size="Math.max(3, textValue.length + 1)"
                        @keydown.enter.prevent="commitText" @keydown.esc.prevent.stop="cancelText"
                        :style="{ left: textInput.x + 'px', top: textInput.y + 'px', color: textInput.color, fontSize: textInput.size + 'px', lineHeight: 1 }"
                        class="absolute bg-transparent outline-dashed outline-1 outline-offset-2 font-bold p-0 m-0 placeholder:opacity-40" />
                </div>
            </div>

            <input v-model="note" placeholder="Comentário sobre as correções (opcional)"
                class="w-full rounded-lg border border-line bg-surface-raised text-ink px-3 py-2 text-sm focus-ring" />
            <p class="text-[11px] text-ink-subtle">A imagem marcada entra como <strong>comentário</strong> no chat da tarefa (o anexo original é mantido). Imagem comprimida automaticamente.</p>
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button :loading="saving" :disabled="loadError" icon="fas fa-floppy-disk" @click="save">Salvar marcação</Button>
        </template>
    </Modal>
</template>

<style scoped>
.touch-none { touch-action: none; }
</style>
