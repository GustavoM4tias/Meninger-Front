<template>
    <div class="space-y-2">
        <div class="relative">
            <textarea ref="taEl" v-model="text" :placeholder="placeholder"
                :rows="compact ? 2 : 3"
                class="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                @input="onInput" @keydown="onKeydown" />

            <!-- Autocomplete de menções -->
            <div v-if="mentionOpen && mentionResults.length"
                class="absolute z-20 mt-1 w-64 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                <button v-for="(u, idx) in mentionResults" :key="u.id" type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                    :class="idx === mentionActiveIdx
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                    @click="pickMention(u)">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {{ initials(u.username) }}
                    </span>
                    <span class="font-medium text-slate-900 dark:text-slate-100">{{ u.username }}</span>
                    <span v-if="u.position" class="ml-auto text-xs text-slate-400 dark:text-slate-500">{{ u.position }}</span>
                </button>
            </div>
        </div>

        <div class="flex items-center justify-end gap-2">
            <button v-if="$attrs.onCancel !== undefined" type="button"
                class="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                @click="$emit('cancel')">
                Cancelar
            </button>
            <button type="button" :disabled="!canSubmit || busy"
                class="rounded-xl bg-slate-900 dark:bg-white px-4 py-1.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                @click="submit">
                {{ busy ? 'Enviando...' : 'Comentar' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
    placeholder: { type: String, default: 'Escreva um comentário...' },
    busy: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
});

const emit = defineEmits(['submit', 'cancel']);

const taEl = ref(null);
const text = ref('');

const canSubmit = computed(() => text.value.trim().length > 0);

// ── Autocomplete de menções @ ────────────────────────────────────────
const mentionOpen = ref(false);
const mentionResults = ref([]);
const mentionActiveIdx = ref(0);
const mentionQuery = ref('');
let mentionDebounce = null;

function initials(name) {
    return String(name || '?').slice(0, 2).toUpperCase();
}

function detectMention() {
    const el = taEl.value;
    if (!el) return null;
    const pos = el.selectionStart;
    const before = text.value.slice(0, pos);
    // último @palavra sem espaço
    const m = before.match(/@([a-zA-Z0-9._-]*)$/);
    return m ? { query: m[1], start: pos - m[1].length - 1 } : null;
}

async function onInput() {
    const m = detectMention();
    if (!m) {
        mentionOpen.value = false;
        return;
    }
    mentionQuery.value = m.query;
    if (mentionDebounce) clearTimeout(mentionDebounce);
    mentionDebounce = setTimeout(async () => {
        if (m.query.length < 1) {
            mentionOpen.value = false;
            return;
        }
        try {
            const data = await requestWithAuth(`/academy/users/lookup?q=${encodeURIComponent(m.query)}&limit=8`);
            mentionResults.value = Array.isArray(data?.results) ? data.results : [];
            mentionActiveIdx.value = 0;
            mentionOpen.value = mentionResults.value.length > 0;
        } catch {
            mentionOpen.value = false;
        }
    }, 200);
}

function pickMention(u) {
    const el = taEl.value;
    if (!el) return;
    const pos = el.selectionStart;
    const before = text.value.slice(0, pos);
    const after = text.value.slice(pos);
    const replaced = before.replace(/@([a-zA-Z0-9._-]*)$/, `@${u.username} `);
    text.value = replaced + after;
    mentionOpen.value = false;
}

function onKeydown(e) {
    if (!mentionOpen.value) {
        // Ctrl/Cmd+Enter envia
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionActiveIdx.value = (mentionActiveIdx.value + 1) % mentionResults.value.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionActiveIdx.value = (mentionActiveIdx.value - 1 + mentionResults.value.length) % mentionResults.value.length;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        pickMention(mentionResults.value[mentionActiveIdx.value]);
    } else if (e.key === 'Escape') {
        mentionOpen.value = false;
    }
}

function submit() {
    if (!canSubmit.value || props.busy) return;
    emit('submit', text.value.trim());
    text.value = '';
    mentionOpen.value = false;
}
</script>
