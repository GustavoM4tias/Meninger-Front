<template>
    <div class="flex gap-3">
        <!-- Avatar -->
        <div class="shrink-0">
            <span
                class="flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300"
                :class="isReply ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'">
                {{ initials }}
            </span>
        </div>

        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {{ comment.user?.username || 'Usuário' }}
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-500">{{ fmtDate(comment.createdAt) }}</span>
                <span v-if="comment.editedAt"
                    class="text-[10px] italic text-slate-400 dark:text-slate-500">(editado)</span>
            </div>

            <!-- Corpo (ou editor) -->
            <div v-if="!editing" class="mt-0.5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words"
                :class="comment.status === 'DELETED' ? 'italic text-slate-400 dark:text-slate-500' : ''"
                v-html="renderedBody"></div>

            <div v-else class="mt-1">
                <textarea v-model="editText" rows="3"
                    class="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"></textarea>
                <div class="mt-1.5 flex items-center gap-2">
                    <button type="button"
                        class="rounded-lg bg-slate-900 dark:bg-white px-3 py-1 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90"
                        @click="saveEdit">Salvar</button>
                    <button type="button"
                        class="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        @click="editing = false">Cancelar</button>
                </div>
            </div>

            <!-- Ações -->
            <div v-if="!editing && comment.status !== 'DELETED'" class="mt-1 flex items-center gap-3">
                <button v-if="!isReply" type="button"
                    class="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    @click="$emit('reply', comment.id)">
                    <i class="fa-solid fa-reply mr-1"></i>Responder
                </button>
                <button v-if="canManage" type="button"
                    class="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    @click="startEdit">
                    <i class="fa-solid fa-pen mr-1"></i>Editar
                </button>
                <button v-if="canManage" type="button"
                    class="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    @click="$emit('remove', comment.id)">
                    <i class="fa-solid fa-trash mr-1"></i>Excluir
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    comment: { type: Object, required: true },
    currentUserId: { type: [Number, String], default: null },
    isAdmin: { type: Boolean, default: false },
    isReply: { type: Boolean, default: false },
});

const emit = defineEmits(['reply', 'edit', 'remove']);

const editing = ref(false);
const editText = ref('');

const initials = computed(() =>
    String(props.comment.user?.username || '?').slice(0, 2).toUpperCase()
);

const canManage = computed(() => {
    if (props.isAdmin) return true;
    return String(props.comment.userId) === String(props.currentUserId);
});

// Renderiza @menções como destaque (escapa HTML primeiro).
const renderedBody = computed(() => {
    const raw = String(props.comment.body || '');
    const escaped = raw
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/@([a-zA-Z0-9._-]{3,50})/g,
        '<span class="font-semibold text-sky-600 dark:text-sky-400">@$1</span>');
});

function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('pt-BR');
}

function startEdit() {
    editText.value = props.comment.body || '';
    editing.value = true;
}

function saveEdit() {
    const t = editText.value.trim();
    if (!t) return;
    emit('edit', props.comment.id, t);
    editing.value = false;
}
</script>
