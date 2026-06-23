<script setup>
// Modal de edição de formulário interno (LP).
// Estrutura em tabs (parelha à do MetaFormMappingModal):
//   1. Geral — slug, name, active, description, priority, campaign_ref, datas
//   2. Vínculo CV — midia, cv_origem, empreendimentos, tags
//   3. UTMs default
//   4. Campos extras (CV) — JSON
//   5. Landing Page — visual + fields_config
//   6. LGPD & Outros — consent, allowed_origins, redirect_url
//   7. Como usar — só em edição: LP URL, QR, embed HTML
//   8. Leads recentes — só em edição

import { computed, ref, watch } from 'vue';
import QRCode from 'qrcode';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import API_URL from '@/config/apiUrl';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';

const LP_HOST = 'https://lp.menin.com.br';

const props = defineProps({
  open: { type: Boolean, default: false },
  form: { type: Object, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useLeadFormsStore();

const CV_ORIGEM_OPTIONS = [
  { v: 'SI', label: 'WebSite' },
  { v: 'FB', label: 'Facebook' },
  { v: 'IG', label: 'Instagram' },
  { v: 'GO', label: 'Google' },
  { v: 'MP', label: 'Mídia Paga' },
  { v: 'OU', label: 'Outros' },
];

const AVAILABLE_FIELDS = [
  { key: 'nome',           label_default: 'Nome',           type: 'text',  enabled: true,  required: true },
  { key: 'email',          label_default: 'E-mail',         type: 'email', enabled: true,  required: false },
  { key: 'telefone',       label_default: 'Telefone',       type: 'tel',   enabled: true,  required: true },
  { key: 'documento',      label_default: 'CPF',            type: 'text',  enabled: false, required: false },
  { key: 'cidade',         label_default: 'Cidade',         type: 'text',  enabled: false, required: false },
  { key: 'estado',         label_default: 'Estado',         type: 'text',  enabled: false, required: false },
  { key: 'cep',            label_default: 'CEP',            type: 'text',  enabled: false, required: false },
  { key: 'renda_familiar', label_default: 'Renda familiar', type: 'text',  enabled: false, required: false },
  { key: 'sexo',           label_default: 'Sexo',           type: 'text',  enabled: false, required: false },
];

const isEdit = computed(() => !!props.form?.id);

function buildFieldsConfig(stored) {
  const byKey = new Map();
  if (Array.isArray(stored)) for (const s of stored) if (s?.key) byKey.set(s.key, s);
  return AVAILABLE_FIELDS.map(af => {
    const s = byKey.get(af.key);
    return s
      ? { ...af, enabled: s.enabled !== false, required: !!s.required, label: s.label || '' }
      : { ...af, label: '' };
  });
}

function buildPage(stored) {
  const s = stored || {};
  return {
    title: s.title || '',
    subtitle: s.subtitle || '',
    logo_url: s.logo_url || '',
    background_color: s.background_color || '',
    background_image_url: s.background_image_url || '',
    accent_color: s.accent_color || '',
    cta_button_text: s.cta_button_text || '',
    success_title: s.success_title || '',
    success_message: s.success_message || '',
  };
}

const empty = () => ({
  slug: '', name: '', active: true,
  description: '', priority: 'normal', campaign_ref: '',
  start_date: '', end_date: '',
  midia_slug: '', cv_origem: 'SI',
  bound_empreendimentos: [],
  tags_str: '',
  default_utm_source: '', default_utm_medium: '', default_utm_campaign: '',
  default_utm_content: '', default_utm_term: '',
  cv_extra_json: '',
  consent_required: true, consent_text: '', consent_text_version: 'v1',
  allowed_origins_str: '', redirect_url: '',
  fields_config: buildFieldsConfig(null),
  page: buildPage(null),
});

const data = ref(empty());
const cvExtraError = ref(null);
const localError = ref(null);
const activeSection = ref('geral');
const recentLeads = ref([]);
const loadingLeads = ref(false);

function fmtDateInput(iso) {
  if (!iso) return '';
  // backend retorna DATEONLY como 'YYYY-MM-DD' já
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
}

watch(() => props.open, async (v) => {
  if (!v) return;
  const f = props.form;
  if (f) {
    data.value = {
      slug: f.slug, name: f.name, active: !!f.active,
      description: f.description || '',
      priority: f.priority || 'normal',
      campaign_ref: f.campaign_ref || '',
      start_date: fmtDateInput(f.start_date),
      end_date: fmtDateInput(f.end_date),
      midia_slug: f.midia_slug || '',
      cv_origem: f.cv_origem || 'SI',
      bound_empreendimentos: Array.isArray(f.bound_empreendimentos) ? [...f.bound_empreendimentos] : [],
      tags_str: Array.isArray(f.tags) ? f.tags.join(', ') : '',
      default_utm_source:   f.default_utm_source   || '',
      default_utm_medium:   f.default_utm_medium   || '',
      default_utm_campaign: f.default_utm_campaign || '',
      default_utm_content:  f.default_utm_content  || '',
      default_utm_term:     f.default_utm_term     || '',
      cv_extra_json: f.cv_extra_fields ? JSON.stringify(f.cv_extra_fields, null, 2) : '',
      consent_required: !!f.consent_required,
      consent_text: f.consent_text || '',
      consent_text_version: f.consent_text_version || 'v1',
      allowed_origins_str: Array.isArray(f.allowed_origins) ? f.allowed_origins.join(', ') : '',
      redirect_url: f.redirect_url || '',
      fields_config: buildFieldsConfig(f.fields_config),
      page: buildPage(f.page_config),
    };

    // Carrega leads recentes em paralelo (não bloqueia abertura)
    loadingLeads.value = true;
    recentLeads.value = [];
    try {
      recentLeads.value = await store.fetchRecentLeads(f.id, { limit: 20 });
    } finally {
      loadingLeads.value = false;
    }
  } else {
    data.value = empty();
    recentLeads.value = [];
  }
  cvExtraError.value = null;
  localError.value = null;
  activeSection.value = 'geral';
});

function close() { emit('update:open', false); }

function parseList(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
function cleanPage(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    const t = String(v || '').trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

function tryParseExtra() {
  cvExtraError.value = null;
  const txt = data.value.cv_extra_json.trim();
  if (!txt) return null;
  try {
    const parsed = JSON.parse(txt);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      cvExtraError.value = 'O JSON precisa ser um objeto (chave: valor).';
      return undefined;
    }
    return parsed;
  } catch (e) {
    cvExtraError.value = 'JSON inválido: ' + e.message;
    return undefined;
  }
}

async function save() {
  const d = data.value;
  localError.value = null;
  if (!isEdit.value && !/^[a-z0-9-]{2,60}$/.test(d.slug)) {
    activeSection.value = 'geral';
    localError.value = 'Slug inválido — use minúsculas, números e hífen (2–60 caracteres).';
    return;
  }
  if (!d.name.trim()) {
    activeSection.value = 'geral';
    localError.value = 'Informe o nome do formulário.';
    return;
  }
  const cvExtra = tryParseExtra();
  if (cvExtra === undefined) {
    activeSection.value = 'extras';
    return;
  }

  const payload = {
    name: d.name.trim(),
    active: d.active,
    description: d.description.trim() || null,
    priority: d.priority || 'normal',
    campaign_ref: d.campaign_ref.trim() || null,
    start_date: d.start_date || null,
    end_date: d.end_date || null,
    midia_slug: d.midia_slug.trim() || null,
    cv_origem: d.cv_origem,
    bound_empreendimentos: Array.isArray(d.bound_empreendimentos) ? d.bound_empreendimentos : [],
    tags: parseList(d.tags_str),
    default_utm_source:   d.default_utm_source.trim()   || null,
    default_utm_medium:   d.default_utm_medium.trim()   || null,
    default_utm_campaign: d.default_utm_campaign.trim() || null,
    default_utm_content:  d.default_utm_content.trim()  || null,
    default_utm_term:     d.default_utm_term.trim()     || null,
    cv_extra_fields: cvExtra,
    consent_required: d.consent_required,
    consent_text: d.consent_text.trim() || null,
    consent_text_version: d.consent_text_version.trim() || null,
    allowed_origins: parseList(d.allowed_origins_str),
    redirect_url: d.redirect_url.trim() || null,
    fields_config: d.fields_config
      .filter(f => f.enabled)
      .map(f => ({
        key: f.key,
        label: (f.label && f.label.trim()) || f.label_default,
        type: f.type,
        enabled: true,
        required: !!f.required,
      })),
    page_config: cleanPage(d.page),
  };
  const result = isEdit.value
    ? await store.update(props.form.id, payload)
    : await store.create({ slug: d.slug.trim().toLowerCase(), ...payload });
  if (result) {
    emit('saved', result);
    close();
  } else {
    localError.value = store.error || 'Erro ao salvar.';
  }
}

// ── URLs e snippet ──────────────────────────────────────────────────────────
const submitUrl = computed(() => isEdit.value
  ? `${API_URL}/marketing/public/forms/${props.form.slug}/submit`
  : '');
const lpUrl = computed(() => isEdit.value
  ? `${LP_HOST}/${props.form.slug}`
  : '');

const qrDataUrl = ref('');
watch([() => props.open, lpUrl], async ([isOpen, url]) => {
  if (isOpen && url) {
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    } catch { qrDataUrl.value = ''; }
  } else {
    qrDataUrl.value = '';
  }
}, { immediate: true });

async function copyQrImage() {
  if (!qrDataUrl.value) return;
  try {
    const r = await fetch(qrDataUrl.value);
    const blob = await r.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    window.alert('Imagem do QR copiada.');
  } catch {
    window.alert('Seu navegador não suporta copiar imagem direto. Use "Baixar PNG".');
  }
}
function downloadQrImage() {
  if (!qrDataUrl.value) return;
  const a = document.createElement('a');
  a.href = qrDataUrl.value;
  a.download = `qr-${props.form?.slug || 'lp'}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

const htmlSnippet = computed(() => {
  if (!isEdit.value) return '';
  const url = submitUrl.value;
  const closeScript = '</scr' + 'ipt>';
  const cfg = Array.isArray(props.form?.fields_config) && props.form.fields_config.length
    ? props.form.fields_config.filter(f => f.enabled !== false)
    : [
        { key: 'nome',     label: 'Nome',     required: true,  type: 'text'  },
        { key: 'email',    label: 'E-mail',   required: false, type: 'email' },
        { key: 'telefone', label: 'Telefone', required: true,  type: 'tel'   },
      ];
  const inputs = cfg.map(f => {
    const type = f.type || (f.key === 'email' ? 'email' : f.key === 'telefone' ? 'tel' : 'text');
    const req  = f.required ? ' required' : '';
    return `  <input name="${f.key}" type="${type}" placeholder="${f.label || f.key}"${req} />`;
  }).join('\n');
  const consentLine = props.form?.consent_required
    ? `  <label><input name="consent" type="checkbox" required /> ${props.form.consent_text || 'Aceito ser contatado.'}</label>\n`
    : '';
  const ctaText = props.form?.page_config?.cta_button_text || 'Enviar';
  return `<form id="form-menin">
${inputs}
  <input name="_hp" tabindex="-1" autocomplete="off"
         style="position:absolute;left:-9999px" aria-hidden="true" />
${consentLine}  <button type="submit">${ctaText}</button>
</form>
<script>
const f = document.getElementById('form-menin');
f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(f).entries());
  body.consent = f.consent && f.consent.checked;
  const qs = new URLSearchParams(location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
    .forEach(k => qs.get(k) && (body[k] = qs.get(k)));
  body.landing_url = location.href;
  const r = await fetch('${url}', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  const d = await r.json();
  if (d.ok) { d.redirect ? location.href = d.redirect : alert('Recebemos seu contato!'); f.reset(); }
  else alert(d.error || 'Não foi possível enviar.');
});
${closeScript}`;
});

async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); window.alert(`${label} copiado.`); }
  catch { window.alert('Não consegui copiar.'); }
}

// ── KPIs ────────────────────────────────────────────────────────────────────
const stats = computed(() => props.form?.stats || { total: 0, last_30d: 0, delivered: 0, held: 0, spam: 0, failed: 0, last_lead_at: null });

function fmtRelative(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'agora';
  const min = Math.floor(ms / 60000);
  if (min < 1)    return 'agora';
  if (min < 60)   return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7)      return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function statusColor(s) {
  if (s === 'delivered')               return 'text-emerald-600 dark:text-emerald-300';
  if (s === 'held')                    return 'text-amber-600 dark:text-amber-300';
  if (s === 'spam')                    return 'text-red-500';
  if (s === 'failed' || s === 'rejected') return 'text-red-600 dark:text-red-300';
  return 'text-ink-muted';
}

// ── Tabs ────────────────────────────────────────────────────────────────────
const sections = computed(() => {
  const base = [
    { key: 'geral',     label: 'Geral',          icon: 'fas fa-circle-info' },
    { key: 'vinculo',   label: 'Vínculo CV',     icon: 'fas fa-link' },
    { key: 'utms',      label: 'UTMs default',   icon: 'fas fa-tag' },
    { key: 'extras',    label: 'Campos extras',  icon: 'fas fa-code' },
    { key: 'pagina',    label: 'Landing & Campos', icon: 'fas fa-window-maximize' },
    { key: 'lgpd',      label: 'LGPD & Outros',  icon: 'fas fa-shield-halved' },
  ];
  if (isEdit.value) {
    base.push({ key: 'como-usar', label: 'Como usar',     icon: 'fas fa-rocket' });
    base.push({ key: 'leads',     label: 'Leads recentes', icon: 'fas fa-users' });
  }
  return base;
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-4xl rounded-xl shadow-xl border border-line max-h-[92vh] flex flex-col">

      <!-- Header -->
      <header class="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          <i class="fas fa-square-poll-vertical text-lg"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-ink leading-tight truncate">
            {{ isEdit ? form?.name : 'Novo formulário interno' }}
          </h3>
          <p v-if="isEdit" class="text-xs text-ink-subtle mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            <span class="font-mono">/{{ form?.slug }}</span>
            <span v-if="form?.campaign_ref">· {{ form.campaign_ref }}</span>
            <span v-if="form?.created_at">· Criado {{ new Date(form.created_at).toLocaleDateString('pt-BR') }}</span>
          </p>
        </div>
        <span v-if="isEdit" :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium',
          form?.active
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
            : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20']">
          {{ form?.active ? 'Ativo' : 'Inativo' }}
        </span>
        <button @click="close" class="shrink-0 text-ink-subtle hover:text-ink p-1">
          <i class="fas fa-times"></i>
        </button>
      </header>

      <!-- KPI bar (só na edição) -->
      <div v-if="isEdit" class="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-3 border-b border-line bg-surface-sunken/30 shrink-0">
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Total</div>
          <div class="text-lg font-semibold text-ink">{{ stats.total }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Últimos 30d</div>
          <div class="text-lg font-semibold text-ink">{{ stats.last_30d }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Entregues</div>
          <div class="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{{ stats.delivered }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Pendentes</div>
          <div class="text-lg font-semibold text-amber-600 dark:text-amber-300">{{ stats.held }}</div>
        </div>
        <div class="text-center col-span-2 sm:col-span-1">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Último lead</div>
          <div class="text-sm font-medium text-ink">{{ fmtRelative(stats.last_lead_at) }}</div>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="px-5 border-b border-line shrink-0 overflow-x-auto">
        <div class="flex gap-0">
          <button v-for="s in sections" :key="s.key" @click="activeSection = s.key"
            :class="['px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
              activeSection === s.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink']">
            <i :class="s.icon" class="text-[10px]"></i>
            {{ s.label }}
          </button>
        </div>
      </nav>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        <!-- ── Geral ─────────────────────────────────────────────────────── -->
        <section v-show="activeSection === 'geral'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="data.slug" label="Slug (URL)" placeholder="lp-mond-marilia" size="sm"
              :disabled="isEdit" hint="Minúsculas, números e hífen. Imutável após criar." />
            <Input v-model="data.name" label="Nome interno" placeholder="Formulário MOND Marília" size="sm" />
          </div>

          <div>
            <label class="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" v-model="data.active" class="h-4 w-4 rounded border-line accent-emerald-500" />
              <span class="text-sm text-ink font-medium">Aceita submissões</span>
            </label>
            <p class="text-xs text-ink-subtle mt-1 ml-6">
              Desativado = formulário rejeita novas submissões com mensagem amigável.
            </p>
          </div>

          <div>
            <label class="text-sm font-medium text-ink block mb-1">Descrição interna</label>
            <p class="text-[11px] text-ink-subtle mb-1.5">Notas pra equipe. Não vai pro lead nem pro CV.</p>
            <textarea v-model="data.description" rows="2"
              placeholder="Ex: LP do lançamento Mond — campanha out/2026"
              class="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 resize-y" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Prioridade</label>
              <select v-model="data.priority" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <Input v-model="data.campaign_ref" label="Referência da campanha" placeholder="LANC-MOND-OUT-2026" size="sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Data de início</label>
              <input v-model="data.start_date" type="date"
                class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40" />
              <p class="text-[11px] text-ink-subtle mt-1">Informativo — usado em filtros/relatórios.</p>
            </div>
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Data de encerramento</label>
              <input v-model="data.end_date" type="date"
                class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40" />
              <p class="text-[11px] text-ink-subtle mt-1">Após essa data o form passa a rejeitar submissões automaticamente.</p>
            </div>
          </div>
        </section>

        <!-- ── Vínculo CV ────────────────────────────────────────────────── -->
        <section v-show="activeSection === 'vinculo'" class="space-y-4">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-info-circle text-accent mr-1.5"></i>Roteamento ao CV
            </div>
            <p class="text-xs text-ink-subtle">Esses campos vão direto no payload do lead pro CV CRM.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <Input v-model="data.midia_slug" label="Mídia (slug)" placeholder="site-mond-marilia" size="sm"
                hint="Vira o campo 'midia' no CV. Use kebab-case." />
            </div>
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Origem CV</label>
              <select v-model="data.cv_origem" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
                <option v-for="o in CV_ORIGEM_OPTIONS" :key="o.v" :value="o.v">{{ o.label }} ({{ o.v }})</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-ink block mb-1.5">Empreendimentos vinculados</label>
            <EnterpriseMultiSelect v-model="data.bound_empreendimentos" />
          </div>

          <Input v-model="data.tags_str" label="Tags (separadas por vírgula)" placeholder="feirao, alto-padrao" size="sm" />
        </section>

        <!-- ── UTMs default ──────────────────────────────────────────────── -->
        <section v-show="activeSection === 'utms'" class="space-y-3">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-info-circle text-accent mr-1.5"></i>UTMs default
            </div>
            <p class="text-xs text-ink-subtle">
              Quando o lead não traz UTM na URL, esses valores são aplicados. Útil pra LPs com tráfego direto (QR code, link de WhatsApp, e-mail).
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="data.default_utm_source"   label="utm_source"   placeholder="qrcode" size="sm" />
            <Input v-model="data.default_utm_medium"   label="utm_medium"   placeholder="offline" size="sm" />
            <Input v-model="data.default_utm_campaign" label="utm_campaign" placeholder="outdoor_marilia" size="sm" />
            <Input v-model="data.default_utm_content"  label="utm_content"  placeholder="placa_av_paulista" size="sm" />
            <div class="sm:col-span-2">
              <Input v-model="data.default_utm_term" label="utm_term" placeholder="apartamento+marilia" size="sm" />
            </div>
          </div>
        </section>

        <!-- ── Campos extras ─────────────────────────────────────────────── -->
        <section v-show="activeSection === 'extras'" class="space-y-3">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-code text-accent mr-1.5"></i>Campos extras (JSON)
            </div>
            <p class="text-xs text-ink-subtle">
              Pares chave-valor adicionados a cada lead capturado. Em conflito com campos do submit, prevalece o submit.
            </p>
          </div>
          <textarea v-model="data.cv_extra_json" rows="8"
            placeholder='{
  "corretor_id": 42,
  "situacao": "quente"
}'
            class="w-full rounded border border-line bg-surface px-3 py-2 text-xs font-mono text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 resize-y" />
          <div v-if="cvExtraError"
            class="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <i class="fas fa-circle-exclamation mr-1"></i>{{ cvExtraError }}
          </div>
        </section>

        <!-- ── Landing Page & Campos ─────────────────────────────────────── -->
        <section v-show="activeSection === 'pagina'" class="space-y-4">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-window-maximize text-accent mr-1.5"></i>Landing page
            </div>
            <p class="text-xs text-ink-subtle">
              Visual em <code class="font-mono">lp.menin.com.br/{{ data.slug || 'slug' }}</code>. Tudo opcional — sem nada vale o visual padrão.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="data.page.title" label="Título principal" placeholder="Conheça o MOND" size="sm" />
            <Input v-model="data.page.subtitle" label="Subtítulo" placeholder="Apartamentos 2 e 3 dorms em Marília" size="sm" />
            <Input v-model="data.page.logo_url" label="URL do logo" placeholder="https://..." size="sm" />
            <Input v-model="data.page.background_image_url" label="URL da imagem de fundo" placeholder="https://..." size="sm" />
            <Input v-model="data.page.background_color" label="Cor de fundo (hex)" placeholder="#0f172a" size="sm" />
            <Input v-model="data.page.accent_color" label="Cor do botão (hex)" placeholder="#3b82f6" size="sm" />
            <Input v-model="data.page.cta_button_text" label="Texto do botão" placeholder="Quero saber mais" size="sm" />
            <Input v-model="data.page.success_title" label="Título pós-cadastro" placeholder="Obrigado!" size="sm" />
          </div>
          <Input v-model="data.page.success_message" label="Mensagem pós-cadastro"
            placeholder="Recebemos seu contato. Em breve nosso time entra em contato." size="sm" />

          <!-- Campos do form -->
          <div class="pt-3 border-t border-line/60">
            <div class="text-sm font-medium text-ink mb-1">Campos do formulário</div>
            <p class="text-[11px] text-ink-subtle mb-2">
              Escolha quais campos pedir e quais são obrigatórios. Sistema sempre exige no mínimo e-mail OU telefone válido.
            </p>
            <div class="overflow-x-auto rounded border border-line/60">
              <table class="w-full text-sm">
                <thead class="bg-surface-sunken/30">
                  <tr class="border-b border-line">
                    <th class="text-left   text-[10px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 px-2">Campo</th>
                    <th class="text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 w-16">Pedir</th>
                    <th class="text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 w-24">Obrigatório</th>
                    <th class="text-left   text-[10px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 px-2">Label personalizado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in data.fields_config" :key="f.key" class="border-b border-line/40 last:border-0">
                    <td class="py-1.5 px-2 text-ink-muted">{{ f.label_default }}</td>
                    <td class="text-center py-1.5"><input type="checkbox" v-model="f.enabled" /></td>
                    <td class="text-center py-1.5"><input type="checkbox" v-model="f.required" :disabled="!f.enabled" /></td>
                    <td class="py-1.5 px-2">
                      <input type="text" v-model="f.label" :placeholder="f.label_default" :disabled="!f.enabled"
                        class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- ── LGPD & Outros ─────────────────────────────────────────────── -->
        <section v-show="activeSection === 'lgpd'" class="space-y-4">
          <div>
            <label class="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" v-model="data.consent_required" class="h-4 w-4 rounded border-line accent-emerald-500" />
              <span class="text-sm text-ink font-medium">Exigir aceite no formulário</span>
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="data.consent_text" label="Texto do termo" placeholder="Autorizo o contato..." size="sm" />
            <Input v-model="data.consent_text_version" label="Versão do termo" placeholder="v1" size="sm" />
          </div>

          <div class="pt-3 border-t border-line/60 space-y-3">
            <Input v-model="data.redirect_url" label="URL pós-cadastro (opcional)" placeholder="https://menin.com.br/obrigado" size="sm" />
            <Input v-model="data.allowed_origins_str" label="Domínios autorizados (vírgula, opcional)" placeholder="menin.com.br" size="sm" />
          </div>
        </section>

        <!-- ── Como usar ─────────────────────────────────────────────────── -->
        <section v-show="activeSection === 'como-usar' && isEdit" class="space-y-4">
          <div>
            <div class="text-xs text-ink-muted mb-1">Landing page hospedada:</div>
            <div class="flex items-center gap-2">
              <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ lpUrl }}</code>
              <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(lpUrl, 'URL da LP')">Copiar</Button>
              <a :href="lpUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-accent hover:underline px-2 py-1.5">
                <i class="fas fa-arrow-up-right-from-square"></i>Abrir
              </a>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-muted mb-1.5">QR code da LP (imprima/cole onde quiser — não expira):</div>
            <div class="flex items-start gap-3">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="h-32 w-32 rounded border border-line bg-white shrink-0" />
              <div v-else class="h-32 w-32 rounded border border-line bg-surface-sunken grid place-items-center text-ink-subtle text-xs shrink-0">
                <i class="fas fa-circle-notch fa-spin"></i>
              </div>
              <div class="flex flex-col gap-2">
                <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copyQrImage" :disabled="!qrDataUrl">Copiar imagem</Button>
                <Button variant="ghost" size="sm" icon="fas fa-download" @click="downloadQrImage" :disabled="!qrDataUrl">Baixar PNG</Button>
              </div>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-muted mb-1">URL de submit (pra integrar com outros sites):</div>
            <div class="flex items-center gap-2">
              <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ submitUrl }}</code>
              <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(submitUrl, 'URL')">Copiar</Button>
            </div>
          </div>

          <div>
            <div class="text-xs text-ink-muted mb-1">Snippet HTML pra colar em site externo:</div>
            <pre class="text-[11px] font-mono bg-surface border border-line rounded p-3 overflow-x-auto max-h-72 whitespace-pre">{{ htmlSnippet }}</pre>
            <div class="mt-2 flex justify-end">
              <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copy(htmlSnippet, 'HTML')">Copiar HTML</Button>
            </div>
          </div>
        </section>

        <!-- ── Leads recentes ────────────────────────────────────────────── -->
        <section v-show="activeSection === 'leads' && isEdit" class="space-y-2">
          <div v-if="loadingLeads" class="text-center py-8 text-ink-subtle">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando leads...
          </div>
          <div v-else-if="!recentLeads.length" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-inbox text-2xl mb-2 block"></i>
            Nenhum lead chegou por esse formulário ainda.
          </div>
          <div v-else class="rounded-lg border border-line overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Quando</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Contato</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
                  <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="l in recentLeads" :key="l.id" class="hover:bg-surface-hover/40">
                  <td class="px-3 py-2 text-[11px] text-ink-subtle whitespace-nowrap">{{ fmtRelative(l.created_at) }}</td>
                  <td class="px-3 py-2">
                    <div class="text-ink text-xs">{{ l.nome || '—' }}</div>
                    <div class="text-[10px] text-ink-subtle">{{ l.email || l.telefone || '' }}</div>
                  </td>
                  <td class="px-3 py-2 text-[11px] font-mono text-ink-muted">{{ l.midia_slug || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <span :class="['text-[11px] font-medium', statusColor(l.status)]">{{ l.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Erro local -->
        <div v-if="localError"
          class="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          <i class="fas fa-circle-exclamation mr-1.5"></i>{{ localError }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-line flex items-center justify-end gap-2 bg-surface-sunken/30 shrink-0">
        <Button variant="secondary" size="sm" @click="close" :disabled="store.saving">Cancelar</Button>
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
          {{ isEdit ? 'Salvar alterações' : 'Criar formulário' }}
        </Button>
      </footer>
    </div>
  </div>
</template>
