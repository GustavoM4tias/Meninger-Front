<template>
    <aside class="w-3/12 h-full overflow-hidden py-4">
        <div class="cards w-full h-full">
            <h2 class="text-2xl font-semibold ps-2">Faturados X Empreendimentos</h2>
            <div class="overflow-y-auto h-[calc(100%-2rem)] px-2 pt-2 flex flex-col gap-3">
                <div v-for="(count, empreendimento) in agrupamentoEmpreendimentos" :key="empreendimento"
                    @click="emitirContratos(empreendimento)">
                    <Card :title="empreendimento" :icon="'fas fa-building'"
                        :class="'!bg-gray-500/15 !border-gray-500/30'" :value="count"
                        :label="`Vendas em ${empreendimento}`" />
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useContratosStore } from '@/stores/Reports/Contracts/contractStore'
import Card from '@/components/Reports/Reservas/Card.vue'

const props = defineProps({
    filtros: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['show-vendas-by-empreendimento'])

const store = useContratosStore()

// Agrupamento
const agrupamentoEmpreendimentos = computed(() => {
    const result = {}

    const idToName = {}
    store.contratos.forEach(grupo => {
        grupo.contracts.forEach(c => {
            const id = c.enterpriseId?.toString()
            if (id) idToName[id] = c.enterpriseName
        })
    })

    const vinculos = {}
    const chaveToNome = {}

    props.filtros.linkedEnterprises.forEach(link => {
        const [a, b] = link.split(':')
        const chave = `${a}:${b}`
        vinculos[a] = chave
        vinculos[b] = chave
        chaveToNome[chave] = idToName[a] || idToName[b] || chave
    })

    store.contratos.forEach(grupo => {
        grupo.contracts.forEach(c => {
            const id = c.enterpriseId?.toString() || 'N/A'
            const nome = c.enterpriseName || 'N/A'
            const chaveGrupo = vinculos[id] || id
            const nomeGrupo = chaveToNome[chaveGrupo] || nome

            if (!result[nomeGrupo]) result[nomeGrupo] = 0
            result[nomeGrupo]++
        })
    })

    return Object.entries(result)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [nome, count]) => {
            acc[nome] = count
            return acc
        }, {})
})

// Emissor de contratos filtrados
const emitirContratos = (empreendimento) => {
    const contratosFiltrados = store.contratos.flatMap(grupo =>
        grupo.contracts.filter(c => {
            const id = c.enterpriseId?.toString() || ''
            const nome = c.enterpriseName || ''
            const chave = props.filtros.linkedEnterprises.find(link => link.includes(id))
            const chaveGrupo = chave || nome
            return chaveGrupo === empreendimento
        })
    )

    emit('show-vendas-by-empreendimento', contratosFiltrados)
}
</script>
