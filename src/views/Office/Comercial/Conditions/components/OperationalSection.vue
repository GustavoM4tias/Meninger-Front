<template>
  <div class="space-y-4">

    <!-- ── Responsáveis ──────────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-user-tie text-blue-500"></i> Responsáveis</p>
      </div>
      <div class="p-5 space-y-5">

        <!-- Gestor Responsável -->
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <label class="lbl mb-0">Gestor Responsável</label>
            <!-- Toggle sistema / manual -->
            <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button type="button" @click="setManagerMode('sistema')" :disabled="readonly"
                :class="['px-3 py-1 text-xs font-semibold rounded-md transition',
                  managerMode === 'sistema'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
                <i class="fas fa-users text-xs mr-1"></i>Sistema
              </button>
              <button type="button" @click="setManagerMode('manual')" :disabled="readonly"
                :class="['px-3 py-1 text-xs font-semibold rounded-md transition',
                  managerMode === 'manual'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
                <i class="fas fa-pen text-xs mr-1"></i>Manual
              </button>
            </div>
          </div>

          <!-- Sistema: select de usuários -->
          <div v-if="managerMode === 'sistema'">
            <select :value="form.manager_user_id" @change="set('manager_user_id', numOrNull($event))" class="inp" :disabled="readonly">
              <option value="">Selecionar gestor...</option>
              <option v-for="u in activeUsers" :key="u.id" :value="u.id">
                {{ u.username }}{{ u.position ? ` — ${u.position}` : '' }}
              </option>
            </select>
          </div>

          <!-- Manual: campos livres -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="lbl">Nome</label>
              <input :value="form.manager_name" @input="set('manager_name', $event.target.value)"
                type="text" class="inp" placeholder="Nome completo do gestor..." :disabled="readonly" />
            </div>
            <div>
              <label class="lbl">E-mail</label>
              <input :value="form.manager_email" @input="set('manager_email', $event.target.value)"
                type="email" class="inp" placeholder="gestor@email.com" :disabled="readonly" />
            </div>
            <div>
              <label class="lbl">Telefone</label>
              <input :value="form.manager_phone" @input="set('manager_phone', $event.target.value)"
                type="tel" class="inp" placeholder="(67) 99999-9999" :disabled="readonly" />
            </div>
          </div>
        </div>

        <!-- Prazo de Entrega -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="lbl">Prazo de Entrega (meses)</label>
            <input :value="form.delivery_deadline_months" @input="set('delivery_deadline_months', numOrNull($event))"
              type="number" min="1" max="120" class="inp" placeholder="Ex: 24" :disabled="readonly" />
          </div>
          <div>
            <label class="lbl">Observação do Prazo</label>
            <input :value="form.delivery_deadline_note" @input="set('delivery_deadline_note', $event.target.value)"
              type="text" class="inp" placeholder="Ex: a partir da assinatura do contrato CEF" :disabled="readonly" />
          </div>
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
            <input type="text" :value="form.commission_pct != null ? String(Number(form.commission_pct).toFixed(2)).replace('.', ',') : ''"
  @focus="e => { e.target.value = form.commission_pct ?? ''; e.target.select(); }"
  @blur="e => { const raw = String(e.target.value).replace(',', '.'); const n = parseFloat(raw); set('commission_pct', isNaN(n) ? null : Math.round(n * 100) / 100); }"
  class="inp pr-9" placeholder="0,00" :disabled="readonly" />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">%</span>
          </div>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Fonte: {{ form.commission_source === 'cv' ? 'tabela do CV' : 'manual' }}
          </p>
        </div>
        <div>
          <label class="lbl">Premissa de Lançamento / Preço</label>
          <input :value="form.price_premise_note" @input="set('price_premise_note', $event.target.value)"
            type="text" class="inp" placeholder="Ex: valor inicial R$ 200.000,00" :disabled="readonly" />
        </div>
      </div>
    </div>

    <!-- ── Registro do Contrato ───────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-file-signature text-blue-500"></i> Registro do Contrato</p>
      </div>
      <div class="p-5 space-y-4">

        <!-- Tipo de responsável -->
        <div>
          <label class="lbl">Responsável pelo Registro</label>
          <div class="flex gap-2 flex-wrap mt-1">
            <label v-for="opt in contractOptions" :key="opt.value"
              class="flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
              :class="form.contract_registration_by === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600'"
              :style="readonly ? 'pointer-events:none;opacity:.75' : ''"
            >
              <input type="radio" :value="opt.value" :checked="form.contract_registration_by === opt.value"
                @change="set('contract_registration_by', opt.value)" class="sr-only" :disabled="readonly" />
              <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                :class="form.contract_registration_by === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'">
                <span v-if="form.contract_registration_by === opt.value" class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              {{ opt.label }}
            </label>
          </div>
        </div>

        <!-- Menin: sistema ou manual -->
        <div v-if="form.contract_registration_by === 'menin'" class="space-y-3">
          <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
            <button type="button" @click="setMeniMode('sistema')" :disabled="readonly"
              :class="['px-3 py-1.5 text-xs font-semibold rounded-md transition',
                meniMode === 'sistema'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
              <i class="fas fa-users text-xs mr-1"></i>Usuário do sistema
            </button>
            <button type="button" @click="setMeniMode('manual')" :disabled="readonly"
              :class="['px-3 py-1.5 text-xs font-semibold rounded-md transition',
                meniMode === 'manual'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
              <i class="fas fa-pen text-xs mr-1"></i>Informar manualmente
            </button>
          </div>

          <div v-if="meniMode === 'sistema'">
            <label class="lbl">Responsável Interno (Menin)</label>
            <select :value="form.contract_registered_by_user_id" @change="set('contract_registered_by_user_id', numOrNull($event))" class="inp" :disabled="readonly">
              <option value="">Selecionar pessoa...</option>
              <option v-for="u in activeUsers" :key="u.id" :value="u.id">
                {{ u.username }}{{ u.position ? ` — ${u.position}` : '' }}
              </option>
            </select>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="lbl">Nome do Responsável</label>
              <input :value="form.outros_contact_name" @input="set('outros_contact_name', $event.target.value)"
                type="text" class="inp" placeholder="Nome completo do responsável..." :disabled="readonly" />
            </div>
            <div>
              <label class="lbl">E-mail</label>
              <input :value="form.outros_contact_email" @input="set('outros_contact_email', $event.target.value)"
                type="email" class="inp" placeholder="email@menin.com.br" :disabled="readonly" />
            </div>
            <div>
              <label class="lbl">Telefone</label>
              <input :value="form.outros_contact_phone" @input="set('outros_contact_phone', $event.target.value)"
                type="tel" class="inp" placeholder="(67) 99999-9999" :disabled="readonly" />
            </div>
          </div>
        </div>

        <!-- Outros: contato externo -->
        <div v-if="form.contract_registration_by === 'outros'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-3">
            <label class="lbl">Nome do Responsável</label>
            <input :value="form.outros_contact_name" @input="set('outros_contact_name', $event.target.value)"
              type="text" class="inp" placeholder="Nome completo..." :disabled="readonly" />
          </div>
          <div>
            <label class="lbl">E-mail</label>
            <input :value="form.outros_contact_email" @input="set('outros_contact_email', $event.target.value)"
              type="email" class="inp" placeholder="email@exemplo.com" :disabled="readonly" />
          </div>
          <div>
            <label class="lbl">Telefone</label>
            <input :value="form.outros_contact_phone" @input="set('outros_contact_phone', $event.target.value)"
              type="tel" class="inp" placeholder="(67) 99999-9999" :disabled="readonly" />
          </div>
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
            <input :value="form.cca_company_name" @input="set('cca_company_name', $event.target.value)"
              type="text" class="inp" placeholder="Nome da empresa CCA..." :disabled="readonly" />
          </div>
          <div>
            <label class="lbl">Correspondente Responsável</label>
            <select :value="form.correspondent_id" @change="set('correspondent_id', numOrNull($event))" class="inp" :disabled="readonly">
              <option value="">Nenhum</option>
              <option v-for="c in correspondents" :key="c.idusuario" :value="c.idusuario">
                {{ c.nome }}{{ c.email ? ` — ${c.email}` : '' }}{{ c.celular ? ` · ${c.celular}` : '' }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between p-3.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200">CCA cobra da empresa</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ative se o CCA cobra taxa da Menin</p>
          </div>
          <button type="button" @click="set('cca_charges_company', !form.cca_charges_company)"
            :class="form.cca_charges_company ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ml-4"
            :disabled="readonly">
            <span :class="form.cca_charges_company ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200" />
          </button>
        </div>

        <div v-if="form.cca_charges_company">
          <label class="lbl">Valor Cobrado pelo CCA (R$)</label>
          <div class="relative">
            <span class="pfx">R$</span>
            <input :value="form.cca_cost" @input="set('cca_cost', numOrNull($event))"
              type="number" step="100" class="inp-pfx" placeholder="0,00" :disabled="readonly" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Verificação / Assinatura Digital ─────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="lbl-section"><i class="fas fa-shield-check text-blue-500"></i> Verificação / Assinatura Digital</p>
      </div>
      <div class="p-5 space-y-4">

        <!-- Toggle: tem certificação? -->
        <div class="flex items-center justify-between p-3.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">certificação digital ativa</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Exige verificação de identidade digital no processo</p>
          </div>
          <button type="button" @click="set('has_digital_cert', !form.has_digital_cert)"
            :class="form.has_digital_cert ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'"
            class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ml-4"
            :disabled="readonly">
            <span :class="form.has_digital_cert ? 'translate-x-5' : 'translate-x-1'"
              class="pointer-events-none inline-block h-4 w-4 mt-1 rounded-full bg-white shadow-md transition-transform duration-200" />
          </button>
        </div>

        <!-- Detalhes da verificação -->
        <div v-if="form.has_digital_cert" class="space-y-4">

          <!-- Plataforma: radio pills -->
          <div>
            <label class="lbl">Plataforma de Verificação</label>
            <div class="flex gap-2 flex-wrap mt-1">
              <label v-for="opt in certProviderOptions" :key="opt.value"
                class="flex items-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-all text-sm font-medium select-none"
                :class="certProvider === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300'"
                :style="readonly ? 'pointer-events:none;opacity:.75' : ''"
              >
                <input type="radio" :value="opt.value" :checked="certProvider === opt.value"
                  @change="setCertProvider(opt.value)" class="sr-only" :disabled="readonly" />
                <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  :class="certProvider === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'">
                  <span v-if="certProvider === opt.value" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                </span>
                <i :class="opt.icon" class="text-xs opacity-70"></i>
                {{ opt.label }}
              </label>
            </div>
          </div>

          <!-- Campo livre quando "Outra" -->
          <div v-if="certProvider === 'outra'">
            <label class="lbl">Nome da Plataforma</label>
            <input :value="form.digital_cert_provider" @input="set('digital_cert_provider', $event.target.value)"
              type="text" class="inp" placeholder="Ex: Clicksign, DocuSign..." :disabled="readonly" />
          </div>

          <!-- Contato -->
          <div>
            <label class="lbl">Contato / Suporte</label>
            <input :value="form.digital_cert_contact" @input="set('digital_cert_contact', $event.target.value)"
              type="text" class="inp" placeholder="Nome, telefone ou e-mail do suporte..." :disabled="readonly" />
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
        <textarea :value="form.notes" @input="set('notes', $event.target.value)"
          rows="3" class="inp resize-none" placeholder="Informações adicionais, particularidades do produto..." :disabled="readonly" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    form:           { type: Object,  required: true },
    correspondents: { type: Array,   default: () => [] },
    officeUsers:    { type: Array,   default: () => [] },
    readonly:       { type: Boolean, default: false },
});
const emit = defineEmits(['update']);

