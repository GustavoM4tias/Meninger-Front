<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import * as api from '@/utils/Whatsapp/apiAutomations'

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

const TA = 'w-full rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-[12.5px] font-mono leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent-ring/30 focus:border-accent/40 transition resize-y'
const LABEL = 'block text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5'

const tab = ref('automations')
const loading = ref(true)
const busy = ref(false)
const toast = reactive({ text: '', type: 'ok' })

const automations = ref([])
const events = ref([])
const editId = ref(null)
const json = reactive({ variableMapping: '', buttons: '', replyActions: '', recipients: '' })
const newName = ref('')
const conn = reactive({ busy: false, msg: '', ok: null })

const templates = ref([])
const tmplLoading = ref(false)
const tmpl = reactive({ name: '', category: 'UTILITY', language: 'pt_BR', headerText: '', body: '', footerText: '', buttons: 'SIM, NÃO', examples: '' })

const tabOpts = [
  { value: 'automations', label: 'Automações', icon: 'fas fa-bolt' },
  { value: 'templates', label: 'Templates', icon: 'fas fa-file-lines' },
]
const triggerOptions = [
  { value: 'manual', label: 'Manual / interno' },
  { value: 'event', label: 'Evento' },
  { value: 'schedule', label: 'Agenda (cron)' },
]
const categoryOptions = [
  { value: 'UTILITY', label: 'UTILITY' },
  { value: 'MARKETING', label: 'MARKETING' },
  { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
]
const eventOptions = () => events.value.map(e => ({ value: e.value, label: e.label }))

function notify(text, type = 'ok') {
  toast.text = text; toast.type = type
  setTimeout(() => { if (toast.text === text) toast.text = '' }, 3500)
}
const trigVariant = (t) => ({ event: 'info', schedule: 'accent', manual: 'neutral' }[t] || 'neutral')
const statusVariant = (s) => ({ APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', DISABLED: 'danger' }[String(s || '').toUpperCase()] || 'neutral')
const pretty = (v) => JSON.stringify(v || {}, null, 2)

async function load() {
  loading.value = true
  try {
    const data = await api.listAutomations()
    automations.value = data.automations || []
    events.value = data.events || []
  } catch (e) { notify(e.message, 'err') } finally { loading.value = false }
}

// ── Automações ──
function openEdit(a) {
  if (editId.value === a.id) { editId.value = null; return }
  editId.value = a.id
  if (!a.triggerConfig) a.triggerConfig = {}
  json.variableMapping = pretty(a.variableMapping)
  json.buttons = pretty(a.buttons)
  json.replyActions = pretty(a.replyActions)
  json.recipients = pretty(a.recipients)
}
function parseJson(label, str) {
  const s = String(str || '').trim()
  if (!s) return null
  try { return JSON.parse(s) } catch { throw new Error(`JSON inválido em "${label}".`) }
}
async function save(a) {
  busy.value = true
  try {
    const payload = {
      name: a.name, description: a.description, enabled: a.enabled,
      triggerType: a.triggerType, triggerConfig: a.triggerConfig || {},
      templateName: a.templateName, templateLanguage: a.templateLanguage, category: a.category,
      variableMapping: parseJson('Mapeamento de variáveis', json.variableMapping),
      buttons: parseJson('Botões', json.buttons),
      replyActions: parseJson('Ações de resposta', json.replyActions),
      recipients: parseJson('Destinatários', json.recipients),
    }
    const { automation } = await api.updateAutomation(a.id, payload)
    Object.assign(a, automation)
    notify('Automação salva.')
    editId.value = null
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function toggle(a, enabled) {
  const prev = a.enabled; a.enabled = enabled
  try { await api.updateAutomation(a.id, { enabled }) }
  catch (e) { notify(e.message, 'err'); a.enabled = prev }
}
async function createNew() {
  if (!newName.value.trim()) return
  busy.value = true
  try {
    const { automation } = await api.createAutomation({ name: newName.value.trim(), triggerType: 'event' })
    automations.value.push(automation)
    newName.value = ''
    notify('Automação criada.')
    openEdit(automation)
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}
async function remove(a) {
  if (!confirm(`Excluir a automação "${a.name}"?`)) return
  try { await api.deleteAutomation(a.id); automations.value = automations.value.filter(x => x.id !== a.id) }
  catch (e) { notify(e.message, 'err') }
}

// ── Conexão do webhook (subscribed_apps) ──
async function connectWebhook() {
  conn.busy = true; conn.msg = ''
  try {
    const r = await api.connectWebhook()
    conn.ok = !!r.subscribed
    conn.msg = r.subscribed
      ? 'Conectado ✓ - toque SIM num alerta novo, agora deve chegar.'
      : 'Comando enviado. Teste tocar SIM.'
    notify(r.subscribed ? 'WhatsApp conectado ao webhook!' : 'Comando enviado.')
  } catch (e) { conn.ok = false; conn.msg = e.message; notify(e.message, 'err') }
  finally { conn.busy = false }
}

// ── Templates ──
async function loadTemplates() {
  tmplLoading.value = true
  try { const d = await api.listTemplates(); templates.value = d.templates || [] }
  catch (e) { notify(e.message, 'err') } finally { tmplLoading.value = false }
}
async function submitTemplate() {
  if (!tmpl.name.trim() || !tmpl.body.trim()) { notify('Nome e corpo são obrigatórios.', 'err'); return }
  busy.value = true
  try {
    await api.createTemplate({
      name: tmpl.name, category: tmpl.category, language: tmpl.language,
      headerText: tmpl.headerText || undefined, body: tmpl.body, footerText: tmpl.footerText || undefined,
      buttons: tmpl.buttons.split(',').map(s => s.trim()).filter(Boolean).map(text => ({ text })),
      examples: tmpl.examples.split(',').map(s => s.trim()).filter(Boolean),
    })
    notify('Template enviado para aprovação da Meta. Sincronize em alguns minutos.')
    tmpl.name = ''; tmpl.body = ''
    loadTemplates()
  } catch (e) { notify(e.message, 'err') } finally { busy.value = false }
}

watch(tab, (t) => { if (t === 'templates' && !templates.value.length) loadTemplates() })
onMounted(load)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader title="Automações WhatsApp" subtitle="Configure quais templates disparam, com quais variáveis, botões e ações - sem código." icon="fab fa-whatsapp" />

      <div class="mb-5"><SegmentedControl :model-value="tab" :options="tabOpts" @change="(v) => tab = v" /></div>

      <!-- AUTOMAÇÕES -->
      <div v-show="tab === 'automations'">
        <Surface variant="raised" padding="sm" class="mb-3" :class="conn.ok ? 'border-emerald-500/40' : ''">
          <div class="flex items-center gap-3 flex-wrap">
            <i class="fab fa-whatsapp text-emerald-500 text-lg"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">Conexão do webhook</p>
              <p class="text-xs text-ink-muted">Recebe o alerta mas o "SIM" não volta? Clique aqui - conecta sua conta ao webhook (subscribed_apps) usando o token já salvo.</p>
            </div>
            <div class="ml-auto flex items-center gap-3">
              <span v-if="conn.msg" class="text-xs" :class="conn.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ conn.msg }}</span>
              <Button variant="primary" size="sm" icon="fas fa-plug" :loading="conn.busy" @click="connectWebhook">Conectar ao webhook</Button>
            </div>
          </div>
        </Surface>

        <Surface variant="raised" padding="sm" class="mb-5">
          <div class="flex items-end gap-2 flex-wrap">
            <div class="flex-1 min-w-[200px]"><label :class="LABEL">Nova automação</label><Input v-model="newName" size="sm" placeholder="Nome da automação" /></div>
            <Button variant="primary" size="sm" icon="fas fa-plus" :loading="busy" :disabled="!newName" @click="createNew">Criar</Button>
          </div>
        </Surface>

        <div v-if="loading" class="py-16 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>Carregando…</div>

        <div v-else class="space-y-2.5">
          <Surface v-for="a in automations" :key="a.id" variant="raised" padding="sm" :class="!a.enabled ? 'opacity-60' : ''">
            <div class="flex items-center gap-3 flex-wrap">
              <Badge :variant="trigVariant(a.triggerType)" size="sm">{{ a.triggerType }}</Badge>
              <span class="text-sm font-semibold text-ink">{{ a.name }}</span>
              <code v-if="a.templateName" class="text-xs font-mono text-ink-muted">{{ a.templateName }}</code>
              <Badge v-if="a.isSystem" variant="neutral" size="sm">sistema</Badge>
              <div class="ml-auto flex items-center gap-2">
                <Switch :model-value="a.enabled" size="sm" @change="(v) => toggle(a, v)" />
                <Button variant="ghost" size="sm" @click="openEdit(a)">{{ editId === a.id ? 'Fechar' : 'Editar' }}</Button>
              </div>
            </div>

            <div v-if="editId === a.id" class="mt-4 space-y-4">
              <div class="grid sm:grid-cols-2 gap-4">
                <Input v-model="a.name" label="Nome" />
                <Select :model-value="a.triggerType" :options="triggerOptions" label="Gatilho" @change="(v) => a.triggerType = v" />
                <Select v-if="a.triggerType === 'event'" :model-value="a.triggerConfig.event" :options="eventOptions()" label="Evento" @change="(v) => a.triggerConfig.event = v" />
                <Input v-else-if="a.triggerType === 'schedule'" v-model="a.triggerConfig.cron" label="Cron" placeholder="0 8 * * *" />
                <div v-else></div>
                <Input v-model="a.templateName" label="Template (nome aprovado na Meta)" />
                <Input v-model="a.templateLanguage" label="Idioma do template" placeholder="pt_BR" />
                <Select :model-value="a.category" :options="categoryOptions" label="Categoria" @change="(v) => a.category = v" />
              </div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div><label :class="LABEL">Mapeamento de variáveis (JSON)</label><textarea v-model="json.variableMapping" :class="TA" rows="4" placeholder='{ "1": "owner.username", "2": "title" }'></textarea></div>
                <div><label :class="LABEL">Destinatários (JSON)</label><textarea v-model="json.recipients" :class="TA" rows="4" placeholder='{ "mode": "owner" }'></textarea></div>
                <div><label :class="LABEL">Botões (JSON)</label><textarea v-model="json.buttons" :class="TA" rows="4" placeholder='[{ "text": "SIM", "action": "yes" }]'></textarea></div>
                <div><label :class="LABEL">Ações de resposta (JSON)</label><textarea v-model="json.replyActions" :class="TA" rows="4" placeholder='{ "yes": { "type": "send_report" } }'></textarea></div>
              </div>
              <div class="flex items-center justify-between">
                <Button v-if="!a.isSystem" variant="danger" size="sm" icon="fas fa-trash" @click="remove(a)">Excluir</Button>
                <span v-else class="text-xs text-ink-subtle">Automação de sistema - editável, não deletável.</span>
                <Button variant="primary" size="sm" :loading="busy" @click="save(a)">Salvar</Button>
              </div>
            </div>
          </Surface>
          <EmptyState v-if="!automations.length" size="md" icon="fab fa-whatsapp" title="Nenhuma automação" description="Rode o seed (whatsapp_automation_seed.js) ou crie uma acima." />
        </div>
      </div>

      <!-- TEMPLATES -->
      <div v-show="tab === 'templates'">
        <Surface variant="raised" padding="md" class="mb-5">
          <h2 class="text-base font-semibold text-ink mb-1">Novo template</h2>
          <p class="text-xs text-ink-muted mb-4">Cabeçalho não aceita emoji/formatação. Corpo aceita *negrito*, _itálico_ e variáveis <code class="font-mono">&#123;&#123;1&#125;&#125;</code> (informe os exemplos). Vai para aprovação da Meta.</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <Input v-model="tmpl.name" label="Nome (a-z, números, _)" placeholder="meu_template_v1" />
            <Select :model-value="tmpl.category" :options="categoryOptions" label="Categoria" @change="(v) => tmpl.category = v" />
            <Input v-model="tmpl.language" label="Idioma" placeholder="pt_BR" />
            <Input v-model="tmpl.headerText" label="Cabeçalho (texto, opcional)" />
            <div class="sm:col-span-2"><label :class="LABEL">Corpo</label><textarea v-model="tmpl.body" :class="TA" rows="4" placeholder="Olá! Seu relatório está pronto…"></textarea></div>
            <Input v-model="tmpl.footerText" label="Rodapé (opcional)" />
            <Input v-model="tmpl.buttons" label="Botões quick-reply (vírgula, até 3)" placeholder="SIM, NÃO" />
            <div class="sm:col-span-2"><Input v-model="tmpl.examples" label="Exemplos das variáveis (vírgula, na ordem)" placeholder="Gustavo, Leads do dia" /></div>
          </div>
          <div class="mt-5"><Button variant="primary" :loading="busy" icon="fas fa-paper-plane" @click="submitTemplate">Enviar para aprovação</Button></div>
        </Surface>

        <div v-if="tmplLoading" class="py-12 text-center text-ink-subtle"><i class="fas fa-spinner animate-spin text-xl mb-2 block"></i>Carregando templates…</div>
        <div v-else class="space-y-2">
          <Surface v-for="t in templates" :key="t.id || t.name" variant="raised" padding="sm">
            <div class="flex items-center gap-3 flex-wrap">
              <code class="text-sm font-mono text-ink">{{ t.name }}</code>
              <span class="text-xs text-ink-subtle font-mono">{{ t.language }}</span>
              <Badge size="sm" variant="neutral">{{ t.category }}</Badge>
              <Badge size="sm" :variant="statusVariant(t.status)" class="ml-auto">{{ t.status || '-' }}</Badge>
            </div>
          </Surface>
          <EmptyState v-if="!templates.length" size="md" icon="fas fa-file-lines" title="Nenhum template" description="Crie um acima ou sincronize com a Meta na tela de Config do WhatsApp." />
        </div>
      </div>
    </PageContainer>

    <transition name="toast">
      <div v-if="toast.text" class="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-elevated text-sm font-medium border"
        :class="toast.type === 'err' ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'">
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all .25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
