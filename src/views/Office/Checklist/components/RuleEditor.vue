<script setup>
import { computed } from 'vue';
const props = defineProps({ rule: { type: Object, required: true } });
defineEmits(['remove']);

// "Quando" amigável (mapeia para offset_days: negativo=antes, 0=no dia, positivo=depois).
const kind = computed({
    get() { const o = Number(props.rule.offset_days) || 0; return o < 0 ? 'before' : o > 0 ? 'after' : 'onday'; },
    set(v) {
        const d = Math.abs(Number(props.rule.offset_days) || 0) || 1;
        props.rule.offset_days = v === 'before' ? -d : v === 'after' ? d : 0;
    },
});
const days = computed({
    get() { return Math.abs(Number(props.rule.offset_days) || 0); },
    set(v) {
        const n = Math.max(1, Number(v) || 1);
        props.rule.offset_days = kind.value === 'before' ? -n : kind.value === 'after' ? n : 0;
    },
});
const repeat = computed({
    get() { return !!props.rule.repeat_every_days; },
    set(v) { props.rule.repeat_every_days = v ? (props.rule.repeat_every_days || 3) : null; },
});

function summary(r) {
    const o = Number(r.offset_days) || 0;
    let base = o < 0 ? `${Math.abs(o)} dia(s) antes do prazo` : o === 0 ? 'no dia do prazo' : `${o} dia(s) após o prazo (atraso)`;
    if (r.repeat_every_days) base += `, repetindo a cada ${r.repeat_every_days} dia(s) até concluir`;
    const ch = [r.channels?.inapp && 'sino', r.channels?.email && 'e-mail', r.channels?.whatsapp && 'WhatsApp'].filter(Boolean).join(' + ') || 'nenhum canal';
    const to = [r.recipients?.assignee && 'responsável', r.recipients?.owner && 'dono'].filter(Boolean).join(' e ') || 'ninguém';
    return `Avisa ${to} ${base}, por ${ch}.`;
}

const inputCls = 'rounded-lg border border-line bg-surface-raised text-ink px-2.5 h-9 text-sm focus-ring';
const chk = 'flex items-center gap-1.5 text-sm text-ink-muted cursor-pointer';
const tokensHint = 'Tokens disponíveis: {{task}} {{checklist}} {{due}} {{daysLate}} {{daysToDue}} {{assignee}}';
</script>

<template>
    <div :class="!rule.active ? 'opacity-60' : ''">
        <div class="flex items-center gap-3 mb-3">
            <input v-model="rule.name" :class="inputCls + ' flex-1 font-semibold'" placeholder="Nome do lembrete (ex.: Aviso 3 dias antes)" />
            <label class="flex items-center gap-1.5 text-xs text-ink-muted whitespace-nowrap"><input type="checkbox" v-model="rule.active" /> ativo</label>
            <button @click="$emit('remove')" class="text-ink-subtle hover:text-red-500 focus-ring rounded" title="Excluir regra"><i class="fas fa-trash"></i></button>
        </div>

        <!-- Quando -->
        <div class="flex flex-wrap items-end gap-x-4 gap-y-2 mb-2">
            <label class="text-xs text-ink-muted">Quando avisar
                <select v-model="kind" :class="inputCls + ' block w-48 mt-1'">
                    <option value="before">Antes do prazo</option>
                    <option value="onday">No dia do prazo</option>
                    <option value="after">Depois do prazo (atraso)</option>
                </select>
            </label>
            <label v-if="kind !== 'onday'" class="text-xs text-ink-muted">Dias
                <input type="number" min="1" v-model.number="days" :class="inputCls + ' block w-20 mt-1'" />
            </label>
            <label :class="chk + ' pb-1.5'"><input type="checkbox" v-model="repeat" /> repetir até concluir</label>
            <label v-if="repeat" class="text-xs text-ink-muted">a cada (dias)
                <input type="number" min="1" v-model.number="rule.repeat_every_days" :class="inputCls + ' block w-20 mt-1'" />
            </label>
        </div>

        <!-- Para quem + canais -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
                <p class="text-xs font-medium text-ink-muted mb-1.5">Avisar</p>
                <div class="flex flex-wrap gap-4">
                    <label :class="chk"><input type="checkbox" v-model="rule.recipients.assignee" /> Responsável</label>
                    <label :class="chk"><input type="checkbox" v-model="rule.recipients.owner" /> Dono do checklist</label>
                </div>
            </div>
            <div>
                <p class="text-xs font-medium text-ink-muted mb-1.5">Canais</p>
                <div class="flex flex-wrap gap-4">
                    <label :class="chk"><input type="checkbox" v-model="rule.channels.inapp" /> <i class="fas fa-bell text-ink-subtle"></i> Sino</label>
                    <label :class="chk"><input type="checkbox" v-model="rule.channels.email" /> <i class="fas fa-envelope text-ink-subtle"></i> E-mail</label>
                    <label :class="chk"><input type="checkbox" v-model="rule.channels.whatsapp" /> <i class="fab fa-whatsapp text-ink-subtle"></i> WhatsApp</label>
                </div>
            </div>
        </div>

        <p class="text-xs text-amber-600 dark:text-amber-400 mb-2"><i class="fas fa-circle-info"></i> {{ summary(rule) }}</p>

        <!-- Mensagem personalizada (avançado, escondido) -->
        <details class="text-xs">
            <summary class="cursor-pointer text-ink-subtle hover:text-ink select-none">Mensagem personalizada (opcional)</summary>
            <div class="mt-2 space-y-2">
                <input v-model="rule.title_template" placeholder="Título (deixe vazio p/ padrão)" :class="inputCls + ' w-full'" />
                <input v-model="rule.body_template" placeholder="Mensagem (deixe vazio p/ padrão)" :class="inputCls + ' w-full'" />
                <p class="text-[11px] text-ink-subtle">{{ tokensHint }}</p>
            </div>
        </details>
    </div>
</template>
