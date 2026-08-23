<template>
  <PageContainer size="md">
    <PageHeader
      title="DocuSign"
      subtitle="Conecte a conta que assina os documentos"
      icon-img="/icons/docusign.png">
      <template #actions>
        <PageHelp
          storage-key="docusign"
          title="Como conectar o DocuSign"
          intro="Esta tela liga o Office a UMA conta DocuSign. Quem assina cada documento não se define aqui, e sim nas Configurações das Fichas Comerciais."
          :steps="[
            { title: 'Conexão rápida', text: 'É o caminho recomendado: você faz login no DocuSign e autoriza o Office. Serve para a maioria dos casos.' },
            { title: 'Conexão avançada (JWT)', text: 'Só quando a empresa exige integração de servidor, sem login humano. Precisa de chave privada e consentimento do administrador da conta DocuSign.' },
            { title: 'Teste antes de confiar', text: 'O botão Testar confirma que a credencial ainda vale. Faça isso depois de qualquer troca de senha ou de chave.' },
          ]"
          :tips="[
            'Desconectar não apaga documento nenhum, mas trava novos envios até reconectar.',
            'Se a assinatura parar de funcionar sem ninguém ter mexido aqui, o mais provável é o token ter expirado: use Testar.',
          ]" />
      </template>
    </PageHeader>

    <!-- Status -->
    <div v-if="settings" class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm flex-wrap"
      :class="settings.connected
        ? 'bg-data-pos/10 border-data-pos/25 text-data-pos'
        : 'bg-surface-sunken border-line text-ink-muted'">
      <div class="flex items-center gap-2 min-w-0">
        <i :class="settings.connected ? 'fa-circle-check' : 'fa-circle-xmark'" class="fas"></i>
        <span v-if="settings.connected" class="truncate">
          Conectado como <strong>{{ settings.connected_email || settings.connected_name }}</strong>
          <span v-if="settings.account_id" class="opacity-70"> · conta {{ settings.account_id.substring(0, 8) }}...</span>
        </span>
        <span v-else-if="settings.auth_mode === 'jwt'">Usando conexão avançada (JWT).</span>
        <span v-else>Não conectado.</span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="testConnection" :disabled="testing" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-raised border border-line rounded-lg hover:bg-surface-raised/70 disabled:opacity-50 transition">
          <i :class="testing ? 'fa-spinner fa-spin' : 'fa-plug'" class="fas mr-1"></i> Testar
        </button>
        <button v-if="settings.connected" @click="pedindoDesconectar = true" class="px-3 py-1.5 text-xs font-semibold text-data-neg bg-data-neg/10 border border-data-neg/25 rounded-lg hover:bg-data-neg/10 transition">
          <i class="fas fa-link-slash mr-1"></i> Desconectar
        </button>
      </div>
    </div>

    <!-- Conexão rápida (login) -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-line bg-surface-sunken">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide"><i class="fas fa-bolt text-accent mr-1.5"></i> Conexão rápida (recomendada) - login no DocuSign</p>
      </div>
      <div class="p-5 space-y-4">

        <!-- Passo 1 -->
        <div class="space-y-3">
          <p class="text-xs text-ink-muted"><strong class="text-ink">1.</strong> No DocuSign (Admin → Apps and Keys), copie a <strong>Integration Key</strong> e gere uma <strong>Secret Key</strong>:</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="lbl">Integration Key</label>
              <input v-model="form.integration_key" type="text" class="inp" autocomplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div>
              <label class="lbl">
                Secret Key
                <span v-if="settings?.has_secret_key" class="ml-2 normal-case font-normal text-data-pos"><i class="fas fa-check mr-0.5"></i>salva — cole outra só para trocar</span>
              </label>
              <input v-model="form.secret_key" type="password" class="inp" autocomplete="new-password" data-1p-ignore data-lpignore="true" :placeholder="settings?.has_secret_key ? '(mantida)' : 'cole a secret key'" />
            </div>
            <div>
              <label class="lbl">Ambiente</label>
              <select v-model="form.oauth_base" class="inp">
                <option value="account.docusign.com">Produção (account.docusign.com)</option>
                <option value="account-d.docusign.com">Demo / Sandbox (account-d.docusign.com)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Passo 2 -->
        <div class="space-y-1.5">
          <p class="text-xs text-ink-muted"><strong class="text-ink">2.</strong> No mesmo app do DocuSign, registre esta <strong>Redirect URI</strong>:</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 min-w-0 px-3 py-2 text-xs bg-surface-sunken border border-line rounded-lg truncate">{{ redirectUri }}</code>
            <button @click="copyRedirect" class="px-3 py-2 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 transition flex-shrink-0">
              <i :class="copied ? 'fa-check text-data-pos' : 'fa-copy'" class="fas"></i>
            </button>
          </div>
        </div>

        <!-- Passo 3 -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs text-ink-muted"><strong class="text-ink">3.</strong> Salve e clique em Conectar — você loga no DocuSign e pronto, fica salvo.</p>
          <div class="flex items-center gap-2">
            <button @click="save" :disabled="saving" class="px-4 py-2 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition">
              <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas mr-1"></i> Salvar
            </button>
            <button @click="connect" :disabled="connecting" class="px-4 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent disabled:opacity-50 transition">
              <i :class="connecting ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'" class="fas mr-1"></i> Conectar com DocuSign
            </button>
          </div>
        </div>

        <div v-if="feedback" class="px-3.5 py-2.5 rounded-lg text-xs border"
          :class="feedback.ok
            ? 'bg-data-pos/10 border-data-pos/25 text-data-pos'
            : 'bg-data-neg/10 border-data-neg/25 text-data-neg'">
          {{ feedback.message }}
        </div>

        <p class="text-micro text-ink-subtle">
          A conexão se renova sozinha a cada uso. Se o sistema ficar ~30 dias sem enviar nada, ela expira — basta clicar em "Conectar com DocuSign" de novo.
        </p>
      </div>
    </div>

    <!-- Modo avançado (JWT) -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
      <button @click="showAdvanced = !showAdvanced" class="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-sunken/40 transition">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide"><i class="fas fa-gears text-ink-subtle mr-1.5"></i> Modo avançado (JWT) - conexão que nunca expira</p>
        <i :class="showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down'" class="fas text-xs text-ink-subtle"></i>
      </button>
      <div v-if="showAdvanced" class="p-5 pt-2 space-y-4 border-t border-line">
        <p class="text-micro text-ink-subtle">Para conexão de servidor sem login (não expira). Exige gerar um par de chaves RSA no app DocuSign e conceder consentimento uma vez. Se a conexão rápida acima estiver ativa, ela tem prioridade.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="lbl">User ID (GUID do usuário impersonado)</label>
            <input v-model="form.ds_user_id" type="text" class="inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label class="lbl">API Account ID <span class="normal-case font-normal text-ink-subtle">(auto no modo rápido)</span></label>
            <input v-model="form.account_id" type="text" class="inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
        </div>
        <div>
          <label class="lbl">
            RSA Private Key (PEM)
            <span v-if="settings?.has_private_key" class="ml-2 normal-case font-normal text-data-pos"><i class="fas fa-check mr-0.5"></i>já cadastrada</span>
          </label>
          <textarea v-model="form.private_key" rows="5" class="inp resize-none font-mono text-xs"
            :placeholder="settings?.has_private_key ? '(mantida — cole uma nova apenas para substituir)' : '-----BEGIN RSA PRIVATE KEY-----'"></textarea>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button @click="openConsent" class="px-3.5 py-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/25 rounded-lg hover:bg-accent/10  transition">
            <i class="fas fa-user-check mr-1"></i> Consentimento
          </button>
          <button @click="save" :disabled="saving" class="px-4 py-2 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition">
            <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas mr-1"></i> Salvar
          </button>
        </div>
      </div>
    </div>

    <!-- Como funciona -->
    <div class="bg-surface-raised rounded-2xl border border-line shadow-sm p-5 text-xs text-ink-muted space-y-1.5">
      <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2"><i class="fas fa-circle-info text-accent mr-1.5"></i> Como funciona</p>
      <p>1. Configure os <strong>assinantes e o modo de assinatura</strong> em Fichas Comerciais → Configurações.</p>
      <p>2. Após <strong>autorizar</strong> uma ficha, a aba <strong>Assinatura</strong> dela permite enviar o documento pelo DocuSign.</p>
      <p>3. Quando todos assinam, o <strong>PDF assinado</strong> (com certificado) é salvo automaticamente e fica anexado na ficha.</p>
    </div>

  </PageContainer>

  <ConfirmDialog :open="pedindoDesconectar" tone="danger"
    title="Desconectar do DocuSign?"
    consequence="Novos envios para assinatura param de funcionar na hora, em todas as fichas."
    hint="Documentos já assinados e envelopes em andamento não são afetados. Reconectar restabelece o envio."
    confirm-label="Desconectar" :loading="desconectando"
    @confirm="disconnect" @cancel="pedindoDesconectar = false" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import API_URL from '@/config/apiUrl';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';

