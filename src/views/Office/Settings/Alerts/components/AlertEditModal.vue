<script setup>
// Edit modal "rápido" — só ajusta metadados (nome, cron, canais, cooldown, ativo).
// Receita (tool_call) é read-only — pra editar receita, abre o editor inline via Eme.
// Visual: mesma linguagem do ChatAlertEditor (hairline accent, seções numeradas,
// recurrence tabs, weekday picker, channels grid).

import { ref, computed, watch, onMounted } from 'vue';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import { useToast } from 'vue-toastification';

import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({ rule: { type: Object, required: true } });
const emit = defineEmits(['close', 'saved']);

const store = useAlertStore();
const toast = useToast();
const saving = ref(false);

// ─── Form ────────────────────────────────────────────────────────────────────
const form = ref({
  name: props.rule.name || '',
  description: props.rule.description || '',
  recurrence: 'daily',
  hour: 8,
  minute: 0,
  daysOfWeek: [1],
  dayOfMonth: 1,
  cron: props.rule.cron || '0 8 * * *',
  timezone: props.rule.timezone || 'America/Sao_Paulo',
  cooldown_minutes: props.rule.cooldown_minutes ?? 0,
  enabled: props.rule.enabled !== false,
  channels: {
    inapp:    props.rule.channels?.inapp    !== false,
    email:    !!props.rule.channels?.email,
    whatsapp: !!props.rule.channels?.whatsapp,
  },
});

const advancedOpen = ref(false);
const recipeOpen = ref(false);

