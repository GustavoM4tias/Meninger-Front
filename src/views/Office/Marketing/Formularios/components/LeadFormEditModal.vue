<script setup>
// Modal de edição de formulário interno (LP), no molde do modal de campanha:
// `Modal screen` (o formulário é uma página), seções numa barra sticky, KPIs
// em StatRow, cada bloco num Panel, campos nos primitivos do Office.
//   1. Geral - slug, name, active, description, priority, campaign_ref, datas
//   2. Vínculo CV - midia, cv_origem, empreendimentos, tags
//   3. Landing & Campos - visual, layout e fields_config (com preview ao vivo)
//   4. Avançado - UTMs default, campos extras (JSON), LGPD, domínios, redirect
//   5. Como usar - só em edição: LP URL, QR, embed HTML
//   6. Leads recentes - só em edição

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import QRCode from 'qrcode';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import API_URL from '@/config/apiUrl';
import Button from '@/components/UI/Button.vue';
import Modal from '@/components/UI/Modal.vue';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import { fieldBase, labelBase } from '@/components/UI/_classes.js';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';
import LeadStatusBadge from '@/views/Office/Marketing/Captacao/components/LeadStatusBadge.vue';
import LeadFormCard from '@/views/Lp/components/LeadFormCard.vue';
import { backgroundStyle, cardWidthClass, cardJustifyClass } from '@/views/Lp/lpTheme';

const LP_HOST = 'https://lp.menin.com.br';

