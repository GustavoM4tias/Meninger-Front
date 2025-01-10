<template>
    <div v-if="modalVisivel" class="absolute left-0 w-full h-full bg-gray-900/25 flex justify-center items-center z-20">
        <div class="bg-gray-200 dark:bg-gray-600 relative p-4 rounded-lg w-1/2 h-[80vh] overflow-auto">
            <i class="fas fa-xmark text-3xl absolute right-3 cursor-pointer" @click="fecharModal"></i>
            <h2 class="text-lg font-semibold mb-4">Leads do Dia</h2>

            <ul>
                <li v-for="lead in leads" :key="lead.idlead"
                    class="bg-gray-300 dark:bg-gray-700 m-2 p-2 rounded-lg relative shadow">
                    <div class="line flex justify-between">
                        <div class="name flex truncate">
                            <p @click="toggleDetalhes(lead.idlead)" class="truncate flex-1 text-xl cursor-pointer">{{ lead.nome }}<i class="fas m-auto ms-1.5"
                                    :class="detalhesVisiveis[lead.idlead] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                            </p>

                        </div>
                        <div class="flex"> 
                            <div class="flex m-1 gap-1.5 text-sm truncate"> 
                                <button v-tippy="'Mídia de Visita'">
                                    <p v-if="lead.midia_principal"
                                        class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                        {{ lead.midia_principal }}
                                    </p>
                                </button> 
                                <button v-tippy="'Situação'" class="truncate">
                                    <p class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                        {{ lead.situacao.nome }}
                                    </p>
                                </button>
                            </div>

                            <div class="redirects flex gap-2 p-2">
                                <button v-tippy="'CV CRM'">
                                    <a :href="'https://menin.cvcrm.com.br/gestor/comercial/leads/' + lead.idlead + '/administrar?lido=true'"
                                        target="_blank">
                                        <img src="/CVLogo.png" alt="CV CRM" class="h-4 drop-shadow">
                                    </a>
                                </button>
                                <button v-tippy="'RD Station'">
                                    <a :href="lead.link_rdstation" target="_blank">
                                        <img src="/RDLogo.png" alt="RD Station" class="h-4 drop-shadow">
                                    </a>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="detalhesVisiveis[lead.idlead]" class="mt-2">
                        <div class="bg-gray-600 px-2 pb-2 pt-3 rounded-xl flex text-center my-3 text-gray-200/80">
                            <label class="absolute ms-3 -mt-6 font-semibold text-lg text-gray-200">Dados Cliente</label>
                            <button v-tippy="'Email'" class="flex-1">
                                <a :href="'mailto:' + lead.email"><i class="fas fa-envelope"></i> {{ lead.email
                                    }}</a></button>
                            <button v-tippy="'WhatsApp'" class="flex-1">
                                <a :href="'https://wa.me/' + lead.telefone.replace(/\D/g, '')" target="_blank"><i
                                        class="fab fa-whatsapp"></i> {{ lead.telefone }}</a></button>
                        </div>
                        <div v-if="lead.imobiliaria.nome" class="bg-gray-600 px-2 pb-2 pt-3 rounded-xl flex text-center my-3 text-gray-200/80">
                            <label class="absolute ms-3 -mt-6 font-semibold text-lg text-gray-200">Dados
                                imobiliária</label>
                            <button v-tippy="'CV Imobiliária'" class="flex-1">
                                <a target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias?q%5B1%7Cimobiliarias.idimobiliaria%5D=&q%5B2%7Cimobiliarias.nome%5D=' + lead.imobiliaria.nome">
                                    <i class="fas fa-trowel-bricks"></i> {{ lead.imobiliaria.nome }}
                                </a>
                            </button>
                            <button v-tippy="'CV Corretor'" class="flex-1">
                                <a target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/corretores?q%5B1%7Cc.idcorretor%5D=&q%5B2%7Cc.nome%5D=' + lead.corretor.nome">
                                    <i class="fas fa-clipboard"></i> {{ lead.corretor.nome }}
                                </a>
                            </button>
                        </div>
                    </div>

                    <div class="w-full justify-between flex gap-1.5 overflow-x-auto mt-2">
                        <div class="bg-gray-600 rounded-md px-2" v-if="lead.empreendimento.length > 0">
                            {{ lead.empreendimento[0].nome }}
                        </div>
                        <div v-else class="bg-gray-600 rounded-md px-2">SEM EMPREENDIMENTO</div>
                        <div class="text-gray-500 pe-1.5">
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

const toggleDetalhes = (idlead) => {
    detalhesVisiveis.value[idlead] = !detalhesVisiveis.value[idlead];
};

const emit = defineEmits(['update:modalVisivel']);

const fecharModal = () => {
    emit('update:modalVisivel', false);
};
</script>
