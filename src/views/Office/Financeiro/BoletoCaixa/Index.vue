<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <div class="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg overflow-hidden">
      <div class="p-6 text-white">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold mb-1 flex items-center gap-3">
              <i class="fas fa-barcode"></i>
              Boleto Caixa
            </h1>
            <p class="text-blue-100 text-sm">
              Emissão automática de boletos no ECO Cobrança via webhook do CV
            </p>
          </div>

          <!-- Indicador de status -->
          <div v-if="store.settings" class="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
            <span class="relative flex h-3 w-3">
              <span v-if="store.settings.active"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3"
                :class="store.settings.active ? 'bg-green-400' : 'bg-gray-300'"></span>
            </span>
            <span class="text-sm font-medium">
              {{ store.settings.active ? 'Automação ativa' : 'Automação pausada' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === tab.key
          ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'">
        <i :class="tab.icon" class="mr-2"></i>{{ tab.label }}
      </button>
    </div>

    <!-- ── TAB: Configurações ───────────────────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="space-y-5">

      <!-- Card: Credenciais ECO Cobrança -->
      <div class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-lock"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-900 dark:text-white">Credenciais ECO Cobrança</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Acesso ao portal da Caixa Econômica Federal</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Usuário (CPF)
            </label>
            <input v-model="form.eco_usuario" type="text" placeholder="00000000000" maxlength="11"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Senha
              <span v-if="store.settings?.eco_senha_set"
                class="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">
                (configurada)
              </span>
            </label>
            <input v-model="form.eco_senha" type="password" placeholder="••••••" maxlength="6"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            <p class="text-xs text-gray-400 mt-1">Deixe em branco para manter a senha atual.</p>
          </div>
        </div>
      </div>

      <!-- Card: Webhook -->
      <div class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-3">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-webhook"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-900 dark:text-white">Endereço do Webhook</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Configure este endereço no cadastro do webhook do CV</p>
          </div>
        </div>

        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
          <code class="text-sm text-blue-600 dark:text-blue-400 flex-1 break-all select-all">
            {{ webhookUrl }}
          </code>
          <button @click="copyWebhook"
            class="flex-none px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <i :class="copied ? 'fas fa-check' : 'fas fa-copy'" class="mr-1"></i>
            {{ copied ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>

        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <i class="fas fa-info-circle mr-2"></i>
          Configure o gatilho <strong>"Quando entrar na situação..."</strong> para a funcionalidade
          <strong>Reserva</strong> no CV com este endereço.
        </div>
      </div>

      <!-- Card: Configurações de Série e CV -->
      <div class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-sliders"></i>
          </div>
          <h2 class="font-semibold text-gray-900 dark:text-white">Configurações do CV</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              ID da Série (Recurso Próprio a Vista)
            </label>
            <input v-model.number="form.idserie_ra" type="number" placeholder="21"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            <p class="text-xs text-gray-400 mt-1">Padrão: 21</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              ID Tipo Documento (CV) para Anexo
            </label>
            <input v-model.number="form.cv_idtipo_documento" type="number" placeholder="Ex: 14"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            <p class="text-xs text-gray-400 mt-1">Obtido na API de tipos de arquivo do CV.</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              ID Situação CV — Sucesso
            </label>
            <input v-model.number="form.situacao_sucesso_id" type="number" placeholder="ID da situação"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              ID Situação CV — Erro
            </label>
            <input v-model.number="form.situacao_erro_id" type="number" placeholder="ID da situação"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            <p class="text-xs text-gray-400 mt-1">Usa endpoint <code>cancelar-reserva</code> do CV.</p>
          </div>
        </div>
      </div>

      <!-- Card: Controle de ativação -->
      <div class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center"
              :class="form.active ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'">
              <i :class="form.active ? 'fas fa-play' : 'fas fa-pause'"></i>
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">Automação</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ form.active ? 'Processando webhooks automaticamente' : 'Webhooks recebidos mas não processados' }}
              </p>
            </div>
          </div>
          <button @click="form.active = !form.active"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            :class="form.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </div>
      </div>

      <!-- Botão salvar -->
      <div class="flex justify-end gap-3">
        <p v-if="store.settingsError" class="text-sm text-red-500 self-center">
          <i class="fas fa-exclamation-circle mr-1"></i>{{ store.settingsError }}
        </p>
        <p v-if="store.settingsSaved" class="text-sm text-green-600 dark:text-green-400 self-center">
          <i class="fas fa-check mr-1"></i>Configurações salvas!
        </p>
        <button @click="handleSave" :disabled="store.settingsLoading"
          class="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <i :class="store.settingsLoading ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
          {{ store.settingsLoading ? 'Salvando...' : 'Salvar Configurações' }}
        </button>
      </div>

      <!-- Card: Simulação de Webhook (somente dev) -->
      <div v-if="isDev"
        class="rounded-2xl border-2 border-dashed border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-6 shadow-sm space-y-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold uppercase tracking-wide">
            <i class="fas fa-flask"></i> Dev Only
          </span>
          <h3 class="text-base font-semibold text-yellow-800 dark:text-yellow-300">
            Simular Webhook
          </h3>
        </div>
        <p class="text-sm text-yellow-700 dark:text-yellow-400">
          Dispara o processamento de boleto manualmente para uma reserva, sem precisar configurar o CV.
          Bloqueado automaticamente em produção.
        </p>

        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="simulateIdreserva"
            type="number"
            placeholder="ID da Reserva (ex: 12345)"
            class="flex-1 rounded-xl border border-yellow-300 dark:border-yellow-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            @click="handleSimulate"
            :disabled="store.simulateLoading || !simulateIdreserva"
            class="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
            <i :class="store.simulateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-play'"></i>
            {{ store.simulateLoading ? 'Disparando...' : 'Disparar' }}
          </button>
        </div>

        <p v-if="store.simulateSuccess" class="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <i class="fas fa-check-circle"></i>
          Webhook simulado! Acompanhe o progresso na aba Histórico.
        </p>
        <p v-if="store.simulateError" class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <i class="fas fa-circle-xmark"></i>
          {{ store.simulateError }}
        </p>
      </div>
    </div>

    <!-- ── TAB: Histórico ───────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'history'" class="space-y-4">

      <!-- Filtros -->
      <div class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Status</label>
            <select v-model="store.historyFilter.status" @change="store.fetchHistory()"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Todos</option>
              <option value="processing">Processando</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">ID Reserva</label>
            <input v-model="store.historyFilter.idreserva" @keyup.enter="store.fetchHistory()"
              type="number" placeholder="Ex: 7187"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 w-32" />
          </div>
          <button @click="store.fetchHistory()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <i class="fas fa-filter"></i> Filtrar
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.historyLoading" class="flex items-center justify-center py-12 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl mr-3"></i>
        <span>Carregando histórico...</span>
      </div>

      <!-- Erro -->
      <div v-else-if="store.historyError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-600">
        <i class="fas fa-exclamation-circle mr-2"></i>{{ store.historyError }}
      </div>

      <!-- Tabela -->
      <div v-else class="rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                <th class="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">ID Reserva</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Titular</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Empreendimento</th>
                <th class="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Valor</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Vencimento</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Data</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Boleto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.history.length">
                <td colspan="8" class="text-center py-10 text-gray-400">
                  <i class="fas fa-inbox text-3xl mb-2 block"></i>
                  Nenhum registro encontrado.
                </td>
              </tr>
              <tr v-for="item in store.history" :key="item.id"
                class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td class="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  #{{ item.idreserva }}
                </td>
                <td class="px-4 py-3 text-gray-800 dark:text-gray-200">
                  {{ item.titular_nome || '—' }}
                </td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                  {{ item.empreendimento || '—' }}
                </td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  {{ item.valor ? formatCurrency(item.valor) : '—' }}
                </td>
                <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {{ item.vencimento ? formatDate(item.vencimento) : '—' }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    :class="statusClass(item.status)">
                    <i :class="statusIcon(item.status)"></i>
                    {{ statusLabel(item.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {{ formatDateTime(item.created_at) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <a v-if="item.boleto_supabase_url" :href="item.boleto_supabase_url" target="_blank"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                    <i class="fas fa-file-pdf"></i> PDF
                  </a>
                  <span v-else-if="item.status === 'error'" class="text-xs text-red-500" :title="item.error_message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span class="hidden md:inline ml-1">{{ truncate(item.error_message, 30) }}</span>
                  </span>
                  <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div v-if="store.totalPages > 1"
          class="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ store.historyTotal }} registros
          </span>
          <div class="flex gap-1">
            <button v-for="p in store.totalPages" :key="p" @click="store.setPage(p)"
              class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
              :class="store.historyPage === p
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
              {{ p }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import API_URL from '@/config/apiUrl';

const store = useBoletoStore();

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'settings', label: 'Configurações', icon: 'fas fa-gear' },
  { key: 'history',  label: 'Histórico',     icon: 'fas fa-clock-rotate-left' },
];
const activeTab = ref('settings');

// ── Webhook URL ───────────────────────────────────────────────────────────────
const webhookUrl = computed(() => `${API_URL}/boleto-caixa/webhook`);

const copied = ref(false);
function copyWebhook() {
  navigator.clipboard.writeText(webhookUrl.value).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
}

// ── Simulate (dev only) ───────────────────────────────────────────────────────
const isDev = import.meta.env.DEV;
const simulateIdreserva = ref('');

async function handleSimulate() {
  if (!simulateIdreserva.value) return;
  await store.simulateWebhook(simulateIdreserva.value);
  if (store.simulateSuccess) {
    simulateIdreserva.value = '';
    // Após 2s vai pro histórico para o usuário acompanhar
    setTimeout(() => {
      activeTab.value = 'history';
      store.fetchHistory();
    }, 2000);
  }
}

// ── Form ──────────────────────────────────────────────────────────────────────
const form = ref({
  eco_usuario: '',
  eco_senha: '',
  idserie_ra: 21,
  cv_idtipo_documento: null,
  situacao_sucesso_id: null,
  situacao_erro_id: null,
  active: false,
});

async function handleSave() {
  const payload = { ...form.value };
  await store.saveSettings(payload);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.substring(0, n) + '...' : str;
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusClass(status) {
  return {
    processing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    success:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    error:      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  }[status] || 'bg-gray-100 text-gray-500';
}

function statusIcon(status) {
  return {
    processing: 'fas fa-spinner fa-spin',
    success:    'fas fa-check',
    error:      'fas fa-times',
  }[status] || 'fas fa-question';
}

function statusLabel(status) {
  return { processing: 'Processando', success: 'Sucesso', error: 'Erro' }[status] || status;
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.fetchSettings();
  if (store.settings) {
    form.value.eco_usuario        = store.settings.eco_usuario || '';
    form.value.idserie_ra         = store.settings.idserie_ra ?? 21;
    form.value.cv_idtipo_documento = store.settings.cv_idtipo_documento || null;
    form.value.situacao_sucesso_id = store.settings.situacao_sucesso_id || null;
    form.value.situacao_erro_id    = store.settings.situacao_erro_id || null;
    form.value.active              = store.settings.active ?? false;
  }
  await store.fetchHistory();
});
</script>