// ─── Cron logic ──────────────────────────────────────────────────────────────
const WEEKDAYS = [
  { value: 1, short: 'S' }, { value: 2, short: 'T' }, { value: 3, short: 'Q' },
  { value: 4, short: 'Q' }, { value: 5, short: 'S' }, { value: 6, short: 'S' }, { value: 0, short: 'D' },
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

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

function toggleDay(d) {
  const arr = form.value.daysOfWeek;
  form.value.daysOfWeek = arr.includes(d) ? arr.filter(x => x !== d) : [...arr, d];
}

onMounted(() => parseCron(props.rule.cron));

// ─── Save ────────────────────────────────────────────────────────────────────
async function save() {
  if (!form.value.name?.trim()) { toast.error('Dá um nome ao alerta'); return; }
  if (!form.value.cron?.trim()) { toast.error('Configure a recorrência'); return; }

  saving.value = true;
  try {
    await store.update(props.rule.id, {
      name: form.value.name,
      description: form.value.description,
      cron: form.value.cron,
      timezone: form.value.timezone,
      cooldown_minutes: form.value.cooldown_minutes,
      enabled: form.value.enabled,
      channels: form.value.channels,
    });
    toast.success('Alterações salvas');
    emit('saved');
  } catch (e) {
    toast.error(e.message || 'Falha ao salvar');
  } finally { saving.value = false; }
}
</script>

<template>
  <Modal :open="true" @close="emit('close')" size="lg"
    :title="`Editar alerta`" :subtitle="rule.name">

    <div class="editor-shell">
      <!-- ─── 01 · IDENTIDADE ─────────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">01 · identidade</span></div>
        <input v-model="form.name" type="text" placeholder="nome do alerta" class="name-input" />
        <textarea v-model="form.description" rows="1"
          placeholder="descrição (opcional)" class="desc-input"></textarea>
      </section>

      <!-- ─── 02 · QUANDO DISPARAR ────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">02 · quando disparar</span></div>

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

        <div v-if="form.recurrence === 'weekly'" class="weekday-row">
          <button v-for="d in WEEKDAYS" :key="d.value"
            type="button"
            @click="toggleDay(d.value)"
            :class="['weekday-btn', form.daysOfWeek.includes(d.value) && 'weekday-active']">
            {{ d.short }}
          </button>
        </div>

        <div v-if="form.recurrence === 'monthly'" class="time-row">
          <span class="time-label">no dia</span>
          <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" class="num-input" />
          <span class="time-label">de cada mês</span>
        </div>

        <div v-if="form.recurrence === 'custom'" class="cron-input-row">
          <input v-model="form.cron" type="text" placeholder="0 8 * * *" class="cron-input" />
          <span class="cron-hint">min hora dia mês diasem · mín. 20 min entre disparos</span>
        </div>

        <div class="cron-summary">
          <div class="cron-summary-text">
            <i class="far fa-clock"></i>
            <span>{{ cronSummary }}</span>
          </div>
          <code class="cron-summary-code">{{ form.cron }}</code>
        </div>
      </section>

      <!-- ─── 03 · POR ONDE ENVIAR ────────────────────────────────────── -->
      <section class="section">
        <div class="section-divider"><span class="section-label">03 · por onde enviar</span></div>
        <div class="channels-grid">
          <label class="channel-card" :class="form.channels.inapp && 'channel-active'">
            <input v-model="form.channels.inapp" type="checkbox" class="sr-only" />
            <i class="fas fa-bell"></i>
            <div>
              <p class="channel-name">sino</p>
              <p class="channel-desc">no painel</p>
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

      <!-- ─── 04 · AVANÇADO (collapsible) ─────────────────────────────── -->
      <section class="section">
        <button @click="advancedOpen = !advancedOpen" type="button" class="advanced-toggle">
          <div class="section-divider flex-1">
            <span class="section-label">04 · avançado</span>
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

      <!-- ─── Receita (read-only) ─────────────────────────────────────── -->
      <section v-if="rule.tool_call" class="recipe">
        <button @click="recipeOpen = !recipeOpen" type="button" class="recipe-toggle">
          <span class="recipe-label">receita</span>
          <code class="recipe-tool">{{ rule.tool_call.tool }}</code>
          <span class="recipe-args-count">
            {{ Object.keys(rule.tool_call.args || {}).length }} filtros
          </span>
          <i :class="['fas fa-chevron-down chev', recipeOpen && 'chev-open']"></i>
        </button>
        <pre v-if="recipeOpen" class="recipe-args">{{ JSON.stringify(rule.tool_call.args || {}, null, 2) }}</pre>
        <p class="recipe-hint">
          <i class="fas fa-circle-info"></i>
          a receita só é editável criando um novo alerta via Eme.
        </p>
      </section>
    </div>

    <template #footer>
      <button @click="emit('close')" class="btn-ghost">cancelar</button>
      <button @click="save" :disabled="saving" class="btn-primary">
        <Spinner v-if="saving" size="xs" />
        <template v-else>
          salvar alterações
          <i class="fas fa-check ml-1"></i>
        </template>
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.editor-shell {
  position: relative;
  padding-left: 4px;
}
.editor-shell::before {
  content: '';
  position: absolute;
  left: -8px; top: 4px; bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg,
    rgb(var(--accent)) 0%,
    rgb(var(--accent) / 0.4) 60%,
    rgb(var(--accent) / 0) 100%);
}

/* ═══════════ SECTIONS ═══════════ */
.section { padding: 0 0 18px; }
.section + .section { padding-top: 4px; }
.section-divider {
  position: relative;
  display: flex; align-items: center;
  margin-bottom: 12px;
}
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgb(var(--line)) 0%, rgb(var(--line) / 0.3) 100%);
  margin-left: 12px;
}
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-subtle));
  white-space: nowrap;
}

/* ═══════════ IDENTIDADE ═══════════ */
.name-input {
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink));
  background: transparent;
  border: none;
  border-bottom: 1px solid rgb(var(--line));
  padding: 4px 0 8px;
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

/* ═══════════ RECURRENCE TABS ═══════════ */
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
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
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
  box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.06), inset 0 0 0 1px rgb(var(--line));
}
.rec-tab-active i { opacity: 1; color: rgb(var(--accent)); }

