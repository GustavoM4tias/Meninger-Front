<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import * as api from '@/utils/OfficeAI/apiOfficeBrain'
import { getFeedback } from '@/utils/OfficeAI/apiOfficeChat'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

import PageContainer from '@/components/UI/PageContainer.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import Surface from '@/components/UI/Surface.vue'
import Button from '@/components/UI/Button.vue'
import IconButton from '@/components/UI/IconButton.vue'
import Badge from '@/components/UI/Badge.vue'
import Switch from '@/components/UI/Switch.vue'
import Input from '@/components/UI/Input.vue'
import Select from '@/components/UI/Select.vue'
import SegmentedControl from '@/components/UI/SegmentedControl.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import Modal from '@/components/UI/Modal.vue'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

// Classe reutilizável para textareas (alinha com o look dos campos do design system)
const TA = 'w-full rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring/30 focus:border-accent/40 transition resize-y'
const TA_MONO = TA + ' font-mono text-[12.5px] leading-relaxed'
const LABEL = 'block text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5'

const tab = ref('blocks')
const loading = ref(true)
const busy = ref(false)
const toast = reactive({ text: '', type: 'ok' })

const active = ref(null)
const publishLabel = ref('')
const blocks = ref([])
const glossary = ref([])
const reports = ref([])
const versions = ref([])
const identity = reactive({ name: '', role: '', tone: '', language: 'pt-BR' })
const behavior = reactive({ fast: '', smart: '', keywords: '', storage_mb: 20, rate_per_min: 15, rate_per_hour: 200 })

const blockSearch = ref('')
const edit = reactive({ key: null, content: '' })
const editReport = ref(null)
const newTerm = reactive({ kind: 'vocabulary', term: '', canonical: '' })
const glossaryFilter = ref('all')
const sbox = reactive({ role: 'admin', city: '', message: '', prompt: '', answer: '', note: '' })

// Insights (feedbacks dos usuários)
const fb = reactive({ loading: false, items: [], stats: { up: 0, down: 0, total: 0 }, total: 0, page: 1, filter: '', loaded: false })
const detail = reactive({ open: false, item: null })

const tabOptions = computed(() => [
  { value: 'identity', label: 'Identidade', icon: 'fas fa-id-badge' },
  { value: 'blocks', label: 'Políticas', icon: 'fas fa-scroll', count: blocks.value.length },
  { value: 'glossary', label: 'Glossário', icon: 'fas fa-book', count: glossary.value.length },
  { value: 'behavior', label: 'Comportamento', icon: 'fas fa-sliders-h' },
  { value: 'reports', label: 'Relatórios', icon: 'fas fa-table', count: reports.value.length },
  { value: 'insights', label: 'Insights', icon: 'fas fa-comments' },
  { value: 'versions', label: 'Versões', icon: 'fas fa-code-branch', count: versions.value.length },
  { value: 'sandbox', label: 'Sandbox', icon: 'fas fa-flask' },
])

const kindOptions = [
  { value: 'voice_stt', label: 'Voz (STT)' },
  { value: 'vocabulary', label: 'Vocabulário' },
  { value: 'forbidden', label: 'Proibida' },
]
const glossaryFilterOptions = computed(() => [
  { value: 'all', label: 'Todos', count: glossary.value.length },
  { value: 'voice_stt', label: 'Voz', count: glossary.value.filter(g => g.kind === 'voice_stt').length },
  { value: 'vocabulary', label: 'Vocab', count: glossary.value.filter(g => g.kind === 'vocabulary').length },
  { value: 'forbidden', label: 'Proibidas', count: glossary.value.filter(g => g.kind === 'forbidden').length },
])
const roleOptions = [
  { value: 'admin', label: 'Admin (acesso total)' },
  { value: 'user', label: 'Usuário (restrito à cidade)' },
]

const filteredBlocks = computed(() => {
  const q = blockSearch.value.trim().toLowerCase()
  if (!q) return blocks.value
  return blocks.value.filter(b => (b.title || '').toLowerCase().includes(q) || (b.content || '').toLowerCase().includes(q))
})
const filteredGlossary = computed(() => glossaryFilter.value === 'all' ? glossary.value : glossary.value.filter(g => g.kind === glossaryFilter.value))

