<script setup>
// Confirmação de exclusão mostrando o IMPACTO REAL: quem perde acesso, se há
// link público ativo (que morre na hora) e quantas versões publicadas vão junto.
// A exclusão é reversível por 30 dias na lixeira.
import { ref, computed, watch } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  reportId: { type: String, default: null },
})
const emit = defineEmits(['close', 'deleted'])

const store = useReportsStore()
const loading = ref(false)
const deleting = ref(false)
const impact = ref(null)
const error = ref('')

const hasAudience = computed(() =>
  (impact.value?.peopleCount || 0) > 0 || (impact.value?.positions?.length || 0) > 0
)

watch(() => props.open, async (v) => {
  if (!v || !props.reportId) return
  impact.value = null
  error.value = ''
  loading.value = true
  try {
    impact.value = await store.deletionImpact(props.reportId)
  } catch (e) {
    error.value = e.payload?.error || e.message
  } finally {
    loading.value = false
  }
})

async function confirm() {
  deleting.value = true
  try {
    await store.deleteReport(props.reportId)
    emit('deleted', impact.value?.title)
    emit('close')
  } catch (e) {
    error.value = e.payload?.error || e.message
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Modal :open="open" title="Excluir relatório" size="md" @close="emit('close')">
    <div v-if="loading" class="py-8 text-center text-ink-subtle text-sm">
      <i class="fas fa-circle-notch fa-spin mr-2" /> Verificando o que será afetado...
    </div>

    <div v-else-if="impact" class="space-y-4">
      <p class="text-sm text-ink">
        Excluir <strong>{{ impact.title }}</strong>?
      </p>

      <!-- Impacto -->
      <ul class="rounded-xl border border-line bg-surface-raised divide-y divide-line/70 text-sm">
        <li v-if="impact.hasPublicLink" class="flex items-start gap-2.5 px-4 py-2.5">
          <i class="fas fa-globe text-amber-500 mt-0.5 w-4 text-center flex-shrink-0" />
          <span class="text-ink">
            O <strong>link público será desativado imediatamente</strong>.
            <span v-if="impact.publicViews" class="text-ink-subtle">Teve {{ impact.publicViews }} acesso(s).</span>
            <span class="block text-xs text-ink-subtle mt-0.5">Quem tiver o endereço verá "relatório indisponível".</span>
          </span>
        </li>
        <li v-if="hasAudience" class="flex items-start gap-2.5 px-4 py-2.5">
          <i class="fas fa-users text-ink-subtle mt-0.5 w-4 text-center flex-shrink-0" />
          <span class="text-ink">
            <template v-if="impact.peopleCount">
              <strong>{{ impact.peopleCount }} pessoa(s)</strong> perdem o acesso
              <span class="text-ink-subtle">({{ impact.people.slice(0, 4).join(', ') }}<span v-if="impact.people.length > 4"> e mais {{ impact.people.length - 4 }}</span>)</span>.
            </template>
            <template v-if="impact.positions?.length">
              <span v-if="impact.peopleCount" class="block mt-0.5" />
              Cargos com acesso: <strong>{{ impact.positions.join(', ') }}</strong>.
            </template>
          </span>
        </li>
        <li v-if="impact.versions" class="flex items-start gap-2.5 px-4 py-2.5">
          <i class="fas fa-clock-rotate-left text-ink-subtle mt-0.5 w-4 text-center flex-shrink-0" />
          <span class="text-ink">{{ impact.versions }} versão(ões) publicada(s) vão junto.</span>
        </li>
        <li v-if="!impact.hasPublicLink && !hasAudience" class="flex items-start gap-2.5 px-4 py-2.5">
          <i class="fas fa-lock text-ink-subtle mt-0.5 w-4 text-center flex-shrink-0" />
          <span class="text-ink-muted">Este relatório é privado - ninguém além de você perde acesso.</span>
        </li>
      </ul>

      <!-- Reversibilidade -->
      <p class="flex items-start gap-2 rounded-xl bg-surface-sunken px-4 py-2.5 text-xs text-ink-muted">
        <i class="fas fa-trash-arrow-up mt-0.5 text-ink-subtle" />
        <span>
          Vai para a lixeira e pode ser restaurado por <strong class="text-ink">{{ impact.retentionDays }} dias</strong>.
          Depois disso é apagado de vez. Ao restaurar, o link público não volta sozinho - você gera um novo se precisar.
        </span>
      </p>

      <p v-if="error" class="rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm px-3 py-2">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('close')">Cancelar</Button>
        <Button variant="danger" :loading="deleting" :disabled="loading" @click="confirm">
          Mover para a lixeira
        </Button>
      </div>
    </template>
  </Modal>
</template>
