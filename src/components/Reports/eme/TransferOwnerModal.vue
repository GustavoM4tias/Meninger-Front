<script setup>
// Transferir a responsabilidade de um relatório para outra pessoa.
// Usado principalmente quando o dono saiu da empresa — o relatório continua
// visível para quem tem acesso, mas precisa de alguém que possa editá-lo.
import { ref, computed, watch } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import Input from '@/components/UI/Input.vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  report: { type: Object, default: null },
})
const emit = defineEmits(['close', 'transferred'])

const loading = ref(false)
const saving = ref(false)
const users = ref([])
const search = ref('')
const selected = ref(null)
const keepPreviousAccess = ref(true)
const error = ref('')

const previousOwner = computed(() => props.report?.owner?.username || null)
const ownerInactive = computed(() => props.report?.owner && props.report.owner.status === false)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter((u) => !q || u.username?.toLowerCase().includes(q))
})

watch(() => props.open, async (v) => {
  if (!v || !props.report) return
  search.value = ''
  selected.value = null
  error.value = ''
  keepPreviousAccess.value = true
  loading.value = true
  try {
    const data = await requestWithAuth(`/reports/${props.report.id}/share-options`)
    users.value = (data.users || []).filter((u) => u.id !== props.report.ownerId)
  } catch (e) {
    error.value = e.payload?.error || e.message
  } finally {
    loading.value = false
  }
})

async function confirm() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  try {
    const r = await requestWithAuth(`/reports/${props.report.id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: selected.value,
        keep_previous_access: keepPreviousAccess.value,
      }),
    })
    emit('transferred', r)
    emit('close')
  } catch (e) {
    error.value = e.payload?.error || e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal
    :open="open"
    title="Transferir responsabilidade"
    :subtitle="report?.title"
    size="md"
    @close="emit('close')"
  >
    <div v-if="loading" class="py-8 text-center text-ink-subtle text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2" /> Carregando...
    </div>

    <div v-else class="space-y-4">
      <p v-if="ownerInactive" class="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
        <i class="fas fa-user-slash mt-0.5" />
        <span>
          <strong>{{ previousOwner }}</strong> está inativo no sistema. O relatório continua
          visível para quem tem acesso - só falta alguém que possa editá-lo.
        </span>
      </p>

      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-1.5">Novo responsável</p>
        <Input v-model="search" placeholder="Buscar usuário..." size="sm" icon-left="fas fa-magnifying-glass" />
        <div class="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-line/70">
          <button
            v-for="u in filtered" :key="u.id"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-sunken transition"
            :class="selected === u.id ? 'bg-accent-soft' : ''"
            @click="selected = u.id"
          >
            <i :class="selected === u.id ? 'fas fa-circle-dot text-accent' : 'far fa-circle text-ink-subtle'" />
            <span class="text-ink">{{ u.username }}</span>
            <span v-if="u.position" class="ml-auto text-[11px] text-ink-subtle">{{ u.position }}</span>
          </button>
          <p v-if="!filtered.length" class="px-3 py-4 text-xs text-ink-subtle text-center">Nenhum usuário ativo encontrado.</p>
        </div>
      </div>

      <label v-if="previousOwner && !ownerInactive" class="flex items-start gap-2 text-xs text-ink rounded-xl border border-line bg-surface-raised px-3 py-2.5">
        <input v-model="keepPreviousAccess" type="checkbox" class="mt-0.5 accent-[rgb(var(--accent))]" />
        Manter <strong>{{ previousOwner }}</strong> com acesso de leitura ao relatório.
      </label>

      <p class="text-xs text-ink-subtle">
        O novo responsável passa a poder editar, publicar e compartilhar. Quem já tinha acesso continua com ele.
      </p>

      <p v-if="error" class="rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm px-3 py-2">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('close')">Cancelar</Button>
        <Button variant="primary" :loading="saving" :disabled="!selected" @click="confirm">
          Transferir
        </Button>
      </div>
    </template>
  </Modal>
</template>