const positiveRate = computed(() => fb.stats.total ? Math.round((fb.stats.up / fb.stats.total) * 100) : 0)
const fbPages = computed(() => Math.ceil(fb.total / 30) || 1)
const fbFilterOptions = computed(() => [
  { value: '', label: 'Todos', count: fb.stats.total },
  { value: 'up', label: 'Positivos', icon: 'fas fa-thumbs-up', count: fb.stats.up },
  { value: 'down', label: 'Negativos', icon: 'fas fa-thumbs-down', count: fb.stats.down },
])

function notify(text, type = 'ok') {
  toast.text = text; toast.type = type
  setTimeout(() => { if (toast.text === text) toast.text = '' }, 3200)
}
const fmt = (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : ''
const fromNow = (d) => dayjs(d).fromNow()
const catVariant = (c) => ({ policy: 'danger', module_rule: 'success', behavior: 'warning', voice: 'accent', access: 'info', identity: 'accent' }[c] || 'neutral')
const kindVariant = (k) => ({ voice_stt: 'accent', vocabulary: 'info', forbidden: 'danger' }[k] || 'neutral')
const kindLabel = (k) => ({ voice_stt: 'voz', vocabulary: 'vocab', forbidden: 'proibida' }[k] || k)

async function load() {
  loading.value = true
  try {
    const { active: act, draft } = await api.getBrain()
    active.value = act
    blocks.value = draft.blocks || []
    glossary.value = draft.glossary || []
    reports.value = draft.reports || []
    const s = draft.settings || {}
    const id = s.identity || {}
    Object.assign(identity, { name: id.name || 'Eme', role: id.role || '', tone: id.tone || '', language: id.language || 'pt-BR' })
    const mp = s.model_pools || {}
    Object.assign(behavior, {
      fast: (mp.fast || []).join(', '),
      smart: (mp.smart || []).join(', '),
      keywords: (s.escalation_keywords || []).join('\n'),
      storage_mb: s.limits?.storage_mb ?? 20,
      rate_per_min: s.limits?.rate_per_min ?? 15,
      rate_per_hour: s.limits?.rate_per_hour ?? 200,
    })
    const { versions: vs } = await api.getVersions()
    versions.value = vs || []
  } catch (e) {
    notify(e.message || 'Erro ao carregar.', 'err')
  } finally {
    loading.value = false
  }
}

// ── Identidade ──
async function saveIdentity() {
  busy.value = true
  try { await api.saveSetting('identity', { ...identity }); notify('Identidade salva no rascunho.') }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}

// ── Comportamento ──
const toList = (s, sep) => String(s || '').split(sep).map(x => x.trim()).filter(Boolean)
async function saveBehavior() {
  busy.value = true
  try {
    await api.saveSetting('model_pools', { fast: toList(behavior.fast, ','), smart: toList(behavior.smart, ',') })
    await api.saveSetting('escalation_keywords', toList(behavior.keywords, '\n'))
    await api.saveSetting('limits', {
      storage_mb: Number(behavior.storage_mb) || 20,
      rate_per_min: Number(behavior.rate_per_min) || 15,
      rate_per_hour: Number(behavior.rate_per_hour) || 200,
    })
    notify('Comportamento salvo no rascunho.')
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}

// ── Blocos ──
function openEdit(b) { if (edit.key === b.key) { edit.key = null; return } edit.key = b.key; edit.content = b.content || '' }
async function saveBlock(b) {
  busy.value = true
  try { await api.updateBlock(b.id, { content: edit.content }); b.content = edit.content; notify('Bloco salvo no rascunho.'); edit.key = null }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function toggleBlock(b, enabled) {
  const prev = b.enabled; b.enabled = enabled
  try { await api.updateBlock(b.id, { enabled }) }
  catch (e) { notify(e.message, 'err'); b.enabled = prev }
}

// ── Glossário ──
async function addTerm() {
  if (!newTerm.term.trim()) return
  busy.value = true
  try {
    const { term } = await api.createTerm({ ...newTerm })
    glossary.value.push(term)
    newTerm.term = ''; newTerm.canonical = ''
    notify('Termo adicionado.')
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function updateCanonical(g, ev) {
  const canonical = ev.target.value
  try { await api.updateTerm(g.id, { canonical }); g.canonical = canonical }
  catch (e) { notify(e.message, 'err') }
}
async function toggleTerm(g, enabled) {
  const prev = g.enabled; g.enabled = enabled
  try { await api.updateTerm(g.id, { enabled }) }
  catch (e) { notify(e.message, 'err'); g.enabled = prev }
}
async function removeTerm(g) {
  if (!confirm(`Excluir o termo "${g.term}"?`)) return
  try { await api.deleteTerm(g.id); glossary.value = glossary.value.filter(x => x.id !== g.id) }
  catch (e) { notify(e.message, 'err') }
}

// ── Relatórios (tools) ──
function openReport(r) { editReport.value = editReport.value === r.name ? null : r.name }
async function saveReport(r) {
  busy.value = true
  try { await api.updateReport(r.id, { description: r.description, promptRules: r.promptRules }); notify('Relatório salvo no rascunho.'); editReport.value = null }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function toggleReport(r, enabled) {
  const prev = r.enabled; r.enabled = enabled
  try { await api.updateReport(r.id, { enabled }) }
  catch (e) { notify(e.message, 'err'); r.enabled = prev }
}

// ── Versões ──
async function doPublish() {
  busy.value = true
  try { await api.publish(publishLabel.value || null); publishLabel.value = ''; notify('Rascunho publicado e ativado.'); await load() }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function doRollback(v) {
  if (!confirm(`Reativar a versão "${v.label}"?`)) return
  busy.value = true
  try { await api.rollback(v.id); notify('Versão reativada.'); await load() }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function doDeactivate() {
  if (!confirm('Desativar o cérebro e voltar ao comportamento padrão (fallback)?')) return
  busy.value = true
  try { await api.deactivate(); notify('Desativado — fallback no ar.'); await load() }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}

// ── Sandbox ──
async function doPreview() {
  busy.value = true; sbox.answer = ''
  try {
    const r = await api.sandboxPreview(sbox.role, sbox.city)
    sbox.prompt = r.systemPrompt
    sbox.note = `${r.char_count} caracteres · ${r.blocks_used} blocos · ${r.simulated.enterprises} empreendimentos`
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function doSandboxChat() {
  if (!sbox.message.trim()) return
  busy.value = true; sbox.answer = ''
  try { const r = await api.sandboxChat(sbox.message, sbox.role, sbox.city); sbox.answer = r.text; sbox.note = r.note || '' }
  catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}

// ── Insights ──
async function loadFeedback() {
  fb.loading = true
  try {
    const data = await getFeedback({ page: fb.page, per_page: 30, rating: fb.filter || undefined })
    fb.items = data.feedback; fb.stats = data.stats; fb.total = data.total; fb.loaded = true
  } catch (e) { notify(e.message || 'Erro ao carregar feedbacks.', 'err') } finally { fb.loading = false }
}
function setFbFilter(v) { fb.filter = v; fb.page = 1; loadFeedback() }
function fbGo(p) { if (p < 1 || p > fbPages.value) return; fb.page = p; loadFeedback() }
function openDetail(item) { detail.item = item; detail.open = true }
function truncate(text, n = 120) {
  if (!text) return '—'
  try { const p = JSON.parse(text); text = p.text || text } catch { /* */ }
  return text.length > n ? text.slice(0, n) + '…' : text
}
const formatLatency = (ms) => ms == null ? '—' : (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`)
const poolLabel = (p) => p === 'smart' ? 'Smart (Pro)' : p === 'fast' ? 'Fast (Flash)' : (p || '—')
const poolVariant = (p) => p === 'smart' ? 'accent' : p === 'fast' ? 'info' : 'neutral'

watch(tab, (t) => { if (t === 'insights' && !fb.loaded) loadFeedback() })
onMounted(load)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader title="Cérebro da Eme" subtitle="Configure regras, comportamento, glossário e relatórios — sem código." icon="fas fa-brain">
        <template #actions>
          <Badge :variant="active ? 'success' : 'warning'" dot>{{ active ? 'No ar' : 'Fallback' }}</Badge>
          <IconButton icon="fas fa-rotate" size="md" label="Atualizar" :class="{ 'animate-spin': loading }" @click="load" />
          <Button variant="primary" size="sm" icon="fas fa-rocket" :loading="busy" @click="doPublish">Publicar</Button>
        </template>
      </PageHeader>

      <!-- Status -->
      <Surface :variant="active ? 'raised' : 'flat'" padding="sm" class="mb-4"
        :class="active ? 'border-emerald-500/30' : 'border-amber-500/30'">
        <div class="flex items-center gap-3 text-sm">
          <i :class="active ? 'fas fa-circle text-emerald-500' : 'fas fa-circle text-amber-500'" class="text-[8px]"></i>
          <span v-if="active" class="text-ink">No ar: <strong>{{ active.label }}</strong>
            <span class="text-ink-subtle font-mono text-xs ml-1">por {{ active.published_by || '—' }}</span>
          </span>
          <span v-else class="text-ink-muted">Nenhuma versão publicada — a Eme usa o comportamento padrão. Edite à vontade e publique quando quiser.</span>
          <Button v-if="active" variant="ghost" size="sm" class="ml-auto" @click="doDeactivate">Desativar</Button>
        </div>
      </Surface>

      <!-- Tabs -->
      <div class="mb-5">
        <SegmentedControl :model-value="tab" :options="tabOptions" size="md" @change="(v) => tab = v" />
      </div>

      <!-- IDENTIDADE -->
      <Surface v-show="tab === 'identity'" variant="raised" padding="md">
        <h2 class="text-base font-semibold text-ink mb-1">Identidade & Persona</h2>
        <p class="text-xs text-ink-muted mb-4">Guardado em <code class="font-mono text-accent">settings.identity</code>.</p>
        <div class="grid sm:grid-cols-2 gap-4">
          <Input v-model="identity.name" label="Nome" />
          <Input v-model="identity.language" label="Idioma" />
          <div class="sm:col-span-2"><Input v-model="identity.role" label="Papel" /></div>
          <div class="sm:col-span-2"><Input v-model="identity.tone" label="Tom" /></div>
        </div>
        <div class="mt-5"><Button variant="primary" :loading="busy" icon="fas fa-save" @click="saveIdentity">Salvar identidade</Button></div>
      </Surface>

      <!-- POLÍTICAS & REGRAS -->
      <section v-show="tab === 'blocks'">
        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p class="text-xs text-ink-muted">Cada bloco é uma peça do system prompt. <i class="fas fa-lock text-[10px]"></i> = núcleo (não deletável); <i class="fas fa-bolt text-[10px]"></i> = dinâmico (injetado por código).</p>
          <div class="w-56"><Input v-model="blockSearch" size="sm" placeholder="Buscar bloco…" icon-left="fas fa-search" /></div>
        </div>
        <div class="space-y-2.5">
          <Surface v-for="b in filteredBlocks" :key="b.key" variant="raised" padding="sm" :class="!b.enabled ? 'opacity-60' : ''">
            <div class="flex items-center gap-3">
              <Badge :variant="catVariant(b.category)" size="sm">{{ b.category }}</Badge>
              <span class="text-sm font-medium text-ink truncate">{{ b.title }}</span>
              <i v-if="b.isDynamic" class="fas fa-bolt text-amber-500 text-xs" title="Dinâmico"></i>
              <i v-else-if="b.locked" class="fas fa-lock text-ink-subtle text-xs" title="Núcleo"></i>
              <div class="ml-auto flex items-center gap-2">
                <Switch :model-value="b.enabled" :disabled="b.isDynamic" size="sm" @change="(v) => toggleBlock(b, v)" />
                <Button v-if="!b.isDynamic" variant="ghost" size="sm" @click="openEdit(b)">{{ edit.key === b.key ? 'Fechar' : 'Editar' }}</Button>
              </div>
            </div>
            <div v-if="edit.key === b.key" class="mt-3">
              <textarea v-model="edit.content" :class="TA_MONO" rows="12"></textarea>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-ink-subtle font-mono">{{ edit.content.length }} caracteres</span>
                <Button variant="primary" size="sm" :loading="busy" @click="saveBlock(b)">Salvar bloco</Button>
              </div>
            </div>
          </Surface>
          <EmptyState v-if="!filteredBlocks.length" size="md" icon="fas fa-scroll" title="Nenhum bloco" description="Ajuste a busca ou rode o seed do cérebro." />
        </div>
      </section>

      <!-- GLOSSÁRIO -->
      <section v-show="tab === 'glossary'">
        <p class="text-xs text-ink-muted mb-3">Jargão de voz, vocabulário e palavras proibidas. Ex.: "líderes" → leads; "banco" → use "CCA".</p>
        <Surface variant="raised" padding="sm" class="mb-4">
          <div class="flex items-end gap-2 flex-wrap">
            <div class="w-40"><label :class="LABEL">Tipo</label><Select :model-value="newTerm.kind" :options="kindOptions" size="sm" @change="(v) => newTerm.kind = v" /></div>
            <div class="flex-1 min-w-[140px]"><label :class="LABEL">Termo de entrada</label><Input v-model="newTerm.term" size="sm" placeholder="líderes" /></div>
            <div class="flex-1 min-w-[140px]"><label :class="LABEL">Correto / alternativa</label><Input v-model="newTerm.canonical" size="sm" placeholder="leads" /></div>
            <Button variant="primary" size="sm" icon="fas fa-plus" :loading="busy" :disabled="!newTerm.term" @click="addTerm">Adicionar</Button>
          </div>
        </Surface>

        <div class="mb-3"><SegmentedControl :model-value="glossaryFilter" :options="glossaryFilterOptions" size="sm" @change="(v) => glossaryFilter = v" /></div>

        <div class="space-y-2">
          <Surface v-for="g in filteredGlossary" :key="g.id" variant="raised" padding="sm" :class="!g.enabled ? 'opacity-60' : ''">
            <div class="flex items-center gap-3">
              <Badge :variant="kindVariant(g.kind)" size="sm">{{ kindLabel(g.kind) }}</Badge>
              <span class="text-sm text-ink font-medium min-w-[100px] truncate">{{ g.term }}</span>
              <i class="fas fa-arrow-right text-ink-subtle text-xs"></i>
              <input :value="g.canonical" @change="(e) => updateCanonical(g, e)"
                class="flex-1 min-w-0 bg-transparent border-b border-line/60 focus:border-accent/50 focus:outline-none text-sm text-ink py-0.5" />
              <div class="ml-auto flex items-center gap-2">
                <Switch :model-value="g.enabled" size="sm" @change="(v) => toggleTerm(g, v)" />
                <IconButton icon="fas fa-trash" size="sm" label="Excluir" @click="removeTerm(g)" />
              </div>
            </div>
          </Surface>
          <EmptyState v-if="!filteredGlossary.length" size="md" icon="fas fa-book" title="Nenhum termo" description="Adicione um termo acima." />
        </div>
      </section>

      <!-- COMPORTAMENTO -->
      <Surface v-show="tab === 'behavior'" variant="raised" padding="md">
        <h2 class="text-base font-semibold text-ink mb-1">Comportamento & Limites</h2>
        <p class="text-xs text-ink-muted mb-4">Pools de modelo e gatilhos de escalonamento são <strong>consumidos pelo runtime</strong> quando há versão publicada (as palavras são aditivas às embutidas). Limites ficam salvos para as próximas fases.</p>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2"><Input v-model="behavior.fast" label="Modelos rápidos (flash) — separados por vírgula" placeholder="gemini-2.5-flash" /></div>
          <div class="sm:col-span-2"><Input v-model="behavior.smart" label="Modelos avançados (pro) — separados por vírgula" placeholder="gemini-2.5-pro, gemini-2.5-flash" /></div>
          <div class="sm:col-span-2">
            <label :class="LABEL">Palavras que escalam para "avançado" (uma por linha)</label>
            <textarea v-model="behavior.keywords" :class="TA" rows="5"></textarea>
          </div>
          <Input v-model="behavior.storage_mb" type="number" label="Histórico (MB)" />
          <Input v-model="behavior.rate_per_min" type="number" label="Msgs / minuto" />
          <Input v-model="behavior.rate_per_hour" type="number" label="Msgs / hora" />
        </div>
        <div class="mt-5"><Button variant="primary" :loading="busy" icon="fas fa-save" @click="saveBehavior">Salvar comportamento</Button></div>
      </Surface>

      <!-- RELATÓRIOS -->
      <section v-show="tab === 'reports'">
        <p class="text-xs text-ink-muted mb-3">Ligue/desligue ferramentas, ajuste a <strong>descrição</strong> que o modelo lê (controla quando a tool é chamada) e adicione regras de uso.</p>
        <div class="space-y-2.5">
          <Surface v-for="r in reports" :key="r.name" variant="raised" padding="sm" :class="!r.enabled ? 'opacity-60' : ''">
            <div class="flex items-center gap-3">
              <Badge variant="neutral" size="sm">{{ r.kind }}</Badge>
              <code class="text-sm font-mono text-ink">{{ r.name }}</code>
              <div class="ml-auto flex items-center gap-2">
                <Switch :model-value="r.enabled" size="sm" @change="(v) => toggleReport(r, v)" />
                <Button variant="ghost" size="sm" @click="openReport(r)">{{ editReport === r.name ? 'Fechar' : 'Editar' }}</Button>
              </div>
            </div>
            <div v-if="editReport === r.name" class="mt-3 space-y-3">
              <div>
                <label :class="LABEL">Descrição (o que o Gemini lê)</label>
                <textarea v-model="r.description" :class="TA" rows="3"></textarea>
              </div>
              <div>
                <label :class="LABEL">Regras de uso (injetadas no prompt)</label>
                <textarea v-model="r.promptRules" :class="TA" rows="3" placeholder="Opcional. Ex.: sempre use group_by por padrão…"></textarea>
              </div>
              <div class="flex justify-end"><Button variant="primary" size="sm" :loading="busy" @click="saveReport(r)">Salvar</Button></div>
            </div>
          </Surface>
          <EmptyState v-if="!reports.length" size="md" icon="fas fa-table" title="Nenhum relatório" description="Rode o seed para registrar as ferramentas." />
        </div>
      </section>

      <!-- INSIGHTS -->
      <section v-show="tab === 'insights'">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Surface variant="raised" padding="sm"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Total</p><p class="text-2xl font-semibold text-ink mt-1 tabular-nums">{{ fb.stats.total }}</p></Surface>
          <Surface variant="raised" padding="sm"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Positivos</p><p class="text-2xl font-semibold text-emerald-500 mt-1 tabular-nums flex items-center gap-1.5"><i class="fas fa-thumbs-up text-base"></i>{{ fb.stats.up }}</p></Surface>
          <Surface variant="raised" padding="sm"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Negativos</p><p class="text-2xl font-semibold text-red-500 mt-1 tabular-nums flex items-center gap-1.5"><i class="fas fa-thumbs-down text-base"></i>{{ fb.stats.down }}</p></Surface>
          <Surface variant="raised" padding="sm"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Taxa positiva</p><p class="text-2xl font-semibold mt-1 tabular-nums" :class="positiveRate >= 70 ? 'text-emerald-500' : positiveRate >= 40 ? 'text-amber-500' : 'text-red-500'">{{ positiveRate }}%</p></Surface>
        </div>

        <Surface v-if="fb.stats.total" variant="raised" padding="sm" class="mb-4">
          <div class="h-2 rounded-full bg-surface-sunken overflow-hidden flex">
            <div class="h-full bg-emerald-500 transition-all duration-700" :style="{ width: positiveRate + '%' }"></div>
            <div class="h-full bg-red-500 transition-all duration-700" :style="{ width: (100 - positiveRate) + '%' }"></div>
          </div>
        </Surface>

        <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
          <SegmentedControl :model-value="fb.filter" :options="fbFilterOptions" size="sm" @change="setFbFilter" />
          <span class="text-xs text-ink-subtle font-mono">{{ fb.total }} resultado{{ fb.total !== 1 ? 's' : '' }}</span>
        </div>

        <div v-if="fb.loading && !fb.items.length" class="py-16 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>Carregando feedbacks…</div>
        <EmptyState v-else-if="!fb.items.length" size="md" icon="far fa-comment-dots" title="Nenhum feedback" description="Aguarde novos feedbacks dos usuários." />

        <div v-else class="space-y-2">
          <article v-for="item in fb.items" :key="item.id" @click="openDetail(item)"
            class="group flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-surface-raised border border-line surface-gradient hover:border-accent/30 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div class="h-9 w-9 rounded-lg grid place-items-center shrink-0 border"
              :class="item.rating === 'up' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' : 'bg-red-500/15 text-red-600 border-red-500/20'">
              <i :class="item.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" class="text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-ink">{{ item.user?.username || 'Usuário' }}</span>
                <span v-if="item.user?.city" class="text-xs text-ink-subtle font-mono">{{ item.user.city }}</span>
                <span class="text-xs text-ink-subtle ml-auto font-mono">{{ fromNow(item.created_at) }}</span>
              </div>
              <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed mt-1">{{ truncate(item.message?.content) }}</p>
              <p v-if="item.comment" class="text-xs text-ink italic border-l-2 border-line pl-2 mt-2">"{{ item.comment }}"</p>
            </div>
            <i class="fas fa-chevron-right text-ink-subtle text-xs mt-1 group-hover:text-accent transition-colors"></i>
          </article>
        </div>

        <div v-if="fbPages > 1" class="flex items-center justify-center gap-2 mt-5">
          <Button size="sm" variant="ghost" icon="fas fa-chevron-left" :disabled="fb.page <= 1" @click="fbGo(fb.page - 1)">Anterior</Button>
          <span class="text-xs text-ink-muted font-mono px-3">{{ fb.page }} / {{ fbPages }}</span>
          <Button size="sm" variant="ghost" icon-right="fas fa-chevron-right" :disabled="fb.page >= fbPages" @click="fbGo(fb.page + 1)">Próxima</Button>
        </div>
      </section>

      <!-- VERSÕES -->
      <section v-show="tab === 'versions'">
        <Surface variant="raised" padding="sm" class="mb-4">
          <div class="flex items-end gap-2 flex-wrap">
            <div class="flex-1 min-w-[200px]"><Input v-model="publishLabel" label="Rótulo da publicação (opcional)" size="sm" placeholder="ex.: ajuste no tom das respostas" /></div>
            <Button variant="primary" size="sm" icon="fas fa-rocket" :loading="busy" @click="doPublish">Publicar rascunho</Button>
          </div>
        </Surface>
        <p class="text-xs text-ink-muted mb-3">Cada publicação congela o rascunho. O rollback reativa uma versão na hora (o rascunho não é alterado).</p>
        <div class="space-y-2">
          <Surface v-for="v in versions" :key="v.id" variant="raised" padding="sm" :class="v.is_active ? 'border-emerald-500/40' : ''">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink truncate">{{ v.label }}</p>
                <p class="text-xs text-ink-subtle font-mono">{{ fmt(v.created_at) }} · {{ v.published_by || '—' }}</p>
                <p v-if="v.note" class="text-xs text-ink-muted italic mt-0.5">{{ v.note }}</p>
              </div>
              <Badge v-if="v.is_active" variant="success" dot>No ar</Badge>
              <Button v-else variant="ghost" size="sm" icon="fas fa-rotate-left" :loading="busy" @click="doRollback(v)">Reativar</Button>
            </div>
          </Surface>
          <EmptyState v-if="!versions.length" size="md" icon="fas fa-code-branch" title="Nenhuma versão" description="Publique o rascunho para criar a primeira versão." />
        </div>
      </section>

      <!-- SANDBOX -->
      <Surface v-show="tab === 'sandbox'" variant="raised" padding="md">
        <h2 class="text-base font-semibold text-ink mb-1">🧪 Sandbox</h2>
        <p class="text-xs text-ink-muted mb-4">Testa o <strong>rascunho</strong> com um usuário simulado, sem afetar a Eme ao vivo nem salvar nada.</p>
        <div class="flex items-end gap-3 flex-wrap mb-3">
          <div class="w-64"><label :class="LABEL">Perfil</label><Select :model-value="sbox.role" :options="roleOptions" size="sm" @change="(v) => sbox.role = v" /></div>
          <div class="w-40"><label :class="LABEL">Cidade</label><Input v-model="sbox.city" size="sm" placeholder="ex.: Sinop" :disabled="sbox.role === 'admin'" /></div>
          <Button variant="outline" size="sm" icon="fas fa-eye" :loading="busy" @click="doPreview">Ver prompt montado</Button>
        </div>
        <label :class="LABEL">Mensagem de teste</label>
        <textarea v-model="sbox.message" :class="TA" rows="3" placeholder="Pergunte algo à Eme…"></textarea>
        <div class="mt-3"><Button variant="primary" icon="fas fa-paper-plane" :loading="busy" :disabled="!sbox.message" @click="doSandboxChat">Testar resposta</Button></div>
        <p v-if="sbox.note" class="text-xs text-ink-subtle font-mono mt-3">{{ sbox.note }}</p>

        <Surface v-if="sbox.answer" variant="sunken" padding="sm" class="mt-4">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Resposta</p>
          <p class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ sbox.answer }}</p>
        </Surface>
        <details v-if="sbox.prompt" class="mt-4 group">
          <summary class="cursor-pointer text-xs font-mono text-ink-muted hover:text-ink select-none">▸ Prompt montado ({{ sbox.prompt.length }} caracteres)</summary>
          <pre class="mt-2 bg-surface-sunken border border-line text-ink-muted p-3 rounded-lg overflow-auto max-h-96 text-[11.5px] leading-relaxed">{{ sbox.prompt }}</pre>
        </details>
      </Surface>
    </PageContainer>

    <!-- Modal detalhe do feedback -->
    <Modal :open="detail.open" size="lg" @close="detail.open = false">
      <template #header>
        <div v-if="detail.item" class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg grid place-items-center shrink-0 border"
            :class="detail.item.rating === 'up' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' : 'bg-red-500/15 text-red-600 border-red-500/20'">
            <i :class="detail.item.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" class="text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink truncate">{{ detail.item.user?.username }}</h3>
            <p class="text-xs text-ink-muted font-mono truncate">{{ detail.item.user?.email }}<span v-if="detail.item.user?.city"> · {{ detail.item.user.city }}</span></p>
          </div>
        </div>
      </template>
      <div v-if="detail.item" class="space-y-4">
        <section v-if="detail.item.context?.user_question">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Pergunta do usuário</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ detail.item.context.user_question }}</div>
        </section>
        <section>
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Resposta avaliada</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">{{ detail.item.context?.assistant_text || truncate(detail.item.message?.content, 1000) }}</div>
        </section>
        <section v-if="detail.item.comment">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Comentário</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink italic leading-relaxed">"{{ detail.item.comment }}"</div>
        </section>
        <section v-if="detail.item.context" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Modelo</p><p class="text-xs text-ink font-mono truncate mt-0.5">{{ detail.item.context.model || '—' }}</p></div>
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Pool</p><Badge :variant="poolVariant(detail.item.context.pool)" size="sm" class="mt-0.5">{{ poolLabel(detail.item.context.pool) }}</Badge></div>
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2"><p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Latência</p><p class="text-xs text-ink font-mono mt-0.5">{{ formatLatency(detail.item.context.latency_ms) }}</p></div>
        </section>
        <section v-if="detail.item.context?.tool_calls?.length">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Ferramentas chamadas ({{ detail.item.context.tool_calls.length }})</p>
          <div class="space-y-2">
            <div v-for="(tc, idx) in detail.item.context.tool_calls" :key="idx" class="rounded-lg border border-line bg-surface-sunken p-3 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <Badge variant="accent" size="sm"><code class="font-mono">{{ tc.name }}</code></Badge>
                <Badge v-if="tc.error" variant="danger" size="sm">erro</Badge>
                <span class="text-[10px] text-ink-subtle ml-auto font-mono">{{ formatLatency(tc.ms) }}</span>
              </div>
              <pre v-if="tc.args && Object.keys(tc.args).length" class="text-[11px] font-mono text-ink-muted bg-surface rounded p-2 overflow-x-auto">{{ JSON.stringify(tc.args, null, 2) }}</pre>
              <div v-if="tc.error" class="text-xs text-red-600">{{ tc.error }}</div>
            </div>
          </div>
        </section>
        <div class="flex items-center justify-between text-xs text-ink-subtle pt-2 border-t border-line font-mono">
          <span>Tipo: <span class="text-ink">{{ detail.item.message?.response_type || 'text' }}</span></span>
          <span>{{ fmt(detail.item.created_at) }}</span>
        </div>
      </div>
    </Modal>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.text" class="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-elevated text-sm font-medium border"
        :class="toast.type === 'err' ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'">
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
