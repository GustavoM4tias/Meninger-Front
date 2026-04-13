<template>
  <div class="space-y-4">

    <!-- ── Parcelas e Entrada ─────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-hand-holding-dollar text-blue-500"></i> Parcelas e Entrada</p>
      </div>
      <div class="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="lbl">Máx. de Entrada</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.max_entry_value" @input="set('max_entry_value', numOrNull($event))" type="number" step="1000" class="inp-pfx" placeholder="0,00" />
          </div>
        </div>
        <div>
          <label class="lbl">Parcela RP</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.rp_installment_value" @input="set('rp_installment_value', numOrNull($event))" type="number" step="100" class="inp-pfx" placeholder="0,00" />
          </div>
        </div>
        <div>
          <label class="lbl">Parcela Ato</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.act_installment_value" @input="set('act_installment_value', numOrNull($event))" type="number" step="100" class="inp-pfx" placeholder="0,00" />
          </div>
        </div>
        <div>
          <label class="lbl">Parcela Mínima</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.min_installment_value" @input="set('min_installment_value', numOrNull($event))" type="number" step="100" class="inp-pfx" placeholder="0,00" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Reajuste e Prazo ───────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-calendar-days text-blue-500"></i> Reajuste e Prazo</p>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="lbl">Parcelas até Habite-se</label>
          <input :value="form.installment_until_habite_se" @input="set('installment_until_habite_se', $event.target.value)" type="text" class="inp" placeholder="Ex: INCC" />
        </div>
        <div>
          <label class="lbl">Parcelas pós Habite-se</label>
          <input :value="form.installment_post_habite_se" @input="set('installment_post_habite_se', $event.target.value)" type="text" class="inp" placeholder="Ex: IPCA + 1% a.m." />
        </div>
        <div>
          <label class="lbl">Máx. Parcelas</label>
          <input :value="form.max_installments" @input="set('max_installments', numOrNull($event))" type="number" min="0" class="inp" placeholder="Ex: 120" />
        </div>
      </div>
    </div>

    <!-- ── Regras de Negociação ───────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-file-lines text-blue-500"></i> Regras e Observações</p>
      </div>
      <div class="p-5">
        <label class="lbl">Regra do RP / Observações de Negociação</label>
        <textarea :value="form.rp_rule" @input="set('rp_rule', $event.target.value)" rows="3" class="inp resize-none" placeholder="Ex: parcela do cliente não pode ultrapassar 30% da renda comprovada..." />
      </div>
    </div>

    <!-- ── Subsídio Estadual ──────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-building-flag text-blue-500"></i> Subsídio Estadual</p>
      </div>
      <div class="p-5 space-y-4">

        <!-- Toggle -->
        <div class="flex items-start justify-between gap-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">Subsídio Estadual disponível</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Existe subsídio estadual para este produto?</p>
          </div>
          <button
            type="button"
            @click="set('has_state_subsidy', !form.has_state_subsidy)"
            :class="form.has_state_subsidy ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <span
              :class="form.has_state_subsidy ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200"
            />
          </button>
        </div>

        <template v-if="form.has_state_subsidy">
          <!-- Estado / Programa -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="lbl">Estado do Programa</label>
              <div class="flex gap-2 flex-wrap mt-1">
                <label
                  v-for="opt in subsidyStates"
                  :key="opt.value"
                  class="flex items-center gap-2 px-3.5 py-2 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                  :class="form.state_subsidy_state === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'"
                >
                  <input type="radio" :value="opt.value" :checked="form.state_subsidy_state === opt.value" @change="set('state_subsidy_state', opt.value)" class="sr-only" />
                  <span
                    class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    :class="form.state_subsidy_state === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'"
                  >
                    <span v-if="form.state_subsidy_state === opt.value" class="w-1 h-1 rounded-full bg-white"></span>
                  </span>
                  {{ opt.label }}
                </label>
              </div>
            </div>

            <div>
              <label class="lbl">Nome do Programa</label>
              <input
                :value="form.state_subsidy_program"
                @input="set('state_subsidy_program', $event.target.value)"
                type="text"
                class="inp"
                :placeholder="subsidyProgramPlaceholder"
              />
            </div>
          </div>

          <!-- Estado "Outro" - nome livre -->
          <div v-if="form.state_subsidy_state === 'custom'">
            <label class="lbl">Nome do Estado / Programa</label>
            <input
              :value="form.state_subsidy_custom_state"
              @input="set('state_subsidy_custom_state', $event.target.value)"
              type="text"
              class="inp"
              placeholder="Ex: Goiás, Santa Catarina..."
            />
          </div>

          <!-- Regras -->
          <div>
            <label class="lbl">Regras do Subsídio</label>
            <textarea
              :value="form.state_subsidy_rules"
              @input="set('state_subsidy_rules', $event.target.value)"
              rows="3"
              class="inp resize-none"
              placeholder="Descreva as regras de elegibilidade, limites de renda, documentação necessária..."
            />
          </div>

          <!-- Condições -->
          <div>
            <label class="lbl">Condições e Observações</label>
            <textarea
              :value="form.state_subsidy_conditions"
              @input="set('state_subsidy_conditions', $event.target.value)"
              rows="2"
              class="inp resize-none"
              placeholder="Prazos, valores, restrições, contato do programa..."
            />
          </div>
        </template>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ form: { type: Object, required: true } });
const emit = defineEmits(['update']);

const subsidyStates = [
    { value: 'ms', label: 'MS' },
    { value: 'mt', label: 'MT' },
    { value: 'pr', label: 'PR' },
    { value: 'sp', label: 'SP' },
    { value: 'custom', label: 'Outro' },
];

const subsidyProgramPlaceholder = computed(() => {
    const map = {
        ms: 'Ex: Programa MTPAR',
        mt: 'Ex: Programa MTPAR',
        pr: 'Ex: Programa COHAPAR',
        sp: 'Ex: Programa Casa Paulista',
        custom: 'Nome do programa...',
    };
    return map[props.form.state_subsidy_state] || 'Nome do programa estadual...';
});

function set(field, val) { emit('update', { [field]: val }); }
function numOrNull(evt) { const v = evt.target.value; return v === '' ? null : Number(v); }
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2; }
.lbl     { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5; }
.inp     { @apply w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.pfx     { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none; }
</style>
