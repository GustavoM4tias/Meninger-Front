<script setup>
import { computed, onMounted } from 'vue';
import { useLeadsStore } from '../../../stores/leadStore';
import BarChart from './Daily/BarChart.vue';
import BarChart2 from './Monthly/BarChart.vue';
import LineChart from './weekly/LineChart.vue';
import LeadsGeneral from './LeadsGeneral.vue';

const leadsStore = useLeadsStore();

onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
    }
});

// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);
const filas = computed(() => filasData.filas);

// Mock do JSON fornecido
const filasData = {
    "total_filas": 6,
    "pagina": 1,
    "limite": 50,
    "filas": [
        {
            "idfila_distribuicao_leads": 1,
            "nome": "Fila Marília",
            "corretores_e_imobiliarias": [
                {
                    "idimobiliaria": 14,
                    "nome_imobiliaria": "Corretores Autônomos",
                    "idcorretor": 399,
                    "nome_corretor": "Juliana Iamanaka Pontes",
                    "email_corretor": "juliana.ipontes@hotmail.com",
                    "telefone": "+5514996628608",
                    "posicao": "Próximo"
                }
            ]
        },
        {
            "idfila_distribuicao_leads": 2,
            "nome": "Fila Bauru",
            "corretores_e_imobiliarias": [
                {
                    "idimobiliaria": 23,
                    "nome_imobiliaria": "FRBROKERS NEGOCIOS IMOBILIARIOS",
                    "idcorretor": 295,
                    "nome_corretor": "Georgia Haddad Cherri Thomaz",
                    "email_corretor": "georgiacherri@icloud.com",
                    "telefone": "+5514998644478",
                    "posicao": "Último"
                },
                {
                    "idimobiliaria": 23,
                    "nome_imobiliaria": "FRBROKERS NEGOCIOS IMOBILIARIOS",
                    "idcorretor": 301,
                    "nome_corretor": "FLAVIA REGINA DOS REIS QUINAIA",
                    "email_corretor": "flaviarmreis@hotmail.com",
                    "telefone": "+5514988031619",
                    "posicao": "Próximo"
                }
            ]
        },
        {
            "idfila_distribuicao_leads": 3,
            "nome": "Fila Bady Bassitt",
            "corretores_e_imobiliarias": [
                {
                    "idimobiliaria": 14,
                    "nome_imobiliaria": "Corretores Autônomos",
                    "idcorretor": 346,
                    "nome_corretor": "Aparecida Caldeira de Carvalho",
                    "email_corretor": "cida.carvalho@menin.com.br",
                    "telefone": "+5517982162078",
                    "posicao": "Próximo"
                }
            ]
        },
        {
            "idfila_distribuicao_leads": 4,
            "nome": "Fila Jacarezinho",
            "corretores_e_imobiliarias": [
                {
                    "idimobiliaria": 43,
                    "nome_imobiliaria": "SOMA INTELIGENCIA IMOBILIÁRIA",
                    "idcorretor": 338,
                    "nome_corretor": "THAIS BORTOLAI NOCCIOLI",
                    "email_corretor": "tnoccioli@gmail.com",
                    "telefone": "+5516996448535",
                    "posicao": "Próximo"
                }
            ]
        },
        {
            "idfila_distribuicao_leads": 5,
            "nome": "Fila Dourados",
            "corretores_e_imobiliarias": [
                {
                    "idimobiliaria": 17,
                    "nome_imobiliaria": "INTFOUR IMOBILIARIA",
                    "idcorretor": 231,
                    "nome_corretor": "SERGIO ADRIANO DOS SANTOS",
                    "email_corretor": "sergio.a.corretor@gmail.com",
                    "telefone": "+5567998368006",
                    "posicao": "Próximo"
                }
            ]
        },
        // Outras filas omitidas para brevidade...
    ]
};

</script>

<template>
    <div class="bg-gray-800 w-full relative overflow-hidden">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800 relative">

            <!-- Primeira coluna -->
            <div class="w-full md:w-2/3 flex flex-col">
                <LineChart :leads="leads" class="drop-shadow-none" />
                <BarChart2 :leads="leads" class="filter drop-shadow-none" />
            </div>

            <!-- Segunda coluna -->
            <div class="w-full md:w-1/3 flex flex-col">
                <BarChart :leads="leads" class="flex-1 filter drop-shadow-none order-2 md:order-1" />
                <LeadsGeneral class="enterprise flex flex-1 order-1 md:order-2" />
            </div>
        </div>

        <!-- Ajustar Posteriormente -->
        <div
            class="group bg-gray-600 cursor-pointer absolute right-[-15rem] top-32 rounded-bl-lg transform transition-transform duration-300">
            <div class="button absolute -left-7 bg-gray-600 cursor-pointer rounded-l-lg py-3 px-2.5">
                <i class="fas fa-chevron-left"></i>
            </div>
            <div class="content w-60 h-auto p-2 gap-2 flex flex-col justify-between">
                <h2 class="text-2xl font-semibold text-white px-1">Corretores</h2>
                <!-- Exibindo as filas (cidades) -->
                <div v-for="fila in filas" :key="fila.idfila_distribuicao_leads" class="bg-gray-700 p-1 rounded-lg">
                    <h2 class="text-xl font-semibold text-white px-1">{{ fila.nome }}</h2>

                    <!-- Exibindo os atendentes -->
                    <div class="bg-gray-600 rounded-md" v-tippy="`${fila.corretores_e_imobiliarias.map(corretor => corretor.nome_corretor).join(' - ')}`">
                        <div class="flex items-center px-1">
                            <div class="bg-green-400 w-4 h-4 rounded-full"></div>
                            <p class="ms-1.5">
                                {{ fila.corretores_e_imobiliarias.length }} Corretor{{ fila.corretores_e_imobiliarias.length > 1 ? 'es' : '' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div> 
    </div>
</template>

<style scoped>
.group:hover {
    transform: translateX(-15rem);
}
</style>
