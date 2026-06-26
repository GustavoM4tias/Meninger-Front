<script setup>
// Configurações Meta (App) — fonte ÚNICA das credenciais de NÍVEL DE APP do
// Meta, compartilhadas pelo WhatsApp e pelo Meta Lead Ads (mesmo App). Setar o
// App Secret aqui vale pros dois de uma vez. Tokens de acesso e verify tokens
// continuam em cada integração (são diferentes).

import { ref, watch, computed, onMounted } from 'vue';
import { useMetaAppStore } from '@/stores/Meta/metaAppStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const store = useMetaAppStore();

const form = ref({ meta_app_id: '', meta_app_secret: '', meta_graph_api_version: 'v21.0' });
const dirty = ref(false);
const message = ref(null);

onMounted(() => store.fetchConfig());

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
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">

    <!-- Header -->
    <header class="flex items-start gap-3">
      <div class="shrink-0 w-11 h-11 rounded-xl bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center text-xl">
        <i class="fab fa-meta"></i>
      </div>
      <div>
        <h1 class="text-lg font-semibold text-ink">Configurações Meta (App)</h1>
        <p class="text-sm text-ink-muted">
          Credenciais do App da Meta compartilhadas pelo <b>WhatsApp</b> e pelo <b>Meta Lead Ads</b>.
        </p>
      </div>
    </header>

    <!-- Explicação -->
    <div class="rounded-xl border border-[#0866FF]/20 bg-[#0866FF]/5 p-4 text-sm text-ink-muted space-y-1.5">
      <p>
        <i class="fas fa-circle-info text-[#0866FF] mr-1"></i>
        Como WhatsApp e Lead Ads usam o <b>mesmo App</b> na Meta, o <b>App Secret</b> é o mesmo nos dois.
        Definindo aqui, ele vale para as duas integrações de uma vez - sem risco de uma ficar pra trás.
      </p>
      <p class="text-ink-subtle">
        Os <b>tokens de acesso</b> e <b>verify tokens</b> são diferentes por integração e continuam em
        <RouterLink to="/settings/whatsapp" class="text-accent underline">WhatsApp</RouterLink> e
        <RouterLink to="/marketing/settings" class="text-accent underline">Captação (Lead Ads)</RouterLink>.
      </p>
    </div>

    <!-- Form -->
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
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20']">
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
        <span v-if="dirty && store.config?.has_meta_app_secret" class="text-[11px] text-ink-subtle">Salve antes de testar.</span>
      </div>

      <!-- Resultado do teste -->
      <div v-if="store.testResult"
        :class="['rounded-lg border px-3 py-2.5 text-sm',
          store.testResult.ok
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
            : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300']">
        <div class="flex items-start gap-2">
          <i :class="store.testResult.ok ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'" class="mt-0.5"></i>
          <div>
            <div class="font-medium">{{ store.testResult.ok ? 'App ID + App Secret válidos.' : 'App Secret não confere.' }}</div>
            <div v-if="store.testResult.error" class="text-xs font-mono mt-0.5 break-words">{{ store.testResult.error }}</div>
            <div v-if="store.testResult.hint" class="text-xs mt-1 text-ink-muted">{{ store.testResult.hint }}</div>
          </div>
        </div>
      </div>

      <p class="text-[11px] text-ink-subtle">Último teste: {{ lastTest }}</p>
    </section>
  </div>
</template>
