<script setup>
// Central Meta › aba Credenciais — TUDO pra conectar a Meta num lugar só:
//
//   1. Credenciais do App (App ID, App Secret, versão Graph) — compartilhadas
//      com o WhatsApp (mesmo App na Meta). Fonte: meta_app_configs (/api/meta-app).
//   2. Token de Gestão de Campanhas (admin, vê todos os BMs) — relatório/atribuição.
//   3. Tokens do Lead Ads (verify token do webhook + access token do System User)
//      — próprios da captação. Fonte: marketing_configs (/api/marketing/config).
//
// Absorve a antiga tela /settings/meta (redirect pra cá) + a aba "Meta Lead Ads"
// da antiga Config. Captação. O storage NÃO mudou — só a apresentação.

import { ref, watch, computed, onMounted, onBeforeUnmount, onActivated } from 'vue';
import { useToast } from 'vue-toastification';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useMetaAppStore } from '@/stores/Meta/metaAppStore';
import { useMarketingSettingsStore } from '@/stores/Marketing/Settings/marketingSettingsStore';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const store = useMetaAppStore();
const toast = useToast();
/* O App Secret e a chave que autentica o webhook da Meta: sem ele a captacao
   de leads para de entrar. Merece dialogo com consequencia, nao `confirm`. */
const pedindoRemover = ref(null);   // qual secret aguarda confirmação
const mkt = useMarketingSettingsStore();

// ══ 1. Credenciais do App (compartilhadas WhatsApp + Lead Ads) ══════════════

const form = ref({ meta_app_id: '', meta_app_secret: '', meta_graph_api_version: 'v21.0' });
const dirty = ref(false);
const message = ref(null);
const campaignToken = ref('');

// Ao voltar da aba do login OAuth, reatualiza o status do token de campanhas.
const refetchOnFocus = () => store.fetchCampaignsStatus();

onMounted(() => {
  store.fetchConfig();
  store.fetchCampaignsStatus();
  mkt.fetchConfig().then(resetLeadAdsDraft);
  window.addEventListener('focus', refetchOnFocus);
});
onBeforeUnmount(() => window.removeEventListener('focus', refetchOnFocus));
// KeepAlive do hub: revalida status ao voltar pra aba.
onActivated(() => store.fetchCampaignsStatus());

watch(() => store.config, (cfg) => {
  if (!cfg) return;
  form.value = {
    meta_app_id: cfg.meta_app_id || '',
    meta_app_secret: '',
    meta_graph_api_version: cfg.meta_graph_api_version || 'v21.0',
  };
  dirty.value = false;
}, { immediate: true });

watch(form, () => { dirty.value = true; }, { deep: true });

const lastTest = computed(() => {
  const c = store.config;
  if (!c?.last_test_at) return 'Nunca testado.';
  const dt = new Date(c.last_test_at).toLocaleString('pt-BR');
  return `${dt} - ${c.last_test_ok ? 'OK' : `Falhou${c.last_test_error ? ': ' + c.last_test_error : ''}`}`;
});

const flash = (type, text) => { message.value = { type, text }; setTimeout(() => { message.value = null; }, 5000); };

async function onSave() {
  const ok = await store.updateConfig({
    meta_app_id: form.value.meta_app_id.trim() || null,
    meta_graph_api_version: form.value.meta_graph_api_version || null,
    meta_app_secret: form.value.meta_app_secret,   // vazio = preserva o atual
  });
  if (ok) {
    form.value.meta_app_secret = '';
    dirty.value = false;
    flash('success', 'Credenciais salvas. WhatsApp e Lead Ads já usam este mesmo segredo.');
  } else {
    flash('error', store.error || 'Erro ao salvar.');
  }
}

async function onTest() {
  await store.testSecret();
}

// ══ 2. Gestão de Campanhas (token admin) ════════════════════════════════════

const campExpiry = computed(() => {
  const s = store.campaignsStatus;
  if (!s?.connected) return null;
  if (!s.expires_at) return 'sem expiração (token permanente)';
  return `expira em ${s.days_left} dia(s) · ${new Date(s.expires_at).toLocaleDateString('pt-BR')}`;
});

async function onConnectLogin() {
  try {
    const d = await store.campaignsOAuthUrl();
    window.open(d.url, '_blank', 'noopener,width=680,height=780');
  } catch (e) {
    flash('error', e.message);
  }
}

async function onConnectPaste() {
  if (!campaignToken.value.trim()) return;
  const d = await store.connectCampaigns(campaignToken.value.trim());
  if (d) campaignToken.value = '';
}

// ══ 3. Tokens do Lead Ads (verify + System User) ════════════════════════════