const activeUsers = computed(() =>
    (props.officeUsers ?? []).filter(u => u.status !== false)
);

const contractOptions = [
    { value: 'cca',    label: 'CCA' },
    { value: 'menin',  label: 'Menin (interno)' },
    { value: 'outros', label: 'Outros' },
];

const certProviderOptions = [
    { value: 'splink', label: 'Splink',  icon: 'fas fa-bolt' },
    { value: 'gov',    label: 'Gov.br',  icon: 'fas fa-landmark' },
    { value: 'outra',  label: 'Outra',   icon: 'fas fa-ellipsis' },
];

// ── Modo Gestor: sistema (FK user) ou manual (texto livre) ────────────────────

const managerMode = ref(
    props.form.manager_mode ||
    (props.form.manager_user_id ? 'sistema' : (props.form.manager_name ? 'manual' : 'sistema'))
);

watch(() => props.form.manager_mode, (v) => { if (v) managerMode.value = v; });
watch(() => props.form.manager_user_id, (id) => { if (id && !props.form.manager_name) managerMode.value = 'sistema'; });
watch(() => props.form.manager_name, (name) => { if (name && !props.form.manager_user_id) managerMode.value = 'manual'; });

function setManagerMode(mode) {
    if (props.readonly) return;
    managerMode.value = mode;
    if (mode === 'sistema') {
        emit('update', { manager_mode: 'sistema', manager_name: '', manager_email: '', manager_phone: '' });
    } else {
        emit('update', { manager_mode: 'manual', manager_user_id: null });
    }
}

