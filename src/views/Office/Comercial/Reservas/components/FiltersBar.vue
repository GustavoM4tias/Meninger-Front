<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-900">
        <div class="flex flex-wrap gap-4">

            <div class="flex-1 lg:flex-initial lg:min-w-44" v-tippy="'Período pela data de cadastro da reserva'">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-day mr-1"></i>Cadastro — Início
                </label>
                <input v-model="localStart" type="date"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <div class="flex-1 lg:flex-initial lg:min-w-44" v-tippy="'Período pela data de cadastro da reserva'">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-check mr-1"></i>Cadastro — Fim
                </label>
                <input v-model="localEnd" type="date" :min="localStart || undefined"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <div class="flex-1 max-w-96">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-building mr-1"></i>Empreendimento
                </label>
                <MultiSelector :model-value="localEnterprises"
                    @update:modelValue="v => localEnterprises = Array.isArray(v) ? v : []" :options="enterprisesOptions"
                    placeholder="Empreendimentos" :page-size="200" :select-all="true" />
            </div>

            <div class="flex-1 max-w-80">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-list-check mr-1"></i>Situação
                </label>
                <MultiSelector :model-value="localStages"
                    @update:modelValue="v => localStages = Array.isArray(v) ? v : []" :options="situacoesOptions"
                    placeholder="Situações..." :page-size="150" :select-all="true" />
            </div>

            <div class="flex-1 max-w-80">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-money-bill-transfer mr-1"></i>Status Repasse
                </label>
                <MultiSelector :model-value="localStatusRep"
                    @update:modelValue="v => localStatusRep = Array.isArray(v) ? v : []" :options="statusRepasseOptions"
                    placeholder="Status..." :page-size="150" :select-all="true" />
            </div>

            <div class="flex-1 max-w-80">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-tag mr-1"></i>Tipo Venda
                </label>
                <MultiSelector :model-value="localTipoVenda"
                    @update:modelValue="v => localTipoVenda = Array.isArray(v) ? v : []" :options="tipoVendaOptions"
                    placeholder="Tipos..." :page-size="150" :select-all="true" />
            </div>

            <div class="flex-1 max-w-80">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-city mr-1"></i>Empresa Correspondente
                </label>
                <MultiSelector :model-value="localBanks"
                    @update:modelValue="v => localBanks = Array.isArray(v) ? v : []"
                    :options="empresasCorrespondentesOptions" placeholder="Empresas..." :page-size="150"
                    :select-all="true" />
            </div>

            <div class="flex flex-wrap w-full gap-4">

                <div class="flex-1 max-w-80">
                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <i class="fas fa-store mr-1"></i>Imobiliária
                    </label>
                    <MultiSelector :model-value="localImobs"
                        @update:modelValue="v => localImobs = Array.isArray(v) ? v : []" :options="imobiliariasOptions"
                        placeholder="Imobiliárias" :page-size="150" :select-all="true" />
                </div>

                <div class="flex-1 max-w-80">
                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <i class="fas fa-user-tie mr-1"></i>Corretor
                    </label>
                    <MultiSelector :model-value="localCorretores"
                        @update:modelValue="v => localCorretores = Array.isArray(v) ? v : []"
                        :options="corretoresOptions" placeholder="Corretores" :page-size="150" :select-all="true" />
                </div>

                <div class="flex-1 max-w-80">
                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <i class="fas fa-compass mr-1"></i>Origem do Lead
                    </label>
                    <MultiSelector :model-value="localLeadOrigens"
                        @update:modelValue="v => localLeadOrigens = Array.isArray(v) ? v : []"
                        :options="leadOrigensOptions" placeholder="Origens..." :page-size="150" :select-all="true" />
                </div>

                <div class="flex-1 max-w-96">
                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <i class="fas fa-id-card mr-1"></i>Cliente / CPF
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                        <input v-model="localNome" placeholder="Nome"
                            class="w-full px-2 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 text-sm text-gray-400 dark:text-gray-500" />
                        <input v-model="localDoc" placeholder="Documento"
                            class="w-full px-2 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 text-sm text-gray-400 dark:text-gray-500" />
                    </div>
                </div>

                <div class="flex gap-4 mt-4 pb-1">
                    <div class="flex flex-col gap-1.5 pt-1">
                        <label
                            class="inline-flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                            <input type="checkbox" v-model="localOnlyActive" class="rounded border-gray-400" />
                            <span>Em curso (ativa)</span>
                        </label>
                        <label v-tippy="'Apenas reservas marcadas como Vendida no CRM (etapa, não venda concretizada)'"
                            class="inline-flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                            <input type="checkbox" v-model="localOnlyVendida" class="rounded border-gray-400" />
                            <span>Apenas etapa Vendida (CRM)</span>
                        </label>
                    </div>
                    <div class="flex flex-col gap-1.5 pt-1">
                        <label
                            class="inline-flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                            <input type="checkbox" v-model="localWithLead" class="rounded border-gray-400" />
                            <span>Veio de lead</span>
                        </label>
                        <label v-tippy="'Mostra só reservas cujo lead NÃO veio de Painel — leads externos.'"
                            class="inline-flex items-center gap-2 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                            <input type="checkbox" v-model="localExcluirPainel" class="rounded border-gray-400" />
                            <span>Excluir leads de Painel</span>
                        </label>
                    </div>

                    <div class="flex flex-1 gap-3">
                        <slot name="extra-actions" />
                        <button @click="clearFilters"
                            class="flex w-full px-4 py-2 text-base font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                            <i class="fas fa-broom pe-1 my-auto"></i>
                            <span class="text-center w-full">Limpar</span>
                        </button>
                        <button @click="applyFilters" :disabled="!isValid"
                            class="flex w-full px-4 py-2 text-base font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none disabled:opacity-50">
                            <i class="fas fa-filter pe-1 my-auto"></i>
                            <span class="text-center w-full">Filtrar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const props = defineProps({
    filtros: { type: Object, required: true },
    enterprisesOptions: { type: Array, default: () => [] },
    situacoesOptions: { type: Array, default: () => [] },
    statusRepasseOptions: { type: Array, default: () => [] },
    tipoVendaOptions: { type: Array, default: () => [] },
    imobiliariasOptions: { type: Array, default: () => [] },
    corretoresOptions: { type: Array, default: () => [] },
    empresasCorrespondentesOptions: { type: Array, default: () => [] },
    leadOrigensOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:filtros', 'buscar', 'limpar'])

const initDate = (d) => d ? dayjs(d).format('YYYY-MM-DD') : ''
const localStart = ref(initDate(props.filtros.data_inicio) || dayjs().startOf('month').format('YYYY-MM-DD'))
const localEnd = ref(initDate(props.filtros.data_fim) || dayjs().endOf('month').format('YYYY-MM-DD'))

const localEnterprises = ref([...(props.filtros.empreendimento || [])])
const localStages = ref([...(props.filtros.situacao || [])])
const localStatusRep = ref([...(props.filtros.status_repasse || [])])
const localTipoVenda = ref([...(props.filtros.tipovenda || [])])
const localBanks = ref([...(props.filtros.empresa_correspondente || [])])
const localImobs = ref([...(props.filtros.imobiliaria || [])])
const localCorretores = ref([...(props.filtros.corretor || [])])
const localLeadOrigens = ref([...(props.filtros.lead_origem || [])])
const localOnlyActive = ref(!!props.filtros.only_active)
const localOnlyVendida = ref(!!props.filtros.only_vendida)
const localWithLead = ref(!!props.filtros.with_lead)
const localExcluirPainel = ref(!!props.filtros.excluir_painel)
const localNome = ref(props.filtros.nome || '')
const localDoc = ref(props.filtros.documento || '')

watch(() => props.filtros, (f) => {
    localStart.value = initDate(f.data_inicio) || dayjs().startOf('month').format('YYYY-MM-DD')
    localEnd.value = initDate(f.data_fim) || dayjs().endOf('month').format('YYYY-MM-DD')
    localEnterprises.value = [...(f.empreendimento || [])]
    localStages.value = [...(f.situacao || [])]
    localStatusRep.value = [...(f.status_repasse || [])]
    localTipoVenda.value = [...(f.tipovenda || [])]
    localBanks.value = [...(f.empresa_correspondente || [])]
    localImobs.value = [...(f.imobiliaria || [])]
    localCorretores.value = [...(f.corretor || [])]
    localLeadOrigens.value = [...(f.lead_origem || [])]
    localOnlyActive.value = !!f.only_active
    localOnlyVendida.value = !!f.only_vendida
    localWithLead.value = !!f.with_lead
    localExcluirPainel.value = !!f.excluir_painel
    localNome.value = f.nome || ''
    localDoc.value = f.documento || ''
}, { deep: true })

const isValid = computed(() =>
    !!localStart.value && !!localEnd.value && localStart.value <= localEnd.value
)

function applyFilters() {
    if (!isValid.value) return
    emit('update:filtros', {
        ...props.filtros,
        data_inicio: localStart.value,
        data_fim: localEnd.value,
        empreendimento: [...localEnterprises.value],
        situacao: [...localStages.value],
        status_repasse: [...localStatusRep.value],
        tipovenda: [...localTipoVenda.value],
        empresa_correspondente: [...localBanks.value],
        imobiliaria: [...localImobs.value],
        corretor: [...localCorretores.value],
        lead_origem: [...localLeadOrigens.value],
        only_active: localOnlyActive.value,
        only_vendida: localOnlyVendida.value,
        with_lead: localWithLead.value,
        excluir_painel: localExcluirPainel.value,
        nome: localNome.value,
        documento: localDoc.value,
    })
    emit('buscar')
}

function clearFilters() {
    localStart.value = dayjs().startOf('month').format('YYYY-MM-DD')
    localEnd.value = dayjs().endOf('month').format('YYYY-MM-DD')
    localEnterprises.value = []
    localStages.value = []
    localStatusRep.value = []
    localTipoVenda.value = []
    localBanks.value = []
    localImobs.value = []
    localCorretores.value = []
    localLeadOrigens.value = []
    localOnlyActive.value = false
    localOnlyVendida.value = false
    localWithLead.value = false
    localExcluirPainel.value = false
    localNome.value = ''
    localDoc.value = ''
    emit('limpar')
}
</script>
