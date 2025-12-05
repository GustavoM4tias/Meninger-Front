<template>
    <div class="h-full py-6 md:py-8 px-4">
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="mb-6 md:mb-8">
                <div class="flex items-center">
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Grupos de Situações</h1>
                    <Favorite class="ml-3" :router="'/cv/workflow-grupos'" :section="'Workflow CV'" />
                </div>
                <p class="text-gray-600 dark:text-gray-400 mt-1">Visualize e gerencie o fluxo de Reservas e Repasses</p>
            </div>

            <!-- Tipo: Reservas / Repasses (padrão pill com gradiente no ativo) -->
            <div class="flex flex-wrap gap-3 md:gap-4 mb-6" role="tablist" aria-label="Tipo (atalhos)">
                <button v-for="t in ['reservas', 'repasses']" :key="t" @click="switchTipo(t)"
                    :aria-pressed="store.tipo === t" role="tab" :class="[
                        'inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl font-semibold transition-all duration-300',
                        'border dark:border-gray-700 shadow-sm hover:shadow',
                        store.tipo === t
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent scale-[1.02]'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    ]">
                    <i :class="t === 'reservas' ? 'fas fa-clipboard-list' : 'fas fa-hand-holding-dollar'"></i>
                    {{ t === 'reservas' ? 'Reservas' : 'Repasses' }}
                </button>
            </div>

            <!-- FAB -->
            <div class="fixed bottom-6 right-6 z-30">
                <button @click="openModal(null)"
                    class="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
                    title="Adicionar Grupo">
                    <i class="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
                </button>
            </div>
 
            <div v-if="!store.grupos.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
                Nenhum grupo encontrado para <span class="font-semibold">{{ store.tipo }}</span>.
            </div>

            <!-- Grid de Cards -->
            <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <article v-for="g in store.grupos" :key="g.idgroup"
                    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <!-- Card header -->
                    <div
                        class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {{ g.nome }}
                            </h2>
                            <div class="mt-1 flex flex-wrap items-center gap-2">
                                <!-- Tipo badge -->
                                <span :class="[
                                    'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full',
                                    store.tipo === 'reservas'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                ]">
                                    <i
                                        :class="store.tipo === 'reservas' ? 'fas fa-clipboard-list mr-1.5' : 'fas fa-hand-holding-dollar mr-1.5'"></i>
                                    {{ store.tipo === 'reservas' ? 'Reservas' : 'Repasses' }}
                                </span>
 
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <button @click="openModal(g)"
                                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                                <i class="fas fa-pen mr-1"></i>Editar
                            </button>
                            <button @click="deleteGroup(g)"
                                class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                                <i class="fas fa-trash mr-1"></i>Excluir
                            </button>
                        </div>
                    </div>

                    <!-- Card body -->
                    <div class="p-4 md:p-5 space-y-3">
                        <div class="text-sm text-gray-600 dark:text-gray-300" v-if="g.descricao">
                            {{ g.descricao }}
                        </div>

                        <!-- Segmentos -->
                        <div class="text-xs">
                            <span class="text-gray-500 dark:text-gray-400">Segmento:</span>
                            <template v-if="Array.isArray(g.segmentos) && g.segmentos.length">
                                <span v-for="(seg, i) in g.segmentos" :key="i"
                                    class="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] ml-2 mt-1
                  border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40">
                                    <i class="fas fa-layer-group mr-1"></i>{{ seg }}
                                </span>
                            </template>
                            <span v-else class="ml-2 text-gray-400">—</span>
                        </div>

                        <!-- Situações -->
                        <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                            <div v-for="s in g.situacoes" :key="s.id"
                                class="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="w-3.5 h-3.5 rounded-sm border"
                                        :style="{ backgroundColor: s.cor_bg, borderColor: s.cor_bg }"></span>
                                    <span class="truncate">{{ s.id }} - {{ s.nome }}</span>
                                </div> 
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </div>

        <!-- Modal -->
        <transition name="fade">
            <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="absolute inset-0 bg-gray-900/60" @click="closeModal" />

                <div class="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    role="dialog" aria-modal="true">
                    <!-- Modal header -->
                    <div
                        class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                            <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                                {{ editing ? 'Editar Grupo' : 'Novo Grupo' }}
                                <span class="text-gray-500 dark:text-gray-400 text-sm">({{ store.tipo }})</span>
                            </h2>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Defina nome, segmento e situações do
                                grupo</p>
                        </div>
                        <button @click="closeModal"
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Modal body -->
                    <div class="p-6 space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label
                                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                                <input v-model="form.nome"
                                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Etapas de Assinatura" />
                            </div>

                            <div class="md:col-span-2">
                                <label
                                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                                <textarea v-model="form.descricao" rows="2"
                                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Descrição opcional"></textarea>
                            </div>

                            <!-- Segmento -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Segmento
                                    do
                                    Empreendimento</label>
                                <select v-model="form.segmentoSelecionado"
                                    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="" disabled>Selecione um segmento</option>
                                    <option v-for="seg in segmentosOptions" :key="seg" :value="seg">{{ seg }}</option>
                                </select>
                                <p class="text-xs text-gray-500 mt-1">Opções geradas a partir de
                                    <code>cv_enterprises.segmento_nome</code>.
                                </p>
                            </div>
                        </div>

                        <!-- Situações com busca -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Etapas
                                    (situações)</label>
                                <div class="flex items-center gap-2 text-xs">
                                    <button
                                        class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        @click="selectAllSituacoes">Selecionar todas</button>
                                    <button
                                        class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        @click="clearSituacoes">Limpar</button>
                                </div>
                            </div>

                            <div class="relative mb-2">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input v-model="q" placeholder="Buscar pelo nome da situação"
                                    class="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div
                                class="border border-gray-200 dark:border-gray-700 rounded-xl max-h-60 overflow-y-auto divide-y dark:divide-gray-700">
                                <label v-for="etapa in filteredWorkflow" :key="etapa.idsituacao"
                                    class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                    <input type="checkbox" v-model="selectedSituacoes" :value="etapa.idsituacao"
                                        class="accent-blue-600" />
                                    <span class="w-4 h-4 rounded-sm border"
                                        :style="{ backgroundColor: etapa.cor_bg, borderColor: etapa.cor_bg }"></span>
                                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ etapa.nome }}</span> 
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Modal footer -->
                    <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                        <button
                            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            @click="closeModal">Cancelar</button>
                        <button class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            @click="saveGroup">
                            <i class="fas fa-save mr-2"></i>
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Favorite from '@/components/config/Favorite.vue'
import { useWorkflowGroupsStore } from '@/stores/Comercial/Workflow/groupsStore'

