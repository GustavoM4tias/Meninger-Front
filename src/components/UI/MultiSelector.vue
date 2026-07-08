<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
    options: { type: Array, default: () => [] },
    modelValue: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Selecione...' },
    label: { type: String, default: '' },
    searchDebounce: { type: Number, default: 180 },
    pageSize: { type: Number, default: 150 },
    disabled: { type: Boolean, default: false },
    single: { type: Boolean, default: false },
    // Teleporta o dropdown pro <body> (position: fixed, acima de modais).
    // Use dentro de Modal, onde overflow-hidden/auto cortaria o painel.
    overlay: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'open', 'close', 'change']);

const open = ref(false);
const wrapperRef = ref(null);
const panelRef = ref(null);
const searchInputRef = ref(null);
const masterRef = ref(null);

// ── Overlay: dropdown fixo ancorado no trigger (segue scroll/resize) ──
const panelStyle = ref({});
function updatePanelPosition() {
    if (!props.overlay || !wrapperRef.value) return;
    const r = wrapperRef.value.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    // Painel ~330px (busca + lista). Abre pra cima quando não cabe embaixo.
    const openUp = spaceBelow < 330 && r.top > spaceBelow;
    panelStyle.value = {
        position: 'fixed',
        left: `${r.left}px`,
        width: `${r.width}px`,
        ...(openUp
            ? { bottom: `${window.innerHeight - r.top + 6}px` }
            : { top: `${r.bottom + 6}px` }),
    };
}
function onReposition() { if (open.value) updatePanelPosition(); }
watch(open, (v) => {
    if (!props.overlay) return;
    if (v) {
        updatePanelPosition();
        window.addEventListener('scroll', onReposition, { capture: true, passive: true });
        window.addEventListener('resize', onReposition, { passive: true });
    } else {
        window.removeEventListener('scroll', onReposition, { capture: true });
        window.removeEventListener('resize', onReposition);
    }
});
onBeforeUnmount(() => {
    window.removeEventListener('scroll', onReposition, { capture: true });
    window.removeEventListener('resize', onReposition);
});

// internal selection Set
const selectedSet = ref(new Set(props.modelValue));
const selected = computed(() => Array.from(selectedSet.value));

watch(() => props.modelValue, (arr) => {
    selectedSet.value = new Set(Array.isArray(arr) ? arr : []);
}, { deep: false });

// click outside
function onDocClick(e) {
    if (!open.value) return;
    const inWrapper = wrapperRef.value?.contains(e.target);
    // Com overlay, o painel vive no <body> — clique nele não pode fechar.
    const inPanel = panelRef.value?.contains(e.target);
    if (!inWrapper && !inPanel) {
        open.value = false;
        emit('close');
    }
}
onMounted(() => document.addEventListener('click', onDocClick, { capture: true, passive: true }));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, { capture: true }));

function toggleOpen() {
    if (props.disabled) return;
    open.value = !open.value;
    emit(open.value ? 'open' : 'close');
    if (open.value) {
        nextTick(() => setTimeout(() => { searchInputRef.value?.focus(); try { searchInputRef.value?.select(); } catch { } }, 0));
    }
}

// search debounce
const searchRaw = ref('');
const search = ref('');
let t;
watch(searchRaw, (v) => { clearTimeout(t); t = setTimeout(() => (search.value = v), props.searchDebounce); });

// lowercased cache
const optionsLc = computed(() =>
    (props.options || []).map(o => [o, (o ?? '').toString().toLowerCase()])
);

const filteredOptions = computed(() => {
    const s = (search.value || '').trim().toLowerCase();
    if (!s) return optionsLc.value.map(([orig]) => orig);
    const out = [];
    for (const [orig, low] of optionsLc.value) if (low.includes(s)) out.push(orig);
    return out;
});

const page = ref(props.pageSize);
const visibleOptions = computed(() => filteredOptions.value.slice(0, page.value));
function onScroll(e) {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) page.value += props.pageSize;
}

// emit batch
let rafId = 0;
function emitSelectedOnce() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        rafId = 0;
        const arr = Array.from(selectedSet.value);
        emit('update:modelValue', arr);
        emit('change', arr);
    });
}

function toggle(option) {
    if (props.single) {
        selectedSet.value = new Set([option]);
        emitSelectedOnce();
        open.value = false;
        emit('close');
        return;
    }
    const set = new Set(selectedSet.value);
    set.has(option) ? set.delete(option) : set.add(option);
    selectedSet.value = set;
    emitSelectedOnce();
}

function clearAll() {
    selectedSet.value = new Set();
    emitSelectedOnce();
}

// select-all (filtered)
const filteredCount = computed(() => filteredOptions.value.length);
const selectedInFiltered = computed(() => { let c = 0; for (const o of filteredOptions.value) if (selectedSet.value.has(o)) c++; return c; });
const allFilteredSelected = computed(() => filteredCount.value > 0 && selectedInFiltered.value === filteredCount.value);
const noneFilteredSelected = computed(() => selectedInFiltered.value === 0);