const leadAds = ref({ meta_verify_token: '', meta_access_token: '' });
const showSecrets = ref({ verify_token: false, access_token: false });

function resetLeadAdsDraft() {
  leadAds.value = { meta_verify_token: '', meta_access_token: '' };
  showSecrets.value = { verify_token: false, access_token: false };
}

const mktCfg = computed(() => mkt.config || {});
const test = computed(() => mkt.testResult);

// Gera verify_token aleatório no cliente (24 bytes hex).
function generateVerifyToken() {
  const arr = new Uint8Array(24);
  window.crypto.getRandomValues(arr);
  leadAds.value.meta_verify_token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  showSecrets.value.verify_token = true;
}

/* Guarda QUAL secret vai sair: o diálogo confirma depois, fora desta função. */
function clearSecret(key) {
  pedindoRemover.value = key;
}

function removerSecretConfirmado() {
  const key = pedindoRemover.value;
  pedindoRemover.value = null;
  if (!key) return;
  // Sentinel especial que o backend interpreta como "limpar"
  leadAds.value[`meta_${key}`] = '__CLEAR__';
}

async function saveLeadAds() {
  // Só envia o que o usuário digitou (vazios são preservados pelo backend).
  const ok = await mkt.updateConfig({
    meta_verify_token: leadAds.value.meta_verify_token || '',
    meta_access_token: leadAds.value.meta_access_token || '',
  });
  if (ok) {
    toast.success('Tokens do Lead Ads salvos.');
    await mkt.fetchConfig();
    resetLeadAdsDraft();
  } else {
    toast.error('Erro ao salvar: ' + (mkt.error || 'erro desconhecido'));
  }
}