/* time/num/text inputs */
.time-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
}
.time-label { font-size: 12px; color: rgb(var(--ink-muted)); }
.time-select, .num-input, .text-input {
  height: 34px;
  padding: 0 10px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  font-size: 13px;
  color: rgb(var(--ink));
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  transition: border-color 160ms;
}
.time-select:focus, .num-input:focus, .text-input:focus { border-color: rgb(var(--accent)); }
.time-sep { color: rgb(var(--ink-subtle)); font-weight: 600; }
.num-input { width: 64px; text-align: center; }
.num-wide { width: 80px; }
.text-input { font-family: inherit; flex: 1; }

/* weekday picker */
.weekday-row { display: flex; gap: 6px; margin-bottom: 12px; }
.weekday-btn {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
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

/* cron custom */
.cron-input-row { margin-bottom: 12px; }
.cron-input {
  width: 100%;
  height: 38px;
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

/* cron summary */
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

/* ═══════════ CHANNELS ═══════════ */
.channels-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.channel-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--line));
  border-radius: 8px;
  cursor: pointer;
  transition: all 160ms;
}
.channel-card i {
  font-size: 15px;
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
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--ink));
  margin: 0;
  line-height: 1.2;
}
.channel-desc {
  font-size: 10.5px;
  color: rgb(var(--ink-subtle));
  margin: 2px 0 0 0;
}

/* ═══════════ ADVANCED ═══════════ */
.advanced-toggle {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  background: transparent; border: none; padding: 0; cursor: pointer; color: inherit;
}
.chev {
  font-size: 10px;
  color: rgb(var(--ink-subtle));
  transition: transform 200ms;
}
.chev-open { transform: rotate(180deg); }
.advanced-body { display: flex; flex-direction: column; gap: 12px; padding: 6px 0 0; }
.advanced-row { display: flex; align-items: center; gap: 10px; }
.advanced-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgb(var(--ink-muted));
  min-width: 84px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.advanced-hint { font-size: 11px; color: rgb(var(--ink-subtle)); }
.advanced-toggle-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0;
  cursor: pointer;
}
.advanced-toggle-row span { display: flex; flex-direction: column; gap: 1px; }
.advanced-toggle-row strong {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--ink));
  text-transform: none;
}
.advanced-toggle-row small { font-size: 11px; color: rgb(var(--ink-subtle)); }
.check-input { width: 16px; height: 16px; accent-color: rgb(var(--accent)); cursor: pointer; }

/* ═══════════ RECIPE ═══════════ */
.recipe { padding-top: 4px; }
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
.recipe-hint {
  font-size: 10.5px;
  color: rgb(var(--ink-subtle));
  margin: 8px 0 0;
  display: flex; align-items: center; gap: 5px;
}
.recipe-hint i { font-size: 9px; }

/* ═══════════ FOOTER BUTTONS ═══════════ */
.btn-ghost {
  padding: 8px 14px;
  background: transparent;
  border: 1px solid rgb(var(--line));
  border-radius: 7px;
  font-size: 13px;
  color: rgb(var(--ink-muted));
  cursor: pointer;
  transition: all 160ms;
}
.btn-ghost:hover {
  color: rgb(var(--ink));
  background: rgb(var(--surface));
  border-color: rgb(var(--line-strong));
}
.btn-primary {
  padding: 8px 16px;
  background: rgb(var(--accent));
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 180ms;
  box-shadow:
    0 1px 2px 0 rgb(var(--accent) / 0.3),
    inset 0 1px 0 0 rgb(255 255 255 / 0.15);
  display: flex; align-items: center; gap: 4px;
  letter-spacing: -0.005em;
  min-width: 160px;
  justify-content: center;
}
.btn-primary:hover:not(:disabled) {
  background: rgb(var(--accent-hover));
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px -2px rgb(var(--accent) / 0.4),
    inset 0 1px 0 0 rgb(255 255 255 / 0.2);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
