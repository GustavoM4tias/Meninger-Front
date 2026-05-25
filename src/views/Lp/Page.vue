<script setup>
// Landing page pública renderizada em lp.menin.com.br/<slug>.
// Busca a config do formulário no backend e renderiza um form polido com
// honeypot anti-bot, validação de campos obrigatórios, consentimento LGPD e
// captura automática de UTMs / referrer / landing_url.

import { onMounted, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import API_URL from '@/config/apiUrl';

const route = useRoute();
const slug = computed(() => route.params.slug);

const loading = ref(true);
const error = ref(null);
const inactive = ref(false);   // true = página existe mas foi desativada (410)
const form = ref(null);
const submitting = ref(false);
const success = ref(false);

const data = ref({});           // valores dos campos do formulário
const honeypot = ref('');       // se vier preenchido, é bot
const consentGiven = ref(false);

// Campos default quando o admin ainda não configurou.
const DEFAULT_FIELDS = [
  { key: 'nome',     label: 'Nome',     required: true,  enabled: true },
  { key: 'email',    label: 'E-mail',   required: false, enabled: true, type: 'email' },
  { key: 'telefone', label: 'Telefone', required: true,  enabled: true, type: 'tel' },
];

const FIELD_TYPES = {
  email: 'email', telefone: 'tel', telefone_ddi: 'tel',
  cep: 'text', renda_familiar: 'text',
};

const fields = computed(() => {
  const cfg = Array.isArray(form.value?.fields_config) && form.value.fields_config.length
    ? form.value.fields_config
    : DEFAULT_FIELDS;
  return cfg
    .filter(f => f.enabled !== false)
    .map(f => ({
      key: f.key,
      label: f.label || f.key,
      required: !!f.required,
      type: f.type || FIELD_TYPES[f.key] || 'text',
      placeholder: f.placeholder || '',
    }));
});

const pageConfig = computed(() => form.value?.page_config || {});

const bgStyle = computed(() => {
  const c = pageConfig.value;
  if (c.background_image_url) {
    return {
      backgroundImage: `linear-gradient(rgba(15,23,42,0.55),rgba(15,23,42,0.55)), url(${c.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (c.background_color) return { backgroundColor: c.background_color };
  return {};
});

const accent = computed(() => pageConfig.value.accent_color || '#3b82f6');

async function load() {
  loading.value = true;
  error.value = null;
  inactive.value = false;
  try {
    const resp = await fetch(`${API_URL}/marketing/public/forms/${encodeURIComponent(slug.value)}/page`);
    const d = await resp.json().catch(() => ({}));
    if (!resp.ok || !d.ok) {
      // 410 (inactive) tem UX próprio; demais (404 etc.) caem no "não encontrada".
      inactive.value = !!d.inactive || resp.status === 410;
      throw new Error(d.error || (inactive.value ? 'Esta página foi desativada.' : 'Página não encontrada.'));
    }
    form.value = d.form;

    const init = {};
    for (const f of fields.value) init[f.key] = '';
    data.value = init;

    document.title = pageConfig.value.title || form.value.name || 'Menin';
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function readUtms() {
  const qs = new URLSearchParams(location.search);
  const out = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
    if (qs.get(k)) out[k] = qs.get(k);
  });
  return out;
}

async function submit() {
  // Validação cliente — backend re-valida.
  for (const f of fields.value) {
    if (f.required && !String(data.value[f.key] || '').trim()) {
      window.alert(`Por favor preencha: ${f.label}`);
      return;
    }
  }
  if (form.value.consent_required && !consentGiven.value) {
    window.alert('É necessário aceitar o termo de consentimento.');
    return;
  }

  submitting.value = true;
  try {
    const body = {
      ...data.value,
      _hp: honeypot.value,                    // honeypot — sempre vazio em humanos
      ...readUtms(),
      landing_url: location.href,
      consent: consentGiven.value,
    };
    const resp = await fetch(
      `${API_URL}/marketing/public/forms/${encodeURIComponent(slug.value)}/submit`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const d = await resp.json().catch(() => ({}));
    if (resp.ok && d.ok) {
      if (d.redirect) { location.href = d.redirect; return; }
      success.value = true;
    } else {
      window.alert(d.error || 'Não foi possível enviar. Tente novamente.');
    }
  } catch (e) {
    window.alert('Erro ao enviar. Tente novamente em instantes.');
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
watch(slug, load);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-900" :style="bgStyle">

    <!-- Loading -->
    <div v-if="loading" class="text-white">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <!-- Página desativada (410) -->
    <div v-else-if="inactive" class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="h-14 w-14 rounded-full bg-amber-100 mx-auto mb-4 grid place-items-center text-amber-600">
        <i class="fas fa-pause text-2xl"></i>
      </div>
      <div class="text-slate-900 text-xl font-semibold mb-2">Cadastro indisponível</div>
      <p class="text-slate-500 text-sm leading-relaxed mb-5">{{ error }}</p>
      <a href="https://menin.com.br"
        class="inline-block rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
        Conheça a Menin Engenharia
      </a>
    </div>

    <!-- Página não encontrada (404 e outros erros) -->
    <div v-else-if="error" class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="h-14 w-14 rounded-full bg-slate-100 mx-auto mb-4 grid place-items-center text-slate-400">
        <i class="fas fa-circle-question text-2xl"></i>
      </div>
      <div class="text-slate-900 text-xl font-semibold mb-1">Página não encontrada</div>
      <p class="text-slate-500 text-sm">{{ error }}</p>
    </div>

    <!-- Sucesso -->
    <div v-else-if="success" class="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="h-14 w-14 rounded-full bg-emerald-100 mx-auto mb-4 grid place-items-center text-emerald-600">
        <i class="fas fa-check text-2xl"></i>
      </div>
      <h2 class="text-slate-900 text-xl font-semibold mb-2">{{ pageConfig.success_title || 'Obrigado!' }}</h2>
      <p class="text-slate-600 text-sm leading-relaxed">
        {{ pageConfig.success_message || 'Recebemos seu contato. Em breve nosso time entra em contato.' }}
      </p>
    </div>

    <!-- Formulário -->
    <div v-else class="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
      <!-- Hero -->
      <div class="px-6 py-6 border-b border-slate-200">
        <img v-if="pageConfig.logo_url" :src="pageConfig.logo_url" alt="logo" class="h-10 mb-4 object-contain" />
        <h1 class="text-slate-900 text-2xl font-bold leading-tight">{{ pageConfig.title || form.name }}</h1>
        <p v-if="pageConfig.subtitle" class="text-slate-500 text-sm mt-2 leading-relaxed">{{ pageConfig.subtitle }}</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="px-6 py-5 space-y-3">
        <!-- honeypot — invisível pra humanos, denuncia bots -->
        <input type="text" name="_hp" v-model="honeypot" tabindex="-1" autocomplete="off"
               style="position:absolute;left:-9999px;width:1px;height:1px" aria-hidden="true" />

        <div v-for="f in fields" :key="f.key">
          <label :for="`f-${f.key}`" class="block text-xs font-medium text-slate-700 mb-1">
            {{ f.label }}<span v-if="f.required" class="text-red-500 ml-0.5">*</span>
          </label>
          <input
            :id="`f-${f.key}`"
            :type="f.type"
            v-model="data[f.key]"
            :placeholder="f.placeholder || ''"
            :required="f.required"
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all" />
        </div>

        <label v-if="form.consent_required" class="flex items-start gap-2 text-xs text-slate-600 pt-2 cursor-pointer">
          <input type="checkbox" v-model="consentGiven" required class="mt-0.5 shrink-0" />
          <span>{{ form.consent_text || 'Autorizo o contato sobre este interesse e concordo com a política de privacidade.' }}</span>
        </label>

        <button type="submit" :disabled="submitting"
          :style="{ backgroundColor: accent }"
          class="w-full mt-2 rounded-lg text-white px-4 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity">
          <i v-if="submitting" class="fas fa-circle-notch fa-spin mr-2"></i>
          {{ submitting ? 'Enviando...' : (pageConfig.cta_button_text || 'Enviar') }}
        </button>
      </form>

      <div v-if="pageConfig.show_powered_by !== false"
        class="px-6 py-3 border-t border-slate-100 text-center text-[10px] text-slate-400 tracking-wide">
        Captação Menin
      </div>
    </div>
  </div>
</template>
