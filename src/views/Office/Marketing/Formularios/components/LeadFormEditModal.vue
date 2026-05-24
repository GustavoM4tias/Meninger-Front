<script setup>
import { computed, ref, watch } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import API_URL from '@/config/apiUrl';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

const LP_HOST = 'https://lp.menin.com.br';

const props = defineProps({
  open: { type: Boolean, default: false },
  form: { type: Object, default: null },   // null = criar
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

// Catálogo de campos que o admin pode habilitar no formulário.
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
  midia_slug: '', cv_origem: 'SI',
  bound_empreendimentos_str: '', tags_str: '',
  consent_required: true, consent_text: '', consent_text_version: 'v1',
  allowed_origins_str: '', redirect_url: '',
  fields_config: buildFieldsConfig(null),
  page: buildPage(null),
});

const data = ref(empty());

watch(() => props.open, (v) => {
  if (!v) return;
  const f = props.form;
  if (f) {
    data.value = {
      slug: f.slug, name: f.name, active: !!f.active,
      midia_slug: f.midia_slug || '',
      cv_origem: f.cv_origem || 'SI',
      bound_empreendimentos_str: Array.isArray(f.bound_empreendimentos) ? f.bound_empreendimentos.join(', ') : '',
      tags_str: Array.isArray(f.tags) ? f.tags.join(', ') : '',
      consent_required: !!f.consent_required,
      consent_text: f.consent_text || '',
      consent_text_version: f.consent_text_version || 'v1',
      allowed_origins_str: Array.isArray(f.allowed_origins) ? f.allowed_origins.join(', ') : '',
      redirect_url: f.redirect_url || '',
      fields_config: buildFieldsConfig(f.fields_config),
      page: buildPage(f.page_config),
    };
  } else {
    data.value = empty();
  }
});

function close() { emit('update:open', false); }

function parseIds(s)  { return String(s || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => Number.isFinite(n)); }
function parseList(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }

