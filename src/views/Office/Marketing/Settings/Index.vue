<script setup>
import { onMounted, ref, computed } from 'vue';
import { useMarketingSettingsStore } from '@/stores/Marketing/Settings/marketingSettingsStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

const store = useMarketingSettingsStore();
const tab = ref('geral');

// Buffer de edição separado da config persistida — usuário edita sem afetar
// o estado do banco até clicar Salvar.
const draft = ref({
    dry_run: true,
    retry_max_attempts: 6,
    form_rate_limit_per_min: 10,
    cv_leads_endpoint: '/v1/comercial/leads',
    meta_app_id: '',
    meta_graph_api_version: 'v21.0',
    meta_app_secret: '',
    meta_verify_token: '',
    meta_access_token: '',
});

const showSecrets = ref({ app_secret: false, verify_token: false, access_token: false });

function resetDraft() {
    const c = store.config || {};
    draft.value = {
        dry_run: !!c.dry_run,
        retry_max_attempts: c.retry_max_attempts ?? 6,
        form_rate_limit_per_min: c.form_rate_limit_per_min ?? 10,
        cv_leads_endpoint: c.cv_leads_endpoint || '/v1/comercial/leads',
        meta_app_id: c.meta_app_id || '',
        meta_graph_api_version: c.meta_graph_api_version || 'v21.0',
        meta_app_secret: '',
        meta_verify_token: '',
        meta_access_token: '',
    };
    showSecrets.value = { app_secret: false, verify_token: false, access_token: false };
}

onMounted(async () => {
    await store.fetchConfig();
    resetDraft();
});

const cfg = computed(() => store.config || {});

const META_GRAPH_VERSIONS = ['v25.0', 'v24.0', 'v23.0', 'v22.0', 'v21.0', 'v20.0'];

async function save() {
    // Só envia secrets que o usuário digitou (vazios são preservados pelo backend).
    const patch = {
        dry_run: draft.value.dry_run,
        retry_max_attempts: Number(draft.value.retry_max_attempts) || 6,
        form_rate_limit_per_min: Number(draft.value.form_rate_limit_per_min) || 10,
        cv_leads_endpoint: draft.value.cv_leads_endpoint || '/v1/comercial/leads',
        meta_app_id: draft.value.meta_app_id || null,
        meta_graph_api_version: draft.value.meta_graph_api_version || 'v21.0',
        meta_app_secret: draft.value.meta_app_secret || '',
        meta_verify_token: draft.value.meta_verify_token || '',
        meta_access_token: draft.value.meta_access_token || '',
    };
    const ok = await store.updateConfig(patch);
    if (ok) {
        window.alert('Configuração salva.');
        await store.fetchConfig();
        resetDraft();
    }
}

// Gera verify_token aleatório no cliente (24 bytes hex).
function generateVerifyToken() {
    const arr = new Uint8Array(24);
    window.crypto.getRandomValues(arr);
    draft.value.meta_verify_token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    showSecrets.value.verify_token = true;
}

function clearSecret(key) {
    if (!window.confirm('Tem certeza que quer remover esse secret salvo? Você terá que cadastrar de novo.')) return;
    // Sentinel especial que o backend interpreta como "limpar"
    draft.value[`meta_${key}`] = '__CLEAR__';
}

async function copyWebhook() {
    try { await navigator.clipboard.writeText(store.webhookUrl); window.alert('URL copiada.'); }
    catch { window.alert('Não consegui copiar.'); }
}