watch([selectedInFiltered, filteredCount], async () => {
    await nextTick();
    if (!masterRef.value) return;
    masterRef.value.indeterminate = !allFilteredSelected.value && !noneFilteredSelected.value && filteredCount.value > 0;
});

function toggleSelectAllFiltered(e) {
    const check = e?.target?.checked ?? !allFilteredSelected.value;
    const set = new Set(selectedSet.value);
    for (const o of filteredOptions.value) check ? set.add(o) : set.delete(o);
    selectedSet.value = set;
    emitSelectedOnce();
}
</script>

<template>
    <div class="relative w-full" ref="wrapperRef">
        <!-- Label -->
        <label v-if="label" class="block text-xs font-medium text-ink-muted mb-1.5">
            {{ label }}
        </label>

        <!-- Trigger button -->
        <button type="button" :disabled="disabled" @click="toggleOpen"
            class="w-full flex items-center justify-between gap-2 px-3.5 py-2 h-9 text-sm text-left
                   bg-surface-raised border border-line rounded-lg shadow-inner-soft
                   outline-none transition-all duration-150 ease-out-expo
                   hover:border-line-strong
                   focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20
                   disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="truncate" :class="selected.length === 0 ? 'text-ink-subtle' : 'text-ink'">
                <slot name="button" :selected="selected">
                    <template v-if="selected.length === 1">{{ selected[0] }}</template>
                    <template v-else-if="selected.length > 1">{{ selected.length }} selecionados</template>
                    <template v-else>{{ placeholder }}</template>
                </slot>
            </span>
            <i class="fas fa-chevron-down text-ink-subtle text-xs transition-transform duration-200 shrink-0"
                :class="{ 'rotate-180': open }"></i>
        </button>

        <!-- Dropdown panel (overlay: teleporta pro body, acima de modais) -->
        <teleport to="body" :disabled="!overlay">
        <transition name="dropdown">
            <div v-if="open" ref="panelRef" :style="overlay ? panelStyle : null"
                :class="overlay ? 'z-[10000]' : 'absolute z-50 mt-1.5 w-full'"
                class="bg-surface-overlay border border-line
                       rounded-xl shadow-overlay overflow-hidden"
                role="listbox" aria-multiselectable="true">
                <!-- Search -->
                <div class="p-2 border-b border-line">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
                        <input ref="searchInputRef" v-model="searchRaw" type="text" placeholder="Filtrar..."
                            aria-label="Filtro de opções"
                            class="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-line rounded-lg
                                   outline-none text-ink placeholder:text-ink-subtle
                                   focus:border-accent-ring focus:ring-1 focus:ring-accent-ring/20" />
                    </div>
                </div>

                <!-- Select all row (multi only) -->
                <div v-if="!single"
                    class="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted
                           border-b border-line bg-surface-sunken/40">
                    <input ref="masterRef" type="checkbox" class="cursor-pointer"
                        :checked="allFilteredSelected" @change="toggleSelectAllFiltered" />
                    <span class="cursor-pointer select-none" @click="toggleSelectAllFiltered">
                        {{ allFilteredSelected ? 'Remover todos' : 'Selecionar todos' }}
                    </span>
                    <span class="ml-auto font-mono text-ink-subtle">{{ selectedInFiltered }}/{{ filteredCount }}</span>
                </div>

                <!-- Options list -->
                <div class="max-h-56 overflow-y-auto" @scroll.passive="onScroll">
                    <label v-for="opt in visibleOptions" :key="opt"
                        class="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer text-ink
                               hover:bg-accent-soft/40 transition-colors duration-100"
                        :class="{ 'bg-accent-soft/60': single && selectedSet.has(opt) }">
                        <input v-if="!single" type="checkbox" class="cursor-pointer shrink-0"
                            :checked="selectedSet.has(opt)" @change="toggle(opt)" />
                        <i v-else class="fas shrink-0 text-xs w-3"
                            :class="selectedSet.has(opt) ? 'fa-circle-dot text-accent' : 'fa-circle text-ink-subtle/50'"
                            @click.prevent="toggle(opt)"></i>
                        <slot name="option" :option="opt" :checked="selectedSet.has(opt)">
                            <span class="truncate" @click.prevent="toggle(opt)" :title="opt">{{ opt }}</span>
                        </slot>
                    </label>

                    <div v-if="visibleOptions.length === 0" class="px-3 py-4 text-sm text-center text-ink-subtle">
                        Nenhum resultado encontrado.
                    </div>

                    <div v-if="visibleOptions.length < filteredOptions.length"
                        class="px-3 py-2 text-xs text-center text-ink-subtle">
                        Carregando... ({{ visibleOptions.length }}/{{ filteredOptions.length }})
                    </div>
                </div>
            </div>
        </transition>
        </teleport>
    </div>
</template>

<style scoped>
.dropdown-enter-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-leave-active {
    transition: opacity 0.1s ease, transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>