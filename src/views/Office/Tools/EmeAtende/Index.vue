<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import * as api from '@/utils/EmeAtende/api'

import PageContainer from '@/components/UI/PageContainer.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import Surface from '@/components/UI/Surface.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Switch from '@/components/UI/Switch.vue'
import Input from '@/components/UI/Input.vue'
import Select from '@/components/UI/Select.vue'
import SegmentedControl from '@/components/UI/SegmentedControl.vue'
import EmptyState from '@/components/UI/EmptyState.vue'

const TA = 'w-full rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-[12.5px] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30 focus:border-accent/40 transition resize-y'
const LABEL = 'block text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5'

const tab = ref('conversations')
const busy = ref(false)
const toast = reactive({ text: '', type: 'ok' })

const tabOpts = [
  { value: 'conversations', label: 'Conversas', icon: 'fas fa-comments' },
  { value: 'flows', label: 'Fluxos', icon: 'fas fa-diagram-project' },
  { value: 'leads', label: 'Leads', icon: 'fas fa-user-plus' },
  { value: 'config', label: 'Config', icon: 'fas fa-gear' },
]

function notify(text, type = 'ok') {
  toast.text = text; toast.type = type
  setTimeout(() => { if (toast.text === text) toast.text = '' }, 3500)
}
const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
const stateVariant = (s) => ({ bot: 'info', closed: 'neutral' }[s] || 'neutral')
const stateLabel = (s) => ({ bot: 'Eme (IA)', closed: 'Encerrada' }[s] || s)
const leadVariant = (s) => ({ received: 'neutral', opened: 'info', engaged: 'accent', qualified: 'success', closed: 'neutral', opted_out: 'danger' }[s] || 'neutral')

// ── Conversas ────────────────────────────────────────────────────────────────
const convLoading = ref(false)
const conversations = ref([])
const convFilter = ref('')
const convOpen = ref(null)     // id expandida
const convDetail = ref(null)   // detalhe carregado (messages)
const convFilterOpts = [
  { value: '', label: 'Todas' },
  { value: 'bot', label: 'Eme (IA)' },
  { value: 'closed', label: 'Encerradas' },
]

async function loadConversations() {
  convLoading.value = true
  try { conversations.value = await api.listConversations(convFilter.value) }
  catch (e) { notify(e.message, 'err') } finally { convLoading.value = false }
}
async function openConv(c) {
  if (convOpen.value === c.id) { convOpen.value = null; convDetail.value = null; return }
  convOpen.value = c.id; convDetail.value = null
  try { convDetail.value = await api.getConversation(c.id) }
  catch (e) { notify(e.message, 'err') }
}
async function changeConvState(c, state) {
  try {
    await api.setConversationState(c.id, state)
    c.state = state
    if (convDetail.value?.id === c.id) convDetail.value.state = state
    notify(state === 'bot' ? 'Conversa devolvida pra Eme.' : 'Conversa encerrada.')
  } catch (e) { notify(e.message, 'err') }
}
watch(convFilter, loadConversations)

// ── Fluxos + regras ──────────────────────────────────────────────────────────
const flowsLoading = ref(false)
const flows = ref([])
const rules = ref([])
const templates = ref([])
const flowOpen = ref(null)
const flowEdit = reactive({ openerVars: '', triggersJson: '' })
// Empreendimentos publicados no site - fonte do contexto do fluxo.
const siteEnterprises = ref([])
const siteState = reactive({ loading: false, error: '', syncing: 0 })
const newFlowName = ref('')
const newRule = reactive({ field: 'campaign', operator: 'contains', value: '', flow_id: null, priority: 100 })

// ── Regras por empreendimento ────────────────────────────────────────────────
// Override PARCIAL: '' = herda o geral, então o valor vazio é apagado do objeto
// em vez de virar string vazia no banco.
const formalityOptsInherit = [
  { value: '', label: 'Herda do geral' },
  { value: 'informal', label: 'Informal' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'formal', label: 'Formal' },
]
const emojiOptsInherit = [
  { value: '', label: 'Herda do geral' },
  { value: 'none', label: 'Sem emoji' },
  { value: 'light', label: 'Pouco emoji' },
  { value: 'free', label: 'À vontade' },
]
function setFlowStd(f, key, value) {
  if (!f.standards) f.standards = {}
  const empty = value === '' || value === null || value === undefined
    || (Array.isArray(value) && !value.length)
  if (empty) delete f.standards[key]
  else f.standards[key] = value
}

const rulesPreview = reactive({ flowId: null, text: '', running: false })
async function previewRules(f) {
  rulesPreview.running = true
  try {
    // Manda o estado do editor (ainda não salvo) pra dar pra calibrar antes de gravar.
    const r = await api.previewRules({
      flow_id: f.id, name: f.name, system_prompt: f.system_prompt,
      attendance_rules: f.attendance_rules, standards: f.standards || {},
    })
    rulesPreview.flowId = f.id
    rulesPreview.text = r.instructions
  } catch (e) { notify(e.message, 'err') } finally { rulesPreview.running = false }
}

const fieldOpts = [
  { value: 'source', label: 'Origem (source)' },
  { value: 'campaign', label: 'Campanha' },
  { value: 'empreendimento', label: 'Empreendimento' },
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'E-mail' },
]
const operatorOpts = [
  { value: 'contains', label: 'contém' },
  { value: 'equals', label: 'é igual a' },
  { value: 'regex', label: 'regex' },
]
const flowOpts = computed(() => flows.value.filter(f => f.active).map(f => ({ value: f.id, label: f.name })))
const templateOpts = computed(() => [
  { value: '', label: '(sem abertura - só responde quem chama)' },
  ...templates.value.map(t => ({ value: t.name, label: `${t.name} (${t.language})` })),
])
const flowName = (id) => flows.value.find(f => f.id === id)?.name || `#${id}`