const store = useWorkflowGroupsStore()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ nome: '', descricao: '', segmentoSelecionado: '' })
const selectedSituacoes = ref([])
const q = ref('')

// Opções de segmentos vindas do store
const segmentosOptions = computed(() => store.segmentos || [])

const filteredWorkflow = computed(() => {
    const term = q.value.trim().toLowerCase()
    if (!term) return store.workflow || []
    return (store.workflow || []).filter((e) => String(e?.nome || '').toLowerCase().includes(term))
})

const switchTipo = async (t) => {
    await store.fetchWorkflow(t)
    await store.fetchGrupos(t)
}

const openModal = (grupo) => {
    editing.value = grupo
    showModal.value = true
    if (grupo) {
        form.value = {
            nome: grupo.nome,
            descricao: grupo.descricao || '',
            segmentoSelecionado: Array.isArray(grupo.segmentos) && grupo.segmentos.length ? grupo.segmentos[0] : ''
        }
        selectedSituacoes.value = (grupo.situacoes || []).map((s) => s.id)
    } else {
        form.value = { nome: '', descricao: '', segmentoSelecionado: '' }
        selectedSituacoes.value = []
    }
}

const closeModal = () => {
    showModal.value = false
    editing.value = null
    q.value = ''
}

const saveGroup = async () => {
    if (!form.value.nome.trim()) {
        alert('Informe um nome para o grupo.')
        return
    }
    if (!selectedSituacoes.value.length) {
        if (!confirm('Nenhuma situação selecionada. Continuar mesmo assim?')) return
    }

    const payload = {
        tipo: store.tipo,
        nome: form.value.nome.trim(),
        descricao: form.value.descricao.trim(),
        situacoes_ids: selectedSituacoes.value,
        segmentos: form.value.segmentoSelecionado ? [form.value.segmentoSelecionado] : []
    }

    try {
        await store.saveGrupo(payload)
        showModal.value = false
    } catch (e) {
        alert('Erro ao salvar: ' + e.message)
    }
}

const deleteGroup = async (g) => {
    if (!confirm(`Excluir grupo "${g.nome}"?`)) return
    await store.deleteGrupo(g.idgroup)
}
 
const selectAllSituacoes = () => {
    selectedSituacoes.value = (store.workflow || []).map((w) => w.idsituacao)
}
const clearSituacoes = () => {
    selectedSituacoes.value = []
}

onMounted(async () => {
    await Promise.all([store.fetchWorkflow(), store.fetchGrupos(), store.fetchSegmentos()])
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity .2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