const test = computed(() => store.testResult);
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader
        title="Configurações de Captação"
        subtitle="Modo sombra, tentativas de envio e tokens do Meta Lead Ads (App Secret e App ID ficam em Configurações Meta)."
        icon="fas fa-gear">
        <template #actions>
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" @click="store.fetchConfig">
            Recarregar
          </Button>
        </template>
      </PageHeader>

      <!-- Erro global -->
      <div v-if="store.error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- Tabs -->
      <Surface variant="raised" padding="none" class="mb-4 overflow-hidden">
        <div class="flex border-b border-line">
          <button type="button" @click="tab = 'geral'"
            :class="['px-5 py-3 text-sm font-medium transition-colors border-b-2',
              tab === 'geral'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-hover']">
            <i class="fas fa-sliders mr-1.5"></i>Geral
          </button>
          <button type="button" @click="tab = 'meta'"
            :class="['px-5 py-3 text-sm font-medium transition-colors border-b-2',
              tab === 'meta'
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-hover']">
            <i class="fab fa-facebook mr-1.5"></i>Meta Lead Ads
            <span v-if="cfg.meta_last_health_ok === true"
              class="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500" title="Último teste OK"></span>
            <span v-else-if="cfg.meta_last_health_ok === false"
              class="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" title="Último teste falhou"></span>
          </button>
        </div>
      </Surface>

      <!-- ═════════ Geral ═════════ -->
      <div v-if="tab === 'geral'" class="space-y-4">
        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink mb-1">Modo sombra (dry-run)</h3>
          <p class="text-xs text-ink-muted mb-3">
            Quando ligado, leads são capturados e o JSON que iria pro CV é registrado como
            evento <code class="font-mono">dry_run</code> na timeline — mas <strong>nada é enviado</strong> pro CV.
            Use pra testar em paralelo com o RD sem duplicar nada no CRM.
          </p>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="draft.dry_run" class="h-4 w-4" />
            <span class="text-sm text-ink">Modo sombra ligado (não envia ao CV)</span>
          </label>
          <p v-if="!draft.dry_run" class="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <i class="fas fa-triangle-exclamation mr-1"></i>
            <strong>Atenção:</strong> entrega real ligada. Próximos leads vão pro CV de verdade.
          </p>
        </Surface>

        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink mb-1">Resiliência do despacho</h3>
          <p class="text-xs text-ink-muted mb-3">
            Quando o CV falhar (rede, 5xx), quantas vezes re-tentar antes de declarar
            <em>dead-letter</em> e alertar os admins.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="draft.retry_max_attempts" label="Máximo de tentativas" type="number" size="sm"
              hint="Default 6 — equivale a ~1h de re-tentativas com backoff" />
            <Input v-model="draft.form_rate_limit_per_min" label="Limite de submissões por IP/min" type="number" size="sm"
              hint="Anti-flood do formulário público. Default 10" />
          </div>
        </Surface>

        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink mb-1">CV CRM</h3>
          <p class="text-xs text-ink-muted mb-3">
            Endpoint relativo a <code class="font-mono">CV_API_BASE_URL</code> (configurado no .env).
            Em condições normais, não precisa mexer.
          </p>
          <Input v-model="draft.cv_leads_endpoint" label="Endpoint de criação de lead" size="sm"
            placeholder="/v1/comercial/leads"
            hint="Concatena com CV_API_BASE_URL pra montar a URL final" />
        </Surface>
      </div>

      <!-- ═════════ Meta Lead Ads ═════════ -->
      <div v-if="tab === 'meta'" class="space-y-4">

        <!-- Webhook URL (display only) -->
        <Surface variant="raised" padding="md" class="border-accent/30 bg-accent-soft">
          <h3 class="text-sm font-semibold text-ink mb-1">
            <i class="fas fa-link mr-1"></i>URL de callback do webhook
          </h3>
          <p class="text-xs text-ink-muted mb-2">
            Cole essa URL no Meta ao cadastrar o webhook
            (<a href="https://developers.facebook.com/" target="_blank" rel="noopener" class="text-accent hover:underline">developers.facebook.com</a>
            → seu app → <strong>Webhooks</strong> → objeto <strong>Página</strong> → campo <strong>leadgen</strong>):
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ store.webhookUrl }}</code>
            <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copyWebhook">Copiar</Button>
          </div>
        </Surface>

        <!-- App ID / App Secret / versão Graph → centralizados (compartilhados c/ WhatsApp) -->
        <Surface variant="raised" padding="md" class="border-[#0866FF]/20 bg-[#0866FF]/5">
          <h3 class="text-sm font-semibold text-ink mb-1">
            <i class="fas fa-key mr-1 text-[#0866FF]"></i>App ID, App Secret e versão da Graph
          </h3>
          <p class="text-xs text-ink-muted">
            Essas credenciais são <b>compartilhadas com o WhatsApp</b> (mesmo App da Meta) e agora ficam num lugar só:
            <RouterLink to="/settings/meta" class="text-accent underline">Configurações Meta (App)</RouterLink>.
            Atualizar lá vale pro Lead Ads e pro WhatsApp de uma vez - sem uma ficar pra trás.
          </p>
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
              <Input v-model="draft.meta_verify_token"
                :type="showSecrets.verify_token ? 'text' : 'password'"
                :placeholder="cfg.has_meta_verify_token ? '•••• já configurado — preencha pra trocar' : 'Token aleatório'"
                size="sm" />
            </div>
            <Button variant="ghost" size="sm" icon="fas fa-dice" @click="generateVerifyToken">Gerar</Button>
            <Button variant="ghost" size="sm"
              :icon="showSecrets.verify_token ? 'fas fa-eye-slash' : 'fas fa-eye'"
              @click="showSecrets.verify_token = !showSecrets.verify_token" />
          </div>
          <button v-if="cfg.has_meta_verify_token" type="button" @click="clearSecret('verify_token')"
            class="mt-1 text-[11px] text-red-500 hover:underline">
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
              <Input v-model="draft.meta_access_token"
                :type="showSecrets.access_token ? 'text' : 'password'"
                :placeholder="cfg.has_meta_access_token ? '•••• já configurado — preencha pra trocar' : 'EAALKa... (cole o token completo)'"
                size="sm" />
            </div>
            <Button variant="ghost" size="sm"
              :icon="showSecrets.access_token ? 'fas fa-eye-slash' : 'fas fa-eye'"
              @click="showSecrets.access_token = !showSecrets.access_token" />
          </div>
          <button v-if="cfg.has_meta_access_token" type="button" @click="clearSecret('access_token')"
            class="mt-1 text-[11px] text-red-500 hover:underline">
            Remover salvo
          </button>
        </Surface>

        <!-- Test connection -->
        <Surface variant="raised" padding="md" class="border-accent/20">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 class="text-sm font-semibold text-ink">Testar conexão com o Meta</h3>
              <p class="text-xs text-ink-muted">
                Chama <code class="font-mono">/me</code> + <code class="font-mono">/me/accounts</code> com o token salvo
                pra confirmar identidade e listar Páginas acessíveis. Salve antes de testar.
              </p>
            </div>
            <Button variant="primary" size="sm" icon="fas fa-bolt" :loading="store.testing" @click="store.testMeta()">
              Testar
            </Button>
          </div>

          <div v-if="test" class="mt-3">
            <!-- Sucesso completo -->
            <div v-if="test.ok && test.identity && !test.accounts_error"
              class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm">
              <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                <i class="fas fa-circle-check"></i>
                Token válido — conta: <strong>{{ test.identity.name }}</strong> (id {{ test.identity.id }})
              </div>
              <div v-if="test.pages?.length" class="mt-2 text-xs text-ink-muted">
                <strong>{{ test.pages.length }}</strong> página(s) acessível(eis):
                <ul class="mt-1 space-y-0.5">
                  <li v-for="p in test.pages" :key="p.id" class="ml-3">
                    • <strong>{{ p.name }}</strong> <span class="font-mono text-[10px] text-ink-subtle">#{{ p.id }}</span>
                    <span v-if="!p.has_page_token" class="text-amber-600 dark:text-amber-300 text-[10px] ml-1">(sem page token)</span>
                  </li>
                </ul>
              </div>
              <div v-else class="mt-2 text-xs text-amber-600 dark:text-amber-300">
                <i class="fas fa-triangle-exclamation mr-1"></i>Token válido, mas nenhuma Página acessível —
                vincule uma Página ao System User no business.facebook.com.
              </div>
            </div>

            <!-- Sucesso parcial (identidade ok, sem permissão de Pages) -->
            <div v-else-if="test.ok && test.accounts_error"
              class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm">
              <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                <i class="fas fa-triangle-exclamation"></i>
                Token válido (conta {{ test.identity?.name }}), mas <strong>sem permissão de Páginas</strong>
              </div>
              <div class="mt-1 text-xs text-ink-muted">{{ test.hint }}</div>
              <div class="mt-1 text-[11px] font-mono text-ink-subtle">{{ test.accounts_error }}</div>
            </div>

            <!-- Falha -->
            <div v-else class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm">
              <div class="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium">
                <i class="fas fa-circle-xmark"></i>{{ test.error || 'Falha no teste' }}
              </div>
              <div v-if="test.hint" class="mt-1 text-xs text-ink-muted">{{ test.hint }}</div>
            </div>
          </div>

          <div v-else-if="cfg.meta_last_health_at" class="mt-2 text-xs text-ink-subtle">
            Último teste: {{ new Date(cfg.meta_last_health_at).toLocaleString('pt-BR') }}
            <span :class="cfg.meta_last_health_ok ? 'text-emerald-600' : 'text-red-600'">
              · {{ cfg.meta_last_health_ok ? 'OK' : 'FALHOU' }}
            </span>
            <span v-if="cfg.meta_last_health_error" class="ml-1 italic">({{ cfg.meta_last_health_error }})</span>
          </div>
        </Surface>
      </div>

      <!-- Footer fixo -->
      <div class="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3
                  bg-surface/80 backdrop-blur border-t border-line flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="resetDraft">Descartar</Button>
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
          Salvar configurações
        </Button>
      </div>

    </PageContainer>
  </div>
</template>