function cleanPage(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    const t = String(v || '').trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

async function save() {
  const d = data.value;
  if (!isEdit.value && !/^[a-z0-9-]{2,60}$/.test(d.slug)) {
    window.alert('Slug inválido — use minúsculas, números e hífen (2–60 caracteres).');
    return;
  }
  if (!d.name.trim()) {
    window.alert('Informe o nome do formulário.');
    return;
  }
  const payload = {
    name: d.name.trim(),
    active: d.active,
    midia_slug: d.midia_slug.trim() || null,
    cv_origem: d.cv_origem,
    bound_empreendimentos: parseIds(d.bound_empreendimentos_str),
    tags: parseList(d.tags_str),
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
  let result;
  if (isEdit.value) {
    result = await store.update(props.form.id, payload);
  } else {
    result = await store.create({ slug: d.slug.trim().toLowerCase(), ...payload });
  }
  if (result) {
    window.alert('Formulário salvo.');
    emit('saved', result);
  }
}

// ── URLs e snippet (só fazem sentido na edição) ─────────────────────────────
const submitUrl = computed(() => isEdit.value
  ? `${API_URL}/marketing/public/forms/${props.form.slug}/submit`
  : '');

const lpUrl = computed(() => isEdit.value
  ? `${LP_HOST}/${props.form.slug}`
  : '');

const htmlSnippet = computed(() => {
  if (!isEdit.value) return '';
  const url = submitUrl.value;
  // O closing tag de script é montado em duas partes para o parser do Vue SFC
  // não confundir com o fim deste bloco.
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
  <!-- honeypot: invisível; se vier preenchido = bot -->
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
</script>

<template>
  <Modal :open="open" size="xl" :title="isEdit ? `Editar: ${form?.name}` : 'Novo formulário'" @close="close">
    <div class="space-y-5">

      <!-- Geral -->
      <div>
        <h3 class="text-sm font-semibold text-ink mb-2">Geral</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="data.slug" label="Slug (URL)" placeholder="ex: lp-mond-marilia" size="sm"
            :disabled="isEdit" hint="Minúsculas, números e hífen. Imutável após criar." />
          <Input v-model="data.name" label="Nome interno" placeholder="ex: Formulário MOND Marília" size="sm" />
        </div>
        <label class="flex items-center gap-2 text-sm text-ink mt-3">
          <input type="checkbox" v-model="data.active" /> Ativo (aceita submissões)
        </label>
      </div>

      <!-- Vínculo -->
      <div class="rounded-xl border border-line bg-surface-sunken/30 p-4">
        <h3 class="text-sm font-semibold text-ink mb-1">Vínculo (roteamento para o CV)</h3>
        <p class="text-xs text-ink-muted mb-3">Esses campos vão direto no payload do lead pro CV CRM.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="data.midia_slug" label="Mídia (slug)" placeholder="ex: site-mond-marilia" size="sm"
            hint="Vira o campo 'midia' no CV. Use slug estável (minúsculo, sem espaço)." />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1">Origem CV</label>
            <select v-model="data.cv_origem"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              <option v-for="o in CV_ORIGEM_OPTIONS" :key="o.v" :value="o.v">{{ o.label }} ({{ o.v }})</option>
            </select>
          </div>
          <Input v-model="data.bound_empreendimentos_str" label="Empreendimentos (IDs CV, vírgula)" placeholder="ex: 10, 12" size="sm" />
          <Input v-model="data.tags_str" label="Tags (vírgula)" placeholder="ex: feirao, alto-padrao" size="sm" />
        </div>
      </div>

      <!-- Página (LP) -->
      <div class="rounded-xl border border-line bg-surface-sunken/30 p-4">
        <h3 class="text-sm font-semibold text-ink mb-1">Página (landing page hospedada)</h3>
        <p class="text-xs text-ink-muted mb-3">
          Visual da página em <code class="font-mono text-ink">lp.menin.com.br/{{ data.slug || 'slug' }}</code>.
          Tudo opcional — sem nada preenchido vale o visual padrão (fundo escuro, card branco, botão azul).
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="data.page.title" label="Título principal" placeholder="ex: Conheça o MOND" size="sm" />
          <Input v-model="data.page.subtitle" label="Subtítulo" placeholder="ex: Apartamentos 2 e 3 dorms em Marília" size="sm" />
          <Input v-model="data.page.logo_url" label="URL do logo" placeholder="https://..." size="sm" />
          <Input v-model="data.page.background_image_url" label="URL da imagem de fundo" placeholder="https://..." size="sm" />
          <Input v-model="data.page.background_color" label="Cor de fundo (hex)" placeholder="#0f172a" size="sm" />
          <Input v-model="data.page.accent_color" label="Cor do botão (hex)" placeholder="#3b82f6" size="sm" />
          <Input v-model="data.page.cta_button_text" label="Texto do botão" placeholder="Quero saber mais" size="sm" />
          <Input v-model="data.page.success_title" label="Título pós-cadastro" placeholder="Obrigado!" size="sm" />
        </div>
        <div class="mt-3">
          <Input v-model="data.page.success_message" label="Mensagem pós-cadastro"
            placeholder="Recebemos seu contato. Em breve nosso time entra em contato." size="sm" />
        </div>
      </div>

      <!-- Campos do formulário -->
      <div class="rounded-xl border border-line bg-surface-sunken/30 p-4">
        <h3 class="text-sm font-semibold text-ink mb-1">Campos do formulário</h3>
        <p class="text-xs text-ink-muted mb-3">
          Escolha quais campos o formulário pede e quais são obrigatórios. O sistema sempre exige no mínimo
          e-mail OU telefone válido (regra do CV).
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-line">
                <th class="text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle py-1.5">Campo</th>
                <th class="text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 w-16">Pedir</th>
                <th class="text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle py-1.5 w-24">Obrigatório</th>
                <th class="text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle py-1.5">Label personalizado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in data.fields_config" :key="f.key" class="border-b border-line/40 last:border-0">
                <td class="py-1.5 text-ink-muted">{{ f.label_default }}</td>
                <td class="text-center py-1.5"><input type="checkbox" v-model="f.enabled" /></td>
                <td class="text-center py-1.5"><input type="checkbox" v-model="f.required" :disabled="!f.enabled" /></td>
                <td class="py-1.5">
                  <input type="text" v-model="f.label" :placeholder="f.label_default" :disabled="!f.enabled"
                    class="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- LGPD -->
      <div>
        <h3 class="text-sm font-semibold text-ink mb-2">LGPD</h3>
        <label class="flex items-center gap-2 text-sm text-ink mb-3">
          <input type="checkbox" v-model="data.consent_required" /> Exigir aceite no formulário
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="data.consent_text" label="Texto do termo" placeholder="Autorizo o contato..." size="sm" />
          <Input v-model="data.consent_text_version" label="Versão do termo" placeholder="v1" size="sm" />
        </div>
      </div>

      <!-- Outros -->
      <div>
        <h3 class="text-sm font-semibold text-ink mb-2">Outros</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="data.redirect_url" label="URL pós-cadastro (opcional)" placeholder="https://menin.com.br/obrigado" size="sm" />
          <Input v-model="data.allowed_origins_str" label="Domínios autorizados (vírgula, opcional)" placeholder="menin.com.br" size="sm" />
        </div>
      </div>

      <!-- Como usar (só na edição) -->
      <div v-if="isEdit" class="rounded-xl border border-accent/20 bg-accent-soft p-4 space-y-4">
        <h3 class="text-sm font-semibold text-ink">
          <i class="fas fa-rocket mr-1"></i>Como usar este formulário
        </h3>

        <div>
          <div class="text-xs text-ink-muted mb-1">Landing page hospedada (compartilhe esse link):</div>
          <div class="flex items-center gap-2">
            <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ lpUrl }}</code>
            <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(lpUrl, 'URL da LP')">Copiar</Button>
            <a :href="lpUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1 text-xs text-accent hover:underline px-2 py-1.5">
              <i class="fas fa-arrow-up-right-from-square"></i>Abrir
            </a>
          </div>
        </div>

        <div>
          <div class="text-xs text-ink-muted mb-1">URL de submit (para integrar com outros sites):</div>
          <div class="flex items-center gap-2">
            <code class="flex-1 break-all font-mono text-xs bg-surface px-2 py-1.5 rounded border border-line">{{ submitUrl }}</code>
            <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copy(submitUrl, 'URL')">Copiar</Button>
          </div>
        </div>

        <div>
          <div class="text-xs text-ink-muted mb-1">Snippet HTML pra colar em site externo (já reflete os campos configurados):</div>
          <pre class="text-[11px] font-mono bg-surface border border-line rounded p-3 overflow-x-auto max-h-72 whitespace-pre">{{ htmlSnippet }}</pre>
          <div class="mt-2 flex justify-end">
            <Button variant="secondary" size="sm" icon="fas fa-copy" @click="copy(htmlSnippet, 'HTML')">Copiar HTML</Button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" size="sm" @click="close">Cancelar</Button>
      <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
        {{ isEdit ? 'Salvar alterações' : 'Criar formulário' }}
      </Button>
    </template>
  </Modal>
</template>
