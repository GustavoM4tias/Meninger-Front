<template>
    <aside class="Recents w-4/12 h-full bg-gray-100 dark:bg-gray-800 p-4">
        <div class="flex flex-col h-full justify-around">
            <h2 class="text-2xl">Últimos Leads</h2>
            <div v-for="lead in ultimosLeads" :key="lead.idlead"
                class="bg-gray-200 dark:bg-gray-900 rounded-lg shadow hover:-translate-x-2 filter transition-transform duration-100 ease-in-out p-3 w-full">
                <div class="flex">
                    <div @click="toggleDetails(lead.idlead)"
                        class="flex w-auto max-w-[60%] min-w-[30%] overflow-hidden cursor-pointer">
                        <p class="text-lg font-semibold truncate">{{ lead.nome }}</p>
                        <i class="fas m-auto ms-1.5 shrink-0 min-w-5"
                            :class="detailsOpened(lead.idlead) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>
                    <div class="flex flex-1 overflow-hidden">
                        <div class="hidden md:flex px-2 text-xs m-auto mt-0 me-0 gap-2 min-w-0 overflow-hidden">
                            <button v-tippy="'Mídia de Visita'" class="shrink-0">
                                <p v-if="lead.midia_principal"
                                    class="py-0.5 px-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 truncate">
                                    {{ lead.midia_principal }}
                                </p>
                            </button>
                            <button v-tippy="'Situação'" class="flex-grow min-w-0 overflow-hidden">
                                <p class="py-0.5 px-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 truncate">
                                    {{ lead.situacao.nome }}
                                </p>
                            </button>
                        </div>
                        <div class="flex gap-2 shrink-0">
                            <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${lead.idlead}/administrar?lido=true`"
                                target="_blank" class="cursor-pointer" v-tippy="'CV CRM'">
                                <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                            </a>
                            <a v-if="lead.link_rdstation" :href="lead.link_rdstation" target="_blank"
                                class="cursor-pointer" v-tippy="'RD Station'">
                                <img src="/RDLogo.png" alt="RD Station" class="w-5 min-w-5" />
                            </a>
                        </div>
                    </div>
                </div>
                <div v-if="detailsOpened(lead.idlead)" class="mt-2">
                    <div
                        class="bg-gray-200 dark:bg-gray-700 px-1 sm:px-2 pb-1 md:pb-2 pt-2 md:pt-3 rounded-xl flex text-center my-3">
                        <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                            Cliente</label>
                        <button v-tippy="'Email'" class="flex-1 truncate">
                            <a class="text-sm md:text-md truncate" :href="'mailto:' + lead.email">
                                <i class="fas fa-envelope"></i> {{ lead.email }}
                            </a>
                        </button>
                        <button v-tippy="'WhatsApp'" class="flex-1 truncate">
                            <a class="text-sm md:text-md truncate"
                                :href="'https://wa.me/' + lead.telefone.replace(/\D/g, '')" target="_blank">
                                <i class="fab fa-whatsapp"></i> {{ lead.telefone }}
                            </a>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup>
import { ref } from 'vue';

const ultimosLeads = ref([]);
const detalhesAbertos = ref({});

const toggleDetails = (id) => {
    detalhesAbertos.value[id] = !detalhesAbertos.value[id];
};

const detailsOpened = (id) => detalhesAbertos.value[id] || false;
</script>