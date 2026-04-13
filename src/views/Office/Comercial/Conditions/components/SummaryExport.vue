<template>
  <div class="summary-root space-y-6">
    <!-- Barra de ações (oculta ao imprimir) -->
    <div class="no-print flex justify-end">
      <button
        @click="printPage"
        class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
      >
        <i class="fas fa-file-pdf"></i> Exportar PDF
      </button>
    </div>

    <!-- Cabeçalho do resumo -->
    <div class="summary-card">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ detail?.enterprise?.nome ?? '—' }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {{ detail?.enterprise?.cidade ?? '—' }}
            <span class="mx-1">·</span>
            Ref: {{ formatMonth(detail?.reference_month) }}
            <span class="mx-1">·</span>
            <span :class="statusClass(detail?.status)">{{ statusLabel(detail?.status) }}</span>
          </p>
        </div>
        <div class="text-right text-xs text-gray-400 dark:text-gray-500 shrink-0">
          <p>Ficha Comercial</p>
          <p>{{ formatDateFull(new Date()) }}</p>
        </div>
      </div>
    </div>

    <!-- Módulos -->
    <div v-if="localModules?.length" class="summary-card">
      <h3 class="summary-section-title">Módulos</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Módulo</th>
              <th class="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Unidades</th>
              <th class="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Dem. Mín.</th>
              <th class="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Avaliação</th>
              <th class="text-right py-2 pl-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Teto</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(mod, i) in localModules"
              :key="mod.id ?? i"
              class="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
            >
              <td class="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                {{ mod.module_name || `Módulo ${i + 1}` }}
              </td>
              <td class="py-2 px-4 text-right text-gray-700 dark:text-gray-300">{{ mod.total_units ?? '—' }}</td>
              <td class="py-2 px-4 text-right text-gray-700 dark:text-gray-300">{{ mod.min_demand ?? '—' }}</td>
              <td class="py-2 px-4 text-right text-gray-700 dark:text-gray-300">{{ formatCurrency(mod.appraisal_value) }}</td>
              <td class="py-2 pl-4 text-right text-gray-700 dark:text-gray-300">{{ formatCurrency(mod.appraisal_ceiling) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Negociação -->
    <div class="summary-card">
      <h3 class="summary-section-title">Regras de Negociação</h3>
      <dl class="summary-dl">
        <div v-if="f.max_entry_value != null" class="summary-dl-row">
          <dt>Máximo de Entrada</dt>
          <dd>{{ formatCurrency(f.max_entry_value) }}</dd>
        </div>
        <div v-if="f.rp_installment_value != null" class="summary-dl-row">
          <dt>Parcela RP</dt>
          <dd>{{ formatCurrency(f.rp_installment_value) }}</dd>
        </div>
        <div v-if="f.act_installment_value != null" class="summary-dl-row">
          <dt>Parcela Ato</dt>
          <dd>{{ formatCurrency(f.act_installment_value) }}</dd>
        </div>
        <div v-if="f.min_installment_value != null" class="summary-dl-row">
          <dt>Parcela Mínima</dt>
          <dd>{{ formatCurrency(f.min_installment_value) }}</dd>
        </div>
        <div v-if="f.max_installments != null" class="summary-dl-row">
          <dt>Máx. Parcelas</dt>
          <dd>{{ f.max_installments }}</dd>
        </div>
        <div v-if="f.installment_until_habite_se" class="summary-dl-row">
          <dt>Parcelas até Habite-se</dt>
          <dd>{{ f.installment_until_habite_se }}</dd>
        </div>
        <div v-if="f.installment_post_habite_se" class="summary-dl-row">
          <dt>Parcelas pós Habite-se</dt>
          <dd>{{ f.installment_post_habite_se }}</dd>
        </div>
        <div class="summary-dl-row">
          <dt>Subsídio Estadual</dt>
          <dd>{{ f.has_state_subsidy ? 'Sim' : 'Não' }}</dd>
        </div>
        <template v-if="f.has_state_subsidy">
          <div v-if="subsidyStateLabel || f.state_subsidy_program" class="summary-dl-row">
            <dt>Programa</dt>
            <dd>{{ [subsidyStateLabel, f.state_subsidy_program].filter(Boolean).join(' — ') }}</dd>
          </div>
          <div v-if="f.state_subsidy_rules" class="summary-dl-row summary-dl-row--full">
            <dt>Regras do Subsídio</dt>
            <dd>{{ f.state_subsidy_rules }}</dd>
          </div>
          <div v-if="f.state_subsidy_conditions" class="summary-dl-row summary-dl-row--full">
            <dt>Condições</dt>
            <dd>{{ f.state_subsidy_conditions }}</dd>
          </div>
          <!-- Legado -->
          <div v-if="!f.state_subsidy_rules && f.state_subsidy_note" class="summary-dl-row summary-dl-row--full">
            <dt>Detalhes do Subsídio</dt>
            <dd>{{ f.state_subsidy_note }}</dd>
          </div>
        </template>
        <div v-if="f.rp_rule" class="summary-dl-row summary-dl-row--full">
          <dt>Regra do RP</dt>
          <dd>{{ f.rp_rule }}</dd>
        </div>
      </dl>
    </div>

    <!-- Operacional -->
    <div class="summary-card">
      <h3 class="summary-section-title">Operacional</h3>
      <dl class="summary-dl">
        <div v-if="managerUser" class="summary-dl-row">
          <dt>Gestor Responsável</dt>
          <dd>{{ managerUser.username }} — {{ managerUser.position || managerUser.email }}</dd>
        </div>
        <div v-if="f.delivery_deadline_months != null" class="summary-dl-row">
          <dt>Prazo de Entrega</dt>
          <dd>{{ f.delivery_deadline_months }} meses{{ f.delivery_deadline_note ? ` — ${f.delivery_deadline_note}` : '' }}</dd>
        </div>
        <div v-if="f.commission_pct != null" class="summary-dl-row">
          <dt>Comissão</dt>
          <dd>{{ f.commission_pct }}% ({{ f.commission_source === 'cv' ? 'via CV' : 'manual' }})</dd>
        </div>
        <div v-if="f.price_premise_note" class="summary-dl-row summary-dl-row--full">
          <dt>Premissa de Preço</dt>
          <dd>{{ f.price_premise_note }}</dd>
        </div>
        <div v-if="f.contract_registration_by" class="summary-dl-row">
          <dt>Registro do Contrato</dt>
          <dd>{{ contractRegistrationLabel(f.contract_registration_by) }}</dd>
        </div>
        <div v-if="f.contract_registration_by === 'menin' && contractResponsible" class="summary-dl-row">
          <dt>Responsável pelo Registro</dt>
          <dd>{{ contractResponsible.username }} — {{ contractResponsible.position || contractResponsible.email }}</dd>
        </div>
        <div v-if="f.cca_company_name" class="summary-dl-row">
          <dt>Empresa CCA</dt>
          <dd>{{ f.cca_company_name }}</dd>
        </div>
        <div v-if="f.cca_charges_company" class="summary-dl-row">
          <dt>CCA cobra da empresa?</dt>
          <dd>Sim{{ f.cca_cost != null ? ` — ${formatCurrency(f.cca_cost)}` : '' }}</dd>
        </div>
        <div v-if="correspondentUser" class="summary-dl-row">
          <dt>Correspondente Bancário</dt>
          <dd>{{ correspondentUser.nome }}{{ correspondentUser.email ? ` — ${correspondentUser.email}` : '' }}</dd>
        </div>
        <div v-if="f.has_digital_cert" class="summary-dl-row">
          <dt>Certificação Digital</dt>
          <dd>
            {{ f.digital_cert_provider || 'Sim' }}{{ f.digital_cert_contact ? ` · ${f.digital_cert_contact}` : '' }}
          </dd>
        </div>
        <div v-if="f.notes" class="summary-dl-row summary-dl-row--full">
          <dt>Observações Gerais</dt>
          <dd>{{ f.notes }}</dd>
        </div>
      </dl>
    </div>

    <!-- Tabelas de Preço -->
    <div v-if="selectedPriceTables.length" class="summary-card">
      <h3 class="summary-section-title">Tabelas de Preço Vinculadas</h3>
      <ul class="space-y-1">
        <li
          v-for="t in selectedPriceTables"
          :key="t.idtabela"
          class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <i class="fas fa-table text-blue-500 text-xs"></i>
          {{ t.nome }}
          <span v-if="t.vigente" class="text-xs text-green-600 dark:text-green-400">(vigente)</span>
        </li>
      </ul>
    </div>

    <!-- Campanhas -->
    <div v-if="activeCampaigns.length" class="summary-card">
      <h3 class="summary-section-title">Campanhas Ativas</h3>
      <ul class="space-y-2">
        <li
          v-for="(camp, i) in activeCampaigns"
          :key="camp.id ?? i"
          class="text-sm text-gray-700 dark:text-gray-300"
        >
          <span class="font-medium text-gray-900 dark:text-white">{{ camp.name || camp.titulo || `Campanha ${i + 1}` }}</span>
          <span v-if="camp.description || camp.descricao" class="block text-xs text-gray-500 dark:text-gray-400">
            {{ camp.description || camp.descricao }}
          </span>
        </li>
      </ul>
    </div>

    <!-- Rodapé -->
    <div class="text-center text-xs text-gray-400 dark:text-gray-500 pt-2 no-print">
      Gerado em {{ formatDateFull(new Date()) }}
    </div>
    <div class="print-only text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
      Gerado em {{ formatDateFull(new Date()) }} · Meninger
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    detail: Object,
    form: { type: Object, default: () => ({}) },
    localForm: { type: Object, default: () => ({}) }, // compat alias
    localModules: Array,
    localCampaigns: Array,
    priceTables: { type: Array, default: () => [] },
    correspondents: { type: Array, default: () => [] },
    officeUsers: { type: Array, default: () => [] },
});

