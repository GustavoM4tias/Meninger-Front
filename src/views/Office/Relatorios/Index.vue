<script setup>
// Relatórios da Eme — lista (meus relatórios / compartilhados comigo).
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/UI/PageContainer.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import PageHelp from '@/components/UI/PageHelp.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const router = useRouter()
const store = useReportsStore()
const creating = ref(false)

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

async function excluir(r) {
  if (!window.confirm(`Excluir o relatório "${r.title}"? Essa ação não pode ser desfeita.`)) return
  await store.deleteReport(r.id)
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')

const visBadge = (r) => {
  if (r.visibility === 'public') return { variant: 'warning', label: 'Público' }
  if (r.visibility === 'internal') return { variant: 'info', label: 'Interno' }
  return { variant: 'neutral', label: 'Privado' }
}
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
              'O link público expira automaticamente e pode ser revogado a qualquer momento.',
              'Relatórios compartilhados com você aparecem na seção Compartilhados comigo.',
            ]"
          />
          <Button v-if="store.isAdmin" variant="primary" icon="fas fa-plus" :loading="creating" @click="novo">
            Novo relatório
          </Button>
        </template>
      </PageHeader>

      <div v-if="store.loadingList" class="py-16 text-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-xl" />
      </div>

      <template v-else>
        <!-- Meus relatórios / todos (admin) -->
        <section v-if="store.isAdmin" class="mb-8">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-subtle mb-3">
            {{ store.isAdmin ? 'Relatórios' : 'Meus relatórios' }}
          </h2>
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
                  @click.stop="excluir(r)"
                ><i class="far fa-trash-can text-xs" /></button>
              </div>
            </article>
          </div>
        </section>

        <!-- Compartilhados comigo -->
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
              class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col gap-2.5 hover:border-accent/40 transition cursor-pointer"
              @click="router.push(`/relatorios/${r.id}/view`)"
            >
              <h3 class="font-medium text-ink leading-snug">{{ r.title }}</h3>
              <p v-if="r.enterpriseName" class="text-xs text-ink-muted"><i class="fas fa-building mr-1.5 text-ink-subtle" />{{ r.enterpriseName }}</p>
              <div class="mt-auto flex items-center gap-2 pt-1">
                <span class="text-[11px] text-ink-subtle">por {{ r.owner?.username || '-' }}</span>
                <span class="text-[11px] text-ink-subtle ml-auto">{{ fmtDate(r.updatedAt || r.updated_at) }}</span>
              </div>
            </article>
          </div>
        </section>
      </template>
    </PageContainer>
  </div>
</template>