async function loadFlows() {
  flowsLoading.value = true
  try {
    const [f, r] = await Promise.all([api.listFlows(), api.listRules()])
    flows.value = f; rules.value = r
    if (!newRule.flow_id && f.length) newRule.flow_id = f[0].id
    if (!templates.value.length) {
      try { templates.value = await api.listTemplates('APPROVED') } catch { /* canal sem sync ainda */ }
    }
    if (!siteEnterprises.value.length) loadSiteEnterprises()
  } catch (e) { notify(e.message, 'err') } finally { flowsLoading.value = false }
}
// Lista do site: erro aqui não trava a tela, mas aparece no editor - fluxo
// sem Select é sintoma de site fora do ar ou formato mudado, não de bug local.
async function loadSiteEnterprises() {
  siteState.loading = true; siteState.error = ''
  try { siteEnterprises.value = await api.listSiteEnterprises() }
  catch (e) { siteState.error = e.message }
  finally { siteState.loading = false }
}
const siteOpts = computed(() => [
  { value: '', label: '(sem vínculo - contexto só pelo texto abaixo)' },
  ...siteEnterprises.value.map(e => ({ value: e.slug, label: `${e.nome} - ${e.cidade || ""}` })),
])
// Atualiza AGORA o conteúdo vindo do site (o automático roda 1x/dia).
async function syncFlowSite(f) {
  siteState.syncing = f.id
  try {
    await api.syncSite(f.id)
    const atualizados = await api.listFlows()
    Object.assign(f, atualizados.find(x => x.id === f.id) || {})
    notify(f.site_sync_error ? `Site respondeu, mas: ${f.site_sync_error}` : 'Conteúdo do site atualizado.',
           f.site_sync_error ? 'err' : 'ok')
  } catch (e) { notify(e.message, 'err') } finally { siteState.syncing = 0 }
}