// Suporta tanto form (novo) quanto localForm (compat)
const f = computed(() => (props.form && Object.keys(props.form).length > 0 ? props.form : props.localForm) ?? {});

// ─── Computed lookups ─────────────────────────────────────────────────────────

const managerUser = computed(() =>
    props.officeUsers.find(u => u.id === f.value?.manager_user_id) ?? null
);

const contractResponsible = computed(() =>
    props.officeUsers.find(u => u.id === f.value?.contract_registered_by_user_id) ?? null
);

const subsidyStateLabel = computed(() => {
    const map = { ms: 'Mato Grosso do Sul', mt: 'Mato Grosso', pr: 'Paraná', sp: 'São Paulo' };
    const s = f.value?.state_subsidy_state;
    if (!s) return '';
    if (s === 'custom') return f.value?.state_subsidy_custom_state || 'Outro Estado';
    return map[s] ?? s.toUpperCase();
});

const correspondentUser = computed(() =>
    props.correspondents.find(c => c.idusuario === f.value?.correspondent_id) ?? null
);

const selectedPriceTables = computed(() => {
    const ids = f.value?.price_table_ids ?? [];
    return props.priceTables.filter(t => ids.includes(t.idtabela));
});

const activeCampaigns = computed(() =>
    (props.localCampaigns ?? []).filter(c => c.active !== false && c.ativo !== false)
);

