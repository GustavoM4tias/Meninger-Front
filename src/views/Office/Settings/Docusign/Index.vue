<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
        <img src="/icons/docusign.svg" alt="DocuSign" class="w-10 h-10" />
      </div>
      <div>
        <h1 class="text-lg font-bold text-ink">DocuSign - Assinatura Digital</h1>
        <p class="text-xs text-ink-subtle">Credenciais da integração (JWT). Os assinantes das fichas são configurados nas Configurações das Fichas Comerciais.</p>
      </div>
    </div>

    <!-- Status do teste -->
    <div v-if="settings" class="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
      :class="settings.last_test_ok
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
        : 'bg-surface-sunken border-line text-ink-muted'">
      <i :class="settings.last_test_ok ? 'fa-circle-check' : 'fa-circle-question'" class="fas"></i>
      <span v-if="settings.last_test_ok">Conexão OK — último teste em {{ formatDate(settings.last_test_at) }}.</span>
      <span v-else-if="settings.last_test_at">Último teste falhou ({{ formatDate(settings.last_test_at) }}). Revise as credenciais e o consentimento.</span>
      <span v-else>Integração ainda não testada.</span>
    </div>

    <!-- Credenciais -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-line bg-gray-50/60 dark:bg-gray-800/40">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide"><i class="fas fa-key text-violet-500 mr-1.5"></i> Credenciais (JWT Grant)</p>
      </div>
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">Integration Key (Client ID)</label>
            <input v-model="form.integration_key" type="text" class="inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label class="lbl">User ID (GUID do usuário impersonado)</label>
            <input v-model="form.ds_user_id" type="text" class="inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label class="lbl">API Account ID</label>
            <input v-model="form.account_id" type="text" class="inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label class="lbl">Ambiente</label>
            <select v-model="form.oauth_base" class="inp">
              <option value="account.docusign.com">Produção (account.docusign.com)</option>
              <option value="account-d.docusign.com">Demo / Sandbox (account-d.docusign.com)</option>
            </select>
          </div>
        </div>
        <div>
          <label class="lbl">
            RSA Private Key (PEM)
            <span v-if="settings?.has_private_key" class="ml-2 normal-case font-normal text-green-600 dark:text-green-400"><i class="fas fa-check mr-0.5"></i>já cadastrada — cole novamente só para trocar</span>
          </label>
          <textarea v-model="form.private_key" rows="5" class="inp resize-none font-mono text-xs"
            :placeholder="settings?.has_private_key ? '(mantida — cole uma nova apenas para substituir)' : '-----BEGIN RSA PRIVATE KEY-----'"></textarea>
        </div>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-[11px] text-ink-subtle max-w-md">
            Encontre em DocuSign Admin → Apps and Keys. Gere o par RSA no app e cole a chave privada aqui.
            No 1º uso, conceda o consentimento pelo botão ao lado (logado no DocuSign).
          </p>
          <div class="flex items-center gap-2">
            <button @click="openConsent" :disabled="!settings" class="px-3.5 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 transition">
              <i class="fas fa-user-check mr-1"></i> Consentimento
            </button>
            <button @click="testConnection" :disabled="testing" class="px-3.5 py-2 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition">
              <i :class="testing ? 'fa-spinner fa-spin' : 'fa-plug'" class="fas mr-1"></i> Testar conexão
            </button>
            <button @click="save" :disabled="saving" class="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition">
              <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas mr-1"></i> Salvar
            </button>
          </div>
        </div>
        <div v-if="feedback" class="px-3.5 py-2.5 rounded-lg text-xs border"
          :class="feedback.ok
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'">
          {{ feedback.message }}
        </div>
      </div>
    </div>

    <!-- Como funciona -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm p-5 text-xs text-ink-muted space-y-1.5">
      <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2"><i class="fas fa-circle-info text-violet-500 mr-1.5"></i> Como funciona</p>
      <p>1. Configure os <strong>assinantes e o modo de assinatura</strong> em Fichas Comerciais → Configurações.</p>
      <p>2. Após <strong>autorizar</strong> uma ficha, a aba <strong>Assinatura</strong> dela permite enviar o documento pelo DocuSign.</p>
      <p>3. Quando todos assinam, o <strong>PDF assinado</strong> (com certificado) é salvo automaticamente e fica anexado na ficha.</p>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

const store = useConditionsStore();

const settings = ref(null);
const form = ref({ integration_key: '', ds_user_id: '', account_id: '', oauth_base: 'account.docusign.com', private_key: '' });
const saving = ref(false);
const testing = ref(false);
const feedback = ref(null);

async function load() {
    try {
        settings.value = await store.fetchDocusignSettings();
        form.value = {
            integration_key: settings.value.integration_key ?? '',
            ds_user_id: settings.value.ds_user_id ?? '',
            account_id: settings.value.account_id ?? '',
            oauth_base: settings.value.oauth_base ?? 'account.docusign.com',
            private_key: '',
        };
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao carregar configurações.' };
    }
}

async function save() {
    saving.value = true;
    feedback.value = null;
    try {
        await store.updateDocusignSettings(form.value);
        feedback.value = { ok: true, message: 'Configurações salvas.' };
        await load();
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao salvar.' };
    } finally {
        saving.value = false;
    }
}

async function testConnection() {
    testing.value = true;
    feedback.value = null;
    try {
        const r = await store.testDocusign();
        feedback.value = r.ok
            ? { ok: true, message: 'Conexão com o DocuSign OK.' }
            : { ok: false, message: `Falhou: ${r.error}` };
        await load();
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro no teste.' };
    } finally {
        testing.value = false;
    }
}

async function openConsent() {
    try {
        const { url } = await store.fetchDocusignConsentUrl();
        window.open(url, '_blank', 'noopener');
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Configure e salve a Integration Key primeiro.' };
    }
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(load);
</script>

<style scoped>
.lbl { @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5; }
.inp { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 transition-all duration-150; }
</style>
