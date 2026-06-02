<script setup>
// Editor de alerta inline no chat.
// Renderizado quando uma mensagem da Eme tem action.type === 'open_alert_editor'.
// Inspiração visual: ticket de impressão — hairline accent no edge esquerdo,
// seções numeradas, preview como "carbon stub" perfurado.

import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import * as api from '@/utils/Alerts/apiAlerts';
import API_URL from '@/config/apiUrl';

import Spinner from '@/components/UI/Spinner.vue';
import ChatText from './ChatText.vue';

const props = defineProps({
  action: { type: Object, required: true },
});

const router = useRouter();
const toast = useToast();
const store = useAlertStore();

// ─── Estado de ciclo de vida ─────────────────────────────────────────────────
// idle → editing → saving → saved (collapsed) | error
const lifecycle = ref('editing');
const dismissed = ref(false);
const savedRule = ref(null);   // resposta do POST/PUT
const errorMsg = ref('');

// ─── Form ────────────────────────────────────────────────────────────────────
const form = ref({
  name: props.action.name || '',
  description: '',
  tool_call: props.action.toolCall || null,
  title_template: props.action.title_template || '',
  preview_template: props.action.preview_template || '',
  recurrence: 'daily',
  hour: 8,
  minute: 0,
  daysOfWeek: [1],
  dayOfMonth: 1,
  cron: props.action.cron || '0 8 * * *',
  timezone: 'America/Sao_Paulo',
  channels: {
    inapp:    props.action.channels?.inapp    !== false,
    email:    !!props.action.channels?.email,
    whatsapp: !!props.action.channels?.whatsapp,
  },
  cooldown_minutes: 0,
  enabled: true,
});

const advancedOpen = ref(false);
const recipeOpen = ref(false);
const previewLoading = ref(false);
const previewText = ref('');
const ruleLoading = ref(false);

// ─── Cron logic ──────────────────────────────────────────────────────────────
const WEEKDAYS = [
  { value: 1, short: 'S' }, { value: 2, short: 'T' }, { value: 3, short: 'Q' },
  { value: 4, short: 'Q' }, { value: 5, short: 'S' }, { value: 6, short: 'S' }, { value: 0, short: 'D' },
];

function computeCron() {
  const m = String(form.value.minute).padStart(1, '0');
  const h = String(form.value.hour).padStart(1, '0');
  switch (form.value.recurrence) {
    case 'daily':   return `${m} ${h} * * *`;
    case 'weekly':  {
      const days = (form.value.daysOfWeek || []).slice().sort((a,b)=>a-b).join(',') || '*';
      return `${m} ${h} * * ${days}`;
    }
    case 'monthly': return `${m} ${h} ${form.value.dayOfMonth || 1} * *`;
    case 'custom':  return form.value.cron;
  }
  return form.value.cron;
}

function parseCron(cron) {
  if (!cron) return;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) { form.value.recurrence = 'custom'; form.value.cron = cron; return; }
  const [min, hour, dom, mon, dow] = parts;
  if (mon !== '*') { form.value.recurrence = 'custom'; form.value.cron = cron; return; }
  const minN = Number(min), hourN = Number(hour);
  if (Number.isNaN(minN) || Number.isNaN(hourN)) {
    form.value.recurrence = 'custom'; form.value.cron = cron; return;
  }
  form.value.minute = minN; form.value.hour = hourN;
  if (dom === '*' && dow === '*') form.value.recurrence = 'daily';
  else if (dom !== '*' && dow === '*') { form.value.recurrence = 'monthly'; form.value.dayOfMonth = Number(dom); }
  else if (dom === '*' && dow !== '*') {
    form.value.recurrence = 'weekly';
    form.value.daysOfWeek = dow.split(',').map(d => Number(d)).filter(d => d >= 0 && d <= 6);
  } else { form.value.recurrence = 'custom'; form.value.cron = cron; }
}

watch(() => [form.value.recurrence, form.value.hour, form.value.minute, form.value.daysOfWeek, form.value.dayOfMonth], () => {
  if (form.value.recurrence !== 'custom') form.value.cron = computeCron();
}, { deep: true });

