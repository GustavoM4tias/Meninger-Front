<script setup>
const props = defineProps({ rule: { type: Object, required: true } });
defineEmits(['remove']);

const STATES = [
    { v: 'TODO', l: 'A fazer' },
    { v: 'IN_PROGRESS', l: 'Em andamento' },
    { v: 'BLOCKED', l: 'Bloqueada' },
];

function offsetLabel(r) {
    const o = Number(r.offset_days) || 0;
    let base = o < 0 ? `${Math.abs(o)} dia(s) antes do prazo` : o === 0 ? 'no dia do prazo' : `${o} dia(s) após o prazo`;
    if (r.repeat_every_days) base += `, repetindo a cada ${r.repeat_every_days} dia(s)` + (r.max_occurrences ? ` (até ${r.max_occurrences}x)` : '');
    return base;
}
function toggleState(st) {
    const arr = props.rule.apply_states || (props.rule.apply_states = []);
    const i = arr.indexOf(st);
    if (i >= 0) arr.splice(i, 1); else arr.push(st);
}

const inputCls = 'rounded-lg border border-line bg-surface text-ink px-2 py-1.5 text-sm focus-ring';
const titleHint = 'Título (ex.: Faltam {{daysToDue}} dias: {{task}})';
const bodyHint = 'Mensagem - tokens: {{task}} {{checklist}} {{due}} {{daysLate}} {{daysToDue}} {{assignee}}';
</script>

<template>
    <div :class="!rule.active ? 'opacity-60' : ''">
        <div class="flex items-center gap-3 mb-3">
            <input v-model="rule.name" :class="inputCls + ' flex-1 font-semibold'" />
            <label class="flex items-center gap-1 text-xs text-ink-muted whitespace-nowrap"><input type="checkbox" v-model="rule.active" /> ativa</label>
            <button @click="$emit('remove')" class="text-xs text-red-500 hover:text-red-400 focus-ring rounded"><i class="fas fa-trash"></i></button>
        </div>
        <p class="text-xs text-amber-600 dark:text-amber-400 mb-3"><i class="fas fa-clock"></i> {{ offsetLabel(rule) }}</p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <label class="text-xs text-ink-muted">Offset (dias)<input type="number" v-model.number="rule.offset_days" :class="inputCls + ' w-full mt-1'" /></label>
            <label class="text-xs text-ink-muted">Repetir a cada<input type="number" min="1" v-model.number="rule.repeat_every_days" placeholder="—" :class="inputCls + ' w-full mt-1'" /></label>
            <label class="text-xs text-ink-muted">Máx. repetições<input type="number" min="1" v-model.number="rule.max_occurrences" placeholder="—" :class="inputCls + ' w-full mt-1'" /></label>
            <label class="text-xs text-ink-muted">Importância<input type="number" min="1" max="10" v-model.number="rule.importance" :class="inputCls + ' w-full mt-1'" /></label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
                <p class="text-xs text-ink-muted mb-1">Aplica em</p>
                <div class="flex flex-wrap gap-2">
                    <label v-for="st in STATES" :key="st.v" class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" :checked="(rule.apply_states || []).includes(st.v)" @change="toggleState(st.v)" /> {{ st.l }}</label>
                </div>
            </div>
            <div>
                <p class="text-xs text-ink-muted mb-1">Destinatários</p>
                <div class="flex flex-wrap gap-2">
                    <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="rule.recipients.assignee" /> Responsável</label>
                    <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="rule.recipients.owner" /> Dono</label>
                </div>
            </div>
            <div>
                <p class="text-xs text-ink-muted mb-1">Canais</p>
                <div class="flex flex-wrap gap-2">
                    <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="rule.channels.inapp" /> Sino</label>
                    <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="rule.channels.email" /> E-mail</label>
                    <label class="flex items-center gap-1 text-xs text-ink-muted"><input type="checkbox" v-model="rule.channels.whatsapp" /> WhatsApp</label>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
            <input v-model="rule.title_template" :placeholder="titleHint" :class="inputCls" />
            <input v-model="rule.body_template" :placeholder="bodyHint" :class="inputCls" />
        </div>
    </div>
</template>