function openFlow(f) {
  if (flowOpen.value === f.id) { flowOpen.value = null; return }
  flowOpen.value = f.id
  flowEdit.openerVars = (f.opener_variables || []).join(', ')
  flowEdit.triggersJson = JSON.stringify(f.triggers || [], null, 2)
}
async function saveFlow(f) {
  busy.value = true
  try {
    let triggers
    try { triggers = flowEdit.triggersJson.trim() ? JSON.parse(flowEdit.triggersJson) : [] }
    catch { throw new Error('JSON inválido nos gatilhos.') }
    const payload = {
      name: f.name, is_default: f.is_default,
      system_prompt: f.system_prompt, business_context: f.business_context,
      // regras de atendimento deste empreendimento + override parcial dos padrões
      attendance_rules: f.attendance_rules || null,
      standards: f.standards || {},
      // vínculo com o site: o back re-sincroniza sozinho quando isto muda
      site_slug: f.site_slug || null,
      opener_template: f.opener_template || null, opener_language: f.opener_language || 'pt_BR',
      opener_variables: flowEdit.openerVars.split(',').map(s => s.trim()).filter(Boolean),
      triggers,
    }
    const saved = await api.updateFlow(f.id, payload)
    Object.assign(f, saved)
    notify('Fluxo salvo - vale já na próxima conversa.')
    flowOpen.value = null
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function toggleFlow(f, active) {
  const prev = f.active; f.active = active
  try { await api.updateFlow(f.id, { active }) }
  catch (e) { notify(e.message, 'err'); f.active = prev }
}
async function createNewFlow() {
  if (!newFlowName.value.trim()) return
  busy.value = true
  try {
    const f = await api.createFlow({ name: newFlowName.value.trim() })
    flows.value.push(f); newFlowName.value = ''
    notify('Fluxo criado.'); openFlow(f)
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function addRule() {
  if (!newRule.value.trim() || !newRule.flow_id) return
  busy.value = true
  try {
    await api.createRule({ ...newRule, value: newRule.value.trim() })
    newRule.value = ''
    rules.value = await api.listRules()
    notify('Regra criada.')
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function removeRule(r) {
  try { await api.deleteRule(r.id); rules.value = rules.value.filter(x => x.id !== r.id) }
  catch (e) { notify(e.message, 'err') }
}

// ── Leads ────────────────────────────────────────────────────────────────────
const leadsLoading = ref(false)
const leads = ref([])
const leadsTotal = ref(0)
const leadSearch = ref('')
const leadStatus = ref('')
const leadOpen = ref(null)
const leadDetail = ref(null)
const leadStatusOpts = [
  { value: '', label: 'Todos' },
  { value: 'received', label: 'Recebido' },
  { value: 'opened', label: 'Abertura enviada' },
  { value: 'engaged', label: 'Em conversa' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'closed', label: 'Encerrado' },
  { value: 'opted_out', label: 'Opt-out' },
]

async function loadLeads() {
  leadsLoading.value = true
  try {
    const d = await api.listLeads({ q: leadSearch.value, status: leadStatus.value, limit: 100 })
    leads.value = d.leads || []; leadsTotal.value = d.total || 0
  } catch (e) { notify(e.message, 'err') } finally { leadsLoading.value = false }
}
async function openLead(l) {
  if (leadOpen.value === l.id) { leadOpen.value = null; leadDetail.value = null; return }
  leadOpen.value = l.id; leadDetail.value = null
  try { leadDetail.value = await api.getLead(l.id) }
  catch (e) { notify(e.message, 'err') }
}
watch(leadStatus, loadLeads)

// ── Config ───────────────────────────────────────────────────────────────────
const settings = reactive({
  active: false, dry_run: true, debounce_seconds: 8, max_ai_messages: 30,
  test_mode: false, test_phones: [], validation_level: 'money_dates',
  global_persona: '', global_rules: '',
  site_url: '',
  standards: {
    max_sentences: 4, questions_per_message: 1,
    emoji: 'light', formality: 'informal',
    always_collect: [], never_discuss: [],
  },
})
const formalityOpts = [
  { value: 'informal', label: 'Informal (trata por você)' },
  { value: 'neutro', label: 'Neutro' },
  { value: 'formal', label: 'Formal' },
]
const emojiOpts = [
  { value: 'none', label: 'Sem emoji' },
  { value: 'light', label: 'Pouco emoji (recomendado)' },
  { value: 'free', label: 'À vontade' },
]
const settingsLoaded = ref(false)
const testPhonesText = computed(() => (settings.test_phones || []).join('\n'))
const validationOpts = [
  { value: 'money_dates', label: 'Valores e prazos (recomendado)' },
  { value: 'strict', label: 'Rígido - qualquer número fora do contexto' },
  { value: 'off', label: 'Desligada - só as regras do prompt' },
]
const apiKeys = ref([])
const newKeyName = ref('')
const createdKey = ref(null)
const sandbox = reactive({ flow_id: null, message: '', reply: '', tools: [], running: false, validation: null })

async function loadConfig() {
  try {
    const [s, k] = await Promise.all([api.getSettings(), api.listApiKeys()])
    Object.assign(settings, s); apiKeys.value = k; settingsLoaded.value = true
    if (!flows.value.length) await loadFlows()
    if (!sandbox.flow_id && flows.value.length) sandbox.flow_id = flows.value.find(f => f.is_default)?.id || flows.value[0].id
  } catch (e) { notify(e.message, 'err') }
}
async function saveSettings() {
  busy.value = true
  try {
    Object.assign(settings, await api.updateSettings({ ...settings }))
    notify('Configuração salva.')
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function createKey() {
  if (!newKeyName.value.trim()) return
  busy.value = true
  try {
    createdKey.value = await api.createApiKey(newKeyName.value.trim())
    newKeyName.value = ''
    apiKeys.value = await api.listApiKeys()
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function dropKey(k) {
  if (!confirm(`Desativar a chave "${k.name}"? Sistemas usando ela param de conseguir postar leads.`)) return
  try { await api.deactivateApiKey(k.id); apiKeys.value = await api.listApiKeys() }
  catch (e) { notify(e.message, 'err') }
}
function copyKey() {
  navigator.clipboard?.writeText(createdKey.value.key)
  notify('Chave copiada.')
}
async function runSandbox() {
  if (!sandbox.message.trim()) return
  sandbox.running = true; sandbox.reply = ''; sandbox.tools = []; sandbox.validation = null
  try {
    const r = await api.testAi({ flow_id: sandbox.flow_id, message: sandbox.message })
    sandbox.reply = r.reply || '(sem texto - só ação de tool)'
    sandbox.tools = r.tool_calls || []
    sandbox.validation = r.validation || null
  } catch (e) { notify(e.message, 'err') } finally { sandbox.running = false }
}

watch(tab, (t) => {
  if (t === 'conversations' && !conversations.value.length) loadConversations()
  if (t === 'flows' && !flows.value.length) loadFlows()
  if (t === 'leads' && !leads.value.length) loadLeads()
  if (t === 'config' && !settingsLoaded.value) loadConfig()
})
onMounted(loadConversations)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader title="Eme Atende" subtitle="A Eme atendendo seus leads no WhatsApp - fluxos, conversas e regras editáveis sem código." icon="fas fa-headset" />

      <div class="mb-5"><SegmentedControl :model-value="tab" :options="tabOpts" @change="(v) => tab = v" /></div>

      <!-- CONVERSAS -->
      <div v-show="tab === 'conversations'">
        <div class="mb-4 flex items-center gap-3 flex-wrap">
          <div class="w-48"><Select :model-value="convFilter" :options="convFilterOpts" @change="(v) => convFilter = v" /></div>
          <Button variant="ghost" size="sm" icon="fas fa-rotate" :loading="convLoading" @click="loadConversations">Atualizar</Button>
        </div>

        <div v-if="convLoading && !conversations.length" class="py-16 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>Carregando…</div>
        <div v-else class="space-y-2.5">
          <Surface v-for="c in conversations" :key="c.id" variant="raised" padding="sm">
            <div class="flex items-center gap-3 flex-wrap cursor-pointer" @click="openConv(c)">
              <Badge :variant="stateVariant(c.state)" size="sm">{{ stateLabel(c.state) }}</Badge>
              <span class="text-sm font-semibold text-ink">{{ c.lead?.name || 'Sem nome' }}</span>
              <code class="text-xs font-mono text-ink-muted">{{ c.phone }}</code>
              <Badge v-if="c.lead?.status" :variant="leadVariant(c.lead.status)" size="sm">{{ c.lead.status }}</Badge>
              <span class="ml-auto text-xs text-ink-subtle">últ. msg do lead: {{ fmt(c.last_inbound_at) }}</span>
            </div>

            <div v-if="convOpen === c.id" class="mt-4">
              <div v-if="!convDetail" class="py-6 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin"></i></div>
              <template v-else>
                <div class="max-h-96 overflow-y-auto space-y-2 rounded-lg border border-line bg-surface-sunken p-3">
                  <div v-for="m in convDetail.messages" :key="m.id" class="flex" :class="m.direction === 'out' ? 'justify-end' : 'justify-start'">
                    <div class="max-w-[75%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed"
                      :class="m.direction === 'out' ? 'bg-accent/10 text-ink' : 'bg-surface-raised border border-line text-ink'">
                      <p class="whitespace-pre-wrap break-words">{{ m.body }}</p>
                      <p class="mt-1 text-[10px] text-ink-subtle text-right">
                        {{ fmt(m.created_at || m.createdAt) }} ·
                        <span :class="m.status === 'failed' ? 'text-red-500' : ''">{{ m.status }}</span>
                      </p>
                    </div>
                  </div>
                  <EmptyState v-if="!convDetail.messages?.length" size="sm" icon="fas fa-comments" title="Sem mensagens" description="Nenhuma troca registrada ainda." />
                </div>
                <div class="mt-3 flex items-center gap-2 flex-wrap justify-end">
                  <Button v-if="c.state === 'closed'" variant="primary" size="sm" icon="fas fa-robot" @click="changeConvState(c, 'bot')">Reabrir pra Eme</Button>
                  <Button v-if="c.state !== 'closed'" variant="ghost" size="sm" icon="fas fa-box-archive" @click="changeConvState(c, 'closed')">Encerrar</Button>
                </div>
              </template>
            </div>
          </Surface>
          <EmptyState v-if="!conversations.length && !convLoading" size="md" icon="fas fa-comments" title="Nenhuma conversa" description="Quando um lead chegar (API ou mensagem no número), a conversa aparece aqui." />
        </div>
      </div>

      <!-- FLUXOS -->
      <div v-show="tab === 'flows'">
        <Surface variant="raised" padding="sm" class="mb-5">
          <div class="flex items-end gap-2 flex-wrap">
            <div class="flex-1 min-w-[200px]"><label :class="LABEL">Novo fluxo de atendimento</label><Input v-model="newFlowName" size="sm" placeholder="ex.: Residencial Esmeralda" /></div>
            <Button variant="primary" size="sm" icon="fas fa-plus" :loading="busy" :disabled="!newFlowName" @click="createNewFlow">Criar</Button>
          </div>
        </Surface>

        <div v-if="flowsLoading && !flows.length" class="py-16 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>Carregando…</div>
        <div v-else class="space-y-2.5 mb-8">
          <Surface v-for="f in flows" :key="f.id" variant="raised" padding="sm" :class="!f.active ? 'opacity-60' : ''">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-sm font-semibold text-ink">{{ f.name }}</span>
              <Badge v-if="f.is_default" variant="accent" size="sm">default</Badge>
              <code v-if="f.opener_template" class="text-xs font-mono text-ink-muted">{{ f.opener_template }}</code>
              <div class="ml-auto flex items-center gap-2">
                <Switch :model-value="f.active" size="sm" @change="(v) => toggleFlow(f, v)" />
                <Button variant="ghost" size="sm" @click="openFlow(f)">{{ flowOpen === f.id ? 'Fechar' : 'Editar' }}</Button>
              </div>
            </div>

            <div v-if="flowOpen === f.id" class="mt-4 space-y-4">
              <div class="grid sm:grid-cols-2 gap-4">
                <Input v-model="f.name" label="Nome" />
                <div class="flex items-end gap-2 pb-1">
                  <Switch :model-value="f.is_default" size="sm" @change="(v) => f.is_default = v" />
                  <span class="text-xs text-ink-muted">Fluxo default (leads sem regra caem aqui)</span>
                </div>
                <Select :model-value="f.opener_template || ''" :options="templateOpts" label="Template de abertura (aprovado na Meta)" @change="(v) => f.opener_template = v" />
                <Input v-model="flowEdit.openerVars" label="Variáveis do template (campos do lead, na ordem)" placeholder="name, empreendimento" />
              </div>
              <!-- Empreendimento do SITE: fonte do contexto. O conteúdo não é lido
                   ao vivo na conversa - um sync diário grava o snapshot no fluxo. -->
              <div class="rounded-lg border border-line bg-surface-sunken px-3 py-3 space-y-3">
                <Select :model-value="f.site_slug || ''" :options="siteOpts"
                  label="Empreendimento no site (fonte do contexto)"
                  @change="(v) => f.site_slug = v || null" />

                <p v-if="siteState.loading" class="text-[11px] text-ink-subtle">Lendo o site…</p>
                <p v-else-if="siteState.error" class="text-[11px] text-red-600 dark:text-red-400">
                  Não consegui ler o site: {{ siteState.error }}
                </p>

                <div v-if="f.site_slug" class="flex flex-wrap items-center gap-2">
                  <Badge v-if="f.site_snapshot" variant="neutral" size="sm">
                    {{ f.site_snapshot.images?.length || 0 }} imagem(ns)
                  </Badge>
                  <Badge v-if="f.site_snapshot?.book" variant="neutral" size="sm">book em PDF</Badge>
                  <span class="text-[11px] text-ink-subtle">
                    {{ f.site_synced_at ? `Atualizado do site em ${fmt(f.site_synced_at)}` : 'Ainda não sincronizado' }}
                  </span>
                  <Button variant="secondary" size="sm" icon="fas fa-rotate"
                    :loading="siteState.syncing === f.id" @click="syncFlowSite(f)">Atualizar agora</Button>
                </div>

                <p v-if="f.site_sync_error" class="text-[11px] text-amber-600 dark:text-amber-400">
                  Último sync falhou: {{ f.site_sync_error }}. A Eme segue com o conteúdo anterior.
                </p>
                <p v-if="f.site_slug" class="text-[11px] text-ink-subtle">
                  O conteúdo é atualizado sozinho todo dia às 4h40. Preço e condição não vêm do site,
                  então a Eme não vai afirmar valor nenhum - fica com o consultor.
                </p>
              </div>
              <div>
                <label :class="LABEL">Comportamento da Eme (persona) - vazio herda a persona geral</label>
                <textarea v-model="f.system_prompt" :class="TA" rows="4" placeholder="Deixe vazio para usar a persona definida em Config › Regras gerais. Preencha só se este empreendimento pedir um tom diferente."></textarea>
              </div>

              <!-- Regras de atendimento SÓ deste empreendimento. Entram depois
                   das gerais e prevalecem sobre elas. -->
              <div>
                <label :class="LABEL">Regras deste empreendimento (prevalecem sobre as gerais)</label>
                <textarea v-model="f.attendance_rules" :class="TA" rows="4" placeholder="Ex.: só oferecer unidades de 3 quartos; sempre citar que a entrada é parcelada; não mencionar a fase 2 antes do lançamento."></textarea>
              </div>

              <!-- Override parcial dos padrões: campo em branco herda o geral. -->
              <div class="rounded-lg border border-line bg-surface-sunken px-3 py-3">
                <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
                  Padrão de atendimento deste empreendimento
                </p>
                <p class="text-[11px] text-ink-subtle mb-3">
                  Em branco = herda de Config › Regras gerais. Preencha só o que muda aqui.
                </p>
                <div class="grid sm:grid-cols-2 gap-3">
                  <Select :model-value="f.standards?.formality || ''" :options="formalityOptsInherit"
                    label="Tom" @change="(v) => setFlowStd(f, 'formality', v)" />
                  <Select :model-value="f.standards?.emoji || ''" :options="emojiOptsInherit"
                    label="Emojis" @change="(v) => setFlowStd(f, 'emoji', v)" />
                  <Input :model-value="f.standards?.max_sentences ? String(f.standards.max_sentences) : ''"
                    type="number" label="Máx. de frases" placeholder="herda"
                    @update:model-value="(v) => setFlowStd(f, 'max_sentences', v ? Number(v) : '')" />
                  <Input :model-value="(f.standards?.always_collect || []).join(', ')"
                    label="Sempre descobrir" placeholder="herda"
                    @update:model-value="(v) => setFlowStd(f, 'always_collect', v.split(',').map(s => s.trim()).filter(Boolean))" />
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon="fas fa-layer-group" :loading="rulesPreview.running"
                  @click="previewRules(f)">Ver regras montadas</Button>
                <span class="text-[11px] text-ink-subtle">Mostra exatamente o que a IA vai ler</span>
              </div>
              <div v-if="rulesPreview.flowId === f.id && rulesPreview.text"
                class="rounded-lg border border-line bg-surface-sunken px-3 py-3">
                <pre class="text-[11.5px] leading-relaxed text-ink whitespace-pre-wrap font-sans">{{ rulesPreview.text }}</pre>
                <p class="mt-2 pt-2 border-t border-line text-[11px] text-ink-subtle">
                  Depois disso ainda entram: contexto do negócio, imagens, dados do lead e as regras inegociáveis
                  (fixas no código: não inventar valor, não prometer em nome da empresa).
                </p>
              </div>
              <div><label :class="LABEL">Contexto do negócio (única fonte de verdade sobre produto/valores)</label><textarea v-model="f.business_context" :class="TA" rows="5" placeholder="Empreendimentos, diferenciais, condições vigentes, horário do plantão…"></textarea></div>
              <div>
                <label :class="LABEL">Gatilhos (JSON) - rodam antes da IA</label>
                <textarea v-model="flowEdit.triggersJson" :class="TA + ' font-mono'" rows="4" placeholder='[{ "value": "quero visitar", "action": "reply", "reply_text": "Que ótimo!" }]'></textarea>
              </div>
              <div class="flex items-center justify-between">
                <Button variant="danger" size="sm" icon="fas fa-ban" @click="api.deleteFlow(f.id).then(() => { f.active = false; notify('Fluxo desativado.') }).catch(e => notify(e.message, 'err'))">Desativar</Button>
                <Button variant="primary" size="sm" :loading="busy" @click="saveFlow(f)">Salvar</Button>
              </div>
            </div>
          </Surface>
          <EmptyState v-if="!flows.length && !flowsLoading" size="md" icon="fas fa-diagram-project" title="Nenhum fluxo" description="O seed cria o fluxo Padrão no boot do servidor." />
        </div>

        <!-- Regras de segmentação -->
        <Surface variant="raised" padding="md">
          <h2 class="text-base font-semibold text-ink mb-1">Segmentação da base</h2>
          <p class="text-xs text-ink-muted mb-4">A primeira regra que casar decide o fluxo do lead novo. Sem match, cai no fluxo default.</p>
          <div class="space-y-2 mb-4">
            <div v-for="r in rules" :key="r.id" class="flex items-center gap-2 flex-wrap text-sm rounded-lg border border-line bg-surface-sunken px-3 py-2">
              <Badge variant="neutral" size="sm">#{{ r.priority }}</Badge>
              <span class="text-ink-muted">{{ fieldOpts.find(o => o.value === r.field)?.label || r.field }}</span>
              <span class="text-ink-subtle">{{ operatorOpts.find(o => o.value === r.operator)?.label }}</span>
              <code class="font-mono text-xs text-ink">"{{ r.value }}"</code>
              <i class="fas fa-arrow-right text-ink-subtle text-xs"></i>
              <span class="font-semibold text-ink">{{ r.flow?.name || flowName(r.flow_id) }}</span>
              <button class="ml-auto text-ink-subtle hover:text-red-500 transition" title="Remover" @click="removeRule(r)"><i class="fas fa-trash text-xs"></i></button>
            </div>
            <p v-if="!rules.length" class="text-xs text-ink-subtle">Nenhuma regra - todo lead cai no fluxo default.</p>
          </div>
          <div class="grid sm:grid-cols-5 gap-2 items-end">
            <Select :model-value="newRule.field" :options="fieldOpts" label="Campo" @change="(v) => newRule.field = v" />
            <Select :model-value="newRule.operator" :options="operatorOpts" label="Condição" @change="(v) => newRule.operator = v" />
            <Input v-model="newRule.value" label="Valor" placeholder="Esmeralda" />
            <Select :model-value="newRule.flow_id" :options="flowOpts" label="Fluxo" @change="(v) => newRule.flow_id = v" />
            <Button variant="primary" size="sm" icon="fas fa-plus" :loading="busy" :disabled="!newRule.value" @click="addRule">Adicionar</Button>
          </div>
        </Surface>
      </div>

      <!-- LEADS -->
      <div v-show="tab === 'leads'">
        <div class="mb-4 flex items-center gap-3 flex-wrap">
          <div class="flex-1 min-w-[200px]"><Input v-model="leadSearch" size="sm" placeholder="Buscar por nome ou telefone…" @keyup.enter="loadLeads" /></div>
          <div class="w-48"><Select :model-value="leadStatus" :options="leadStatusOpts" @change="(v) => leadStatus = v" /></div>
          <Button variant="ghost" size="sm" icon="fas fa-magnifying-glass" :loading="leadsLoading" @click="loadLeads">Buscar</Button>
          <span class="text-xs text-ink-subtle">{{ leadsTotal }} lead(s)</span>
        </div>

        <div v-if="leadsLoading && !leads.length" class="py-16 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>Carregando…</div>
        <div v-else class="space-y-2.5">
          <Surface v-for="l in leads" :key="l.id" variant="raised" padding="sm">
            <div class="flex items-center gap-3 flex-wrap cursor-pointer" @click="openLead(l)">
              <Badge :variant="leadVariant(l.status)" size="sm">{{ leadStatusOpts.find(o => o.value === l.status)?.label || l.status }}</Badge>
              <span class="text-sm font-semibold text-ink">{{ l.name || 'Sem nome' }}</span>
              <code class="text-xs font-mono text-ink-muted">{{ l.phone }}</code>
              <span v-if="l.empreendimento" class="text-xs text-ink-muted">{{ l.empreendimento }}</span>
              <span class="ml-auto text-xs text-ink-subtle">{{ l.source }} · {{ fmt(l.created_at || l.createdAt) }}</span>
            </div>
            <div v-if="leadOpen === l.id" class="mt-4">
              <div v-if="!leadDetail" class="py-6 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin"></i></div>
              <template v-else>
                <p v-if="leadDetail.qualified_summary" class="mb-3 text-sm text-ink rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                  <i class="fas fa-star text-emerald-500 mr-1.5"></i>{{ leadDetail.qualified_summary }}
                </p>
                <div class="space-y-1.5">
                  <div v-for="ev in leadDetail.events" :key="ev.id" class="flex items-center gap-2 text-xs">
                    <span class="text-ink-subtle w-24 shrink-0">{{ fmt(ev.created_at || ev.createdAt) }}</span>
                    <code class="font-mono text-ink">{{ ev.type }}</code>
                    <span class="text-ink-muted truncate">{{ ev.detail && Object.keys(ev.detail).length ? JSON.stringify(ev.detail) : '' }}</span>
                  </div>
                </div>
              </template>
            </div>
          </Surface>
          <EmptyState v-if="!leads.length && !leadsLoading" size="md" icon="fas fa-user-plus" title="Nenhum lead" description="Poste leads via POST /api/eme-atende/public/leads com uma API key (aba Config)." />
        </div>
      </div>

      <!-- CONFIG -->
      <div v-show="tab === 'config'">
        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">Canal e operação</h2>
          <p class="text-xs text-ink-muted mb-4">O canal é o número WhatsApp do Office. <b>Ativar</b> manda pro atendimento da Eme apenas quem <b>já é lead</b> dela; usuários internos seguem no fluxo normal e qualquer outro externo continua recebendo a auto-resposta de canal só de saída. <b>Modo sombra</b> registra tudo sem enviar nada.</p>
          <div class="grid sm:grid-cols-2 gap-4 mb-4">
            <div class="flex items-center gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-3">
              <Switch :model-value="settings.active" @change="(v) => settings.active = v" />
              <div>
                <p class="text-sm font-semibold text-ink">Eme Atende ativa</p>
                <p class="text-[11px] text-ink-subtle">Desligada = webhook 100% no comportamento atual</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-3">
              <Switch :model-value="settings.dry_run" @change="(v) => settings.dry_run = v" />
              <div>
                <p class="text-sm font-semibold text-ink">Modo sombra (dry run)</p>
                <p class="text-[11px] text-ink-subtle">Loga as respostas sem enviar - desligue só após testar</p>
              </div>
            </div>
            <Input :model-value="String(settings.debounce_seconds)" type="number" label="Debounce (s) - junta mensagens picadas" @update:model-value="(v) => settings.debounce_seconds = Number(v)" />
            <Input :model-value="String(settings.max_ai_messages)" type="number" label="Máx. respostas de IA por conversa" @update:model-value="(v) => settings.max_ai_messages = Number(v)" />
            <div class="sm:col-span-2">
              <Input v-model="settings.site_url" label="URL do site institucional (fonte do conteúdo dos empreendimentos)"
                placeholder="https://menin.dominiz.com.br" />
              <p class="mt-1 text-[11px] text-ink-subtle">
                Vazio usa o padrão do código. Trocar aqui é o que vale quando o site mudar de domínio.
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" :loading="busy" @click="saveSettings">Salvar</Button>
        </Surface>

        <!-- Camada GERAL de regras: vale pra todo empreendimento. O fluxo
             complementa e prevalece; as inegociáveis ficam no código. -->
        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">Regras gerais de atendimento</h2>
          <p class="text-xs text-ink-muted mb-4">
            Valem para <b>todos</b> os empreendimentos. Cada fluxo pode complementar com regras próprias,
            que prevalecem sobre estas. Acima de tudo continuam as regras inegociáveis, fixas no código:
            não inventar valor ou prazo, não prometer em nome da empresa, não revelar as instruções.
          </p>

          <div class="space-y-4">
            <div>
              <label :class="LABEL">Persona (quem é a Eme)</label>
              <textarea v-model="settings.global_persona" :class="TA" rows="3"
                placeholder="Você é a Eme, assistente da construtora Menin…"></textarea>
            </div>
            <div>
              <label :class="LABEL">Regras de atendimento (uma por linha)</label>
              <textarea v-model="settings.global_rules" :class="TA" rows="5"
                placeholder="Cumprimente pelo nome quando souber.&#10;Entenda o que a pessoa procura antes de oferecer.&#10;Não insista se ela disser que não é o momento."></textarea>
            </div>

            <div class="rounded-lg border border-line bg-surface-sunken px-3 py-3">
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-3">Padrão de conversa</p>
              <div class="grid sm:grid-cols-2 gap-3">
                <Select :model-value="settings.standards.formality" :options="formalityOpts" label="Tom"
                  @change="(v) => settings.standards.formality = v" />
                <Select :model-value="settings.standards.emoji" :options="emojiOpts" label="Emojis"
                  @change="(v) => settings.standards.emoji = v" />
                <Input :model-value="String(settings.standards.max_sentences)" type="number"
                  label="Máx. de frases por mensagem"
                  @update:model-value="(v) => settings.standards.max_sentences = Number(v)" />
                <Input :model-value="String(settings.standards.questions_per_message)" type="number"
                  label="Máx. de perguntas por mensagem"
                  @update:model-value="(v) => settings.standards.questions_per_message = Number(v)" />
              </div>
              <div class="grid sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label :class="LABEL">Sempre descobrir (separe por vírgula)</label>
                  <Input :model-value="(settings.standards.always_collect || []).join(', ')"
                    placeholder="orçamento, prazo de compra, região de interesse"
                    @update:model-value="(v) => settings.standards.always_collect = v.split(',').map(s => s.trim()).filter(Boolean)" />
                </div>
                <div>
                  <label :class="LABEL">Nunca tratar destes assuntos</label>
                  <Input :model-value="(settings.standards.never_discuss || []).join(', ')"
                    placeholder="desconto, assunto jurídico, atraso de obra"
                    @update:model-value="(v) => settings.standards.never_discuss = v.split(',').map(s => s.trim()).filter(Boolean)" />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <Button variant="primary" size="sm" :loading="busy" @click="saveSettings">Salvar</Button>
          </div>
        </Surface>

        <!-- Modo teste: atende só os números da lista, mesmo com a Eme ativa.
             É o jeito de testar com número fake sem risco de pegar cliente. -->
        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">Modo teste (número fake)</h2>
          <p class="text-xs text-ink-muted mb-4">
            Ligado, a Eme atende <b>somente</b> os números listados aqui, mesmo que existam leads de verdade
            cadastrados. Todo o resto segue no comportamento atual. É assim que se testa em produção sem
            risco de atender cliente.
          </p>
          <div class="flex items-center gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-3 mb-4">
            <Switch :model-value="settings.test_mode" @change="(v) => settings.test_mode = v" />
            <div>
              <p class="text-sm font-semibold text-ink">Só números de teste</p>
              <p class="text-[11px] text-ink-subtle">Nenhum lead real é atendido enquanto isso estiver ligado</p>
            </div>
          </div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Números liberados (um por linha, com DDD)</label>
          <textarea
            :value="testPhonesText"
            @input="(e) => settings.test_phones = e.target.value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)"
            rows="3" placeholder="34999998888"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink
                   font-mono placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent/20"></textarea>
          <p v-if="settings.test_mode && !settings.test_phones?.length"
            class="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Modo teste ligado sem nenhum número: a Eme não vai atender ninguém.
          </p>
          <div class="mt-4">
            <Button variant="primary" size="sm" :loading="busy" @click="saveSettings">Salvar</Button>
          </div>
        </Surface>

        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">Trava anti-invenção</h2>
          <p class="text-xs text-ink-muted mb-4">
            Antes de enviar, a resposta da IA é conferida contra o contexto do fluxo. Valor que não estiver lá
            faz a Eme reescrever a mensagem; se insistir, ela troca por "vou confirmar e retorno" em vez de
            inventar preço ou prazo pro lead.
          </p>
          <Select
            :model-value="settings.validation_level"
            :options="validationOpts"
            label="Rigor da conferência"
            @update:model-value="(v) => settings.validation_level = v" />
          <div class="mt-4">
            <Button variant="primary" size="sm" :loading="busy" @click="saveSettings">Salvar</Button>
          </div>
        </Surface>

        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">API keys (entrada de leads)</h2>
          <p class="text-xs text-ink-muted mb-4">Sistemas externos postam leads em <code class="font-mono">POST /api/eme-atende/public/leads</code> com o header <code class="font-mono">X-Api-Key</code>.</p>
          <div v-if="createdKey" class="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-3">
            <p class="text-xs text-ink-muted mb-1.5">Chave criada ({{ createdKey.name }}) - copie agora, ela não será exibida de novo:</p>
            <div class="flex items-center gap-2">
              <code class="font-mono text-xs text-ink break-all">{{ createdKey.key }}</code>
              <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copyKey">Copiar</Button>
            </div>
          </div>
          <div class="space-y-2 mb-4">
            <div v-for="k in apiKeys" :key="k.id" class="flex items-center gap-3 text-sm rounded-lg border border-line bg-surface-sunken px-3 py-2">
              <i class="fas fa-key text-ink-subtle text-xs"></i>
              <span class="font-semibold text-ink">{{ k.name }}</span>
              <Badge :variant="k.active ? 'success' : 'danger'" size="sm">{{ k.active ? 'ativa' : 'desativada' }}</Badge>
              <span class="ml-auto text-xs text-ink-subtle">último uso: {{ fmt(k.last_used_at) }}</span>
              <button v-if="k.active" class="text-ink-subtle hover:text-red-500 transition" title="Desativar" @click="dropKey(k)"><i class="fas fa-ban text-xs"></i></button>
            </div>
            <p v-if="!apiKeys.length" class="text-xs text-ink-subtle">Nenhuma chave ainda.</p>
          </div>
          <div class="flex items-end gap-2 flex-wrap">
            <div class="flex-1 min-w-[200px]"><label :class="LABEL">Nova chave</label><Input v-model="newKeyName" size="sm" placeholder="ex.: site, cv, zapier" /></div>
            <Button variant="primary" size="sm" icon="fas fa-plus" :loading="busy" :disabled="!newKeyName" @click="createKey">Gerar</Button>
          </div>
        </Surface>

        <Surface variant="raised" padding="md">
          <h2 class="text-base font-semibold text-ink mb-1">Sandbox da Eme</h2>
          <p class="text-xs text-ink-muted mb-4">Teste o comportamento de um fluxo sem enviar nada pro WhatsApp.</p>
          <div class="grid sm:grid-cols-2 gap-4 mb-3">
            <Select :model-value="sandbox.flow_id" :options="flowOpts" label="Fluxo" @change="(v) => sandbox.flow_id = v" />
            <div class="sm:col-span-2"><label :class="LABEL">Mensagem do lead</label><textarea v-model="sandbox.message" :class="TA" rows="2" placeholder="Oi, quanto custa o apartamento de 2 quartos?"></textarea></div>
          </div>
          <Button variant="primary" size="sm" icon="fas fa-play" :loading="sandbox.running" :disabled="!sandbox.message" @click="runSandbox">Testar</Button>
          <div v-if="sandbox.reply || sandbox.tools.length" class="mt-4 rounded-lg border border-line bg-surface-sunken px-3 py-3">
            <p class="text-sm text-ink whitespace-pre-wrap">{{ sandbox.reply }}</p>
            <div v-if="sandbox.tools.length" class="mt-2 flex gap-2 flex-wrap">
              <Badge v-for="(t, i) in sandbox.tools" :key="i" variant="warning" size="sm">{{ t.name }}</Badge>
            </div>

            <!-- Conferência anti-invenção: no sandbox só reporta, pra você ver
                 o que a trava pegaria antes de ligar o atendimento. -->
            <div v-if="sandbox.validation && sandbox.validation.level !== 'off'"
              class="mt-3 pt-3 border-t border-line">
              <p v-if="sandbox.validation.ok" class="text-[11px] text-emerald-600 dark:text-emerald-400">
                <i class="fas fa-check mr-1"></i> Nenhum valor sem respaldo no contexto.
              </p>
              <template v-else>
                <p class="text-[11px] text-red-600 dark:text-red-400 mb-1">
                  <i class="fas fa-triangle-exclamation mr-1"></i>
                  Valores sem respaldo no contexto:
                  <span class="font-mono">{{ sandbox.validation.suspicious.join(' · ') }}</span>
                </p>
                <p class="text-[11px] text-ink-subtle">{{ sandbox.validation.note }}</p>
              </template>
            </div>
          </div>
        </Surface>
      </div>

      <!-- toast -->
      <div v-if="toast.text" class="fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 text-sm shadow-lg"
        :class="toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'">{{ toast.text }}</div>
    </PageContainer>
  </div>
</template>