const cronSummary = computed(() => {
  const time = `${String(form.value.hour).padStart(2,'0')}:${String(form.value.minute).padStart(2,'0')}`;
  const r = form.value.recurrence;
  if (r === 'daily')   return `todo dia · ${time}`;
  if (r === 'monthly') return `dia ${form.value.dayOfMonth} de cada mês · ${time}`;
  if (r === 'weekly') {
    const names = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const list = (form.value.daysOfWeek || []).slice().sort((a,b)=>a-b).map(d => names[d]);
    if (!list.length) return 'selecione dias';
    return `${list.join(', ')} · ${time}`;
  }
  return form.value.cron;
});

const channelChips = computed(() => [
  form.value.channels.inapp    && 'sino',
  form.value.channels.email    && 'e-mail',
  form.value.channels.whatsapp && 'whatsapp',
].filter(Boolean));

// ─── Carregar dados em mode=edit ─────────────────────────────────────────────
async function loadAlert(id) {
  ruleLoading.value = true;
  try {
    const r = await api.getAlert(id);
    const rule = r?.rule;
    if (!rule) throw new Error('Alerta não encontrado');
    savedRule.value = rule;
    form.value = {
      ...form.value,
      name: rule.name || '',
      description: rule.description || '',
      tool_call: rule.tool_call || null,
      title_template: rule.title_template || '',
      preview_template: rule.preview_template || '',
      timezone: rule.timezone || 'America/Sao_Paulo',
      channels: {
        inapp:    rule.channels?.inapp    !== false,
        email:    !!rule.channels?.email,
        whatsapp: !!rule.channels?.whatsapp,
      },
      cooldown_minutes: rule.cooldown_minutes ?? 0,
      enabled: rule.enabled !== false,
    };
    parseCron(rule.cron);
    if (form.value.tool_call) loadPreview();
  } catch (e) {
    errorMsg.value = e.message || 'Falha ao carregar';
    lifecycle.value = 'error';
  } finally {
    ruleLoading.value = false;
  }
}

