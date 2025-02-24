<script setup>
import { ref, computed, onMounted } from 'vue';
import { useLeadsStore } from '../../../stores/Lead/leadStore';
import BarChart from './Daily/BarChart.vue';
import BarChart2 from './Monthly/BarChart.vue';
import LineChart from './weekly/LineChart.vue';
import LeadsGeneral from './LeadsGeneral.vue';
import Filas from './components/Filas.vue'; 

const leadsStore = useLeadsStore();

// Chama a função de busca dos leads ao carregar o componente
onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
    }
});

// Computed para pegar os leads da store
const leads = computed(() => leadsStore.leads);

const filas = computed(() => {
    // Agrupando leads por fila
    const filasData = [
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
                    "posicao": "Próximo"
                },
                {
                    "idimobiliaria": 23,
                    "nome_imobiliaria": "FRBROKERS NEGOCIOS IMOBILIARIOS",
                    "idcorretor": 301,
                    "nome_corretor": "FLAVIA REGINA DOS REIS QUINAIA",
                    "email_corretor": "flaviarmreis@hotmail.com",
                    "telefone": "+5514988031619",
                    "posicao": "Último"
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
    ];
    // Função para calcular a data de 7 dias atrás
    const obterDataLimite = () => {
        const hoje = new Date();
        hoje.setDate(hoje.getDate() - 7); // Subtrai 7 dias
        return hoje;
    };

    // Atribuindo leads às filas com base no corretor
    return filasData.map(fila => {
        const dataLimite = obterDataLimite(); // Data limite de 7 dias atrás

        const leadsForFila = leads.value.filter(lead => {
            // Verifica se o corretor está na fila e se a data_dac está dentro dos últimos 7 dias
            const dataDac = new Date(lead.data_cad); // Ajuste para o campo correto, se necessário
            return fila.corretores_e_imobiliarias.some(corretor => corretor.idcorretor === lead.corretor.id) &&
                dataDac >= dataLimite; // Filtra com base na data
        });


        // Filtra os leads com a situação "Aguardando Atendimento Corretor"
        const LeadsWaiting = leadsForFila.filter(lead => {
            return lead.situacao.nome === "Aguardando Atendimento Corretor"; // Filtra pelos leads com a situação correta
        });

        return {
            ...fila,
            leads: leadsForFila,  // Adicionando os leads filtrados para a fila
            leadsWaitingCount: LeadsWaiting.length, // Contando os leads "Aguardando Atendimento Corretor"
            leadsCount: leadsForFila.length  // Contando os leads da fila
        };
    });
});

</script>


<template>
    <div class="bg-gray-800 w-full relative overflow-hidden">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800 relative">
            <div class="w-full md:w-2/3 flex flex-col order-2 md:order-1">
                <LineChart :leads="leads" class="drop-shadow-none" />
                <BarChart2 :leads="leads" class="filter drop-shadow-none" />
            </div>
            <div class="w-full md:w-1/3 flex flex-col order-1 md:order-2">
                <BarChart :leads="leads" class="flex-1 filter drop-shadow-none order-2 md:order-1" />
                <LeadsGeneral class="enterprise flex flex-1 order-1 md:order-2" />
            </div>
        </div>

        <div class="group bg-gray-100 dark:bg-gray-600 cursor-pointer shadow absolute right-[-18rem] top-32 rounded-bl-lg transform transition-transform duration-300">
            <div class="button absolute -left-7 bg-gray-100 dark:bg-gray-600 shadow-[-3px_0_5px_rgba(0,0,0,.05)] cursor-pointer rounded-l-lg py-3 px-2.5">
                <i class="fas fa-chevron-left"></i>
            </div>
            <div class="content w-72 h-auto p-2 gap-2 flex flex-col justify-between">
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-100 px-1">Corretores</h2>
                <!-- Exibindo as filas usando o componente Filas -->
                <Filas v-for="fila in filas" :key="fila.idfila_distribuicao_leads" :fila="fila" />
                <p class="text-center text-gray-600 dark:text-gray-400 text-xs -mt-0.5">Relatório dos últimos 7 dias.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.group:hover {
    transform: translateX(-18rem);
} 
</style>
