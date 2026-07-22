<script setup>
// Modal de link público em 2 passos (segurança):
//  Passo 1 — resumo do que será exposto + scan de PII (bloqueia se houver).
//  Passo 2 — vencimento obrigatório + checkbox de confirmação explícita.
//  Link ativo — copiar, renovar, rotacionar, revogar e auditoria de acessos.
import { ref, computed, watch } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const store = useReportsStore()
const loading = ref(false)
const step = ref(1)
const check = ref(null) // { summary, piiFindings, currentToken, expiresAt }
const expiresInDays = ref(30)
const confirmed = ref(false)
const piiAcknowledged = ref(false)
const activeToken = ref(null)
const copied = ref(false)
const log = ref(null)
const error = ref('')

const isPublic = computed(() => store.report?.visibility === 'public' && store.report?.publicToken)
const hasPii = computed(() => (check.value?.piiFindings || []).length > 0)
const expiryOptions = [7, 15, 30, 90]

watch(() => props.open, async (v) => {
  if (!v) return
  step.value = 1
  confirmed.value = false
  piiAcknowledged.value = false
  copied.value = false
  error.value = ''
  activeToken.value = store.report?.publicToken || null
  loading.value = true
  try {
    check.value = await store.publicCheck()
    if (isPublic.value) {
      log.value = await store.publicLog().catch(() => null)
      step.value = 3
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function enable() {
  error.value = ''
  loading.value = true
  try {
    const r = await store.enablePublic({
      expiresInDays: expiresInDays.value,
      confirmed: confirmed.value,
      piiAcknowledged: piiAcknowledged.value,
    })
    activeToken.value = r.token
    store.report.visibility = 'public'
    store.report.publicToken = r.token
    store.report.publicExpiresAt = r.expiresAt
    log.value = null
    step.value = 3
  } catch (e) {
    error.value = e.payload?.error || e.message
  } finally {
    loading.value = false
  }
}

async function rotate() {
  loading.value = true
  try {
    const r = await store.rotatePublicToken()
    activeToken.value = r.token
    store.report.publicToken = r.token
    copied.value = false
  } finally {
    loading.value = false
  }
}

async function renew() {
  loading.value = true
  try {
    const r = await store.renewPublic(expiresInDays.value)
    store.report.publicExpiresAt = r.expiresAt
    check.value = await store.publicCheck()
  } finally {
    loading.value = false
  }
}

async function revoke() {
  loading.value = true
  try {
    await store.revokePublic()
    store.report.visibility = 'internal'
    store.report.publicToken = null
    activeToken.value = null
    step.value = 1
    check.value = await store.publicCheck()
  } finally {
    loading.value = false
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(store.publicUrl(activeToken.value))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* clipboard indisponível */ }
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-')
</script>

<template>
  <Modal :open="open" title="Link público" size="md" @close="emit('close')">
    <div v-if="loading && !check" class="py-8 text-center text-ink-subtle text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2" /> Analisando o relatório...
    </div>

    <template v-else>
      <p v-if="error" class="mb-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm px-3 py-2">{{ error }}</p>

      <!-- PASSO 1: o que será exposto -->
      <div v-if="step === 1" class="space-y-4">
        <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <p class="font-semibold"><i class="fas fa-triangle-exclamation mr-1.5" />Atenção: conteúdo na internet</p>
          <p class="mt-1 text-xs">Qualquer pessoa com o link acessa este relatório SEM login. Revise o que será exposto.</p>
        </div>

        <div v-if="check?.summary" class="rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm space-y-1.5">
          <p><span class="text-ink-subtle">Relatório:</span> <span class="font-medium text-ink">{{ check.summary.title }}</span></p>
          <p v-if="check.summary.enterprise"><span class="text-ink-subtle">Empreendimento:</span> <span class="text-ink">{{ check.summary.enterprise }}</span></p>
          <p><span class="text-ink-subtle">Período:</span> <span class="text-ink">{{ fmtDate(check.summary.periodStart) }} a {{ check.summary.periodEnd ? fmtDate(check.summary.periodEnd) : 'aberto' }}</span></p>
          <p v-if="check.summary.sections?.length"><span class="text-ink-subtle">Seções:</span> <span class="text-ink">{{ check.summary.sections.join(', ') }}</span></p>
          <p v-if="check.summary.dataSources?.length"><span class="text-ink-subtle">Fontes de dados:</span> <span class="text-ink">{{ check.summary.dataSources.join(', ') }}</span></p>
        </div>

        <!-- Scan de PII -->
        <div v-if="hasPii" class="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm">
          <p class="font-semibold text-rose-600 dark:text-rose-400"><i class="fas fa-user-shield mr-1.5" />Dado pessoal detectado</p>
          <ul class="mt-1.5 space-y-1 text-xs text-rose-600/90 dark:text-rose-400/90">
            <li v-for="(f, i) in check.piiFindings" :key="i">
              {{ f.kind }}: {{ f.count }} ocorrência(s) - ex.: {{ f.samples.join(', ') }}
            </li>
          </ul>
          <p class="mt-2 text-xs text-ink-muted">Recomendado: peça à Eme para remover/agregar esses dados antes de publicar.</p>
          <label class="mt-2 flex items-start gap-2 text-xs text-ink">
            <input v-model="piiAcknowledged" type="checkbox" class="mt-0.5 accent-rose-500" />
            Entendo o risco e quero publicar mesmo assim.
          </label>
        </div>
        <div v-else class="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <i class="fas fa-circle-check" /> Nenhum dado pessoal identificável detectado.
        </div>
      </div>

      <!-- PASSO 2: vencimento + confirmação -->
      <div v-else-if="step === 2" class="space-y-4">
        <div>
          <p class="text-sm font-medium text-ink mb-2">Vencimento do link <span class="text-rose-500">*</span></p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="d in expiryOptions" :key="d"
              class="px-3 py-1.5 rounded-lg border text-sm transition"
              :class="expiresInDays === d ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-line text-ink-muted hover:border-accent/50'"
              @click="expiresInDays = d"
            >{{ d }} dias</button>
          </div>
          <p class="mt-1.5 text-xs text-ink-subtle">O link expira automaticamente - sem opção "para sempre". Você recebe um aviso 3 dias antes.</p>
        </div>
        <label class="flex items-start gap-2 text-sm text-ink rounded-xl border border-line bg-surface-raised px-4 py-3">
          <input v-model="confirmed" type="checkbox" class="mt-0.5 accent-[rgb(var(--accent))]" />
          Entendo que este conteúdo ficará acessível publicamente para qualquer pessoa com o link.
        </label>
      </div>

      <!-- PASSO 3: link ativo -->
      <div v-else class="space-y-4">
        <div class="flex items-center gap-2">
          <Badge variant="success" dot>Link ativo</Badge>
          <span class="text-xs text-ink-subtle">vence em {{ fmtDate(store.report?.publicExpiresAt || check?.expiresAt) }}</span>
        </div>
        <div class="flex items-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2.5">
          <i class="fas fa-link text-ink-subtle text-xs flex-shrink-0" />
          <span class="text-xs text-ink truncate font-mono">{{ store.publicUrl(activeToken) }}</span>
          <button class="ml-auto flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-accent text-white hover:bg-accent-hover transition" @click="copyUrl">
            <i :class="copied ? 'fas fa-check' : 'far fa-copy'" class="mr-1" />{{ copied ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button class="rounded-xl border border-line px-3 py-2 text-xs text-ink hover:border-accent hover:text-accent transition" @click="renew">
            <i class="fas fa-rotate mr-1.5" />Renovar +{{ expiresInDays }} dias
          </button>
          <button class="rounded-xl border border-line px-3 py-2 text-xs text-ink hover:border-accent hover:text-accent transition" @click="rotate">
            <i class="fas fa-arrows-spin mr-1.5" />Gerar novo link
          </button>
        </div>
        <div v-if="log" class="rounded-xl border border-line bg-surface-raised px-4 py-3">
          <p class="text-xs font-medium text-ink mb-1.5"><i class="fas fa-chart-simple mr-1.5 text-ink-subtle" />{{ log.views }} visualização(ões)</p>
          <p v-for="l in (log.logs || []).slice(0, 5)" :key="l.id" class="text-[11px] text-ink-subtle">
            {{ fmtDateTime(l.created_at || l.createdAt) }} · {{ l.ip }}
          </p>
        </div>
        <button class="w-full rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 px-3 py-2 text-xs hover:bg-rose-500/10 transition" @click="revoke">
          <i class="fas fa-ban mr-1.5" />Revogar link público agora
        </button>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('close')">Fechar</Button>
        <Button v-if="step === 1" variant="primary" :disabled="loading || (hasPii && !piiAcknowledged)" @click="step = 2">
          Continuar
        </Button>
        <Button v-else-if="step === 2" variant="primary" :loading="loading" :disabled="!confirmed" @click="enable">
          Gerar link público
        </Button>
      </div>
    </template>
  </Modal>
</template>
