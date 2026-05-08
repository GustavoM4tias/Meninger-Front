<script setup>
import { ref, watch, computed } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import API_URL from '@/config/apiUrl';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';
import SetupWizard from './SetupWizard.vue';

const webhookUrl = computed(() => `${API_URL || ''}/whatsapp/webhook`);

const store = useWhatsappStore();

// modo: wizard (padrão para primeira configuração) ou advanced (edição manual)
const mode = ref('wizard');
// se já existe config completa, exibe a configuração avançada por padrão
watch(() => store.config, (cfg) => {
  if (cfg?.has_access_token && cfg?.phone_number_id) mode.value = 'advanced';
}, { immediate: true });

const form = ref({
  business_id: '',
  waba_id: '',
  phone_number_id: '',
  display_phone: '',
  display_name: '',
  api_version: 'v21.0',
  active: false,
  dry_run: true,
  // secrets
  access_token: '',
  app_secret: '',
  webhook_verify_token: '',
});

const testForm = ref({ to: '', templateName: '', variables: '' });
const testResult = ref(null);
const saving = ref(false);
const message = ref(null); // {type, text}

// Marca "form sujo" — habilita Salvar e desabilita ações dependentes (health/test-send/sync)
const dirty = ref(false);

watch(() => store.config, (cfg) => {
  if (!cfg) return;
  form.value = {
    ...form.value,
    business_id: cfg.business_id || '',
    waba_id: cfg.waba_id || '',
    phone_number_id: cfg.phone_number_id || '',
    display_phone: cfg.display_phone || '',
    display_name: cfg.display_name || '',
    api_version: cfg.api_version || 'v21.0',
    active: !!cfg.active,
    dry_run: !!cfg.dry_run,
    access_token: '',           // nunca preencher; só substitui se preenchido
    app_secret: '',
    webhook_verify_token: '',
  };
  dirty.value = false;
}, { immediate: true });

// Qualquer alteração no form vira dirty
watch(form, () => { dirty.value = true; }, { deep: true });

// Pode testar conexão somente se config foi salva e não há alterações pendentes
const canTest = computed(() =>
  !dirty.value && !!store.config?.has_access_token && !!store.config?.phone_number_id
);
const testHint = computed(() => {
  if (!store.config?.has_access_token || !store.config?.phone_number_id) return 'Salve a configuração antes de testar.';
  if (dirty.value) return 'Você tem alterações não salvas. Salve antes de testar.';
  return '';
});

const lastHealth = computed(() => {
  if (!store.config?.last_health_at) return 'Nunca testado.';
  const dt = new Date(store.config.last_health_at);
  const status = store.config.last_health_ok ? 'OK' : `Falhou${store.config.last_health_error ? ': ' + store.config.last_health_error : ''}`;
  return `${dt.toLocaleString('pt-BR')} — ${status}`;
});

const flash = (type, text) => {
  message.value = { type, text };
  setTimeout(() => { message.value = null; }, 4000);
};

const onSave = async () => {
  saving.value = true;
  try {
    await store.saveConfig(form.value);
    // limpa secrets do form pra evitar reenvio (já estão criptografados no banco)
    form.value.access_token = '';
    form.value.app_secret = '';
    form.value.webhook_verify_token = '';
    dirty.value = false;
    flash('success', 'Configuração salva.');
  } catch (e) {
    flash('error', e.message);
  } finally {
    saving.value = false;
  }
};

const onHealth = async () => {
  try {
    const r = await store.runHealth();
    flash(r.ok ? 'success' : 'error', r.ok ? 'Conexão OK.' : `Falhou: ${r.error}`);
  } catch (e) {
    flash('error', e.message);
  }
};

const onTestSend = async () => {
  testResult.value = null;
  try {
    const variables = (testForm.value.variables || '').split('|').map(s => s.trim()).filter(Boolean);
    const r = await store.testSend({
      to: testForm.value.to,
      templateName: testForm.value.templateName,
      variables,
    });
    testResult.value = { ok: true, text: `Enviado. id: ${r.id || '—'}` };
  } catch (e) {
    testResult.value = { ok: false, text: e.message };
  }
};
</script>

