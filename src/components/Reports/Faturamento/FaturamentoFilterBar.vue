<script setup>
import { reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { useContratosStore } from '@/stores/Reports/Contracts/contractStore';
import { useToast } from 'vue-toastification';

const toast = useToast();

// logo após os seus imports
const contratoStore = useContratosStore();

// função que chama a action clearCache e então refaz a busca
const clearCache = async () => {
    const ok = await contratoStore.clearCache();
    if (ok) {
        // feedback pro usuário (pode trocar por toast, snackbar etc) 
        toast.success('Cache limpo com sucesso!');
        // refaz a busca usando os filtros atuais
        await contratoStore.fetchContratos(filtros);
    } else {
        toast.error('Falha ao limpar o cache');
    }
};

const props = defineProps({
    availableCompanies: Array,
    availableEnterprises: Array,
    availableEnterpriseNames: Array
});

const emit = defineEmits(['aplicar']);

const filtros = reactive({
    // companyIds: ['101', '89', '50', '98', '96', '83', '60', '23', '72', '99'],
    companyIds: [],
    enterpriseIds: [],
    enterpriseNames: [],
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    linkedEnterprises: ['78001:17004', '10101:18915']
});

const vinculoA = ref('');
const vinculoB = ref('');

const adicionarUnico = (e, tipo) => {
    const val = e.target.value;
    if (val && !filtros[tipo].includes(val)) {
        filtros[tipo].push(val);
    }
    e.target.value = '';
};

const removerValor = (tipo, valor) => {
    filtros[tipo] = filtros[tipo].filter(v => v !== valor);
};

const adicionarVinculo = () => {
    if (vinculoA.value && vinculoB.value) {
        const novo = `${vinculoA.value}:${vinculoB.value}`;
        if (!filtros.linkedEnterprises.includes(novo)) {
            filtros.linkedEnterprises.push(novo);
        }
        vinculoA.value = '';
        vinculoB.value = '';
    }
};

const aplicarFiltros = () => {
    emit('aplicar', { ...filtros });
};
</script>


<template>
    <section
        class="flex items-center relative h-auto justify-between p-4 rounded-xl shadow bg-gray-200 dark:bg-gray-700">

        <i class="fa fa-circle-info text-xl absolute right-2 top-2 cursor-pointer" @click.stop="clearCache"
            v-tippy.html="`
            <p class='text-xs text-center px-2'>
            Cache: 20 min para evitar reloads.<br>
            Clique para limpar!
            </p>
            `" data-tippy-placement="bottom"></i>


        <!-- Filtro por Data -->
        <div class="flex gap-4">
            <!-- Datas -->
            <div>
                <label class="font-semibold block text-sm">Período:</label>
                <div class="flex gap-2 items-center mb-2 flex-wrap mt-2">
                    <input type="date" v-model="filtros.startDate"
                        class="w-32 px-2 py-1.5 border rounded-lg bg-transparent border-gray-500 text-center" />
                    <span class="text-sm">até</span>
                    <input type="date" v-model="filtros.endDate"
                        class="w-32 px-2 py-1.5 border rounded-lg bg-transparent border-gray-500 text-center" />
                </div>
            </div>

            <!-- Empresas -->
            <div class="max-w-28">
                <label class="font-semibold block text-sm">Empresa:</label>
                <select @change="e => adicionarUnico(e, 'companyIds')"
                    class="w-full px-2 py-2 mb-2 mt-2 border rounded-lg bg-transparent border-gray-500 text-center">
                    <option value="">Empresa</option>
                    <option class="text-gray-600" v-for="opt in props.availableCompanies" :key="opt" :value="opt">{{ opt
                        }}</option>
                </select>

                <div class="flex flex-wrap max-h-24 gap-1 overflow-auto">
                    <span v-for="id in filtros.companyIds" :key="id"
                        class="bg-sky-500 text-white mb-1 ps-1 pe-2 py-0.5 rounded-full text-sm flex items-center">
                        <button @click="removerValor('companyIds', id)" class="mx-1 hover:text-gray-200"
                            aria-label="Remover empresa">
                            <i class="fas fa-xmark"></i>
                        </button>
                        <p class="truncate">
                            {{ id }}</p>
                    </span>
                </div>
            </div>

            <!-- Empreendimentos -->
            <div class="max-w-44">
                <label class="font-semibold block text-sm">Centro de Custo:</label>
                <select @change="e => adicionarUnico(e, 'enterpriseIds')"
                    class="w-full px-2 py-2 mb-2 mt-2 border rounded-lg bg-transparent border-gray-500 text-center">
                    <option value="">Empreendimento</option>
                    <option class="text-gray-600" v-for="opt in props.availableEnterprises" :key="opt" :value="opt">{{
                        opt }}</option>
                </select>

                <div class="flex flex-wrap max-h-24 gap-1 overflow-auto">
                    <span v-for="id in filtros.enterpriseIds" :key="id"
                        class="bg-emerald-500 text-white mb-1 ps-1 pe-2 py-0.5 rounded-full text-sm flex items-center">
                        <button @click="removerValor('enterpriseIds', id)" class="mx-1 hover:text-gray-200"
                            aria-label="Remover empreendimento">
                            <i class="fas fa-xmark"></i>
                        </button>
                        <p class="truncate">
                            {{ id }}</p>
                    </span>
                </div>
            </div>

            <!-- Nomes de Empreendimentos -->
            <div class="max-w-56">
                <label class="font-semibold block text-sm">Nome empreendimento:</label>
                <select @change="e => adicionarUnico(e, 'enterpriseNames')"
                    class="w-56 px-2 py-2 mb-2 mt-2 border rounded-lg bg-transparent border-gray-500 text-center">
                    <option value="">Nome Empreendimentos</option>
                    <option class="text-gray-600" v-for="opt in props.availableEnterpriseNames" :key="opt" :value="opt">
                        {{ opt }}</option>
                </select>

                <div class="flex flex-wrap max-h-24 gap-1 overflow-auto">
                    <span v-for="n in filtros.enterpriseNames" :key="n"
                        class="bg-purple-500 text-white text-xs mb-1 ps-1 pe-2 py-0.5 rounded-full flex items-center">
                        <button @click="removerValor('enterpriseNames', n)" class="mx-1 hover:text-gray-800"
                            aria-label="Remover empreendimento vinculado">
                            <i class="fas fa-xmark"></i>
                        </button>
                        <p class="truncate">{{ n }}</p>
                    </span>
                </div>
            </div>

            <!-- Vincular Centros de Custo -->
            <div class="max-w-64">
                <label class="font-semibold block text-sm">Vincular Centros de Custo:</label>
                <div class="flex gap-2 items-center mb-2 mt-2 flex-wrap">
                    <input v-model="vinculoA" placeholder="10101"
                        class="w-[5.8rem] py-[8px] border rounded-lg bg-transparent border-gray-500 text-center" />
                    <span class="text-2xl font-bold">:</span>
                    <input v-model="vinculoB" placeholder="18004"
                        class="w-[5.8rem] py-[8px] border rounded-lg bg-transparent border-gray-500 text-center" />
                    <button @click="adicionarVinculo"
                        class="bg-green-600 text-white px-3 py-1.5 text-lg font-semibold rounded-lg hover:bg-green-700 focus:outline-none"
                        type="button">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="flex flex-wrap max-h-24 gap-1 overflow-auto">
                    <span v-for="v in filtros.linkedEnterprises" :key="v"
                        class="bg-yellow-500 text-black mb-1 ps-1 pe-2 py-0.5 rounded-full text-xs flex items-center">
                        <button @click="removerValor('linkedEnterprises', v)" class="mx-1 hover:text-gray-800"
                            aria-label="Remover centro de custo vinculado">
                            <i class="fas fa-xmark"></i>
                        </button>
                        {{ v }}
                    </span>
                </div>
            </div>
        </div>
        <!-- Botão Aplicar -->
        <div>
            <button @click="aplicarFiltros"
                class="flex px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                <i class="fas fa-filter pe-1 my-auto"></i> Filtrar
            </button>
        </div>
    </section>
</template>