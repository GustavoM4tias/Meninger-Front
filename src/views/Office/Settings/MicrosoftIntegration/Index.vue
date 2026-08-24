<script setup>
// /settings/integracao-microsoft — Integração Microsoft 365 (admin).
//
// Responde a pergunta que o repositório não respondia: o que esta integração
// PODE fazer hoje? Os escopos do Planner e da importação de pessoas nunca foram
// pedidos no login; vêm do consentimento de administrador feito no portal do
// Azure. Sem esta tela, uma revisão de permissões derrubava duas telas e o que
// aparecia era um 403 genérico.
//
// Também é onde ficam os tetos que antes eram constante em código.

import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';

const toast = useToast();
const BASE = `${API_URL}/microsoft`;

const diag = ref(null);
const loadingDiag = ref(true);

const settings = ref(null);
const form = ref({
  list_page_cap: 5000, upload_max_mb: 250, upload_chunk_mb: 8, transcript_app_fallback: true,
  outlook_enabled: true, outlook_send_enabled: true, outlook_page_size: 25,
  meeting_reminder_enabled: true, meeting_reminder_minutes: 15,
});
const saving = ref(false);

// ── Carga ─────────────────────────────────────────────────────────────────────

async function loadDiagnostics() {
  loadingDiag.value = true;
  try {
    diag.value = await requestWithAuth(`${BASE}/diagnostics`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível ler o diagnóstico da integração.');
  } finally {
    loadingDiag.value = false;
  }
}

async function loadSettings() {
  try {
    settings.value = await requestWithAuth(`${BASE}/settings`);
    form.value = {
      list_page_cap: settings.value.list_page_cap,
      upload_max_mb: settings.value.upload_max_mb,
      upload_chunk_mb: settings.value.upload_chunk_mb,
      transcript_app_fallback: !!settings.value.transcript_app_fallback,
      outlook_enabled: settings.value.outlook_enabled !== false,
      outlook_send_enabled: settings.value.outlook_send_enabled !== false,
      outlook_page_size: settings.value.outlook_page_size ?? 25,
      meeting_reminder_enabled: settings.value.meeting_reminder_enabled !== false,
      meeting_reminder_minutes: settings.value.meeting_reminder_minutes ?? 15,
    };
  } catch (err) {
    toast.error(err?.message || 'Não foi possível ler as configurações.');
  }
}

async function save() {
  saving.value = true;
  try {
    settings.value = await requestWithAuth(`${BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify({
        list_page_cap: Number(form.value.list_page_cap),
        upload_max_mb: Number(form.value.upload_max_mb),
        upload_chunk_mb: Number(form.value.upload_chunk_mb),
        transcript_app_fallback: !!form.value.transcript_app_fallback,
        outlook_enabled: !!form.value.outlook_enabled,
        outlook_send_enabled: !!form.value.outlook_send_enabled,
        outlook_page_size: Number(form.value.outlook_page_size),
        meeting_reminder_enabled: !!form.value.meeting_reminder_enabled,
        meeting_reminder_minutes: Number(form.value.meeting_reminder_minutes),
      }),
    });
    toast.success('Configurações salvas.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  } finally {
    saving.value = false;
  }
}

onMounted(() => { loadDiagnostics(); loadSettings(); });

// ── Derivados ─────────────────────────────────────────────────────────────────

const features = computed(() => diag.value?.features || []);
const blockedCount = computed(() => features.value.filter(f => !f.granted).length);
const okCount = computed(() => features.value.filter(f => f.granted).length);

const tokenExpires = computed(() => {
  const ts = diag.value?.tokenExpiresAt;
  return ts ? new Date(ts).toLocaleString('pt-BR') : null;
});
</script>

<template>
  <PageContainer size="md">
    <PageHeader
      title="Integração Microsoft 365"
      subtitle="O que a integração pode fazer hoje, e os limites de listagem e envio."
      icon="fab fa-microsoft">
      <template #actions>
        <PageHelp
          storage-key="integracao-microsoft"
          title="Como usar esta tela"
          intro="Aqui você confere, permissão por permissão, o que o Office consegue fazer na conta Microsoft da empresa - e ajusta os limites das telas Microsoft."
          :steps="[
            { title: 'Confira as permissões', text: 'A lista compara o que cada tela precisa com o que a sua conta Microsoft realmente concedeu. Item vermelho é tela que não vai funcionar.' },
            { title: 'Falta alguma?', text: 'Permissão que falta se concede no portal do Azure (Azure Active Directory > Registros de aplicativo > o app do Office > Permissões de API), com o botão de consentimento do administrador. Depois volte aqui e atualize.' },
            { title: 'Ajuste os limites', text: 'O limite de itens vale para as listagens do SharePoint, da agenda e do Planner. O limite de envio recusa o arquivo grande na hora da escolha, em vez de falhar no fim da barra.' },
          ]"
          :tips="[
            'A conferência usa a SUA conta Microsoft: o resultado vale para o tenant, mas você precisa estar conectado.',
            'Permissão marcada como \'do administrador\' não pode ser concedida pela pessoa comum - precisa do consentimento no portal.',
            'Nunca acrescente permissão nova ao login sem antes vê-la concedida aqui: se ela exigir administrador e não estiver liberada, o login para de funcionar para todo mundo.',
          ]" />
      </template>
    </PageHeader>

    <div class="space-y-5">

      <!-- Resumo -->
      <div v-if="!loadingDiag && diag" class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border text-sm"
        :class="diag.connected
          ? (blockedCount ? 'bg-data-warn/10 border-data-warn/30 text-data-warn' : 'bg-data-pos/10 border-data-pos/25 text-data-pos')
          : 'bg-surface-sunken border-line text-ink-muted'">
        <i class="fas" :class="diag.connected ? (blockedCount ? 'fa-triangle-exclamation' : 'fa-circle-check') : 'fa-circle-info'"></i>
        <span v-if="!diag.connected" class="min-w-0">{{ diag.reason }}</span>
        <span v-else-if="blockedCount" class="min-w-0">
          {{ okCount }} de {{ features.length }} recursos liberados.
          <strong>{{ blockedCount }}</strong> sem permissão - a tela correspondente não vai funcionar.
        </span>
        <span v-else class="min-w-0">Todos os {{ features.length }} recursos estão liberados.</span>
      </div>

      <!-- Permissões por recurso -->
      <Panel title="Permissões por recurso" icon="fas fa-key"
        :loading="loadingDiag" loading-variant="row" :padded="false"
        :empty="!loadingDiag && !features.length"
        empty-title="Sem diagnóstico"
        empty-text="Conecte sua conta Microsoft para conferir as permissões.">

        <ul class="divide-y divide-line">
          <li v-for="f in features" :key="f.key" class="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-ink">{{ f.feature }}</span>
                <Badge :variant="f.granted ? 'success' : 'danger'" size="sm">
                  {{ f.granted ? 'Liberado' : 'Sem permissão' }}
                </Badge>
                <Badge v-if="!f.requested" variant="warning" size="sm" outlined>Fora do login</Badge>
                <Badge v-if="f.grantedBy === 'admin'" variant="neutral" size="sm" outlined>Do administrador</Badge>
              </div>
              <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ f.note }}</p>
              <p v-if="!f.granted" class="text-xs text-data-neg mt-1 font-mono break-all">
                Falta: {{ f.missing.join(' ou ') }}
              </p>
            </div>
            <span class="text-xs text-ink-muted font-mono shrink-0 sm:text-right">{{ f.screen }}</span>
          </li>
        </ul>
      </Panel>

      <!-- Detalhe técnico -->
      <Panel v-if="diag?.connected" title="Detalhe da conexão" icon="fas fa-circle-info">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-muted uppercase tracking-wide">Conferido com a conta</dt>
            <dd class="text-ink break-all">{{ diag.checkedAs }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted uppercase tracking-wide">Token válido até</dt>
            <dd class="text-ink">{{ tokenExpires || '-' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs text-ink-muted uppercase tracking-wide">Pedidas no login</dt>
            <dd class="text-ink-muted font-mono text-xs break-all">{{ diag.requestedScopes.join(' ') }}</dd>
          </div>
          <div v-if="diag.extraScopes?.length" class="sm:col-span-2">
            <dt class="text-xs text-ink-muted uppercase tracking-wide">Concedidas além do login</dt>
            <dd class="text-ink-muted font-mono text-xs break-all">{{ diag.extraScopes.join(' ') }}</dd>
            <p class="text-xs text-ink-muted mt-1">
              Vêm do consentimento de administrador no portal do Azure. É o que faz o Planner
              e a importação de pessoas funcionarem hoje - e o que some numa revisão de permissões.
            </p>
          </div>
        </dl>

        <div v-if="diag.appPermissions?.length" class="mt-5 pt-4 border-t border-line">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Permissões de aplicação</p>
          <div v-for="ap in diag.appPermissions" :key="ap.key" class="text-sm">
            <p class="text-ink font-medium">{{ ap.feature }}</p>
            <p class="text-xs text-ink-muted font-mono break-all mt-0.5">{{ ap.permissions.join(' + ') }}</p>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ ap.note }}</p>
          </div>
        </div>

        <div class="mt-5">
          <Button variant="outline" size="sm" icon="fas fa-rotate" :loading="loadingDiag" @click="loadDiagnostics">
            Atualizar diagnóstico
          </Button>
        </div>
      </Panel>

      <!-- Limites -->
      <Panel title="Limites das telas Microsoft" icon="fas fa-sliders" :loading="!settings">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input v-model="form.list_page_cap" type="number" label="Itens por listagem"
            hint="Vale para SharePoint, agenda e Planner. Passou disso, a tela avisa que a lista está cortada." />
          <Input v-model="form.upload_max_mb" type="number" label="Envio máximo (MB)"
            hint="Arquivo maior é recusado na escolha, não no fim do envio." />
          <Input v-model="form.upload_chunk_mb" type="number" label="Pedaço do envio (MB)"
            hint="Arquivo grande sobe em pedaços deste tamanho." />
        </div>

        <div class="mt-5 pt-4 border-t border-line">
          <Switch v-model="form.transcript_app_fallback"
            label="Buscar transcrição de reunião que a pessoa apenas participou"
            description="Usa a permissão de aplicação quando a conta da pessoa não alcança a reunião. Sem o consentimento no portal, a tentativa falha em silêncio e o comportamento continua o de sempre." />
        </div>

        <!-- E-mail -->
        <div class="mt-5 pt-4 border-t border-line space-y-4">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide">E-mail (Outlook)</p>

          <Switch v-model="form.outlook_enabled"
            label="Módulo de e-mail ligado"
            description="Desligado, a tela de e-mail para de responder e a API devolve 503." />

          <Switch v-model="form.outlook_send_enabled"
            label="Permitir enviar e-mail pelo Office"
            description="Separado da leitura de propósito: dá para liberar a caixa e manter o envio desligado enquanto a operação se acostuma. E-mail enviado não tem desfazer." />

          <div class="sm:max-w-[16rem]">
            <Input v-model="form.outlook_page_size" type="number" label="Mensagens por página"
              hint="Quantas a lista traz por vez (5 a 100)." />
          </div>
        </div>

        <!-- Lembrete de reunião -->
        <div class="mt-5 pt-4 border-t border-line space-y-4">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide">Aviso de reunião</p>

          <Switch v-model="form.meeting_reminder_enabled"
            label="Avisar antes da reunião começar"
            description="Chega pelos canais que cada pessoa escolheu nas preferências de notificação. O push toca no celular mesmo com o Office fechado." />

          <div class="sm:max-w-[16rem]">
            <Input v-model="form.meeting_reminder_minutes" type="number" label="Minutos antes"
              hint="Entre 5 e 120. O verificador roda a cada 5 minutos." />
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <Button :loading="saving" icon="fas fa-check" @click="save">Salvar</Button>
        </div>
      </Panel>

    </div>
  </PageContainer>
</template>
