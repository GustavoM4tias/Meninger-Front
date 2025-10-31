<template>
    <div class="h-full">
        <!-- Header -->
        <div class="px-6 pt-6">
            <div class="flex items-center">
                <h1 class="text-2xl font-bold">Grupos de Situações</h1>
                <Favorite class="ml-3" :router="'/cv/workflow-grupos'" :section="'Workflow CV'" />
            </div>
            <p class="mt-1">Visualize e gerencie o fluxo de Reservas e Repasses</p>
        </div>

        <!-- Tabs -->
        <div class="px-6 py-4 flex gap-2">
            <button v-for="t in ['reservas', 'repasses']" :key="t" class="px-4 py-2 rounded-lg border"
                :class="store.tipo === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'" @click="switchTipo(t)">
                {{ t === 'reservas' ? 'Reservas' : 'Repasses' }}
            </button>
            <button class="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                @click="openModal(null)">
                + Novo Grupo
            </button>
        </div>

        <!-- Workflow visual -->
        <div v-if="store.workflow.length" class="px-6 pb-6 overflow-x-auto">
            <div class="flex gap-3">
                <div v-for="etapa in store.workflow" :key="etapa.idsituacao"
                    class="flex flex-col items-center text-center min-w-[120px]">
                    <div :style="{ backgroundColor: etapa.cor_bg, color: etapa.cor_nome }"
                        class="rounded-full px-3 py-2 font-semibold text-sm shadow-md">
                        {{ etapa.nome }}
                    </div>
                    <span class="text-xs text-gray-500 mt-1">#{{ etapa.idsituacao }}</span>
                </div>
            </div>
        </div>

        <!-- Lista de grupos -->
        <div v-if="store.grupos.length && !store.loading" class="px-6 pb-6 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="g in store.grupos" :key="g.idgroup" class="border rounded-lg p-4 shadow-sm bg-white">
                <div class="flex justify-between items-center mb-2">
                    <h2 class="font-semibold text-lg">{{ g.nome }}</h2>
                    <div class="flex gap-2">
                        <button @click="openModal(g)" class="text-blue-600 hover:underline text-sm">Editar</button>
                        <button @click="deleteGroup(g)" class="text-red-600 hover:underline text-sm">Excluir</button>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ g.descricao }}</p>
                <ul class="text-xs text-gray-500 list-disc pl-5">
                    <li v-for="s in g.situacoes" :key="s.id">{{ s.id }} - {{ s.nome }}</li>
                </ul>
            </div>
        </div>

        <!-- Mensagens -->
        <div v-if="store.loading" class="px-6 py-4 text-gray-500">Carregando...</div>
        <div v-if="!store.loading && !store.grupos.length" class="px-6 py-4 text-gray-500">
            Nenhum grupo encontrado para {{ store.tipo }}.
        </div>

        <!-- Modal -->
        <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 class="text-xl font-semibold mb-4">
                    {{ editing ? 'Editar Grupo' : 'Novo Grupo' }} ({{ store.tipo }})
                </h2>

                <div class="space-y-4">
                    <div>
                        <label class="text-sm text-gray-600">Nome</label>
                        <input v-model="form.nome" class="border w-full rounded-lg px-3 py-2"
                            placeholder="Ex: Etapas de Assinatura" />
                    </div>

                    <div>
                        <label class="text-sm text-gray-600">Descrição</label>
                        <textarea v-model="form.descricao" rows="2" class="border w-full rounded-lg px-3 py-2"
                            placeholder="Descrição opcional"></textarea>
                    </div>

                    <!-- select com cor -->
                    <div>
                        <label class="text-sm text-gray-600">Etapas (situações)</label>
                        <div class="border rounded-lg p-2 max-h-60 overflow-y-auto">
                            <div v-for="etapa in store.workflow" :key="etapa.idsituacao"
                                class="flex items-center gap-2 py-1">
                                <input type="checkbox" :id="'e' + etapa.idsituacao" v-model="selectedSituacoes"
                                    :value="etapa.idsituacao" class="accent-blue-600" />
                                <label :for="'e' + etapa.idsituacao" class="flex items-center gap-2 cursor-pointer">
                                    <span class="w-4 h-4 rounded-sm border"
                                        :style="{ backgroundColor: etapa.cor_bg, borderColor: etapa.cor_bg }"></span>
                                    <span class="text-sm">{{ etapa.nome }}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-5">
                    <button class="px-4 py-2 rounded-lg border" @click="closeModal">Cancelar</button>
                    <button class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" @click="saveGroup">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Favorite from '@/components/config/Favorite.vue'
import { useWorkflowGroupsStore } from '@/stores/Settings/Workflow/groupsStore'

const store = useWorkflowGroupsStore()

const showModal = ref(false)
const editing = ref(null)
const form = ref({ nome: '', descricao: '' })
const selectedSituacoes = ref([])

const switchTipo = async (t) => {
    await store.fetchWorkflow(t)
    await store.fetchGrupos(t)
}

const openModal = (grupo) => {
    editing.value = grupo
    showModal.value = true
    if (grupo) {
        form.value = { nome: grupo.nome, descricao: grupo.descricao || '' }
        selectedSituacoes.value = grupo.situacoes.map(s => s.id)
    } else {
        form.value = { nome: '', descricao: '' }
        selectedSituacoes.value = []
    }
}

const closeModal = () => {
    showModal.value = false
    editing.value = null
}

const saveGroup = async () => {
    const payload = {
        tipo: store.tipo,
        nome: form.value.nome.trim(),
        descricao: form.value.descricao.trim(),
        situacoes_ids: selectedSituacoes.value
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

onMounted(async () => {
    await store.fetchWorkflow()
    await store.fetchGrupos()
})
</script>
