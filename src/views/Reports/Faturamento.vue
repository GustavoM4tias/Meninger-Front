<script setup>
import { ref, onMounted, computed } from 'vue';
import { useContratosStore } from '@/stores/Reports/Contracts/contractStore';
import Favorite from "@/components/config/Favorite.vue";
import FaturamentoAside from '@/components/Reports/Faturamento/FaturamentoAside.vue';
import FaturamentoFilterBar from '@/components/Reports/Faturamento/FaturamentoFilterBar.vue';

const store = useContratosStore();

// Estado do filtro
const filtros = ref({
    // companyIds: ['101', '89', '50', '98', '96', '83', '60', '23', '72', '99'],
    companyIds: [],
    enterpriseIds: [],
    enterpriseNames: [],
    startDate: '',
    endDate: '',
    linkedEnterprises: ['78001:17004', '10101:18915'],
});

// Computeds derivados dos dados carregados (para alimentar os selects)
const availableCompanies = computed(() => {
    if (!store.contratos.length) return []
    return [...new Set(store.contratos.flatMap(g => g.contracts.map(c => c.companyId)).filter(Boolean))];
});

const availableEnterprises = computed(() => {
    if (!store.contratos.length) return []
    return [...new Set(store.contratos.flatMap(g => g.contracts.map(c => c.enterpriseId)).filter(Boolean))];
});

const availableEnterpriseNames = computed(() => {
    if (!store.contratos.length) return []
    return [...new Set(store.contratos.flatMap(g => g.contracts.map(c => c.enterpriseName)).filter(Boolean))];
});

// Aplicar os filtros
const aplicar = async (payload) => {
    filtros.value = {
        ...payload,
        linkedEnterprises: payload.linkedEnterprises.filter(Boolean)
    };

    await store.fetchContratos(filtros.value);
};

const mostrarContratosPorEmpreendimento = (empreendimento) => {
    const contratosFiltrados = store.contratos.flatMap(grupo =>
        grupo.contracts.filter(c => {
            const id = c.enterpriseId?.toString() || '';
            const nome = c.enterpriseName || '';
            const chave = filtros.value.linkedEnterprises.find(link => link.includes(id));
            const chaveGrupo = chave || nome;

            return chaveGrupo === empreendimento;
        })
    );

    console.log('Contratos filtrados:', contratosFiltrados);
};

onMounted(() => {
    aplicar(filtros.value);
});
    console.log(store.contratos)
</script>

<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex gap-4">
        <div class="w-10/12 ps-4 pe-2 py-4 h-full flex flex-col overflow-hidden">

            <div class="flex items-center pb-2">
                <h1 class="text-xl md:text-2xl font-bold">Faturamento Sienge</h1>
                <Favorite :router="'/comercial/faturamento'" :section="'Faturamento'" />
            </div>
            <FaturamentoFilterBar @aplicar="aplicar" :available-companies="availableCompanies"
                :available-enterprises="availableEnterprises" :available-enterprise-names="availableEnterpriseNames" />

            <div v-if="store.error" class="text-red-600 mt-4">{{ store.error }}</div>

            <main v-else class="mt-4 px-4 overflow-auto max-h-full">
                <p>Total de grupos: {{ store.count }}</p>

                <p>
                    Total Geral (sem desconto):
                    {{
                        store.contratos
                            .flatMap(grp => grp.contracts || [])
                            .reduce((acc, c) => acc + (c.totalSellingValue || 0), 0)
                            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }}
                </p>

                <p>
                    Total Geral (com desconto):
                    {{
                        store.contratos
                            .flatMap(grp => grp.contracts || [])
                            .reduce((acc, c) => {
                                const dc = c.paymentConditions?.find(p => p.conditionTypeId === 'DC')?.totalValue || 0;
                                return acc + (c.totalSellingValue - dc);
                            }, 0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }}
                </p>
                <p>
                    Total de RP :
                    {{
                        store.contratos
                            .flatMap(grp => grp.contracts || [])
                            .reduce((acc, c) => {
                                const dc = c.paymentConditions?.find(p => p.conditionTypeId === 'RP')?.totalValue || 0;
                                return acc + (dc);
                            }, 0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }}
                </p>

                <p>
                </p>
                <br>

                <ul>
                    <li v-for="grp in store.contratos" :key="grp.customerId + '-' + grp.groupEnterprise" class="mb-4">
                        <strong>{{ grp.customerName }}</strong>
                        (grc: {{ grp.groupEnterprise }} | contratos: {{
                            Array.isArray(grp.contracts) ? grp.contracts.length : 0
                        }})
                        <ul>
                            <li v-for="c in grp.contracts" :key="c.id">
                                #{{ c.enterpriseId }} – {{ c.cost }}

                                <span v-if="c.__usouDataContrato" class="text-yellow-600 font-semibold">
                                    (Data Contrato usada)
                                </span>

                                {{ c.financialInstitutionDate || c.contractDate }} – {{ c.enterpriseName }} – {{
                                    c.totalSellingValue }}

                                <!-- Se existir condição DC, mostra o valor e o total com desconto -->
                                <div v-if="c.paymentConditions.find(p => p.conditionTypeId === 'DC')">
                                    Desconto Construtora (DC):
                                    {{c.paymentConditions.find(p => p.conditionTypeId === 'DC').totalValue}}

                                    <br>

                                    Total com Desconto:
                                    {{
                                        c.totalSellingValue -
                                        c.paymentConditions.find(p => p.conditionTypeId === 'DC').totalValue
                                    }}
                                </div>
                            </li>

                        </ul>
                    </li>
                </ul>
            </main>
        </div>
        <FaturamentoAside :filtros="filtros" @show-vendas-by-empreendimento="mostrarContratosPorEmpreendimento" />
    </div>
</template>