async function copyWebhook() {
  try { await navigator.clipboard.writeText(mkt.webhookUrl); toast.success('URL copiada.'); }
  catch { toast.error('Não consegui copiar.'); }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-5">

    <!-- Explicação -->
    <div class="rounded-xl border border-[#0866FF]/20 bg-[#0866FF]/5 p-4 text-sm text-ink-muted space-y-1.5">
      <p>
        <i class="fas fa-circle-info text-[#0866FF] mr-1"></i>
        Como WhatsApp e Lead Ads usam o <b>mesmo App</b> na Meta, o <b>App Secret</b> é o mesmo nos dois.
        Definindo aqui, ele vale para as duas integrações de uma vez - sem risco de uma ficar pra trás.
      </p>
      <p class="text-ink-subtle">
        Os tokens do <b>Lead Ads</b> ficam logo abaixo, nesta mesma aba. O token do
        <b>WhatsApp</b> continua em
        <RouterLink to="/settings/whatsapp" class="text-accent underline">WhatsApp</RouterLink>.
      </p>
    </div>

    <!-- ══ Credenciais do App ══════════════════════════════════════════════ -->
    <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft space-y-5">
      <header>
        <h2 class="text-sm font-semibold text-ink">Credenciais do App</h2>
        <p class="text-xs text-ink-muted">
          Pegue em <a href="https://developers.facebook.com/apps" target="_blank" class="text-accent underline">developers.facebook.com</a>
          → seu App → Configurações → Básico.
        </p>
      </header>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.meta_app_id" label="App ID" placeholder="785502081163165" />
        <Input v-model="form.meta_graph_api_version" label="Versão da Graph API" placeholder="v21.0" />
      </div>

      <Input v-model="form.meta_app_secret" type="password"
        :label="`App Secret ${store.config?.has_meta_app_secret ? '(já configurado)' : ''}`"
        placeholder="cole o App Secret atual"
        hint="Só é gravado quando preenchido. Para limpar, digite __CLEAR__. Valida a assinatura HMAC dos webhooks (WhatsApp + Lead Ads)." />

      <div v-if="message"
        :class="['text-xs px-3 py-2 rounded-md border',
          message.type === 'success'
            ? 'text-data-pos bg-data-pos/10 border-data-pos/20'
            : 'text-data-neg bg-data-neg/10 border-data-neg/20']">
        {{ message.text }}
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button :loading="store.saving" :disabled="!dirty" icon="fas fa-floppy-disk" @click="onSave">
          Salvar{{ dirty ? '' : ' (sem alterações)' }}
        </Button>
        <Button variant="secondary" :loading="store.testing"
          :disabled="!store.config?.has_meta_app_secret || dirty"
          icon="fas fa-heart-pulse" @click="onTest">
          Testar App Secret
        </Button>
        <span v-if="dirty && store.config?.has_meta_app_secret" class="text-micro text-ink-subtle">Salve antes de testar.</span>
      </div>

      <!-- Resultado do teste -->
      <div v-if="store.testResult"
        :class="['rounded-lg border px-3 py-2.5 text-sm',
          store.testResult.ok
            ? 'border-data-pos/20 bg-data-pos/5 text-data-pos'
            : 'border-data-neg/20 bg-data-neg/10 text-data-neg']">
        <div class="flex items-start gap-2">
          <i :class="store.testResult.ok ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'" class="mt-0.5"></i>
          <div>
            <div class="font-medium">{{ store.testResult.ok ? 'App ID + App Secret válidos.' : 'App Secret não confere.' }}</div>
            <div v-if="store.testResult.error" class="text-xs font-mono mt-0.5 break-words">{{ store.testResult.error }}</div>
            <div v-if="store.testResult.hint" class="text-xs mt-1 text-ink-muted">{{ store.testResult.hint }}</div>
          </div>
        </div>
      </div>

      <p class="text-micro text-ink-subtle">Último teste: {{ lastTest }}</p>
    </section>

    <!-- ══ Gestão de Campanhas (token admin — enxerga todas as contas/BMs) ══ -->
    <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft space-y-4">
      <header>
        <h2 class="text-sm font-semibold text-ink">Gestão de Campanhas (Meta)</h2>
        <p class="text-xs text-ink-muted">
          Conecta um usuário <b>admin</b> que enxerga <b>todas as contas de anúncio de todos os BMs</b>
          (inclusive as futuras) — usado só pelo relatório e atribuição de campanhas.
          <b>Os leads não usam este token:</b> se ele cair, os leads continuam entrando; só o relatório
          para de atualizar até reconectar.
        </p>
      </header>

      <!-- Status -->
      <div class="rounded-lg border px-3 py-2.5 text-sm"
        :class="store.campaignsStatus?.connected
          ? 'border-data-pos/20 bg-data-pos/5'
          : 'border-data-warn/20 bg-data-warn/5'">
        <div v-if="store.campaignsStatus?.connected" class="space-y-0.5">
          <div class="flex items-center gap-2 text-data-pos font-medium">
            <i class="fas fa-circle-check"></i>
            Conectado como {{ store.campaignsStatus.name || 'admin' }}
          </div>
          <div class="text-xs text-ink-muted">
            <span v-if="store.campaignsStatus.accounts_count != null">{{ store.campaignsStatus.accounts_count }} contas visíveis · </span>
            <span>{{ campExpiry }}</span>
          </div>
        </div>
        <div v-else class="flex items-center gap-2 text-data-warn">
          <i class="fas fa-triangle-exclamation"></i>
          Não conectado — o sync usa o token do System User (vê só as contas atribuídas a ele).
        </div>
      </div>

      <!-- Mensagem -->
      <div v-if="store.campaignsMsg"
        :class="['text-xs px-3 py-2 rounded-md border',
          store.campaignsMsg.type === 'success'
            ? 'text-data-pos bg-data-pos/10 border-data-pos/20'
            : 'text-data-neg bg-data-neg/10 border-data-neg/20']">
        {{ store.campaignsMsg.text }}
      </div>

      <!-- Ações -->
      <div class="flex flex-wrap items-center gap-2">
        <Button icon="fab fa-facebook" @click="onConnectLogin">
          {{ store.campaignsStatus?.connected ? 'Reconectar com Facebook' : 'Conectar com Facebook' }}
        </Button>
        <Button v-if="store.campaignsStatus?.connected" variant="secondary" :loading="store.campaignsBusy"
          icon="fas fa-rotate" @click="store.refreshCampaigns()">Renovar token</Button>
        <Button variant="secondary" icon="fas fa-arrows-rotate" @click="store.fetchCampaignsStatus()">Atualizar</Button>
        <Button v-if="store.campaignsStatus?.connected" variant="secondary" :loading="store.campaignsBusy"
          icon="fas fa-link-slash" @click="store.disconnectCampaigns()">Desconectar</Button>
      </div>

      <!-- Fallback: colar token manualmente -->
      <details class="text-xs text-ink-muted">
        <summary class="cursor-pointer select-none">Ou colar um token admin manualmente</summary>
        <div class="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end">
          <div class="flex-1">
            <Input v-model="campaignToken" type="password" label="Token de acesso admin"
              placeholder="cole o token (curto ou longo — troco por um de 60 dias)" />
          </div>
          <Button :loading="store.campaignsBusy" :disabled="!campaignToken.trim()" icon="fas fa-plug" @click="onConnectPaste">Conectar</Button>
        </div>
      </details>

      <p class="text-micro text-ink-subtle">
        O login abre em outra aba. Se o App pedir para cadastrar a URL de redirecionamento (Facebook Login →
        URIs de redirecionamento OAuth válidos), use
        <code class="font-mono">https://menin.up.railway.app/api/meta-app-oauth/campaigns/callback</code>.
      </p>
    </section>

    <!-- ══ Lead Ads: webhook + tokens próprios da captação ══════════════════ -->

    <!-- Webhook URL (display only) -->
    <Surface variant="raised" padding="md" class="border-accent/30 bg-accent-soft">
      <h3 class="text-sm font-semibold text-ink mb-1">
        <i class="fas fa-link mr-1"></i>URL de callback do webhook (Lead Ads)
      </h3>
      <p class="text-xs text-ink-muted mb-2">
        Cole essa URL no Meta ao cadastrar o webhook
        (<a href="https://developers.facebook.com/" target="_blank" rel="noopener" class="text-accent hover:underline">developers.facebook.com</a>
        → seu app → <strong>Webhooks</strong> → objeto <strong>Página</strong> → campo <strong>leadgen</strong>):
      </p>
      <div class="flex items-center gap-2">
        <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ mkt.webhookUrl }}</code>
        <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copyWebhook">Copiar</Button>
      </div>
    </Surface>

    <!-- Verify Token -->
    <Surface variant="raised" padding="md">
      <h3 class="text-sm font-semibold text-ink mb-1">Token de verificação do webhook</h3>
      <p class="text-xs text-ink-muted mb-3">
        Você escolhe esse valor. O Meta usa pra fazer o handshake inicial (chama GET no callback
        com esse token, e o backend confere). Use o gerado aqui — ou cole um seu — e informe
        o <strong>mesmo valor</strong> no Meta ao cadastrar o webhook.
      </p>
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <Input v-model="leadAds.meta_verify_token"
            :type="showSecrets.verify_token ? 'text' : 'password'"
            :placeholder="mktCfg.has_meta_verify_token ? '•••• já configurado — preencha pra trocar' : 'Token aleatório'"
            size="sm" />
        </div>
        <Button variant="ghost" size="sm" icon="fas fa-dice" @click="generateVerifyToken">Gerar</Button>
        <Button variant="ghost" size="sm"
          :icon="showSecrets.verify_token ? 'fas fa-eye-slash' : 'fas fa-eye'"
          @click="showSecrets.verify_token = !showSecrets.verify_token" />
      </div>
      <button v-if="mktCfg.has_meta_verify_token" type="button" @click="clearSecret('verify_token')"
        class="mt-1 text-micro text-data-neg hover:underline">
        Remover salvo
      </button>
    </Surface>

    <!-- Access Token -->
    <Surface variant="raised" padding="md">
      <h3 class="text-sm font-semibold text-ink mb-1">Token de acesso (System User)</h3>
      <p class="text-xs text-ink-muted mb-3">
        Token usado pra buscar os dados do lead na Graph API quando o Meta dispara o webhook.
        <strong>Precisa</strong> ter as permissões <code class="font-mono">leads_retrieval</code> +
        <code class="font-mono">pages_read_engagement</code> + <code class="font-mono">pages_show_list</code>.
      </p>
      <ol class="text-xs text-ink-muted list-decimal list-inside space-y-0.5 mb-3 pl-1">
        <li>Acesse <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener" class="text-accent hover:underline">business.facebook.com → Usuários do Sistema</a></li>
        <li>Selecione <strong>Menin-Office</strong> (ou crie um novo Admin)</li>
        <li>Aba <strong>"Ativos atribuídos"</strong> → "Adicionar ativos" → <strong>Páginas</strong> → marque a Página dos anúncios de lead com <strong>"Acessar leads"</strong> e <strong>"Gerenciar Página"</strong></li>
        <li>Botão <strong>"Gerar novo token"</strong> → selecione o app <strong>Menin Office</strong> → marque <code class="font-mono">leads_retrieval</code> + <code class="font-mono">pages_read_engagement</code> + <code class="font-mono">pages_show_list</code> → "Gerar"</li>
        <li>Cole o token aqui ↓</li>
      </ol>
      <div class="flex items-center gap-2">
        <div class="flex-1">
          <Input v-model="leadAds.meta_access_token"
            :type="showSecrets.access_token ? 'text' : 'password'"
            :placeholder="mktCfg.has_meta_access_token ? '•••• já configurado — preencha pra trocar' : 'EAALKa... (cole o token completo)'"
            size="sm" />
        </div>
        <Button variant="ghost" size="sm"
          :icon="showSecrets.access_token ? 'fas fa-eye-slash' : 'fas fa-eye'"
          @click="showSecrets.access_token = !showSecrets.access_token" />
      </div>
      <button v-if="mktCfg.has_meta_access_token" type="button" @click="clearSecret('access_token')"
        class="mt-1 text-micro text-data-neg hover:underline">
        Remover salvo
      </button>

      <div class="flex justify-end border-t border-line pt-3 mt-4">
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="mkt.saving" @click="saveLeadAds">
          Salvar tokens do Lead Ads
        </Button>
      </div>
    </Surface>

    <!-- Test connection -->
    <Surface variant="raised" padding="md" class="border-accent/20">
      <div class="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 class="text-sm font-semibold text-ink">Testar conexão com o Meta (Lead Ads)</h3>
          <p class="text-xs text-ink-muted">
            Chama <code class="font-mono">/me</code> + <code class="font-mono">/me/accounts</code> com o token salvo
            pra confirmar identidade e listar Páginas acessíveis. Salve antes de testar.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="fas fa-bolt" :loading="mkt.testing" @click="mkt.testMeta()">
          Testar
        </Button>
      </div>

      <div v-if="test" class="mt-3">
        <!-- Sucesso completo -->
        <div v-if="test.ok && test.identity && !test.accounts_error"
          class="rounded-lg border border-data-pos/30 bg-data-pos/10 px-3 py-2.5 text-sm">
          <div class="flex items-center gap-2 text-data-pos font-medium">
            <i class="fas fa-circle-check"></i>
            Token válido — conta: <strong>{{ test.identity.name }}</strong> (id {{ test.identity.id }})
          </div>
          <div v-if="test.pages?.length" class="mt-2 text-xs text-ink-muted">
            <strong>{{ test.pages.length }}</strong> página(s) acessível(eis):
            <ul class="mt-1 space-y-0.5">
              <li v-for="p in test.pages" :key="p.id" class="ml-3">
                • <strong>{{ p.name }}</strong> <span class="font-mono text-micro text-ink-subtle">#{{ p.id }}</span>
                <span v-if="!p.has_page_token" class="text-data-warn text-micro ml-1">(sem page token)</span>
              </li>
            </ul>
          </div>
          <div v-else class="mt-2 text-xs text-data-warn">
            <i class="fas fa-triangle-exclamation mr-1"></i>Token válido, mas nenhuma Página acessível —
            vincule uma Página ao System User no business.facebook.com.
          </div>
        </div>

        <!-- Sucesso parcial (identidade ok, sem permissão de Pages) -->
        <div v-else-if="test.ok && test.accounts_error"
          class="rounded-lg border border-data-warn/30 bg-data-warn/10 px-3 py-2.5 text-sm">
          <div class="flex items-center gap-2 text-data-warn font-medium">
            <i class="fas fa-triangle-exclamation"></i>
            Token válido (conta {{ test.identity?.name }}), mas <strong>sem permissão de Páginas</strong>
          </div>
          <div class="mt-1 text-xs text-ink-muted">{{ test.hint }}</div>
          <div class="mt-1 text-micro font-mono text-ink-subtle">{{ test.accounts_error }}</div>
        </div>

        <!-- Falha -->
        <div v-else class="rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2.5 text-sm">
          <div class="flex items-center gap-2 text-data-neg font-medium">
            <i class="fas fa-circle-xmark"></i>{{ test.error || 'Falha no teste' }}
          </div>
          <div v-if="test.hint" class="mt-1 text-xs text-ink-muted">{{ test.hint }}</div>
        </div>
      </div>

      <div v-else-if="mktCfg.meta_last_health_at" class="mt-2 text-xs text-ink-subtle">
        Último teste: {{ new Date(mktCfg.meta_last_health_at).toLocaleString('pt-BR') }}
        <span :class="mktCfg.meta_last_health_ok ? 'text-data-pos' : 'text-data-neg'">
          · {{ mktCfg.meta_last_health_ok ? 'OK' : 'FALHOU' }}
        </span>
        <span v-if="mktCfg.meta_last_health_error" class="ml-1 italic">({{ mktCfg.meta_last_health_error }})</span>
      </div>
    </Surface>
  </div>

  <ConfirmDialog :open="!!pedindoRemover" tone="danger"
    title="Remover o App Secret salvo?"
    consequence="O webhook da Meta para de ser autenticado e a captação de leads deixa de entrar até você cadastrar outro."
    hint="O valor não fica guardado em lugar nenhum: será preciso pegá-lo de novo no painel da Meta."
    confirm-label="Remover secret"
    @confirm="removerSecretConfirmado" @cancel="pedindoRemover = null" />
</template>