// ─── Preview ─────────────────────────────────────────────────────────────────
async function loadPreview() {
  if (!form.value.tool_call?.tool) return;
  previewLoading.value = true;
  try {
    const resp = await fetch(`${API_URL}/alerts/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ tool_call: form.value.tool_call, timezone: form.value.timezone }),
    });
    const data = await resp.json();
    previewText.value = data?.report || '';
  } catch {
    previewText.value = '';
  } finally {
    previewLoading.value = false;
  }
}

// ─── Salvar ──────────────────────────────────────────────────────────────────
async function save() {
  if (!form.value.name?.trim()) { toast.error('Dá um nome ao alerta'); return; }
  if (!form.value.cron?.trim()) { toast.error('Configure a recorrência'); return; }

  lifecycle.value = 'saving';
  errorMsg.value = '';
  try {
    if (props.action.mode === 'edit' && props.action.alertId) {
      const r = await store.update(props.action.alertId, {
        name: form.value.name,
        cron: form.value.cron,
        timezone: form.value.timezone,
        channels: form.value.channels,
        cooldown_minutes: form.value.cooldown_minutes,
        enabled: form.value.enabled,
      });
      savedRule.value = r?.rule || savedRule.value;
    } else {
      if (!form.value.tool_call?.tool) throw new Error('Receita ausente — peça pra Eme refazer.');
      const resp = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: form.value.name,
          description: form.value.description,
          cron: form.value.cron,
          timezone: form.value.timezone,
          tool_call: form.value.tool_call,
          title_template: form.value.title_template || form.value.name,
          preview_template: form.value.preview_template || '{{preview}}',
          channels: form.value.channels,
          cooldown_minutes: form.value.cooldown_minutes,
          enabled: form.value.enabled,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Falha ao criar');
      savedRule.value = data.rule;
      await store.fetch();
    }
    lifecycle.value = 'saved';
  } catch (e) {
    errorMsg.value = e.message || 'Falha ao salvar';
    lifecycle.value = 'error';
  }
}

async function fireNow() {
  if (!props.action.alertId) return;
  try { await store.fire(props.action.alertId); toast.success('Disparo solicitado'); }
  catch (e) { toast.error(e.message || 'Falha ao disparar'); }
}

async function deleteAlert() {
  if (!props.action.alertId) return;
  if (!confirm(`Excluir o alerta "${form.value.name}"?`)) return;
  try {
    await store.remove(props.action.alertId);
    toast.success('Alerta excluído');
    dismissed.value = true;
  } catch (e) {
    toast.error(e.message || 'Falha ao excluir');
  }
}

function goToList() {
  router.push('/settings/alerts');
}

// ─── Init ────────────────────────────────────────────────────────────────────
const isEdit = computed(() => props.action.mode === 'edit');

onMounted(() => {
  if (isEdit.value && props.action.alertId) {
    loadAlert(props.action.alertId);
  } else {
    if (props.action.cron) parseCron(props.action.cron);
    if (form.value.tool_call) loadPreview();
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toggleDay(d) {
  const arr = form.value.daysOfWeek;
  form.value.daysOfWeek = arr.includes(d) ? arr.filter(x => x !== d) : [...arr, d];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
</script>

<template>
  <div v-if="!dismissed" class="alert-editor-card group">
    <!-- ═══ Loading skeleton (modo edit, carregando regra) ═══════════════ -->
    <div v-if="ruleLoading" class="py-10 grid place-items-center">
      <Spinner size="md" />
    </div>

    <!-- ═══ Estado: SAVED (colapsado / confirmação) ════════════════════════ -->
    <div v-else-if="lifecycle === 'saved'" class="saved-state">
      <div class="saved-icon">
        <i class="fas fa-check"></i>
      </div>
      <div class="saved-body">
        <p class="saved-label">{{ isEdit ? 'alterações salvas' : 'alerta criado' }}</p>
        <h4 class="saved-name">{{ savedRule?.name || form.name }}</h4>
        <p class="saved-meta">
          <i class="far fa-clock text-[10px]"></i>
          {{ cronSummary }}
          <span class="dot">·</span>
          <span v-for="(c, i) in channelChips" :key="c">
            {{ i > 0 ? ', ' : '' }}{{ c }}
          </span>
        </p>
      </div>
      <div class="saved-actions">
        <button class="link-btn" @click="goToList">
          ver todos <i class="fas fa-arrow-right ml-1"></i>
        </button>
      </div>
    </div>

    <!-- ═══ Estado: EDITING / ERROR ════════════════════════════════════════ -->
    <template v-else>
      <!-- Header com status -->
      <header class="card-header">
        <div class="flex items-center gap-2">
          <span class="header-glyph">
            <i class="fas fa-bell-concierge"></i>
          </span>
          <div>
            <p class="header-eyebrow">{{ isEdit ? 'editando alerta' : 'Eme preparou um rascunho' }}</p>
            <h3 class="header-title">{{ form.name || 'novo alerta' }}</h3>
          </div>
        </div>
        <span class="status-pill" :class="lifecycle === 'error' ? 'status-error' : 'status-draft'">
          {{ lifecycle === 'error' ? 'erro' : (isEdit ? 'edição' : 'rascunho') }}
        </span>
      </header>

      <!-- Erro banner -->
      <div v-if="lifecycle === 'error' && errorMsg" class="error-banner">
        <i class="fas fa-triangle-exclamation"></i>
        <span class="flex-1">{{ errorMsg }}</span>
        <button @click="lifecycle = 'editing'; errorMsg = ''" class="text-xs underline">tentar de novo</button>
      </div>

      <!-- ─── 01 · IDENTIDADE ─────────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">01 · identidade</span></div>
        <input
          v-model="form.name"
          type="text"
          placeholder="dê um nome curto…"
          class="name-input" />
        <textarea
          v-model="form.description"
          rows="1"
          placeholder="descrição (opcional)"
          class="desc-input"></textarea>
      </section>

      <!-- ─── 02 · QUANDO DISPARAR ────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">02 · quando disparar</span></div>

        <!-- Recurrence tabs (custom inline) -->
        <div class="recurrence-tabs">
          <button v-for="opt in [
            { v: 'daily',   l: 'diário',   i: 'fa-sun' },
            { v: 'weekly',  l: 'semanal',  i: 'fa-calendar-week' },
            { v: 'monthly', l: 'mensal',   i: 'fa-calendar-day' },
            { v: 'custom',  l: 'cron',     i: 'fa-code' },
          ]" :key="opt.v"
            type="button"
            @click="form.recurrence = opt.v"
            :class="['rec-tab', form.recurrence === opt.v && 'rec-tab-active']">
            <i :class="['fas', opt.i]"></i>
            <span>{{ opt.l }}</span>
          </button>
        </div>

        <!-- Hour/minute (todos exceto custom) -->
        <div v-if="form.recurrence !== 'custom'" class="time-row">
          <span class="time-label">às</span>
          <select v-model.number="form.hour" class="time-select">
            <option v-for="h in HOURS" :key="h" :value="h">{{ String(h).padStart(2,'0') }}</option>
          </select>
          <span class="time-sep">:</span>
          <select v-model.number="form.minute" class="time-select">
            <option v-for="m in MINUTES" :key="m" :value="m">{{ String(m).padStart(2,'0') }}</option>
          </select>
        </div>

        <!-- Weekly: day picker -->
        <div v-if="form.recurrence === 'weekly'" class="weekday-row">
          <button v-for="d in WEEKDAYS" :key="d.value"
            type="button"
            @click="toggleDay(d.value)"
            :class="['weekday-btn', form.daysOfWeek.includes(d.value) && 'weekday-active']">
            {{ d.short }}
          </button>
        </div>

        <!-- Monthly: day input -->
        <div v-if="form.recurrence === 'monthly'" class="time-row">
          <span class="time-label">no dia</span>
          <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" class="num-input" />
          <span class="time-label">de cada mês</span>
        </div>

        <!-- Custom: cron expression -->
        <div v-if="form.recurrence === 'custom'" class="cron-input-row">
          <input v-model="form.cron" type="text" placeholder="0 8 * * *" class="cron-input" />
          <span class="cron-hint">min hora dia mês diasem</span>
        </div>

        <!-- Resumo -->
        <div class="cron-summary">
          <div class="cron-summary-text">
            <i class="far fa-clock"></i>
            <span>{{ cronSummary }}</span>
          </div>
          <code class="cron-summary-code">{{ form.cron }}</code>
        </div>
      </section>

      <!-- ─── 03 · POR ONDE ────────────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">03 · por onde enviar</span></div>
        <div class="channels-grid">
          <label class="channel-card" :class="form.channels.inapp && 'channel-active'">
            <input v-model="form.channels.inapp" type="checkbox" class="sr-only" />
            <i class="fas fa-bell"></i>
            <div>
              <p class="channel-name">sino</p>
              <p class="channel-desc">no painel do app</p>
            </div>
          </label>
          <label class="channel-card" :class="form.channels.email && 'channel-active'">
            <input v-model="form.channels.email" type="checkbox" class="sr-only" />
            <i class="fas fa-envelope"></i>
            <div>
              <p class="channel-name">e-mail</p>
              <p class="channel-desc">relatório completo</p>
            </div>
          </label>
          <label class="channel-card" :class="form.channels.whatsapp && 'channel-active'">
            <input v-model="form.channels.whatsapp" type="checkbox" class="sr-only" />
            <i class="fa-brands fa-whatsapp"></i>
            <div>
              <p class="channel-name">whatsapp</p>
              <p class="channel-desc">com SIM/NÃO</p>
            </div>
          </label>
        </div>
      </section>

      <!-- ─── 04 · PREVIEW ─────────────────────────────────────────────── -->
      <section v-if="form.tool_call" class="section">
        <div class="section-divider"><span class="section-label">04 · você vai receber assim</span></div>
        <div class="preview-stub">
          <div class="preview-perfs">
            <span v-for="i in 24" :key="i" class="perf-dot"></span>
          </div>
          <div class="preview-body">
            <div v-if="previewLoading" class="grid place-items-center py-8">
              <Spinner size="sm" />
            </div>
            <ChatText v-else-if="previewText" :content="previewText" />
            <p v-else class="preview-empty">_sem preview disponível_</p>
          </div>
          <button @click="loadPreview" class="preview-refresh" title="atualizar preview">
            <i class="fas fa-rotate"></i>
          </button>
        </div>
        <p class="preview-hint">
          <i class="fas fa-circle-info"></i>
          cada disparo busca o período atual conforme a recorrência.
        </p>
      </section>

      <!-- ─── 05 · AVANÇADO (collapsible) ──────────────────────────────── -->
      <section class="section">
        <button @click="advancedOpen = !advancedOpen" class="advanced-toggle">
          <div class="section-divider flex-1">
            <span class="section-label">05 · avançado</span>
          </div>
          <i :class="['fas fa-chevron-down chev', advancedOpen && 'chev-open']"></i>
        </button>
        <div v-if="advancedOpen" class="advanced-body">
          <div class="advanced-row">
            <label class="advanced-label">cooldown</label>
            <input v-model.number="form.cooldown_minutes" type="number" min="0" max="1440" class="num-input num-wide" />
            <span class="advanced-hint">minutos mínimos entre disparos · 0 = sem limite</span>
          </div>
          <div class="advanced-row">
            <label class="advanced-label">timezone</label>
            <input v-model="form.timezone" type="text" class="text-input" />
          </div>
          <label class="advanced-toggle-row">
            <input v-model="form.enabled" type="checkbox" class="check-input" />
            <span>
              <strong>ativo</strong>
              <small>desativado mantém configuração mas não dispara</small>
            </span>
          </label>
        </div>
      </section>

      <!-- ─── Receita (técnico, colapsado) ─────────────────────────────── -->
      <section v-if="form.tool_call" class="recipe">
        <button @click="recipeOpen = !recipeOpen" class="recipe-toggle">
          <span class="recipe-label">receita</span>
          <code class="recipe-tool">{{ form.tool_call.tool }}</code>
          <span class="recipe-args-count">
            {{ Object.keys(form.tool_call.args || {}).length }} filtros
          </span>
          <i :class="['fas fa-chevron-down chev', recipeOpen && 'chev-open']"></i>
        </button>
        <pre v-if="recipeOpen" class="recipe-args">{{ JSON.stringify(form.tool_call.args || {}, null, 2) }}</pre>
      </section>

      <!-- ─── FOOTER ─────────────────────────────────────────────────────── -->
      <footer class="card-footer">
        <div class="footer-stats">
          <span><i class="far fa-clock"></i> {{ cronSummary }}</span>
          <span v-if="channelChips.length"><i class="fas fa-route"></i> {{ channelChips.join(', ') }}</span>
        </div>
        <div class="footer-actions">
          <button v-if="isEdit" @click="deleteAlert" class="btn-danger">
            <i class="fas fa-trash"></i> excluir
          </button>
          <button v-if="isEdit" @click="fireNow" class="btn-ghost">
            <i class="fas fa-bolt"></i> disparar
          </button>
          <button @click="dismissed = true" class="btn-ghost">
            cancelar
          </button>
          <button @click="save" :disabled="lifecycle === 'saving'" class="btn-primary">
            <Spinner v-if="lifecycle === 'saving'" size="xs" />
            <template v-else>
              {{ isEdit ? 'salvar alterações' : 'criar alerta' }}
              <i class="fas fa-arrow-right ml-1"></i>
            </template>
          </button>
        </div>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* ═════════════════════════════════════════════════════════════════════════
   CARD: hairline accent no edge esquerdo (signature)
   ═════════════════════════════════════════════════════════════════════════ */
.alert-editor-card {
  position: relative;
  margin-top: 0.5rem;
  background: rgb(var(--surface-raised));
  border: 1px solid rgb(var(--line));
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 1px 2px 0 rgb(15 23 42 / 0.04),
    0 4px 16px -8px rgb(15 23 42 / 0.10),
    inset 0 1px 0 0 rgb(255 255 255 / 0.04);
  animation: slide-up 280ms cubic-bezier(0.16, 1, 0.3, 1);
}

.alert-editor-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg,
    rgb(var(--accent)) 0%,
    rgb(var(--accent) / 0.4) 60%,
    rgb(var(--accent) / 0) 100%);
}

/* ═════════════════════════════════════════════════════════════════════════
   HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.875rem 1.25rem 0.875rem 1.5rem;
  border-bottom: 1px solid rgb(var(--line-subtle));
}
.header-glyph {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border-radius: 9px;
  background: rgb(var(--accent-soft));
  color: rgb(var(--accent));
  font-size: 13px;
}
.header-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--ink-subtle));
  margin: 0;
}
.header-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink));
  margin: 1px 0 0 0;
  letter-spacing: -0.005em;
}
.status-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid;
}
.status-draft {
  border-color: rgb(var(--accent) / 0.3);
  color: rgb(var(--accent));
  background: rgb(var(--accent-soft));
}
.status-error {
  border-color: rgb(239 68 68 / 0.4);
  color: rgb(239 68 68);
  background: rgb(239 68 68 / 0.06);
}

/* ═════════════════════════════════════════════════════════════════════════
   ERROR BANNER
   ═════════════════════════════════════════════════════════════════════════ */
.error-banner {
  margin: 12px 16px 0;
  padding: 10px 12px;
  background: rgb(239 68 68 / 0.08);
  border: 1px solid rgb(239 68 68 / 0.2);
  border-radius: 8px;
  color: rgb(220 38 38);
  font-size: 12.5px;
  display: flex; align-items: center; gap: 8px;
}
:global(.dark) .error-banner { color: rgb(252 165 165); }

/* ═════════════════════════════════════════════════════════════════════════
   SECTIONS
   ═════════════════════════════════════════════════════════════════════════ */
.section {
  padding: 14px 20px 0 24px;
}
.section-divider {
  position: relative;
  display: flex; align-items: center;
  margin-bottom: 10px;
}
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
    rgb(var(--line)) 0%,
    rgb(var(--line) / 0.3) 100%);
  margin-left: 12px;
}
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-subtle));
  white-space: nowrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   IDENTIDADE
   ═════════════════════════════════════════════════════════════════════════ */
.name-input {
  width: 100%;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--ink));
  background: transparent;
  border: none;
  border-bottom: 1px solid rgb(var(--line));
  padding: 4px 0 6px;
  outline: none;
  transition: border-color 160ms;
  letter-spacing: -0.005em;
}
.name-input:focus { border-bottom-color: rgb(var(--accent)); }
.name-input::placeholder { color: rgb(var(--ink-subtle)); font-weight: 400; }

.desc-input {
  width: 100%;
  font-size: 12.5px;
  color: rgb(var(--ink-muted));
  background: transparent;
  border: none;
  padding: 8px 0 0;
  outline: none;
  resize: none;
  font-family: inherit;
}
.desc-input::placeholder { color: rgb(var(--ink-subtle)); }

/* ═════════════════════════════════════════════════════════════════════════
   RECURRENCE TABS
   ═════════════════════════════════════════════════════════════════════════ */
.recurrence-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  background: rgb(var(--surface-sunken) / 0.6);
  border-radius: 8px;
  margin-bottom: 12px;
}
.rec-tab {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 7px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: rgb(var(--ink-muted));
  cursor: pointer;
  transition: all 160ms;
}
.rec-tab i { font-size: 11px; opacity: 0.7; }
.rec-tab:hover { color: rgb(var(--ink)); }
.rec-tab-active {
  background: rgb(var(--surface-raised));
  color: rgb(var(--ink));
  font-weight: 500;
  box-shadow:
    0 1px 2px 0 rgb(15 23 42 / 0.06),
    inset 0 0 0 1px rgb(var(--line));
}
.rec-tab-active i { opacity: 1; color: rgb(var(--accent)); }

/* TIME PICKER */
.time-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
}
.time-label {
  font-size: 12px;
  color: rgb(var(--ink-muted));
}
.time-select, .num-input, .text-input {
  height: 32px;
  padding: 0 8px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  font-size: 12.5px;
  color: rgb(var(--ink));
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  transition: border-color 160ms;
}
.time-select:focus, .num-input:focus, .text-input:focus {
  border-color: rgb(var(--accent));
}
.time-sep { color: rgb(var(--ink-subtle)); font-weight: 600; }
.num-input { width: 64px; text-align: center; }
.num-wide { width: 80px; }
.text-input { font-family: inherit; flex: 1; }

/* WEEKDAYS */
.weekday-row {
  display: flex; gap: 6px;
  margin-bottom: 12px;
}
.weekday-btn {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgb(var(--ink-muted));
  cursor: pointer;
  transition: all 160ms;
}
.weekday-btn:hover { border-color: rgb(var(--accent) / 0.5); }
.weekday-active {
  background: rgb(var(--accent));
  border-color: rgb(var(--accent));
  color: white;
  font-weight: 600;
}

/* CRON CUSTOM */
.cron-input-row { margin-bottom: 12px; }
.cron-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: rgb(var(--ink));
  outline: none;
}
.cron-input:focus { border-color: rgb(var(--accent)); }
.cron-hint {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgb(var(--ink-subtle));
  margin-top: 4px;
  letter-spacing: 0.04em;
}

/* CRON SUMMARY */
.cron-summary {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px;
  background: rgb(var(--surface-sunken) / 0.5);
  border: 1px dashed rgb(var(--line));
  border-radius: 8px;
}
.cron-summary-text {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px;
  color: rgb(var(--ink));
}
.cron-summary-text i { color: rgb(var(--accent)); font-size: 10px; }
.cron-summary-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgb(var(--ink-subtle));
  padding: 2px 6px;
  background: rgb(var(--surface));
  border-radius: 4px;
}

/* ═════════════════════════════════════════════════════════════════════════
   CHANNELS (3 cards lado a lado)
   ═════════════════════════════════════════════════════════════════════════ */
.channels-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.channel-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 8px;
  cursor: pointer;
  transition: all 160ms;
}
.channel-card i {
  font-size: 14px;
  color: rgb(var(--ink-subtle));
  transition: color 160ms;
}
.channel-card:hover { border-color: rgb(var(--accent) / 0.4); }
.channel-active {
  background: rgb(var(--accent-soft));
  border-color: rgb(var(--accent) / 0.5);
  box-shadow: inset 0 0 0 1px rgb(var(--accent) / 0.2);
}
.channel-active i { color: rgb(var(--accent)); }
.channel-name {
  font-size: 12.5px;
  font-weight: 600;
  color: rgb(var(--ink));
  margin: 0;
  line-height: 1.2;
}
.channel-desc {
  font-size: 10.5px;
  color: rgb(var(--ink-subtle));
  margin: 1px 0 0 0;
}

/* ═════════════════════════════════════════════════════════════════════════
   PREVIEW STUB ("carbon copy" perfurado)
   ═════════════════════════════════════════════════════════════════════════ */
.preview-stub {
  position: relative;
  background:
    linear-gradient(180deg,
      rgb(var(--accent-soft) / 0.4) 0%,
      rgb(var(--surface-sunken) / 0.3) 100%);
  border: 1px solid rgb(var(--line));
  border-radius: 10px;
  overflow: hidden;
}
.preview-perfs {
  display: flex; justify-content: space-around;
  padding: 6px 12px;
  background: rgb(var(--surface));
  border-bottom: 1px dashed rgb(var(--line));
}
.perf-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgb(var(--line-strong));
  opacity: 0.4;
}
.preview-body {
  padding: 14px 16px;
  font-size: 12.5px;
  max-height: 320px;
  overflow-y: auto;
}
.preview-body :deep(p) { margin: 0 0 6px; }
.preview-body :deep(ul) { margin: 4px 0; padding-left: 18px; }
.preview-body :deep(strong) { color: rgb(var(--ink)); font-weight: 600; }
.preview-empty {
  color: rgb(var(--ink-subtle));
  font-style: italic;
  text-align: center;
  padding: 20px 0;
  margin: 0;
}
.preview-refresh {
  position: absolute;
  top: 8px; right: 8px;
  width: 24px; height: 24px;
  display: grid; place-items: center;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 5px;
  color: rgb(var(--ink-muted));
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: all 160ms;
}
.preview-stub:hover .preview-refresh { opacity: 1; }
.preview-refresh:hover {
  color: rgb(var(--accent));
  border-color: rgb(var(--accent) / 0.4);
}
.preview-hint {
  font-size: 10.5px;
  color: rgb(var(--ink-subtle));
  margin: 6px 0 0;
  display: flex; align-items: center; gap: 5px;
}
.preview-hint i { font-size: 9px; }

/* ═════════════════════════════════════════════════════════════════════════
   ADVANCED (collapsible)
   ═════════════════════════════════════════════════════════════════════════ */
.advanced-toggle {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
}
.chev {
  font-size: 10px;
  color: rgb(var(--ink-subtle));
  transition: transform 200ms;
}
.chev-open { transform: rotate(180deg); }

.advanced-body {
  display: flex; flex-direction: column; gap: 10px;
  padding: 4px 0 0;
}
.advanced-row { display: flex; align-items: center; gap: 10px; }
.advanced-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgb(var(--ink-muted));
  min-width: 80px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.advanced-hint {
  font-size: 11px;
  color: rgb(var(--ink-subtle));
}
.advanced-toggle-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0;
  cursor: pointer;
}
.advanced-toggle-row span { display: flex; flex-direction: column; gap: 1px; }
.advanced-toggle-row strong {
  font-size: 12.5px;
  font-weight: 500;
  color: rgb(var(--ink));
  text-transform: none;
}
.advanced-toggle-row small {
  font-size: 10.5px;
  color: rgb(var(--ink-subtle));
}
.check-input {
  width: 16px; height: 16px;
  accent-color: rgb(var(--accent));
  cursor: pointer;
}

/* ═════════════════════════════════════════════════════════════════════════
   RECIPE
   ═════════════════════════════════════════════════════════════════════════ */
.recipe {
  padding: 12px 20px 0 24px;
}
.recipe-toggle {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  background: rgb(var(--surface-sunken) / 0.4);
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}
.recipe-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-subtle));
}
.recipe-tool {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: rgb(var(--accent));
  background: rgb(var(--accent-soft));
  padding: 1px 6px;
  border-radius: 3px;
}
.recipe-args-count {
  font-size: 11px;
  color: rgb(var(--ink-muted));
  margin-left: auto;
}
.recipe-args {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: rgb(var(--ink-muted));
  background: rgb(var(--surface-sunken));
  padding: 10px 12px;
  border-radius: 0 0 6px 6px;
  border: 1px solid rgb(var(--line));
  border-top: none;
  margin: -1px 0 0 0;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   FOOTER
   ═════════════════════════════════════════════════════════════════════════ */
.card-footer {
  margin-top: 16px;
  padding: 12px 20px 14px 24px;
  background: rgb(var(--surface-sunken) / 0.4);
  border-top: 1px solid rgb(var(--line-subtle));
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap;
}
.footer-stats {
  display: flex; gap: 14px;
  font-size: 11px;
  color: rgb(var(--ink-subtle));
}
.footer-stats span { display: flex; align-items: center; gap: 5px; }
.footer-stats i { font-size: 9px; }
.footer-actions {
  display: flex; gap: 6px; align-items: center;
}

.btn-ghost {
  padding: 7px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  color: rgb(var(--ink-muted));
  cursor: pointer;
  transition: all 160ms;
}
.btn-ghost:hover {
  color: rgb(var(--ink));
  background: rgb(var(--surface));
  border-color: rgb(var(--line));
}
.btn-ghost i { margin-right: 4px; font-size: 10px; }

.btn-danger {
  padding: 7px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  color: rgb(220 38 38 / 0.8);
  cursor: pointer;
  transition: all 160ms;
}
.btn-danger:hover {
  color: rgb(220 38 38);
  background: rgb(239 68 68 / 0.08);
}
.btn-danger i { margin-right: 4px; font-size: 10px; }

.btn-primary {
  padding: 8px 16px;
  background: rgb(var(--accent));
  border: none;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 180ms;
  box-shadow:
    0 1px 2px 0 rgb(var(--accent) / 0.3),
    inset 0 1px 0 0 rgb(255 255 255 / 0.15);
  display: flex; align-items: center; gap: 4px;
  letter-spacing: -0.005em;
}
.btn-primary:hover:not(:disabled) {
  background: rgb(var(--accent-hover));
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px -2px rgb(var(--accent) / 0.4),
    inset 0 1px 0 0 rgb(255 255 255 / 0.2);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ═════════════════════════════════════════════════════════════════════════
   SAVED STATE (colapsado)
   ═════════════════════════════════════════════════════════════════════════ */
.saved-state {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px 16px 24px;
  animation: scale-in 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
.saved-icon {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  background: linear-gradient(135deg,
    rgb(34 197 94) 0%,
    rgb(22 163 74) 100%);
  border-radius: 50%;
  color: white;
  font-size: 13px;
  box-shadow:
    0 2px 8px -2px rgb(34 197 94 / 0.4),
    inset 0 1px 0 0 rgb(255 255 255 / 0.3);
  flex-shrink: 0;
}
.saved-body { flex: 1; min-width: 0; }
.saved-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(34 197 94);
  margin: 0;
}
.saved-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink));
  margin: 1px 0 2px;
  letter-spacing: -0.005em;
}
.saved-meta {
  font-size: 11.5px;
  color: rgb(var(--ink-muted));
  margin: 0;
  display: flex; align-items: center; gap: 5px;
  flex-wrap: wrap;
}
.saved-meta .dot { color: rgb(var(--ink-subtle)); margin: 0 2px; }
.saved-actions { flex-shrink: 0; }
.link-btn {
  font-size: 11.5px;
  color: rgb(var(--accent));
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 5px;
  transition: background 160ms;
}
.link-btn:hover { background: rgb(var(--accent-soft)); }

/* ═════════════════════════════════════════════════════════════════════════
   Last section (cardápio extra de padding bottom para a borda do card)
   ═════════════════════════════════════════════════════════════════════════ */
.section:last-of-type { padding-bottom: 4px; }

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