// ── Modo Menin: sistema (FK user) ou manual (texto livre) ─────────────────────

const meniMode = ref(
    props.form.contract_registered_by_user_id
        ? 'sistema'
        : (props.form.outros_contact_name ? 'manual' : 'sistema')
);

watch(() => props.form.contract_registered_by_user_id, (id) => { if (id) meniMode.value = 'sistema'; });
watch(() => props.form.outros_contact_name, (name) => {
    if (name && !props.form.contract_registered_by_user_id) meniMode.value = 'manual';
});

function setMeniMode(mode) {
    if (props.readonly) return;
    meniMode.value = mode;
    if (mode === 'sistema') {
        emit('update', { outros_contact_name: '', outros_contact_email: '', outros_contact_phone: '' });
    } else {
        emit('update', { contract_registered_by_user_id: null });
    }
}

// ── Plataforma de Verificação ─────────────────────────────────────────────────
// Valores conhecidos → selecionam o radio; qualquer outro valor → 'outra' + campo livre

const KNOWN_PROVIDERS = ['splink', 'gov'];

const certProvider = computed(() => {
    const v = (props.form.digital_cert_provider ?? '').toLowerCase();
    return KNOWN_PROVIDERS.includes(v) ? v : (props.form.has_digital_cert ? 'outra' : '');
});

function setCertProvider(val) {
    if (props.readonly) return;
    if (val === 'splink') emit('update', { digital_cert_provider: 'Splink' });
    else if (val === 'gov') emit('update', { digital_cert_provider: 'Gov.br' });
    else emit('update', { digital_cert_provider: '' }); // campo livre limpo ao selecionar "outra"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function set(field, val) { if (!props.readonly) emit('update', { [field]: val }); }
function numOrNull(evt)  { const v = evt.target.value; return v === '' ? null : Number(v); }
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2; }
.lbl     { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5; }
.inp     { @apply w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.pfx     { @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none; }
</style>
