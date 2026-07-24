<script setup>
// Central Meta › aba Configurações — regras do pipeline de captação:
// modo sombra, resiliência do despacho, destinatários dos alertas e endpoint CV.
// (Panel do hub /meta — sem PageContainer/PageHeader próprios.)
//
// As credenciais (App ID/Secret, verify token, access token do Lead Ads)
// moraram aqui até 2026-07-23 — agora vivem na aba Credenciais da Central Meta.

import { onMounted, ref, computed } from 'vue';
import { useMarketingSettingsStore } from '@/stores/Marketing/Settings/marketingSettingsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

const store = useMarketingSettingsStore();
const authStore = useAuthStore();

// Buffer de edição separado da config persistida — usuário edita sem afetar
// o estado do banco até clicar Salvar.
const draft = ref({
    dry_run: true,
    retry_max_attempts: 6,
    form_rate_limit_per_min: 10,
    cv_leads_endpoint: '/v1/comercial/leads',
    alert_recipient_user_ids: [],
});

function resetDraft() {
    const c = store.config || {};
    draft.value = {
        dry_run: !!c.dry_run,
        retry_max_attempts: c.retry_max_attempts ?? 6,
        form_rate_limit_per_min: c.form_rate_limit_per_min ?? 10,
        cv_leads_endpoint: c.cv_leads_endpoint || '/v1/comercial/leads',
        alert_recipient_user_ids: Array.isArray(c.alert_recipient_user_ids) ? [...c.alert_recipient_user_ids] : [],
    };
}

onMounted(async () => {
    await store.fetchConfig();
    resetDraft();
    // Lista de usuários pro seletor de destinatários (não bloqueia a tela).
    authStore.getAllUsers().catch(() => {});
});

// ── Destinatários dos alertas ────────────────────────────────────────────────
const allUsers = computed(() =>
    (authStore.users || [])
        .filter(u => u.status !== false)
        .sort((a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'pt-BR')));

const selectedRecipients = computed(() =>
    draft.value.alert_recipient_user_ids.map(id => {
        const u = allUsers.value.find(x => Number(x.id) === Number(id));
        return { id, label: u ? (u.username || u.email) : `Usuário #${id}` };
    }));

const availableRecipients = computed(() =>
    allUsers.value.filter(u => !draft.value.alert_recipient_user_ids.some(id => Number(id) === Number(u.id))));

const recipientToAdd = ref('');

function addRecipient() {
    const id = Number(recipientToAdd.value);
    if (!id) return;
    if (!draft.value.alert_recipient_user_ids.some(x => Number(x) === id)) {
        draft.value.alert_recipient_user_ids.push(id);
    }
    recipientToAdd.value = '';
}

function removeRecipient(id) {
    draft.value.alert_recipient_user_ids = draft.value.alert_recipient_user_ids
        .filter(x => Number(x) !== Number(id));
}

async function save() {
    const patch = {
        dry_run: draft.value.dry_run,
        retry_max_attempts: Number(draft.value.retry_max_attempts) || 6,
        form_rate_limit_per_min: Number(draft.value.form_rate_limit_per_min) || 10,
        cv_leads_endpoint: draft.value.cv_leads_endpoint || '/v1/comercial/leads',
        alert_recipient_user_ids: draft.value.alert_recipient_user_ids,
    };
    const ok = await store.updateConfig(patch);
    if (ok) {
        window.alert('Configuração salva.');
        await store.fetchConfig();
        resetDraft();
    }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">

      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 mb-3">
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" @click="store.fetchConfig">
            Recarregar
          </Button>
      </div>

      <!-- Erro global -->
      <div v-if="store.error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <div class="space-y-4">
        <!-- Aviso: credenciais migraram -->
        <div class="flex items-start gap-2.5 rounded-lg border border-line bg-surface-sunken/30 px-3 py-2.5 text-xs text-ink-muted">
          <i class="fas fa-key text-[#0866FF] mt-0.5"></i>
          <div>
            <b class="text-ink">Procurando os tokens do Meta?</b> App ID/Secret, verify token e access token
            agora ficam na aba
            <RouterLink to="/meta?tab=credenciais" class="text-accent hover:underline">Credenciais</RouterLink>
            desta Central. Aqui ficam só as regras da captação.
          </div>
        </div>

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
          <h3 class="text-sm font-semibold text-ink mb-1">
            <i class="fas fa-bell mr-1"></i>Destinatários dos alertas
          </h3>
          <p class="text-xs text-ink-muted mb-3">
            Quem recebe os alertas automáticos da captação: campanha sem vínculo represando leads,
            lead não entregue ao CV, webhook do Meta rejeitando e token do Meta expirando.
            <strong>Se a lista ficar vazia, todos os admins ativos recebem</strong> (comportamento antigo).
          </p>

          <div v-if="selectedRecipients.length" class="flex flex-wrap gap-2 mb-3">
            <span v-for="r in selectedRecipients" :key="r.id"
              class="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft
                     pl-3 pr-1.5 py-1.5 text-xs font-medium text-ink">
              {{ r.label }}
              <button type="button" @click="removeRecipient(r.id)"
                class="grid h-6 w-6 place-items-center rounded-full text-ink-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                :aria-label="`Remover ${r.label}`">
                <i class="fas fa-xmark text-[11px]"></i>
              </button>
            </span>
          </div>
          <p v-else class="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <i class="fas fa-triangle-exclamation mr-1"></i>
            Nenhum destinatário selecionado — os alertas irão para <strong>todos os admins ativos</strong>.
          </p>

          <div class="flex flex-col sm:flex-row gap-2">
            <select v-model="recipientToAdd"
              class="w-full sm:max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink
                     focus:outline-none focus:ring-2 focus:ring-accent/40">
              <option value="" disabled>Adicionar destinatário…</option>
              <option v-for="u in availableRecipients" :key="u.id" :value="u.id">
                {{ u.username || u.email }}{{ u.role === 'admin' ? ' (admin)' : '' }}
              </option>
            </select>
            <Button variant="secondary" size="sm" icon="fas fa-plus" :disabled="!recipientToAdd" @click="addRecipient">
              Adicionar
            </Button>
          </div>
          <p class="mt-2 text-[11px] text-ink-subtle">
            Vale pra notificação in-app e e-mail. Cada pessoa ainda pode silenciar esses avisos nas
            preferências de notificação dela.
          </p>
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

      <!-- Footer fixo -->
      <div class="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3
                  bg-surface/80 backdrop-blur border-t border-line flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="resetDraft">Descartar</Button>
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
          Salvar configurações
        </Button>
      </div>

  </div>
</template>
