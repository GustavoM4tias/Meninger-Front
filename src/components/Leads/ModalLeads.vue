<template>
    <div v-if="modalVisivel"
        class="absolute left-0 top-0 w-full h-full bg-gray-900/25 flex justify-center md:items-center z-20">
        <div
            class="bg-gray-200 dark:bg-gray-600 relative m-2 p-2 md:p-4 rounded-lg w-full md:w-1/2 mt-[6vh] md:mt-0 h-[80vh] overflow-y-auto">
            <i class="fas fa-xmark text-3xl absolute right-3 cursor-pointer" @click="fecharModal"></i>

            <div :class="{ '!grid-cols-1': filtrosAtivos.empreendimento.length === 1 }"
                class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <!-- Coluna de Empreendimentos: só exibe se nenhum filtro estiver ativo -->
                <div v-if="filtrosAtivos.empreendimento.length === 0">
                    <h3 class="text-lg font-semibold my-2 text-gray-800 dark:text-gray-200">
                        <i class="fas fa-building mx-2"></i> Empreendimentos
                    </h3>
                    <ul class="space-y-1.5">
                        <li v-for="(count, nome) in agruparPor(filtrarLeads(leads), 'empreendimento[0].nome')" :key="nome"
                            @click="aplicarFiltro(nome, 'empreendimento')"
                            :class="{ 'bg-sky-200': filtrosAtivos.empreendimento.includes(nome) }"
                            class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-2 px-3 rounded-lg">
                            <span class="text-sm md:text-lg truncate" :title="nome">
                                {{ nome }}
                            </span>
                            <span class="bg-sky-400 text-white text-sm font-medium px-2 py-1 rounded">
                                {{ count }}
                            </span>
                        </li>
                    </ul>
                </div>

                <!-- Coluna de Mídias e Situações -->
                <div :class="{ '!flex !justify-around gap-2': filtrosAtivos.empreendimento.length === 1 }">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold py-2 text-gray-800 dark:text-gray-200">
                            <i class="fas fa-photo-film mx-2"></i> Mídias
                        </h3>
                        <ul class="space-y-1.5">
                            <li v-for="(count, midia) in agruparPor(filtrarLeads(leads), 'midia_principal')"
                                :key="midia" @click="aplicarFiltro(midia, 'midia_principal')"
                                :class="{ 'bg-sky-200': filtrosAtivos.midia_principal.includes(midia) }"
                                class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-2 px-3 rounded-lg">
                                <span class="text-sm md:text-lg truncate" :title="midia">
                                    {{ midia }}
                                </span>
                                <span class="bg-emerald-500 text-white text-sm font-medium px-2 py-1 rounded">
                                    {{ count }}
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div class="flex-1">
                        <h3 class="text-lg font-semibold py-2 text-gray-800 dark:text-gray-200">
                            <i class="fas fa-chart-pie mx-2"></i> Situações
                        </h3>
                        <ul class="space-y-1.5">
                            <li v-for="(count, situacao) in agruparPor(filtrarLeads(leads), 'situacao.nome')"
                                :key="situacao" @click="aplicarFiltro(situacao, 'situacao')"
                                class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-2 px-3 rounded-lg">
                                <span class="text-sm md:text-lg truncate" :title="situacao">
                                    {{ situacao }}
                                </span>
                                <span class="bg-amber-400 text-white text-sm font-medium px-2 py-1 rounded">
                                    {{ count }}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>


            <div class="mb-4"
                v-if="filtrosAtivos.empreendimento.length > 0 || filtrosAtivos.midia_principal.length > 0 || filtrosAtivos.situacao.length > 0">
                <div class="flex flex-wrap gap-2">
                    <div v-for="(filtro, index) in filtrosAtivos.empreendimento" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-1 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'empreendimento')"
                            class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                    <div v-for="(filtro, index) in filtrosAtivos.midia_principal" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-1 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'midia_principal')"
                            class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                    <div v-for="(filtro, index) in filtrosAtivos.situacao" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-1 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'situacao')" class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                </div>
            </div>

            <ul>
                <div class="flex justify-between">
                    <p class="text-gray-500 dark:text-gray-300">Leads: {{ filtrarLeads(leads).length }}</p>
                    <p class="text-gray-500 dark:text-gray-300">{{ obterIntervaloDeDatas(leads) }}</p>
                </div>
                <li v-for="lead in filtrarLeads(leads)" :key="lead.idlead"
                    class="bg-gray-100 dark:bg-gray-700 my-2 p-2 rounded-lg relative shadow-sm">
                    <!-- Conteúdo do Lead -->
                    <div class="line flex justify-between">
                        <div class="name flex truncate">
                            <p @click="toggleDetalhes(lead.idlead)"
                                class="truncate flex-1 text-md md:text-xl cursor-pointer">{{ lead.nome }}<i
                                    class="fas m-auto ms-1.5"
                                    :class="detalhesVisiveis[lead.idlead] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                            </p>

                        </div>
                        <div class="flex">
                            <div class="hidden md:flex m-1 gap-1.5 text-sm truncate">
                                <button v-tippy="'Mídia de Visita'">
                                    <p v-if="lead.midia_principal"
                                        class="py-0.5 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-500 truncate">
                                        {{ lead.midia_principal }}
                                    </p>
                                </button>
                                <button v-tippy="'Situação'" class="truncate">
                                    <p class="py-0.5 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-500 truncate">
                                        {{ lead.situacao.nome }}
                                    </p>
                                </button>
                            </div>

                            <div class="redirects flex gap-2 p-2">
                                <button v-tippy="'CV CRM'">
                                    <a :href="'https://menin.cvcrm.com.br/gestor/comercial/leads/' + lead.idlead + '/administrar?lido=true'"
                                        target="_blank">
                                        <img src="/CVLogo.png" alt="CV CRM" class="h-4 min-w-4 drop-shadow">
                                    </a>
                                </button>
                                <button v-tippy="'RD Station'">
                                    <a :href="lead.link_rdstation" target="_blank">
                                        <img src="/RDLogo.png" alt="RD Station" class="h-4 min-w-4 drop-shadow">
                                    </a>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex md:hidden gap-1.5 text-xs md:text-sm truncate">
                        <button v-tippy="'Mídia de Visita'">
                            <p v-if="lead.midia_principal" class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                {{ lead.midia_principal }}
                            </p>
                        </button>
                        <button v-tippy="'Situação'" class="truncate">
                            <p class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                {{ lead.situacao.nome }}
                            </p>
                        </button>
                    </div>

                    <div v-if="detalhesVisiveis[lead.idlead]" class="mt-2">
                        <div
                            class="bg-gray-200 dark:bg-gray-600 px-1 sm:px-2 pb-1 md:pb-2 pt-2 md:pt-3 rounded-xl flex text-center my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                Cliente</label>
                            <button v-tippy="'Email'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" :href="'mailto:' + lead.email"><i
                                        class="fas fa-envelope"></i> {{ lead.email
                                        }}</a></button>
                            <button v-tippy="'WhatsApp'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate"
                                    :href="'https://wa.me/' + lead.telefone.replace(/\D/g, '')" target="_blank"><i
                                        class="fab fa-whatsapp"></i> {{ lead.telefone }}</a></button>
                        </div>
                        <div v-if="lead.imobiliaria.nome"
                            class="bg-gray-200 dark:bg-gray-600 px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                imobiliária</label>
                            <button v-tippy="'CV Imobiliária'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias?q%5B1%7Cimobiliarias.idimobiliaria%5D=&q%5B2%7Cimobiliarias.nome%5D=' + lead.imobiliaria.nome">
                                    <i class="fas fa-trowel-bricks"></i> {{ lead.imobiliaria.nome }}
                                </a>
                            </button>
                            <button v-if="lead.corretor?.nome" v-tippy="'CV Corretor'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/corretores?q%5B1%7Cc.idcorretor%5D=&q%5B2%7Cc.nome%5D=' + lead.corretor.nome">
                                    <i class="fas fa-clipboard"></i> {{ lead.corretor.nome }}
                                </a>
                            </button>
                        </div>
                    </div>

                    <div class="w-full justify-between flex gap-1.5 overflow-x-auto mt-2 text-xs md:text-lg">
                        <a v-tippy="'Visualizar Empreendimento'" :href="'/buildings?search=' + lead.empreendimento[0].nome" target="_blank"
                            class="bg-gray-200 dark:bg-gray-600 rounded-md px-2 truncate"
                            v-if="lead.empreendimento.length > 0">
                            {{ lead.empreendimento[0].nome }}
                        </a>
                        <div v-else class="bg-gray-600 rounded-md px-2">SEM EMPREENDIMENTO</div>
                        <div class="text-gray-500 pe-1.5 truncate">
                            {{ new Date(lead.data_cad).toLocaleString('pt-BR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            }).replace(',', '') }}
                        </div>
                    </div>

                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    leads: {
        type: Array,
        required: true,
    },
    modalVisivel: {
        type: Boolean,
        required: true,
    }
});

const detalhesVisiveis = ref({});
const filtrosAtivos = ref({
    empreendimento: [],
    midia_principal: [],
    situacao: []
});

// Função para aplicar filtro
const aplicarFiltro = (filtro, categoria) => {
    if (categoria === 'situacao') {
        // Para situações: permite múltiplas seleções (toggle)
        if (filtrosAtivos.value[categoria].includes(filtro)) {
            // Se já estiver selecionado, remove
            filtrosAtivos.value[categoria] = filtrosAtivos.value[categoria].filter(item => item !== filtro);
        } else {
            // Senão, adiciona à lista
            filtrosAtivos.value[categoria].push(filtro);
        }
    } else {
        // Para empreendimento e midia_principal: permite somente uma seleção.
        // Se o filtro já estiver ativo, desativa (toggle off); caso contrário, substitui qualquer seleção anterior.
        if (filtrosAtivos.value[categoria][0] === filtro) {
            filtrosAtivos.value[categoria] = [];
        } else {
            filtrosAtivos.value[categoria] = [filtro];
        }
    }
};

const limparFiltros = () => {
    filtrosAtivos.value = {
        empreendimento: [],  // ou valores iniciais desejados
        midia_principal: [],
        situacao: [],
    };
};

// Função para remover filtro
const removerFiltro = (filtro, categoria) => {
    if (categoria === 'situacao') {
        // Remove somente o filtro selecionado, mantendo os demais.
        filtrosAtivos.value[categoria] = filtrosAtivos.value[categoria].filter(item => item !== filtro);
    } else {
        // Para empreendimento e midia_principal, limpa a seleção.
        filtrosAtivos.value[categoria] = [];
    }
};
// Função de agrupamento
function agruparPor(array, propriedade) {
    return array.reduce((acc, item) => {
        const valor = propriedade.split('.').reduce((obj, chave) => {
            if (chave.endsWith(']')) {
                const [base, index] = chave.replace(']', '').split('[');
                return obj?.[base]?.[parseInt(index)] ?? null;
            }
            return obj?.[chave];
        }, item);

        if (valor) {
            acc[valor] = (acc[valor] || 0) + 1;
        }
        return acc;
    }, {});
}

const filtrarLeads = (leads) => {
    return leads.filter(lead => {
        // Log para ver os dados do lead
        // console.log('Lead:', lead);

        const empreendimentoNome = lead.empreendimento && lead.empreendimento[0] ? lead.empreendimento[0].nome : null;
        const situacaoNome = lead.situacao ? lead.situacao.nome : null;

        // console.log('Empreendimento Nome:', empreendimentoNome);
        // console.log('Situação Nome:', situacaoNome);

        return filtrosAtivos.value.empreendimento.every(filtro => empreendimentoNome === filtro) &&
            filtrosAtivos.value.midia_principal.every(filtro => lead.midia_principal === filtro) &&
            filtrosAtivos.value.situacao.every(filtro => situacaoNome === filtro);
    });
};

function obterIntervaloDeDatas(leads) {
    const datas = leads.map(lead => {
        const data = new Date(lead.data_cad);
        return new Date(data.getFullYear(), data.getMonth(), data.getDate());
    });

    datas.sort((a, b) => a - b);
    const todasIguais = datas.every(data => data.getTime() === datas[0].getTime());

    if (todasIguais) {
        const dataLeads = datas[0].toLocaleDateString('pt-BR');
        return `${dataLeads}`;
    } else {
        const dataAntiga = datas[0].toLocaleDateString('pt-BR');
        const dataRecente = datas[datas.length - 1].toLocaleDateString('pt-BR');
        return `${dataAntiga} - ${dataRecente}`;
    }
}


const emit = defineEmits(['update:modalVisivel']);

const fecharModal = () => {
    emit('update:modalVisivel', false);
    limparFiltros(); // Limpa os filtros
};

const toggleDetalhes = (idlead) => {
    detalhesVisiveis.value[idlead] = !detalhesVisiveis.value[idlead];
};
</script>
