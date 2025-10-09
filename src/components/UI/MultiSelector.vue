<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

/**
 * MultiSelector — com “Selecionar tudo (filtrado)” + otimizações
 * - Emissão em lote via requestAnimationFrame (evita travar com listas grandes)
 * - Select-all atua sobre a LISTA FILTRADA (mais útil no dia a dia)
 */

const props = defineProps({
    options: { type: Array, default: () => [] },          // array<string>
    modelValue: { type: Array, default: () => [] },        // array<string>
    placeholder: { type: String, default: 'Selecione...' },
    searchDebounce: { type: Number, default: 180 },
    pageSize: { type: Number, default: 150 },
    disabled: { type: Boolean, default: false },

    // classes externas
    wrapperClass: { type: String, default: 'relative' },
    buttonClass: { type: String, default: 'w-full px-3 py-2 rounded-lg border text-left' },
    panelClass: { type: String, default: 'absolute z-10 mt-1 max-h-72 w-full overflow-hidden rounded-md border shadow bg-white dark:bg-gray-800' },
    searchClass: { type: String, default: 'w-full mb-2 px-2 py-1 rounded border text-sm' },
    optionClass: { type: String, default: 'flex items-center gap-2 py-1 px-2 cursor-pointer' },
});

const emit = defineEmits(['update:modelValue', 'open', 'close', 'change']);

const open = ref(false);
const wrapperRef = ref(null);

// seleção interna via Set (leve)
const selectedSet = ref(new Set(props.modelValue));
const selected = computed(() => Array.from(selectedSet.value));

// sincroniza mudanças externas
watch(
    () => props.modelValue,
    (arr) => { selectedSet.value = new Set(Array.isArray(arr) ? arr : []); },
    { deep: false }
);

// click fora
function onDocClick(e) {
    if (open.value && wrapperRef.value && !wrapperRef.value.contains(e.target)) {
        open.value = false;
        emit('close');
    }
}
onMounted(() => document.addEventListener('click', onDocClick, { capture: true, passive: true }));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, { capture: true }));

// abrir/fechar
function toggleOpen() {
    if (props.disabled) return;
    open.value = !open.value;
    emit(open.value ? 'open' : 'close');
}

// ===== Busca com debounce =====
const searchRaw = ref('');
const search = ref('');
let t;
watch(searchRaw, (v) => {
    clearTimeout(t);
    t = setTimeout(() => (search.value = v), props.searchDebounce);
});

// ===== Pré-processamento: cache em minúsculas =====
const optionsLc = computed(() =>
    (props.options || []).map(o => [o, (o ?? '').toString().toLowerCase()])
);

// opções filtradas (usando cache)
const filteredOptions = computed(() => {
    const s = (search.value || '').trim().toLowerCase();
    if (!s) return optionsLc.value.map(([orig]) => orig);
    const out = [];
    for (let i = 0; i < optionsLc.value.length; i++) {
        const [orig, low] = optionsLc.value[i];
        if (low.includes(s)) out.push(orig);
    }
    return out;
});

// virtualização simples
const page = ref(props.pageSize);
const visibleOptions = computed(() => filteredOptions.value.slice(0, page.value));
function onScroll(e) {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
        page.value += props.pageSize;
    }
}

// ===== Emissão (aplica imediatamente) =====
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

// toggle item
function toggle(option) {
    const set = new Set(selectedSet.value);
    if (set.has(option)) set.delete(option); else set.add(option);
    selectedSet.value = set;
    emitSelectedOnce();
}

// limpar total (opcional de fora)
function clearAll() {
    selectedSet.value = new Set();
    emitSelectedOnce();
}

// ====== Select All (atua sobre a lista FILTRADA) ======
const masterRef = ref(null);
const filteredCount = computed(() => filteredOptions.value.length);
const selectedInFiltered = computed(() => {
    let c = 0;
    const set = selectedSet.value;
    const list = filteredOptions.value;
    for (let i = 0; i < list.length; i++) if (set.has(list[i])) c++;
    return c;
});
const allFilteredSelected = computed(() => filteredCount.value > 0 && selectedInFiltered.value === filteredCount.value);
const noneFilteredSelected = computed(() => selectedInFiltered.value === 0);

// controla estado indeterminate do checkbox master
watch([selectedInFiltered, filteredCount], async () => {
    await nextTick();
    if (!masterRef.value) return;
    masterRef.value.indeterminate = !allFilteredSelected.value && !noneFilteredSelected.value && filteredCount.value > 0;
});

// selecionar/limpar tudo do filtro atual
function toggleSelectAllFiltered(e) {
    const check = e?.target?.checked ?? !allFilteredSelected.value;
    const set = new Set(selectedSet.value);
    const list = filteredOptions.value;

    if (check) {
        for (let i = 0; i < list.length; i++) set.add(list[i]);
    } else {
        for (let i = 0; i < list.length; i++) set.delete(list[i]);
    }
    selectedSet.value = set;
    emitSelectedOnce();
}
</script>

<template>
    <div :class="wrapperClass" ref="wrapperRef">
        <!-- Botão -->
        <button type="button" class="border-gray-200 dark:border-gray-600 max-h-20 overflow-y-auto" :disabled="disabled"
            :class="buttonClass" @click="toggleOpen">
            <slot name="button" :selected="selected">
                <span v-if="selected.length">{{ selected.join(', ') }}</span>
                <span v-else class="opacity-60">{{ placeholder }}</span>
            </slot>
        </button>

        <!-- Painel -->
        <div v-if="open" class="border-gray-200 dark:border-gray-700" :class="panelClass" role="listbox"
            aria-multiselectable="true">
            <!-- Busca -->
            <div class="p-2 sticky top-0 bg-inherit">
                <input v-model="searchRaw" class="border-gray-200 dark:border-gray-700 bg-gray-700" type="text"
                    :class="searchClass" placeholder="Filtrar..." aria-label="Filtro de opções" />
            </div>

            <!-- Master checkbox (Selecionar/Remover tudo do filtrado) -->
            <div
                class="px-2 py-1 sticky top-10 bg-inherit flex items-center gap-2 text-sm border-b border-gray-200 dark:border-gray-700">
                <input ref="masterRef" type="checkbox" class="accent-blue-600" :checked="allFilteredSelected"
                    @change="toggleSelectAllFiltered" />
                <span>
                    {{ allFilteredSelected ? 'Remover tudo (filtrado)' : 'Selecionar tudo (filtrado)' }}
                    <span class="opacity-60">— {{ selectedInFiltered }} / {{ filteredCount }}</span>
                </span>
            </div>

            <!-- Lista -->
            <div class="max-h-60 overflow-auto pb-12" @scroll.passive="onScroll">
                <label v-for="opt in visibleOptions" :key="opt" :class="optionClass">
                    <input type="checkbox" class="accent-blue-600" :checked="selectedSet.has(opt)"
                        @change="toggle(opt)" />
                    <slot name="option" :option="opt" :checked="selectedSet.has(opt)">
                        <span class="truncate">{{ opt }}</span>
                    </slot>
                </label>

                <div v-if="visibleOptions.length < filteredOptions.length" class="p-2 text-center text-xs opacity-60">
                    Carregando… ({{ visibleOptions.length }}/{{ filteredOptions.length }})
                </div>
            </div>
        </div>
    </div>
</template>