<template>
  <!-- Toggle: Wizard vs Avançado -->
  <div class="mb-4 flex items-center justify-end gap-2">
    <button type="button" @click="mode = 'wizard'"
      :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
        mode === 'wizard'
          ? 'bg-accent-soft text-accent border-accent/20'
          : 'bg-surface-raised text-ink-muted border-line hover:bg-surface-sunken']">
      <i class="fas fa-wand-magic-sparkles mr-1"></i> Assistente
    </button>
    <button type="button" @click="mode = 'advanced'"
      :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
        mode === 'advanced'
          ? 'bg-accent-soft text-accent border-accent/20'
          : 'bg-surface-raised text-ink-muted border-line hover:bg-surface-sunken']">
      <i class="fas fa-screwdriver-wrench mr-1"></i> Configuração avançada
    </button>
  </div>

  <SetupWizard v-if="mode === 'wizard'" @done="mode = 'advanced'" />

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- ── Form principal ──────────────────────────────── -->
    <section class="lg:col-span-2 rounded-xl border border-line bg-surface-raised p-5 shadow-soft space-y-5">
      <header>
        <h2 class="text-sm font-semibold text-ink">Conta WhatsApp Business</h2>
        <p class="text-xs text-ink-muted">IDs vêm do Meta Business Manager (Cloud API).</p>
      </header>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.business_id"     label="Business ID"     placeholder="123456789012345" />
        <Input v-model="form.waba_id"         label="WABA ID"         placeholder="987654321098765" />
        <Input v-model="form.phone_number_id" label="Phone Number ID" placeholder="111122223333444" />
        <Input v-model="form.api_version"     label="API Version"     placeholder="v21.0" />
        <Input v-model="form.display_phone"   label="Telefone (display)" placeholder="+55 11 99999-9999" />
        <Input v-model="form.display_name"    label="Nome de exibição"  placeholder="Menin" />
      </div>

      <div class="border-t border-line pt-5">
        <h3 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2">Secrets</h3>
        <p class="text-[11px] text-ink-muted mb-3">
          Os campos abaixo só são gravados quando preenchidos. Para limpar um secret existente, digite <code>__CLEAR__</code>.
        </p>
        <div class="grid grid-cols-1 gap-3">
          <Input v-model="form.access_token"
            :label="`Access Token ${store.config?.has_access_token ? '(já configurado)' : ''}`"
            placeholder="EAAG..."
            type="password" />
          <Input v-model="form.app_secret"
            :label="`App Secret ${store.config?.has_app_secret ? '(já configurado)' : ''}`"
            placeholder="..."
            hint="Usado para validar a assinatura HMAC do webhook."
            type="password" />
          <Input v-model="form.webhook_verify_token"
            :label="`Webhook Verify Token ${store.config?.has_webhook_verify_token ? '(já configurado)' : ''}`"
            placeholder="qualquer string que você cadastrou na Meta"
            type="password" />
        </div>
      </div>

      <div class="border-t border-line pt-5 flex flex-col sm:flex-row gap-4">
        <Switch v-model="form.active" size="sm"
          label="Integração ativa"
          description="Quando desligado, nenhum envio é feito por WhatsApp." />
        <Switch v-model="form.dry_run" size="sm"
          label="Modo simulação"
          description="Quando ligado, registra mas não chama a API da Meta." />
      </div>

      <div v-if="message"
        :class="['text-xs px-3 py-2 rounded-md border',
          message.type === 'success'
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20']">
        {{ message.text }}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button :loading="saving" :disabled="!dirty" icon="fas fa-floppy-disk" @click="onSave">
          Salvar{{ dirty ? '' : ' (sem alterações)' }}
        </Button>
        <Button variant="secondary" :loading="store.healthRunning"
          :disabled="!canTest" icon="fas fa-heart-pulse" @click="onHealth">
          Testar conexão
        </Button>
        <span v-if="testHint" class="text-[11px] text-ink-subtle">{{ testHint }}</span>
      </div>
    </section>

    <!-- ── Painéis laterais ──────────────────────────────── -->
    <aside class="space-y-5">
      <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft">
        <h3 class="text-sm font-semibold text-ink mb-1">Health check</h3>
        <p class="text-xs text-ink-muted">{{ lastHealth }}</p>
      </section>

      <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft">
        <h3 class="text-sm font-semibold text-ink mb-2">Webhook URL</h3>
        <p class="text-xs text-ink-muted mb-2">Configure essa URL no Meta Business → WhatsApp → Webhooks.</p>
        <code class="block text-[11px] font-mono break-all p-2 bg-surface-sunken rounded-md border border-line">
          {{ webhookUrl }}
        </code>
        <p class="text-[11px] text-ink-subtle mt-2">
          Use o <em>Verify Token</em> cadastrado acima como verify token na Meta.
        </p>
      </section>

      <section class="rounded-xl border border-line bg-surface-raised p-5 shadow-soft space-y-3">
        <h3 class="text-sm font-semibold text-ink">Envio de teste</h3>
        <Input v-model="testForm.to"           label="Para (E.164)"   placeholder="+5511999999999" size="sm" />
        <Input v-model="testForm.templateName" label="Template name"  placeholder="hello_world" size="sm" />
        <Input v-model="testForm.variables"    label="Variáveis"
          hint="Separe com | (pipe). Ex: João|Workshop|10/05 14h"
          size="sm" />
        <Button block size="sm" variant="secondary" icon="fas fa-paper-plane" @click="onTestSend">
          Enviar teste
        </Button>
        <p v-if="testResult"
          :class="['text-xs', testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400']">
          {{ testResult.text }}
        </p>
      </section>
    </aside>
  </div>
</template>
