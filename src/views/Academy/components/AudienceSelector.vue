<template>
    <section
        class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                <i class="fa-solid fa-shield-halved text-indigo-500"></i>
                Visibilidade
            </h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Quem pode enxergar este conteúdo. Escolha exatamente uma opção.
            </p>
        </div>
        <div class="space-y-3 p-5">
            <!-- 4 classes (radio-cards) -->
            <ul class="space-y-1.5">
                <li v-for="opt in OPTIONS" :key="opt.value">
                    <label
                        class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition"
                        :class="selected === opt.value
                            ? 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/40'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20'">
                        <input type="radio" name="kb-visibility" class="mt-0.5 h-4 w-4 accent-indigo-600"
                            :value="opt.value" :checked="selected === opt.value" @change="pick(opt.value)" />
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <i :class="[opt.icon, 'text-xs', opt.iconColor]"></i>
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ opt.label }}
                                </span>
                                <span class="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                    :class="opt.tint">
                                    {{ opt.badge }}
                                </span>
                            </div>
                            <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                {{ opt.hint }}
                            </p>
                        </div>
                    </label>
                </li>
            </ul>

            <!-- feedback -->
            <p v-if="!selected"
                class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                Sem visibilidade selecionada, ninguém verá o conteúdo. Escolha uma opção.
            </p>
            <p v-else-if="selected === 'INTERNAL' || selected === 'ADMIN'"
                class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <i class="fa-solid fa-lock mr-1"></i>
                Conteúdo protegido — <strong>não aparece</strong> para corretores, imobiliárias nem correspondentes.
            </p>
            <p v-else
                class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                <i class="fa-solid fa-eye mr-1"></i>
                Atenção: este conteúdo ficará visível para o <strong>público externo</strong>
                (corretores, imobiliárias e correspondentes). Não publique informação interna aqui.
            </p>
        </div>
    </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

// ── Modelo de 4 classes (espelha services/academy/audience.js do backend) ──
// O v-model continua sendo um ARRAY de tokens (compat com Editor/trilhas/
// tópicos); este componente apenas restringe a escolha às 4 classes e emite
// sempre o set CANÔNICO correspondente. O backend re-canonicaliza por garantia.
const INTERNAL_TOKENS = ['INTERNAL', 'GESTOR'];
const EXTERNAL_TOKENS = ['BROKER', 'REALESTATE', 'CORRESPONDENT'];

const CANONICAL = {
    INTERNAL: INTERNAL_TOKENS.slice(),
    EXTERNAL: EXTERNAL_TOKENS.slice(),
    BOTH: [...INTERNAL_TOKENS, ...EXTERNAL_TOKENS],
    ADMIN: ['ADMIN'],
};

const OPTIONS = [
    {
        value: 'INTERNAL',
        label: 'Interno (Office)',
        badge: 'interno',
        icon: 'fa-solid fa-building-lock',
        iconColor: 'text-indigo-500',
        hint: 'Funcionários e gestores Menin. Nunca aparece para o público externo.',
        tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    },
    {
        value: 'EXTERNAL',
        label: 'Externo',
        badge: 'externo',
        icon: 'fa-solid fa-handshake',
        iconColor: 'text-emerald-500',
        hint: 'Corretores, imobiliárias e correspondentes. Internos e admin também enxergam pelo painel.',
        tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
        value: 'BOTH',
        label: 'Ambos',
        badge: 'ambos',
        icon: 'fa-solid fa-globe',
        iconColor: 'text-sky-500',
        hint: 'Interno + externo: todo mundo com acesso ao Academy enxerga.',
        tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    },
    {
        value: 'ADMIN',
        label: 'Somente administradores',
        badge: 'admin',
        icon: 'fa-solid fa-user-shield',
        iconColor: 'text-rose-500',
        hint: 'Conteúdo sensível — só quem tem role=admin enxerga.',
        tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    },
];

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

// Deriva a classe a partir de QUALQUER set de tokens (inclusive legados).
function deriveVisibility(audiences) {
    const a = Array.isArray(audiences) ? audiences.map((t) => String(t || '').toUpperCase()) : [];
    if (!a.length) return '';
    const hasInt = a.some((t) => INTERNAL_TOKENS.includes(t));
    const hasExt = a.some((t) => EXTERNAL_TOKENS.includes(t));
    if (hasInt && hasExt) return 'BOTH';
    if (hasInt) return 'INTERNAL';
    if (hasExt) return 'EXTERNAL';
    return 'ADMIN';
}

const selected = ref(deriveVisibility(props.modelValue));

watch(() => props.modelValue, (v) => {
    const next = deriveVisibility(v);
    if (next !== selected.value) selected.value = next;
});

function pick(value) {
    selected.value = value;
    emit('update:modelValue', CANONICAL[value].slice());
}
</script>
