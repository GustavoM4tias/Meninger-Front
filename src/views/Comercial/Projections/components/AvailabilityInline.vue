<script setup>
import { computed, ref, nextTick } from 'vue';

const props = defineProps({
    summary: { type: Object, default: null },
    totalUnits: { type: [Number, String], default: null },
    // ✅ simples: só libera edição se o pai deixar
    editable: { type: Boolean, default: true },
});

const emit = defineEmits(['update:totalUnits']); // ✅ novo

const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};

// --- valores vindos do summary (quando existe) ---
const totalFromSummary = computed(() => n(props.summary?.totalUnits));
const soldFromSummary = computed(() => n(props.summary?.soldUnitsStock ?? props.summary?.soldUnits));
const reservedFromSummary = computed(() => n(props.summary?.reservedUnits));
const blockedFromSummary = computed(() => n(props.summary?.blockedUnits));
const availableFromSummary = computed(() => n(props.summary?.availableUnits));

// --- fallback total (quando NÃO existe summary) ---
const totalFallback = computed(() => {
    const v = n(props.totalUnits);
    return v > 0 ? v : 0;
});

// ✅ decide o “modo” de renderização
const mode = computed(() => {
    if (props.summary) return 'full';
    if (totalFallback.value > 0) return 'totalOnly';
    return 'empty';
});

// valores finais usados pelo template
const total = computed(() => (mode.value === 'full' ? totalFromSummary.value : totalFallback.value));
const sold = computed(() => (mode.value === 'full' ? soldFromSummary.value : 0));
const reserved = computed(() => (mode.value === 'full' ? reservedFromSummary.value : 0));
const blocked = computed(() => (mode.value === 'full' ? blockedFromSummary.value : 0));
const available = computed(() => (mode.value === 'full' ? availableFromSummary.value : 0));

// barra (full)
const pct = computed(() => {
    if (mode.value !== 'full') return 0;
    if (total.value <= 0) return 0;
    const unavailable = total.value - available.value;
    return Math.max(0, Math.min(100, Math.round((unavailable / total.value) * 100)));
});

/* ✅ NOVO: edição simples só no EMPTY */
const editing = ref(false);
const temp = ref('');

function startEdit() {
    if (!props.editable) return;
    editing.value = true;

    const cur = n(props.totalUnits);
    temp.value = cur > 0 ? String(cur) : '';

    nextTick(() => document.getElementById('ai-total-units')?.focus());
}

function commit() {
    if (!props.editable) { editing.value = false; return; }

    const raw = String(temp.value ?? '').trim();

    // vazio => limpa
    if (raw === '') {
        emit('update:totalUnits', null);
        editing.value = false;
        return;
    }

    const v = n(raw);

    // ✅ permite 0: 0 limpa e volta pro EMPTY
    if (v <= 0) {
        emit('update:totalUnits', null);
        editing.value = false;
        return;
    }

    emit('update:totalUnits', v);
    editing.value = false;
}

function cancel() {
    editing.value = false;
}
</script>

<template>
    <!-- ✅ FULL: comportamento atual -->
    <div v-if="mode === 'full'" class="mt-3">
        <div class="flex flex-wrap pb-1 gap-1">
            <span
                class="inline-flex items-center ps-1 pe-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 text-[10px] font-medium cursor-pointer"
                v-tippy="'Carga total de unidades do empreendimento'">
                <span class="w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                {{ total }}
            </span>

            <span
                class="inline-flex items-center ps-1 pe-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-medium cursor-pointer"
                v-tippy="'Unidades livres para comercialização imediata'">
                <span class="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
                {{ available }}
            </span>

            <span
                class="inline-flex items-center ps-1 pe-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 text-[10px] font-medium cursor-pointer"
                v-tippy="'Unidades com reserva ativa ou em processo de proposta'">
                <span class="w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
                {{ reserved }}
            </span>

            <span
                class="inline-flex items-center ps-1 pe-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800 text-[10px] font-medium cursor-pointer"
                v-tippy="'Contratos de venda finalizados'">
                <span class="w-2 h-2 rounded-full bg-rose-500 mr-1"></span>
                {{ sold }}
            </span>

            <span
                class="inline-flex items-center ps-1 pe-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 text-[10px] font-medium cursor-pointer"
                v-tippy="'Unidades bloqueadas administrativamente'">
                <span class="w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
                {{ blocked }}
            </span>
        </div>

        <!-- <div class="space-y-1.5">
            <div class="flex justify-between items-end px-0.5">
                <span class="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                    Status de Vendas
                </span>
                <span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {{ pct }}% Ocupado
                </span>
            </div>

            <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-help"
                v-tippy="`A barra verde cresce conforme a disponibilidade diminui.<br><b>Vendas atual: ${pct}%</b>`">
                <div class="h-full bg-emerald-500 transition-all duration-700 ease-in-out shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)]"
                    :style="{ width: pct + '%' }" />
            </div>

            <div class="flex justify-between text-[10px] text-gray-400 font-medium px-0.5">
                <span>100% Livre</span>
                <span>Esgotado</span>
            </div>
        </div> -->
    </div>

    <!-- ✅ TOTAL ONLY: não tem summary, mas tem totalUnits -->
    <div v-else-if="mode === 'totalOnly'" class="mt-3">
        <div class="flex flex-wrap pb-1 gap-1">
            <!-- quando NÃO está editando: chip clicável -->
            <span v-if="!editing"
                class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-500 text-[10px] font-medium"
                :class="editable ? 'cursor-pointer hover:text-indigo-600' : ''"
                v-tippy="editable ? 'Clique para editar o total de unidades' : 'Carga total de unidades do empreendimento'"
                @click="startEdit">
                <span class="w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                {{ total }}
                <!-- <span v-if="editable" class="ml-1 underline decoration-dotted">(editar)</span> -->
            </span>

            <!-- quando está editando: input + botões -->
            <div v-else class="flex items-center gap-2">
                <input id="ai-total-units" type="number" min="0" v-model="temp"
                    class="w-28 h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 text-[11px] focus:outline-none"
                    placeholder="Total" @keyup.enter="commit" @keyup.esc="cancel" />
                <button class="h-8 px-2 rounded bg-indigo-600 text-white text-[11px] hover:bg-indigo-500"
                    @mousedown.prevent @click="commit">
                    OK
                </button>
                <button
                    class="h-8 px-2 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800"
                    @mousedown.prevent @click="cancel">
                    Cancelar
                </button>
            </div>
        </div>
    </div>

    <!-- ✅ EMPTY -->
    <div v-else class="mt-2 p-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
        <template v-if="!editing">
            <p class="text-[10px] text-gray-500" :class="editable ? 'cursor-pointer hover:text-indigo-600' : ''"
                @click="startEdit"><i class="fas fa-circle-info mr-1.5"></i> Dados de disponibilidade indisponíveis.
                <!-- <span v-if="editable" class="ml-1 underline decoration-dotted">(clique para informar total)</span> -->
            </p>
        </template>

        <template v-else>
            <div class="flex items-center justify-center gap-2">
                <input id="ai-total-units" type="number" min="0" v-model="temp"
                    class="w-28 h-8 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 text-[11px] focus:outline-none"
                    placeholder="Total" @keyup.enter="commit" @keyup.esc="cancel" @blur="commit" />
                <button class="h-8 px-2 rounded bg-indigo-600 text-white text-[11px] hover:bg-indigo-500"
                    @mousedown.prevent @click="commit">
                    OK
                </button>
            </div>
        </template>
    </div>

</template>
