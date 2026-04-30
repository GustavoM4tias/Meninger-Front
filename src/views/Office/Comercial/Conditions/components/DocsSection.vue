<template>
  <div class="space-y-4">

    <!-- ── Pacote CEF ──────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-file-invoice text-blue-500"></i> Pacote CEF</p>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="lbl">Pago por</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <label v-for="opt in payerOptions" :key="opt.value"
              class="flex items-center gap-2 px-3.5 py-2 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
              :class="form.cef_package_paid_by === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300'"
              :style="readonly ? 'pointer-events:none;opacity:.75' : ''">
              <input type="radio" :value="opt.value" :checked="form.cef_package_paid_by === opt.value"
                @change="set('cef_package_paid_by', opt.value)" class="sr-only" :disabled="readonly" />
              <span class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                :class="form.cef_package_paid_by === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'">
                <span v-if="form.cef_package_paid_by === opt.value" class="w-1 h-1 rounded-full bg-white"></span>
              </span>
              <i :class="opt.icon" class="text-xs opacity-70"></i>
              {{ opt.label }}
            </label>
          </div>
        </div>
        <div>
          <label class="lbl">Valor Médio</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input type="text" :value="fmtBR(form.cef_package_avg_value)"
              @focus="e => { e.target.value = form.cef_package_avg_value ?? ''; e.target.select(); }"
              @blur="e => set('cef_package_avg_value', parseBR(e.target.value))"
              class="inp-pfx" placeholder="0,00" :disabled="readonly" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── ITBI ────────────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-stamp text-blue-500"></i> ITBI</p>
      </div>
      <div class="p-5 space-y-4">
        <div class="flex items-start justify-between gap-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">ITBI Isento</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Marque se este produto possui isenção de ITBI</p>
          </div>
          <button type="button" @click="set('itbi_exempt', !form.itbi_exempt)"
            :class="form.itbi_exempt ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200" :disabled="readonly">
            <span :class="form.itbi_exempt ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200" />
          </button>
        </div>

        <!-- Não isento: valor médio -->
        <div v-if="!form.itbi_exempt">
          <label class="lbl">Valor Médio do ITBI</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input type="text" :value="fmtBR(form.itbi_avg_value)"
              @focus="e => { e.target.value = form.itbi_avg_value ?? ''; e.target.select(); }"
              @blur="e => set('itbi_avg_value', parseBR(e.target.value))"
              class="inp-pfx" placeholder="0,00" :disabled="readonly" />
          </div>
        </div>

        <!-- Isento: documento de isenção -->
        <div v-else>
          <label class="lbl">Documento de Isenção</label>
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <AttachmentPicker
                :model-value="form.itbi_exemption_doc_url"
                @update:model-value="set('itbi_exemption_doc_url', $event)"
                :reference-id="form.id"
                upload-context="itbi_isencao"
                hint="Vincule o documento de isenção (link ou arquivo). Um QR Code será gerado automaticamente para o resumo."
              />
            </div>
            <AppraisalQrCode v-if="form.itbi_exemption_doc_url" :url="form.itbi_exemption_doc_url" :size="120" caption="Isenção" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Cartório ────────────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-book-bookmark text-blue-500"></i> Cartório</p>
      </div>
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">Valor da Prenotação</label>
            <div class="relative">
              <span class="pfx">R$</span>
              <input type="text" :value="fmtBR(form.cartorio_prenotacao_value)"
                @focus="e => { e.target.value = form.cartorio_prenotacao_value ?? ''; e.target.select(); }"
                @blur="e => set('cartorio_prenotacao_value', parseBR(e.target.value))"
                class="inp-pfx" placeholder="0,00" :disabled="readonly" />
            </div>
          </div>
          <div>
            <label class="lbl">Valor Médio do Registro</label>
            <div class="relative">
              <span class="pfx">R$</span>
              <input type="text" :value="fmtBR(form.cartorio_registration_value)"
                @focus="e => { e.target.value = form.cartorio_registration_value ?? ''; e.target.select(); }"
                @blur="e => set('cartorio_registration_value', parseBR(e.target.value))"
                class="inp-pfx" placeholder="0,00" :disabled="readonly" />
            </div>
          </div>
        </div>

        <div>
          <label class="lbl">Pago por</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <label v-for="opt in payerOptions" :key="opt.value"
              class="flex items-center gap-2 px-3.5 py-2 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
              :class="form.cartorio_paid_by === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300'"
              :style="readonly ? 'pointer-events:none;opacity:.75' : ''">
              <input type="radio" :value="opt.value" :checked="form.cartorio_paid_by === opt.value"
                @change="set('cartorio_paid_by', opt.value)" class="sr-only" :disabled="readonly" />
              <span class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                :class="form.cartorio_paid_by === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'">
                <span v-if="form.cartorio_paid_by === opt.value" class="w-1 h-1 rounded-full bg-white"></span>
              </span>
              <i :class="opt.icon" class="text-xs opacity-70"></i>
              {{ opt.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Resumo de Custos ────────────────────────────────────────────────── -->
    <div class="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 overflow-hidden">
      <div class="px-5 py-3.5 border-b border-blue-100 dark:border-blue-900 bg-blue-100/40 dark:bg-blue-900/20">
        <p class="lbl-section text-blue-700 dark:text-blue-300"><i class="fas fa-coins"></i> Resumo de Custos</p>
      </div>
      <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-white dark:bg-gray-900/60 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Pago pela Menin</p>
          <ul class="space-y-1.5 text-xs">
            <li v-for="item in costSummary.menin" :key="item.label" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ item.label }}</span>
              <strong class="text-gray-800 dark:text-gray-200">{{ formatCurrency(item.value) }}</strong>
            </li>
            <li v-if="!costSummary.menin.length" class="text-gray-400 italic">Nenhum custo atribuído</li>
          </ul>
          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
            <span class="font-semibold text-gray-700 dark:text-gray-200">Total</span>
            <strong class="text-blue-600 dark:text-blue-400">{{ formatCurrency(costSummary.totalMenin) }}</strong>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-900/60 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Pago pelo Cliente</p>
          <ul class="space-y-1.5 text-xs">
            <li v-for="item in costSummary.client" :key="item.label" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ item.label }}</span>
              <strong class="text-gray-800 dark:text-gray-200">{{ formatCurrency(item.value) }}</strong>
            </li>
            <li v-if="!costSummary.client.length" class="text-gray-400 italic">Nenhum custo atribuído</li>
          </ul>
          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
            <span class="font-semibold text-gray-700 dark:text-gray-200">Total</span>
            <strong class="text-blue-600 dark:text-blue-400">{{ formatCurrency(costSummary.totalClient) }}</strong>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import AttachmentPicker from './AttachmentPicker.vue';
import AppraisalQrCode from './AppraisalQrCode.vue';
import { computeCostSummary } from './costSummary.js';

const props = defineProps({
    form: { type: Object, required: true },
    readonly: { type: Boolean, default: false },
});
const emit = defineEmits(['update']);

const payerOptions = [
    { value: 'menin',  label: 'Menin',   icon: 'fas fa-building' },
    { value: 'client', label: 'Cliente', icon: 'fas fa-user' },
];

const costSummary = computed(() => computeCostSummary(props.form));

function set(field, val) { if (!props.readonly) emit('update', { [field]: val }); }
function fmtBR(val) {
    if (val == null || val === '') return '';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBR(str) {
    if (str === '' || str == null) return null;
    const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
}
function formatCurrency(v) {
    if (v == null) return 'R$ 0,00';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2; }
.lbl { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5; }
.inp { @apply w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.pfx { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none; }
</style>