const store = useConditionsStore();
const route = useRoute();
const router = useRouter();

const settings = ref(null);
const form = ref({ integration_key: '', secret_key: '', ds_user_id: '', account_id: '', oauth_base: 'account.docusign.com', private_key: '' });
const saving = ref(false);
const testing = ref(false);
const connecting = ref(false);
const copied = ref(false);
const showAdvanced = ref(false);
const feedback = ref(null);

// Mesmo valor que o backend monta no /oauth-url (API_URL já inclui /api).
const redirectUri = computed(() => `${API_URL}/docusign-oauth/callback`);

async function load() {
    try {
        settings.value = await store.fetchDocusignSettings();
        form.value = {
            integration_key: settings.value.integration_key ?? '',
            secret_key: '',
            ds_user_id: settings.value.ds_user_id ?? '',
            account_id: settings.value.account_id ?? '',
            oauth_base: settings.value.oauth_base ?? 'account.docusign.com',
            private_key: '',
        };
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao carregar configurações.' };
    }
}

async function save(silent = false) {
    saving.value = true;
    if (!silent) feedback.value = null;
    try {
        await store.updateDocusignSettings(form.value);
        if (!silent) feedback.value = { ok: true, message: 'Configurações salvas.' };
        await load();
        return true;
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao salvar.' };
        return false;
    } finally {
        saving.value = false;
    }
}

