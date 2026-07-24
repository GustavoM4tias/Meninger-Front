<script setup>
// Relatórios da Eme — lista (meus relatórios, compartilhados comigo, lixeira).
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/UI/PageContainer.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import PageHelp from '@/components/UI/PageHelp.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import DeleteReportModal from '@/components/Reports/eme/DeleteReportModal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const router = useRouter()
const store = useReportsStore()

const creating = ref(false)
const showTrash = ref(false)
const deleteId = ref(null)
// Aviso com desfazer, para saída de compartilhamento e exclusão
const flash = ref(null) // { text, undo: fn }

onMounted(() => store.fetchList())

async function novo() {
  creating.value = true
  try {
    const r = await store.createReport('Novo relatório')
    router.push(`/relatorios/${r.id}`)
  } finally {
    creating.value = false
  }
}

function showFlash(text, undo) {
  flash.value = { text, undo }
  setTimeout(() => { if (flash.value?.text === text) flash.value = null }, 8000)
}

function onDeleted(title) {
  showFlash(`"${title}" foi para a lixeira.`, null)
}

async function sairDoCompartilhado(r) {
  await store.dismissShared(r.id)
  showFlash(`"${r.title}" removido da sua lista.`, async () => {
    await store.undoDismissShared(r.id)
    flash.value = null
  })
}

async function abrirLixeira() {
  showTrash.value = true
  await store.fetchTrash()
}

async function restaurar(r) {
  await store.restoreReport(r.id)
  showFlash(`"${r.title}" restaurado.`, null)
}