// ─── Formatadores ─────────────────────────────────────────────────────────────

function formatCurrency(val) {
    if (val == null || val === '') return '—';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${months[Number(m) - 1]}/${y}`;
}

function formatDateFull(date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusClass(s) {
    return s === 'published'
        ? 'text-green-600 dark:text-green-400 font-medium'
        : 'text-yellow-600 dark:text-yellow-400 font-medium';
}

function statusLabel(s) {
    return s === 'published' ? 'Publicado' : 'Rascunho';
}

function contractRegistrationLabel(val) {
    const map = { cca: 'CCA', menin: 'Menin (interno)', outros: 'Outros' };
    return map[val] ?? val;
}

function printPage() {
    window.print();
}
</script>

<style scoped>
.summary-card {
    @apply bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5;
}

.summary-section-title {
    @apply text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700;
}

.summary-dl {
    @apply grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2;
}

.summary-dl-row {
    @apply flex flex-col;
}

.summary-dl-row--full {
    @apply sm:col-span-2;
}

.summary-dl-row dt {
    @apply text-xs font-medium text-gray-500 dark:text-gray-400;
}

.summary-dl-row dd {
    @apply text-sm text-gray-900 dark:text-white mt-0.5;
}

.print-only {
    display: none;
}

@media print {
    /* Oculta tudo na página exceto o componente de resumo */
    body > * {
        display: none !important;
    }

    /* Garante que o root do summary seja visível */
    .summary-root,
    .summary-root * {
        display: revert !important;
        visibility: visible !important;
    }

    .summary-root {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        padding: 24px;
        background: white;
        color: black;
    }

    .no-print {
        display: none !important;
    }

    .print-only {
        display: block !important;
    }

    .summary-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        page-break-inside: avoid;
    }
}
</style>