const props = defineProps({
  open: { type: Boolean, default: false },
  form: { type: Object, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useLeadFormsStore();
const toast = useToast();

const CV_ORIGEM_OPTIONS = [
  { value: 'SI', label: 'WebSite (SI)' },
  { value: 'FB', label: 'Facebook (FB)' },
  { value: 'IG', label: 'Instagram (IG)' },
  { value: 'GO', label: 'Google (GO)' },
  { value: 'MP', label: 'Mídia Paga (MP)' },
  { value: 'OU', label: 'Outros (OU)' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alta' },
];

// Seletores de layout da LP. O Select esconde "" como placeholder, então
// "padrão" é um sentinela que vira '' ao salvar (a chave nem entra na config).
const DEF = '__padrao__';
const LAYOUT_SELECTS = [
  { key: 'logo_size',     label: 'Tamanho do logo',      options: [{ value: DEF, label: 'Padrão (40px)' }, { value: 'sm', label: 'Pequeno (32px)' }, { value: 'lg', label: 'Grande (80px)' }, { value: 'xl', label: 'Gigante (128px)' }] },
  { key: 'logo_align',    label: 'Alinhamento do logo',  options: [{ value: DEF, label: 'Segue o texto' }, { value: 'start', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'end', label: 'Direita' }] },
  { key: 'text_align',    label: 'Alinhamento do texto', options: [{ value: DEF, label: 'Padrão (esquerda)' }, { value: 'center', label: 'Centralizado' }, { value: 'end', label: 'Direita' }] },
  { key: 'spacing',       label: 'Espaçamento',          options: [{ value: DEF, label: 'Padrão' }, { value: 'compact', label: 'Compacto' }, { value: 'spacious', label: 'Espaçoso' }] },
  { key: 'corner_style',  label: 'Cantos',               options: [{ value: DEF, label: 'Padrão (arredondado)' }, { value: 'square', label: 'Retos' }, { value: 'pill', label: 'Bem arredondados' }] },
  { key: 'card_width',    label: 'Largura do card',      options: [{ value: DEF, label: 'Padrão (médio)' }, { value: 'sm', label: 'Estreito' }, { value: 'lg', label: 'Largo' }, { value: 'xl', label: 'Extra largo' }] },
  { key: 'card_position', label: 'Posição na tela',      options: [{ value: DEF, label: 'Padrão (centro)' }, { value: 'start', label: 'Esquerda' }, { value: 'end', label: 'Direita' }] },
  { key: 'cta_width',     label: 'Largura do botão',     options: [{ value: DEF, label: 'Padrão (100%)' }, { value: 'auto', label: 'Ajustado ao texto' }] },
  { key: 'cta_align',     label: 'Alinhamento do botão', options: [{ value: DEF, label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'end', label: 'Direita' }], disabledWhen: (p) => p.cta_width !== 'auto' },
];
function layoutSel(key) { return data.value.page[key] || DEF; }
function setLayout(key, v) { data.value.page[key] = v === DEF ? '' : v; }

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
    // Layout - '' = padrão (a chave nem é salva no page_config)
    logo_size: s.logo_size || '',
    logo_align: s.logo_align || '',
    logo_trim: s.logo_trim || '',
    logo_gap: s.logo_gap ?? '',
    text_align: s.text_align || '',
    corner_style: s.corner_style || '',
    spacing: s.spacing || '',
    card_width: s.card_width || '',
    card_position: s.card_position || '',
    overlay_opacity: s.overlay_opacity || '',
    cta_width: s.cta_width || '',
    cta_align: s.cta_align || '',
    footer_text: s.footer_text || '',
    show_powered_by: s.show_powered_by !== false,
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
    // Boolean: só persiste quando difere do default (true).
    if (k === 'show_powered_by') {
      if (v === false) out[k] = false;
      continue;
    }
    const t = String(v || '').trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

// ── Pré-visualização ao vivo ────────────────────────────────────────────────
// Usa o MESMO componente da LP pública (LeadFormCard) com a config atual do
// modal, então o que se vê aqui é exatamente o que vai pro ar.
const previewConfig = computed(() => cleanPage(data.value.page) || {});
const previewBg = computed(() => backgroundStyle(previewConfig.value));
const previewFields = computed(() => data.value.fields_config
  .filter(f => f.enabled)
  .map(f => ({
    key: f.key,
    label: (f.label || '').trim() || f.label_default,
    required: !!f.required,
    type: f.type,
    placeholder: '',
  })));
const previewData = ref({});   // sink dos v-model dos inputs do preview

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
    localError.value = 'Slug inválido - use minúsculas, números e hífen (2 a 60 caracteres).';
    return;
  }
  if (!d.name.trim()) {
    activeSection.value = 'geral';
    localError.value = 'Informe o nome do formulário.';
    return;
  }
  const cvExtra = tryParseExtra();
  if (cvExtra === undefined) {
    activeSection.value = 'avancado';
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
    toast.success('Imagem do QR copiada.');
  } catch {
    toast.info('Seu navegador não copia imagem direto. Use Baixar PNG.');
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
// design:dialogo-proprio(arquivo): os alert() abaixo NAO devem virar toast. Este
// trecho e copiado para o site do CLIENTE, onde nada do Office existe -
// nem o toast, nem o tema, nem o Vue.
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

// Iframe com o MESMO visual da LP hospedada (?embed=1 renderiza só o card e
// reporta a altura via postMessage - o script abaixo ajusta o iframe).
const iframeSnippet = computed(() => {
  if (!isEdit.value) return '';
  const s = props.form.slug;
  const id = `menin-lp-${s}`;
  const closeScript = '</scr' + 'ipt>';
  return `<iframe id="${id}" src="${lpUrl.value}?embed=1"
  style="width:100%;max-width:480px;height:640px;border:0;display:block;margin:0 auto"
  loading="lazy" title="${props.form.name || 'Formulário Menin'}"></iframe>
<script>
window.addEventListener('message', function (e) {
  if (e.origin !== '${LP_HOST}') return;
  var d = e.data || {};
  if (d.meninLpSlug === '${s}' && d.height) {
    document.getElementById('${id}').style.height = d.height + 'px';
  }
});
${closeScript}`;
});

async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado.`); }
  catch { toast.error('Não consegui copiar.'); }
}

// ── KPIs ────────────────────────────────────────────────────────────────────
const intFmt = new Intl.NumberFormat('pt-BR');
const stats = computed(() => props.form?.stats || { total: 0, last_30d: 0, delivered: 0, held: 0, spam: 0, failed: 0, last_lead_at: null });
const kpiCards = computed(() => {
  const s = stats.value;
  return [
    { key: 'total',     label: 'Leads (total)',  raw: Number(s.total) || 0,     format: v => intFmt.format(v), icon: 'fas fa-users',          tone: 'accent' },
    { key: 'last_30d',  label: 'Últimos 30 dias',raw: Number(s.last_30d) || 0,  format: v => intFmt.format(v), icon: 'fas fa-calendar-days',  tone: 'neutral' },
    { key: 'delivered', label: 'Entregues ao CV',raw: Number(s.delivered) || 0, format: v => intFmt.format(v), icon: 'fas fa-circle-check',   tone: 'pos' },
    { key: 'held',      label: 'Represados',     raw: Number(s.held) || 0,      format: v => intFmt.format(v), icon: 'fas fa-hourglass-half', tone: s.held ? 'warn' : 'neutral' },
    { key: 'failed',    label: 'Com erro',       raw: Number(s.failed) || 0,    format: v => intFmt.format(v), icon: 'fas fa-circle-exclamation', tone: s.failed ? 'neg' : 'neutral' },
    { key: 'last',      label: 'Último lead',    value: fmtRelative(s.last_lead_at), icon: 'fas fa-clock', tone: 'neutral' },
  ];
});

function fmtRelative(iso) {
  if (!iso) return '-';
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

const LEADS_COLUMNS = [
  { key: 'nome',       label: 'Contato', priority: 1, sortable: true, width: '36%' },
  { key: 'status',     label: 'Status',  priority: 1, sortable: true, width: '11rem' },
  { key: 'created_at', label: 'Quando',  priority: 2, sortable: true, width: '8rem' },
  { key: 'midia_slug', label: 'Mídia',   priority: 2, sortable: true },
];

// ── Seções ──────────────────────────────────────────────────────────────────
const sections = computed(() => {
  const base = [
    { key: 'geral',    label: 'Geral',            icon: 'fas fa-circle-info',     hint: 'Nome, status, prioridade e datas' },
    { key: 'vinculo',  label: 'Vínculo CV',       icon: 'fas fa-link',            hint: 'Mídia, origem e empreendimentos do lead' },
    { key: 'pagina',   label: 'Landing & Campos', icon: 'fas fa-window-maximize', hint: 'Visual da LP e campos pedidos' },
    { key: 'avancado', label: 'Avançado',         icon: 'fas fa-sliders',         hint: 'UTMs default, campos extras, LGPD e domínios' },
  ];
  if (isEdit.value) {
    base.push({ key: 'como-usar', label: 'Como usar',      icon: 'fas fa-rocket', hint: 'URL, QR code e código para embutir' });
    base.push({ key: 'leads',     label: 'Leads recentes', icon: 'fas fa-users',  hint: 'Últimos 20 leads deste formulário' });
  }
  return base;
});
</script>

<template>
  <!-- `screen`: o formulário é uma PÁGINA (como a campanha e o empreendimento).
       Fechar mora no canto do Modal; as seções ficam numa barra sticky. -->
  <Modal :open="open" size="screen" :padded="false" @close="close">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="shrink-0 h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          <i class="fas fa-square-poll-vertical"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ isEdit ? form?.name : 'Novo formulário interno' }}</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">
            <template v-if="isEdit">
              <span class="font-mono">/{{ form?.slug }}</span>
              <span v-if="form?.campaign_ref"> · {{ form.campaign_ref }}</span>
              <span v-if="form?.created_at"> · criado {{ new Date(form.created_at).toLocaleDateString('pt-BR') }}</span>
            </template>
            <template v-else>Landing page hospedada em lp.menin.com.br ou embutida no site.</template>
          </p>
        </div>
        <Badge v-if="isEdit" :variant="form?.active ? 'success' : 'neutral'" size="sm" dot class="ml-auto shrink-0">
          {{ form?.active ? 'Ativo' : 'Inativo' }}
        </Badge>
      </div>
    </template>

    <div class="h-full overflow-y-auto">

      <!-- Seções: sticky no scroll único, todas à vista. -->
      <nav class="sticky top-0 z-30 border-b border-line bg-surface" role="tablist" aria-label="Seções do formulário">
        <div class="px-2 sm:px-4 grid grid-cols-3 sm:flex sm:items-stretch">
          <button v-for="s in sections" :key="s.key" type="button" role="tab"
            :aria-selected="activeSection === s.key" :title="s.hint"
            @click="activeSection = s.key"
            class="relative flex items-center justify-center sm:justify-start gap-2 px-2 sm:px-4 py-3 min-h-[48px] min-w-0 transition-colors duration-120 focus-ring rounded-md sm:flex-1 sm:basis-0"
            :class="activeSection === s.key ? 'text-accent' : 'text-ink-muted hover:text-ink'">
            <i :class="s.icon" class="text-sm w-4 text-center shrink-0"></i>
            <span class="text-sm font-semibold leading-tight truncate">{{ s.label }}</span>
            <span class="absolute left-2 right-2 bottom-0 h-0.5 rounded-t"
              :class="activeSection === s.key ? 'bg-accent' : 'bg-transparent'"></span>
          </button>
        </div>
      </nav>

      <div class="p-4 sm:p-6 space-y-4">

        <!-- KPIs: a mesma linha em toda seção (só na edição, que é quando há lead) -->
        <StatRow v-if="isEdit" :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 6 }" size="sm" />

        <!-- Erro de validação/salvamento -->
        <div v-if="localError" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-sm text-data-neg flex items-start gap-2">
          <i class="fas fa-circle-exclamation mt-0.5"></i><span>{{ localError }}</span>
        </div>

        <!-- ── Geral ─────────────────────────────────────────────────────── -->
        <template v-if="activeSection === 'geral'">
          <Panel title="Identificação" icon="fas fa-circle-info" subtitle="Como o formulário aparece no Office e na URL da LP">
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input v-model="data.slug" label="Slug (URL)" placeholder="lp-mond-marilia"
                  :disabled="isEdit" hint="Minúsculas, números e hífen. Não muda depois de criar." />
                <Input v-model="data.name" label="Nome interno" placeholder="Formulário MOND Marília" />
              </div>
              <div>
                <label :class="labelBase">Descrição interna</label>
                <textarea v-model="data.description" rows="2" placeholder="Ex: LP do lançamento Mond - campanha out/2026"
                  :class="[fieldBase, 'rounded-lg px-3 py-2 text-sm resize-y']" />
                <p class="mt-1.5 text-xs text-ink-subtle">Notas para a equipe. Não vai para o lead nem para o CV.</p>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select v-model="data.priority" label="Prioridade" :options="PRIORITY_OPTIONS" placeholder="" />
                <Input v-model="data.campaign_ref" label="Referência da campanha" placeholder="LANC-MOND-OUT-2026" class="sm:col-span-2" />
              </div>
            </div>
          </Panel>

          <Panel title="Vigência" icon="fas fa-calendar-days" subtitle="Quando o formulário aceita submissões">
            <div class="space-y-4">
              <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                <Switch v-model="data.active" label="Aceita submissões"
                  description="Desligado: a LP rejeita novas submissões com uma mensagem amigável." />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input v-model="data.start_date" type="date" label="Data de início" hint="Informativo: usado em filtros e relatórios." />
                <Input v-model="data.end_date" type="date" label="Data de encerramento" hint="Depois dessa data o formulário rejeita submissões sozinho." />
              </div>
            </div>
          </Panel>
        </template>

        <!-- ── Vínculo CV ────────────────────────────────────────────────── -->
        <template v-if="activeSection === 'vinculo'">
          <Panel title="Roteamento ao CV" icon="fas fa-link" subtitle="Esses campos vão direto no payload do lead para o CV CRM">
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input v-model="data.midia_slug" label="Mídia (slug)" placeholder="site-mond-marilia" class="sm:col-span-2"
                  hint="Vira o campo 'midia' no CV. Use kebab-case." />
                <Select v-model="data.cv_origem" label="Origem CV" :options="CV_ORIGEM_OPTIONS" placeholder="" />
              </div>
              <div>
                <label :class="labelBase">Empreendimentos vinculados</label>
                <EnterpriseMultiSelect v-model="data.bound_empreendimentos" />
              </div>
              <Input v-model="data.tags_str" label="Tags" placeholder="feirao, alto-padrao" hint="Separadas por vírgula." />
            </div>
          </Panel>
        </template>

        <!-- ── Landing Page & Campos ─────────────────────────────────────── -->
        <template v-if="activeSection === 'pagina'">
          <Panel title="Pré-visualização ao vivo" icon="fas fa-eye" :padded="false"
            :subtitle="`lp.menin.com.br/${data.slug || 'slug'} · atualiza conforme você edita`">
            <div class="p-5 sm:p-8 flex bg-surface" :class="cardJustifyClass(previewConfig)" :style="previewBg">
              <div :class="['w-full pointer-events-none select-none', cardWidthClass(previewConfig)]">
                <LeadFormCard
                  :page-config="previewConfig"
                  :fields="previewFields"
                  :form-name="data.name || 'Nome do formulário'"
                  :consent-required="data.consent_required"
                  :consent-text="data.consent_text"
                  :data="previewData"
                  preview
                />
              </div>
            </div>
          </Panel>

          <Panel title="Textos e visual" icon="fas fa-window-maximize" subtitle="Tudo opcional: vazio vale o visual padrão">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input v-model="data.page.title" label="Título principal" placeholder="Conheça o MOND" />
              <Input v-model="data.page.subtitle" label="Subtítulo" placeholder="Apartamentos 2 e 3 dorms em Marília" />
              <Input v-model="data.page.logo_url" label="URL do logo" placeholder="https://..." />
              <Input v-model="data.page.background_image_url" label="URL da imagem de fundo" placeholder="https://..." />
              <Input v-model="data.page.background_color" label="Cor de fundo (hex)" placeholder="#0f172a" />
              <Input v-model="data.page.accent_color" label="Cor do botão (hex)" placeholder="#3b82f6" />
              <Input v-model="data.page.cta_button_text" label="Texto do botão" placeholder="Quero saber mais" />
              <Input v-model="data.page.success_title" label="Título pós-cadastro" placeholder="Obrigado!" />
              <Input v-model="data.page.success_message" label="Mensagem pós-cadastro" class="sm:col-span-2"
                placeholder="Recebemos seu contato. Em breve nosso time entra em contato." />
            </div>
          </Panel>

          <Panel title="Layout" icon="fas fa-table-cells-large" subtitle='"Padrão" mantém o visual default: a chave nem é salva na config'>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Select v-for="s in LAYOUT_SELECTS" :key="s.key" :label="s.label" :options="s.options" placeholder=""
                :model-value="layoutSel(s.key)" @update:model-value="v => setLayout(s.key, v)"
                :disabled="s.disabledWhen ? s.disabledWhen(data.page) : false" />
              <Input v-model="data.page.logo_trim" type="number" label="Recorte do logo (px)" placeholder="0"
                hint="Corta espaço transparente em cima/embaixo do PNG." />
              <Input v-model="data.page.logo_gap" type="number" label="Distância logo a título (px)" placeholder="auto"
                hint="Vazio segue o espaçamento geral. 0 = colado." />
              <Input v-model="data.page.overlay_opacity" type="number" label="Overlay da imagem (%)" placeholder="55"
                hint="Escurecimento sobre a imagem de fundo." />
            </div>
            <div class="mt-4 pt-4 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                <Switch v-model="data.page.show_powered_by" label="Exibir rodapé do card" />
              </div>
              <Input v-model="data.page.footer_text" label="Texto do rodapé" placeholder="Captação Menin" :disabled="!data.page.show_powered_by" />
            </div>
          </Panel>

          <Panel title="Campos do formulário" icon="fas fa-list-check" :padded="false"
            subtitle="Quais campos pedir e quais são obrigatórios. O sistema sempre exige e-mail OU telefone válido.">
            <ul class="divide-y divide-line">
              <li v-for="f in data.fields_config" :key="f.key"
                class="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[10rem,9rem,1fr] gap-x-4 gap-y-2 items-center"
                :class="f.enabled ? '' : 'opacity-70'">
                <Switch v-model="f.enabled" size="sm" :label="f.label_default" />
                <Switch v-model="f.required" size="sm" label="Obrigatório" :disabled="!f.enabled" />
                <Input v-model="f.label" size="sm" :placeholder="`Rótulo na LP (padrão: ${f.label_default})`" :disabled="!f.enabled" />
              </li>
            </ul>
          </Panel>
        </template>

        <!-- ── Avançado ──────────────────────────────────────────────────── -->
        <template v-if="activeSection === 'avancado'">
          <Panel title="UTMs default" icon="fas fa-tag"
            subtitle="Aplicadas quando o lead não traz UTM na URL: tráfego direto (QR code, link de WhatsApp, e-mail)">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input v-model="data.default_utm_source"   label="utm_source"   placeholder="qrcode" />
              <Input v-model="data.default_utm_medium"   label="utm_medium"   placeholder="offline" />
              <Input v-model="data.default_utm_campaign" label="utm_campaign" placeholder="outdoor_marilia" />
              <Input v-model="data.default_utm_content"  label="utm_content"  placeholder="placa_av_paulista" />
              <Input v-model="data.default_utm_term" label="utm_term" placeholder="apartamento+marilia" class="sm:col-span-2" />
            </div>
          </Panel>

          <Panel title="LGPD e destino" icon="fas fa-shield-halved" subtitle="Aceite do termo, para onde o lead vai depois e quem pode chamar o submit">
            <div class="space-y-4">
              <div class="rounded-lg border border-line bg-surface-sunken/40 px-3 py-3">
                <Switch v-model="data.consent_required" label="Exigir aceite no formulário"
                  description="O lead só envia se marcar o termo. O texto e a versão ficam gravados no lead." />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input v-model="data.consent_text" label="Texto do termo" placeholder="Autorizo o contato..." class="sm:col-span-2" />
                <Input v-model="data.consent_text_version" label="Versão do termo" placeholder="v1" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input v-model="data.redirect_url" label="URL pós-cadastro" placeholder="https://menin.com.br/obrigado" hint="Opcional. Vazio mostra a mensagem pós-cadastro." />
                <Input v-model="data.allowed_origins_str" label="Domínios autorizados" placeholder="menin.com.br" hint="Opcional, separados por vírgula. Vazio aceita de qualquer site." />
              </div>
            </div>
          </Panel>

          <Collapsible title="Campos extras (JSON)" icon="fas fa-code" hint="pares chave-valor adicionados a cada lead" :default-open="!!data.cv_extra_json">
            <div class="mt-2 space-y-2">
              <p class="text-xs text-ink-subtle">Em conflito com campos do submit, prevalece o submit.</p>
              <textarea v-model="data.cv_extra_json" rows="8"
                placeholder='{
  "corretor_id": 42,
  "situacao": "quente"
}'
                :class="[fieldBase, 'rounded-lg px-3 py-2 text-xs font-mono resize-y', cvExtraError ? 'border border-data-neg' : '']" />
              <p v-if="cvExtraError" class="text-xs text-data-neg flex items-center gap-1">
                <i class="fas fa-circle-exclamation"></i>{{ cvExtraError }}
              </p>
            </div>
          </Collapsible>
        </template>

        <!-- ── Como usar ─────────────────────────────────────────────────── -->
        <template v-if="activeSection === 'como-usar' && isEdit">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Landing page hospedada" icon="fas fa-link" class="lg:col-span-2" subtitle="Cole a URL onde quiser: anúncio, bio, WhatsApp">
              <div class="space-y-4">
                <div class="flex flex-wrap items-center gap-2">
                  <code class="flex-1 min-w-0 break-all font-mono text-xs bg-surface-sunken px-2.5 py-2 rounded-md border border-line">{{ lpUrl }}</code>
                  <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copy(lpUrl, 'URL da LP')">Copiar</Button>
                  <a :href="lpUrl" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors focus-ring">
                    <i class="fas fa-arrow-up-right-from-square"></i>Abrir
                  </a>
                </div>
                <div>
                  <p class="text-xs text-ink-muted mb-1.5">URL de submit, para integrar com outros sites:</p>
                  <div class="flex flex-wrap items-center gap-2">
                    <code class="flex-1 min-w-0 break-all font-mono text-xs bg-surface-sunken px-2.5 py-2 rounded-md border border-line">{{ submitUrl }}</code>
                    <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(submitUrl, 'URL')">Copiar</Button>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="QR code" icon="fas fa-qrcode" subtitle="Imprima ou cole onde quiser: não expira">
              <div class="flex items-start gap-3">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="h-32 w-32 rounded-lg border border-line bg-surface-raised shrink-0" />
                <div v-else class="h-32 w-32 rounded-lg border border-line bg-surface-sunken grid place-items-center text-ink-subtle text-xs shrink-0">
                  <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="flex flex-col gap-2">
                  <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copyQrImage" :disabled="!qrDataUrl">Copiar imagem</Button>
                  <Button variant="ghost" size="sm" icon="fas fa-download" @click="downloadQrImage" :disabled="!qrDataUrl">Baixar PNG</Button>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Embutir em site externo" icon="fas fa-code" subtitle="Iframe com o mesmo visual da LP, altura automática">
            <pre class="text-micro font-mono bg-surface-sunken border border-line rounded-md p-3 overflow-x-auto max-h-72 whitespace-pre">{{ iframeSnippet }}</pre>
            <template #footer>
              <div class="flex justify-end">
                <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copy(iframeSnippet, 'HTML do iframe')">Copiar iframe</Button>
              </div>
            </template>
          </Panel>

          <Collapsible title="Snippet HTML sem estilo" icon="fas fa-file-code" hint="para estilizar direto no site de destino">
            <div class="mt-2 space-y-2">
              <pre class="text-micro font-mono bg-surface-sunken border border-line rounded-md p-3 overflow-x-auto max-h-72 whitespace-pre">{{ htmlSnippet }}</pre>
              <div class="flex justify-end">
                <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(htmlSnippet, 'HTML')">Copiar HTML</Button>
              </div>
            </div>
          </Collapsible>
        </template>

        <!-- ── Leads recentes ────────────────────────────────────────────── -->
        <template v-if="activeSection === 'leads' && isEdit">
          <Panel title="Leads recentes" icon="fas fa-users" :padded="false" subtitle="Os últimos 20 que entraram por este formulário">
            <DataTable :columns="LEADS_COLUMNS" :rows="recentLeads" row-key="id" :loading="loadingLeads"
              sort-by="created_at" sort-dir="desc"
              empty-icon="fas fa-inbox" empty-title="Nenhum lead" empty-text="Nenhum lead chegou por esse formulário ainda.">
              <template #cell-nome="{ row }">
                <div class="text-ink">{{ row.nome || '-' }}</div>
                <div class="text-micro text-ink-subtle truncate">{{ row.email || row.telefone || '' }}</div>
              </template>
              <template #cell-status="{ value }"><LeadStatusBadge :status="value" size="sm" /></template>
              <template #cell-created_at="{ value }"><span class="text-ink-muted">{{ fmtRelative(value) }}</span></template>
              <template #cell-midia_slug="{ value }"><span class="font-mono text-ink-muted">{{ value || '-' }}</span></template>
            </DataTable>
          </Panel>
        </template>
      </div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="close" :disabled="store.saving">Cancelar</Button>
      <Button variant="primary" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
        {{ isEdit ? 'Salvar alterações' : 'Criar formulário' }}
      </Button>
    </template>
  </Modal>
</template>
