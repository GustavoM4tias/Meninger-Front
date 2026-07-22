<script setup>
// Compartilhamento interno: escolhe usuários e/ou cargos do Office.
import { ref, computed, watch } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import Input from '@/components/UI/Input.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentAccess: { type: Array, default: () => [] }, // [{ userId, position }]
})
const emit = defineEmits(['close', 'saved'])

const store = useReportsStore()
const loading = ref(false)
const saving = ref(false)
const users = ref([])
const positions = ref([])
const search = ref('')
const selUsers = ref(new Set())
const selPositions = ref(new Set())

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter((u) => !q || u.username?.toLowerCase().includes(q))
})

watch(() => props.open, async (v) => {
  if (!v) return
  loading.value = true
  search.value = ''
  selUsers.value = new Set(props.currentAccess.filter((a) => a.userId).map((a) => a.userId))
  selPositions.value = new Set(props.currentAccess.filter((a) => a.position).map((a) => a.position))
  try {
    const data = await store.shareOptions()
    users.value = data.users || []
    positions.value = data.positions || []
  } finally {
    loading.value = false
  }
})

function toggleUser(id) {
  const s = new Set(selUsers.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selUsers.value = s
}
function togglePosition(p) {
  const s = new Set(selPositions.value)
  s.has(p) ? s.delete(p) : s.add(p)
  selPositions.value = s
}

async function save() {
  saving.value = true
  try {
    await store.shareInternal({ userIds: [...selUsers.value], positions: [...selPositions.value] })
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="Compartilhar internamente" subtitle="Quem pode visualizar este relatório no Office" size="md" @close="emit('close')">
    <div v-if="loading" class="py-8 text-center text-ink-subtle text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2" /> Carregando...
    </div>
    <div v-else class="space-y-4">
      <div v-if="positions.length">
        <p class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-1.5">Por cargo</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="p in positions" :key="p"
            class="px-3 py-1.5 rounded-full border text-xs transition"
            :class="selPositions.has(p) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-line text-ink-muted hover:border-accent/50'"
            @click="togglePosition(p)"
          >{{ p }}</button>
        </div>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-1.5">Por usuário</p>
        <Input v-model="search" placeholder="Buscar usuário..." size="sm" icon-left="fas fa-magnifying-glass" />
        <div class="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line/70">
          <button
            v-for="u in filteredUsers" :key="u.id"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-sunken transition"
            @click="toggleUser(u.id)"
          >
            <i :class="selUsers.has(u.id) ? 'fas fa-square-check text-accent' : 'far fa-square text-ink-subtle'" />
            <span class="text-ink">{{ u.username }}</span>
            <span v-if="u.position" class="ml-auto text-[11px] text-ink-subtle">{{ u.position }}</span>
          </button>
          <p v-if="!filteredUsers.length" class="px-3 py-4 text-xs text-ink-subtle text-center">Nenhum usuário encontrado.</p>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-ink-subtle">{{ selUsers.size }} usuário(s) · {{ selPositions.size }} cargo(s)</p>
        <div class="flex gap-2">
          <Button variant="ghost" @click="emit('close')">Cancelar</Button>
          <Button variant="primary" :loading="saving" @click="save">Salvar</Button>
        </div>
      </div>
    </template>
  </Modal>
</template>