// Salva o que estiver no form e redireciona para o login do DocuSign.
async function connect() {
    connecting.value = true;
    feedback.value = null;
    try {
        const ok = await save(true);
        if (!ok) return;
        const { url } = await store.fetchDocusignOauthUrl();
        window.location.href = url;
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao iniciar a conexão.' };
    } finally {
        connecting.value = false;
    }
}

const pedindoDesconectar = ref(false);
const desconectando = ref(false);

async function disconnect() {
    pedindoDesconectar.value = false;
    desconectando.value = true;
    try {
        await store.disconnectDocusign();
        feedback.value = { ok: true, message: 'Desconectado.' };
        await load();
    } catch (e) {
        feedback.value = { ok: false, message: e.message || 'Erro ao desconectar.' };
    } finally {
        desconectando.value = false;
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

async function copyRedirect() {
    try {
        await navigator.clipboard.writeText(redirectUri.value);
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
    } catch { /* clipboard indisponível */ }
}

onMounted(async () => {
    await load();
    // Retorno do login DocuSign (callback redireciona com estes params).
    if (route.query.connected === '1') {
        feedback.value = { ok: true, message: `Conectado com sucesso${route.query.email ? ` como ${route.query.email}` : ''}!` };
        router.replace({ query: {} });
    } else if (route.query.ds_error) {
        feedback.value = { ok: false, message: `Falha ao conectar: ${route.query.ds_error}` };
        router.replace({ query: {} });
    }
});
</script>

<style scoped>
.lbl { @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5; }
.inp { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-ink-subtle dark:placeholder:text-ink-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all duration-150; }
</style>
