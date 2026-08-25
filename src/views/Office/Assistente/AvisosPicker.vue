<script setup>
// Quando avisar, antes do prazo. Vários de uma vez.
//
// A pessoa pediu "me lembra 2 dias antes E 1 hora antes", e um campo único de
// data nunca daria conta disso. O valor é uma lista de MINUTOS ANTES DO PRAZO,
// e não de datas: adiar a tarefa move todos os avisos junto, sem a pessoa ter
// que refazer nada.
//
// SEM PRAZO NÃO HÁ AVISO. Em vez de esconder o campo (o que faria a pessoa
// procurar onde ele foi parar), ele fica visível e desligado, dizendo o motivo.

import { computed, ref } from 'vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },   // [2880, 60]
    temPrazo: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);

// Os degraus que cobrem quase todo pedido real. O resto entra pelo campo livre.
const DEGRAUS = [
    { min: 15, curto: '15 min' },
    { min: 60, curto: '1 hora' },
    { min: 180, curto: '3 horas' },
    { min: 1440, curto: '1 dia' },
    { min: 2880, curto: '2 dias' },
    { min: 10080, curto: '1 semana' },
];

const lista = computed(() => [...(props.modelValue || [])].sort((a, b) => b - a));

function alternar(min) {
    const atual = props.modelValue || [];
    emit('update:modelValue', atual.includes(min)
        ? atual.filter(m => m !== min)
        : [...atual, min].slice(0, 6));
}

// ── Um valor que não está nos degraus ────────────────────────────────────────
const livreAberto = ref(false);
const livreN = ref(2);
const livreUnidade = ref('dias');

function somarLivre() {
    const n = Number(livreN.value);
    if (!Number.isFinite(n) || n <= 0) return;
    const fator = { min: 1, horas: 60, dias: 1440, semanas: 10080 }[livreUnidade.value] || 1;
    const min = Math.round(n * fator);
    if (!(props.modelValue || []).includes(min)) {
        emit('update:modelValue', [...(props.modelValue || []), min].slice(0, 6));
    }
    livreAberto.value = false;
}

/** 2880 -> "2 dias antes". O mesmo texto que a Eme fala, de propósito. */
function rotulo(min) {
    if (min % 10080 === 0) { const n = min / 10080; return `${n} semana${n > 1 ? 's' : ''} antes`; }
    if (min % 1440 === 0) { const n = min / 1440; return `${n} dia${n > 1 ? 's' : ''} antes`; }
    if (min % 60 === 0) { const n = min / 60; return `${n} hora${n > 1 ? 's' : ''} antes`; }
    return `${min} min antes`;
}

defineExpose({ rotulo });
</script>

<template>
    <div>
        <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-medium text-ink-muted">Me avise</label>
            <span v-if="lista.length" class="text-micro text-ink-subtle tabular-nums">
                {{ lista.length }} aviso{{ lista.length > 1 ? 's' : '' }}
            </span>
        </div>

        <div class="flex gap-1.5 flex-wrap" :class="temPrazo ? '' : 'opacity-40 pointer-events-none'">
            <button v-for="d in DEGRAUS" :key="d.min" type="button" @click="alternar(d.min)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium
                       border transition-all duration-120 ease-out-expo"
                :class="(modelValue || []).includes(d.min)
                    ? 'bg-accent-soft border-accent/40 text-accent'
                    : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'">
                <i v-if="(modelValue || []).includes(d.min)" class="fas fa-check text-[0.6rem]"></i>
                {{ d.curto }}
            </button>

            <button type="button" @click="livreAberto = !livreAberto"
                class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium border border-dashed border-line
                       text-ink-subtle hover:text-accent hover:border-accent/40 transition-all duration-120">
                <i class="fas fa-plus text-[0.6rem] mr-1"></i>outro
            </button>
        </div>

        <Transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120 ease-out-expo"
            leave-to-class="opacity-0">
            <div v-if="livreAberto && temPrazo" class="flex items-center gap-1.5 mt-2">
                <input v-model.number="livreN" type="number" min="1" max="999"
                    class="w-16 px-2 py-1.5 rounded-lg border border-line bg-surface-sunken text-ink text-sm
                           tabular-nums outline-none focus:border-accent/50" />
                <select v-model="livreUnidade"
                    class="px-2 py-1.5 rounded-lg border border-line bg-surface-sunken text-ink text-xs
                           outline-none focus:border-accent/50">
                    <option value="min">minutos</option>
                    <option value="horas">horas</option>
                    <option value="dias">dias</option>
                    <option value="semanas">semanas</option>
                </select>
                <span class="text-micro text-ink-subtle">antes</span>
                <button type="button" @click="somarLivre"
                    class="px-2.5 py-1.5 rounded-lg text-micro font-medium bg-accent-soft text-accent
                           hover:brightness-105 transition-all duration-120">somar</button>
            </div>
        </Transition>

        <p v-if="!temPrazo" class="text-micro text-ink-subtle mt-1.5">
            Marque um prazo primeiro - o aviso é contado a partir dele.
        </p>
        <p v-else-if="lista.length" class="text-micro text-ink-subtle mt-1.5">
            Aviso {{ lista.map(rotulo).join(' e ') }}. Mudar o prazo move todos junto.
        </p>
        <p v-else class="text-micro text-ink-subtle mt-1.5">
            Sem escolha, o aviso sai na hora do prazo.
        </p>
    </div>
</template>