async function excluirDeVez(r) {
  if (!window.confirm(`Excluir "${r.title}" definitivamente? Esta ação não pode ser desfeita.`)) return
  await store.purgeReport(r.id)
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')

const diasRestantes = (deletedAt) => {
  if (!deletedAt) return 30
  const passados = Math.floor((Date.now() - new Date(deletedAt)) / 86400000)
  return Math.max(0, 30 - passados)
}

const visBadge = (r) => {
  if (r.visibility === 'public') return { variant: 'warning', label: 'Público' }
  if (r.visibility === 'internal') return { variant: 'info', label: 'Interno' }
  return { variant: 'neutral', label: 'Privado' }
}

const trashCount = computed(() => store.trash.length)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios customizados gerados pela Eme com dados reais do Office"
        icon="fas fa-wand-magic-sparkles"
      >
        <template #actions>
          <PageHelp
            storage-key="relatorios"
            title="Como usar os Relatórios"
            intro="Aqui você cria relatórios profissionais conversando com a Eme: ela busca os dados reais (leads, pré-cadastros, reservas...) e monta o relatório visual para você."
            :steps="[
              'Toque em Novo relatório e diga à Eme o que quer ver (empreendimento, período e temas).',
              'Acompanhe a Eme buscando os dados e montando o relatório ao vivo.',
              'Peça ajustes pelo chat até ficar do seu jeito - dá para editar bloco por bloco.',
              'Toque em Publicar para congelar a versão oficial.',
              'Compartilhe: privado, interno (usuários/cargos) ou link público com vencimento.',
            ]"
            :tips="[
              'Relatório excluído vai para a lixeira e pode ser restaurado por 30 dias.',
              'Se compartilharem algo que você não quer acompanhar, use Remover da minha lista.',
              'O link público expira automaticamente e pode ser revogado a qualquer momento.',
            ]"
          />
          <Button v-if="store.isAdmin" variant="secondary" icon="far fa-trash-can" @click="abrirLixeira">
            <span class="hidden sm:inline">Lixeira</span>
          </Button>
          <Button v-if="store.isAdmin" variant="primary" icon="fas fa-plus" :loading="creating" @click="novo">
            Novo relatório
          </Button>
        </template>
      </PageHeader>

      <!-- Aviso com desfazer -->
      <Transition name="fade">
        <div v-if="flash" class="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-2.5">
          <i class="fas fa-circle-check text-emerald-500" />
          <span class="text-sm text-ink">{{ flash.text }}</span>
          <button v-if="flash.undo" class="ml-auto text-sm font-medium text-accent hover:opacity-80" @click="flash.undo()">
            Desfazer
          </button>
          <button class="text-ink-subtle hover:text-ink" aria-label="Fechar" @click="flash = null">
            <i class="fas fa-xmark text-xs" />
          </button>
        </div>
      </Transition>

      <div v-if="store.loadingList" class="py-16 text-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-xl" />
      </div>

      <template v-else>
        <!-- ── LIXEIRA ─────────────────────────────────────────────────────── -->
        <section v-if="showTrash" class="mb-8">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Lixeira</h2>
            <span class="text-xs text-ink-subtle">restauráveis por 30 dias</span>
            <button class="ml-auto text-xs text-accent hover:opacity-80" @click="showTrash = false">
              Voltar aos relatórios
            </button>
          </div>
          <EmptyState
            v-if="!trashCount"
            icon="far fa-trash-can"
            title="Lixeira vazia"
            description="Relatórios excluídos ficam aqui por 30 dias antes de sumirem de vez."
          />
          <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="r in store.trash" :key="r.id"
              class="rounded-xl border border-line bg-surface-raised shadow-soft p-4 flex flex-col gap-2.5 opacity-90"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-medium text-ink leading-snug line-through decoration-ink-subtle/50">{{ r.title }}</h3>
                <Badge variant="danger" size="sm">{{ diasRestantes(r.deletedAt) }}d</Badge>
              </div>
              <p class="text-xs text-ink-subtle">Excluído em {{ fmtDate(r.deletedAt) }}</p>
              <div class="mt-auto flex items-center gap-2 pt-1">
                <button class="text-xs text-accent hover:opacity-80 font-medium" @click="restaurar(r)">
                  <i class="fas fa-trash-arrow-up mr-1" />Restaurar
                </button>
                <button class="ml-auto text-xs text-rose-500 hover:opacity-80" @click="excluirDeVez(r)">
                  Excluir de vez
                </button>
              </div>
            </article>
          </div>
        </section>

        <template v-else>
          <!-- ── MEUS RELATÓRIOS ───────────────────────────────────────────── -->
          <section v-if="store.isAdmin" class="mb-8">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-subtle mb-3">Relatórios</h2>
            <EmptyState
              v-if="!store.own.length"
              icon="fas fa-wand-magic-sparkles"
              title="Nenhum relatório ainda"
              description="Crie o primeiro: a Eme busca os dados e monta tudo com você."
            />
            <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="r in store.own" :key="r.id"
                class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col gap-2.5 hover:border-accent/40 transition cursor-pointer"
                @click="router.push(r.status === 'published' ? `/relatorios/${r.id}/view` : `/relatorios/${r.id}`)"
              >
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-medium text-ink leading-snug">{{ r.title }}</h3>
                  <Badge :variant="r.status === 'published' ? 'success' : 'neutral'" size="sm">
                    {{ r.status === 'published' ? 'Publicado' : 'Rascunho' }}
                  </Badge>
                </div>
                <p v-if="r.enterpriseName" class="text-xs text-ink-muted"><i class="fas fa-building mr-1.5 text-ink-subtle" />{{ r.enterpriseName }}</p>
                <div class="mt-auto flex items-center gap-2 pt-1">
                  <Badge :variant="visBadge(r).variant" size="sm" dot>{{ visBadge(r).label }}</Badge>
                  <span class="text-[11px] text-ink-subtle ml-auto">{{ fmtDate(r.updatedAt || r.updated_at) }}</span>
                  <button
                    class="w-7 h-7 rounded-lg text-ink-subtle hover:text-accent hover:bg-surface-sunken transition"
                    title="Editar com a Eme"
                    @click.stop="router.push(`/relatorios/${r.id}`)"
                  ><i class="fas fa-wand-magic-sparkles text-xs" /></button>
                  <button
                    class="w-7 h-7 rounded-lg text-ink-subtle hover:text-rose-500 hover:bg-surface-sunken transition"
                    title="Excluir"
                    @click.stop="deleteId = r.id"
                  ><i class="far fa-trash-can text-xs" /></button>
                </div>
              </article>
            </div>
          </section>

          <!-- ── COMPARTILHADOS COMIGO ─────────────────────────────────────── -->
          <section>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-subtle mb-3">Compartilhados comigo</h2>
            <EmptyState
              v-if="!store.shared.length"
              icon="fas fa-share-nodes"
              title="Nada compartilhado com você"
              description="Quando alguém compartilhar um relatório com você ou seu cargo, ele aparece aqui."
            />
            <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="r in store.shared" :key="r.id"
                class="group/shared rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col gap-2.5 hover:border-accent/40 transition cursor-pointer"
                @click="router.push(`/relatorios/${r.id}/view`)"
              >
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-medium text-ink leading-snug">{{ r.title }}</h3>
                  <button
                    class="w-7 h-7 rounded-lg text-ink-subtle opacity-0 group-hover/shared:opacity-100 hover:text-rose-500 hover:bg-surface-sunken transition flex-shrink-0"
                    title="Remover da minha lista"
                    @click.stop="sairDoCompartilhado(r)"
                  ><i class="fas fa-xmark text-xs" /></button>
                </div>
                <p v-if="r.enterpriseName" class="text-xs text-ink-muted"><i class="fas fa-building mr-1.5 text-ink-subtle" />{{ r.enterpriseName }}</p>
                <div class="mt-auto flex items-center gap-2 pt-1">
                  <span class="text-[11px] text-ink-subtle">compartilhado por {{ r.owner?.username || '-' }}</span>
                  <span class="text-[11px] text-ink-subtle ml-auto">{{ fmtDate(r.updatedAt || r.updated_at) }}</span>
                </div>
              </article>
            </div>
          </section>
        </template>
      </template>
    </PageContainer>

    <DeleteReportModal
      :open="!!deleteId"
      :report-id="deleteId"
      @close="deleteId = null"
      @deleted="onDeleted"
    />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
