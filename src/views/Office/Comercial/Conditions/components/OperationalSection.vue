<template>
  <div class="space-y-4">

    <!-- ── Responsáveis ──────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-user-tie text-blue-500"></i> Responsáveis</p>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="lbl">Gestor Responsável</label>
          <select :value="form.manager_user_id" @change="set('manager_user_id', numOrNull($event))" class="inp">
            <option value="">Selecionar gestor...</option>
            <option v-for="u in activeUsers" :key="u.id" :value="u.id">
              {{ u.username }}{{ u.position ? ` — ${u.position}` : '' }}
            </option>
          </select>
        </div>
        <div>
          <label class="lbl">Prazo de Entrega (meses)</label>
          <input :value="form.delivery_deadline_months" @input="set('delivery_deadline_months', numOrNull($event))" type="number" min="1" max="120" class="inp" placeholder="Ex: 24" />
        </div>
        <div class="sm:col-span-2">
          <label class="lbl">Observação do Prazo</label>
          <input :value="form.delivery_deadline_note" @input="set('delivery_deadline_note', $event.target.value)" type="text" class="inp" placeholder="Ex: a partir da assinatura do contrato CEF" />
        </div>
      </div>
    </div>

    <!-- ── Comissão ───────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-percent text-blue-500"></i> Comissão e Premissa de Preço</p>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="lbl">Comissão (%)</label>
          <div class="relative">
            <input :value="form.commission_pct" @input="set('commission_pct', numOrNull($event))" type="number" step="0.5" min="0" max="100" class="inp pr-9" placeholder="0.00" />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">%</span>
          </div>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Fonte: {{ form.commission_source === 'cv' ? 'tabela do CV' : 'manual' }}
          </p>
        </div>
        <div>
          <label class="lbl">Premissa de Lançamento / Preço</label>
          <input :value="form.price_premise_note" @input="set('price_premise_note', $event.target.value)" type="text" class="inp" placeholder="Ex: valor inicial R$ 200.000,00" />
        </div>
      </div>
    </div>

    <!-- ── Registro do Contrato ───────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-file-signature text-blue-500"></i> Registro do Contrato</p>
      </div>
      <div class="p-5 space-y-4">
        <div>
          <label class="lbl">Responsável pelo Registro</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <label
              v-for="opt in contractOptions"
              :key="opt.value"
              class="flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
              :class="form.contract_registration_by === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'"
            >
              <input type="radio" :value="opt.value" :checked="form.contract_registration_by === opt.value" @change="set('contract_registration_by', opt.value)" class="sr-only" />
              <span
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                :class="form.contract_registration_by === opt.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'"
              >
                <span v-if="form.contract_registration_by === opt.value" class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              {{ opt.label }}
            </label>
          </div>
        </div>
        <div v-if="form.contract_registration_by === 'menin'">
          <label class="lbl">Responsável Interno (Menin)</label>
          <select :value="form.contract_registered_by_user_id" @change="set('contract_registered_by_user_id', numOrNull($event))" class="inp">
            <option value="">Selecionar pessoa...</option>
            <option v-for="u in activeUsers" :key="u.id" :value="u.id">
              {{ u.username }}{{ u.position ? ` — ${u.position}` : '' }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── CCA / Correspondente Bancário ─────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-building-columns text-blue-500"></i> CCA / Correspondente Bancário</p>
      </div>
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">Empresa CCA</label>
            <input
              :value="form.cca_company_name"
              @input="set('cca_company_name', $event.target.value)"
              type="text"
              class="inp"
              placeholder="Nome da empresa CCA..."
            />
          </div>
          <div>
            <label class="lbl">Correspondente Responsável</label>
            <select :value="form.correspondent_id" @change="set('correspondent_id', numOrNull($event))" class="inp">
              <option value="">Nenhum</option>
              <option v-for="c in correspondents" :key="c.idusuario" :value="c.idusuario">
                {{ c.nome }}{{ c.email ? ` — ${c.email}` : '' }}{{ c.celular ? ` · ${c.celular}` : '' }}
              </option>
            </select>
          </div>
        </div>

        <!-- Toggle: CCA cobra da empresa -->
        <div class="flex items-center justify-between p-3.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200">CCA cobra da empresa</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ative se o CCA cobra taxa da Menin</p>
          </div>
          <button
            type="button"
            @click="set('cca_charges_company', !form.cca_charges_company)"
            :class="form.cca_charges_company ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ml-4"
          >
            <span
              :class="form.cca_charges_company ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200"
            />
          </button>
        </div>

        <!-- Valor cobrado (só se cca_charges_company = true) -->
        <div v-if="form.cca_charges_company">
          <label class="lbl">Valor Cobrado pelo CCA (R$)</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.cca_cost" @input="set('cca_cost', numOrNull($event))" type="number" step="100" class="inp-pfx" placeholder="0,00" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Certificação Digital ───────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-certificate text-blue-500"></i> Certificação Digital</p>
      </div>
      <div class="p-5 space-y-4">
        <div class="flex items-center justify-between p-3.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">Certificação Digital ativa</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">O empreendimento exige certificação digital?</p>
          </div>
          <button
            type="button"
            @click="set('has_digital_cert', !form.has_digital_cert)"
            :class="form.has_digital_cert ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ml-4"
          >
            <span
              :class="form.has_digital_cert ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200"
            />
          </button>
        </div>
        <div v-if="form.has_digital_cert" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">Fornecedor</label>
            <input :value="form.digital_cert_provider" @input="set('digital_cert_provider', $event.target.value)" type="text" class="inp" placeholder="Ex: SPLINK" />
          </div>
          <div>
            <label class="lbl">Contato / Telefone</label>
            <input :value="form.digital_cert_contact" @input="set('digital_cert_contact', $event.target.value)" type="text" class="inp" placeholder="Contato do fornecedor" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Observações ────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-note-sticky text-blue-500"></i> Observações</p>
      </div>
      <div class="p-5">
        <label class="lbl">Observações Gerais</label>
        <textarea :value="form.notes" @input="set('notes', $event.target.value)" rows="3" class="inp resize-none" placeholder="Informações adicionais, particularidades do produto..." />
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    form:         { type: Object, required: true },
    correspondents: { type: Array,  default: () => [] },
    officeUsers:  { type: Array,  default: () => [] },
});
const emit = defineEmits(['update']);

// Filtra apenas usuários ativos
const activeUsers = computed(() =>
    (props.officeUsers ?? []).filter(u => u.status !== false)
);

const contractOptions = [
    { value: 'cca',    label: 'CCA' },
    { value: 'menin',  label: 'Menin (interno)' },
    { value: 'outros', label: 'Outros' },
];

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
