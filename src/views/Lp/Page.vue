<script setup>
// Landing page pública renderizada em lp.menin.com.br/<slug>.
// Busca a config do formulário no backend e renderiza um form polido com
// honeypot anti-bot, validação de campos obrigatórios, consentimento LGPD e
// captura automática de UTMs / referrer / landing_url.
// Com ?embed=1 renderiza só o card (pra iframe em site externo) e reporta a
// altura via postMessage pro pai ajustar o iframe automaticamente.

import { onMounted, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import API_URL from '@/config/apiUrl';
import LeadFormCard from './components/LeadFormCard.vue';
import { backgroundStyle, cardWidthClass, cardJustifyClass } from './lpTheme';

const route = useRoute();
const slug = computed(() => route.params.slug);
const embed = computed(() => ['1', 'true'].includes(String(route.query.embed || '')));

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
const bgStyle = computed(() => backgroundStyle(pageConfig.value));
const widthClass = computed(() => cardWidthClass(pageConfig.value));
// Sem items-center: cada estado usa my-auto, que centraliza quando cabe na
// tela mas deixa rolar a partir do topo quando o form é maior que ela (mobile).
const wrapperClass = computed(() => embed.value
  ? 'w-full p-2 flex justify-center'
  : ['min-h-screen flex p-4 sm:p-6 bg-slate-900', cardJustifyClass(pageConfig.value)]);

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
  // Validação cliente - backend re-valida.
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
      _hp: honeypot.value,                    // honeypot - sempre vazio em humanos
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
      if (d.redirect) {
        // Dentro de iframe, redireciona a página do site hospedeiro.
        (embed.value ? window.top || window : window).location.href = d.redirect;
        return;
      }
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

// No modo embed, avisa a página hospedeira da altura real pro iframe se ajustar.
function reportEmbedHeight() {
  if (window.parent === window) return;
  window.parent.postMessage(
    { meninLpSlug: slug.value, height: document.documentElement.scrollHeight },
    '*'
  );
}

onMounted(() => {
  load();
  if (embed.value && 'ResizeObserver' in window) {
    new ResizeObserver(reportEmbedHeight).observe(document.body);
  }
});
watch(slug, load);
</script>

<template>
  <div :class="wrapperClass" :style="embed ? {} : bgStyle">

    <!-- Loading -->
    <div v-if="loading" :class="embed ? 'text-slate-400 py-10' : 'text-white my-auto'">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <!-- Página desativada (410) -->
    <div v-else-if="inactive" class="max-w-md w-full my-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
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
    <div v-else-if="error" class="max-w-md w-full my-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="h-14 w-14 rounded-full bg-slate-100 mx-auto mb-4 grid place-items-center text-slate-400">
        <i class="fas fa-circle-question text-2xl"></i>
      </div>
      <div class="text-slate-900 text-xl font-semibold mb-1">Página não encontrada</div>
      <p class="text-slate-500 text-sm">{{ error }}</p>
    </div>

    <!-- Sucesso -->
    <div v-else-if="success" class="max-w-md w-full my-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div class="h-14 w-14 rounded-full bg-emerald-100 mx-auto mb-4 grid place-items-center text-emerald-600">
        <i class="fas fa-check text-2xl"></i>
      </div>
      <h2 class="text-slate-900 text-xl font-semibold mb-2">{{ pageConfig.success_title || 'Obrigado!' }}</h2>
      <p class="text-slate-600 text-sm leading-relaxed">
        {{ pageConfig.success_message || 'Recebemos seu contato. Em breve nosso time entra em contato.' }}
      </p>
    </div>

    <!-- Formulário -->
    <div v-else :class="['w-full my-auto', widthClass]">
      <LeadFormCard
        :page-config="pageConfig"
        :fields="fields"
        :form-name="form?.name || ''"
        :consent-required="!!form?.consent_required"
        :consent-text="form?.consent_text || ''"
        :data="data"
        :submitting="submitting"
        v-model:honeypot="honeypot"
        v-model:consent="consentGiven"
        @submit="submit"
      />
    </div>
  </div>
</template>
