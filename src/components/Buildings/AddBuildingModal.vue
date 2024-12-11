<script setup>
import { ref, onMounted, watch } from 'vue';
import { addBuilding, getAddress } from '../../utils/apiBuilding';  // Função para buscar endereço
import { useAuthStore } from '../../stores/authStore';
import Select from '../UI/Select.vue';

const authStore = useAuthStore();

const emit = defineEmits(['close']); // Para fechar o modal

const newBuilding = ref({
    title: '',
    description: '',
    buildingDate: '',
    tags: [],
    images: [],
    address: {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: ''
    },
    created_by: authStore.user.username,
    stage: ''
});

const optionsStage = [
    { value: 'Pré Lançamento', label: 'Pré Lançamento' },
    { value: 'Lançamento', label: 'Lançamento' },
    { value: 'Em Obras', label: 'Em Obras' },
    { value: 'Finalizado', label: 'Finalizado' }
];

// Função para buscar o endereço usando o CEP
const fetchAddress = async (cep) => {
    try {
        const data = await getAddress(cep);
        newBuilding.value.address.street = data.logradouro || '';
        newBuilding.value.address.neighborhood = data.bairro || '';
        newBuilding.value.address.city = data.localidade || '';
        newBuilding.value.address.state = data.uf || '';
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
    }
};

// Watch para monitorar alterações no CEP e buscar o endereço
watch(
    () => newBuilding.value.address.zip_code,
    (newCep) => {
        if (newCep.length === 8) {  // Verifica se o CEP tem 8 dígitos
            fetchAddress(newCep);  // Chama a função para buscar o endereço
        } else if (newCep.length === 0) {  // Se o CEP for apagado, limpa o endereço
            newBuilding.value.address = {
                street: '',
                number: '',
                neighborhood: '',
                city: '',
                state: '',
                zip_code: ''
            };
        }
    }
);


// Funções para gerenciar tags e imagens
const newTag = ref('');
const newImageUrl = ref('');

// Função para submeter o novo empreendimento
const submitAdd = async () => {
    try {
        await addBuilding(newBuilding.value);
        emit('close'); // Fecha o modal após adicionar o empreendimento
    } catch (error) {
        console.error('Erro ao adicionar o empreendimento:', error);
    }
};

// Função para adicionar uma nova tag
const addTag = () => {
    if (newTag.value) {
        newBuilding.value.tags.push(newTag.value);
        newTag.value = '';
    }
};

// Função para remover uma tag
const removeTag = (index) => {
    newBuilding.value.tags.splice(index, 1);
};

// Função para adicionar uma nova imagem
const addImage = () => {
    if (newImageUrl.value) {
        newBuilding.value.images.push(newImageUrl.value);
        newImageUrl.value = '';
    }
};

// Função para remover uma imagem
const removeImage = (index) => {
    newBuilding.value.images.splice(index, 1);
};


// Carrega as informações do usuário ao montar o componente
onMounted(async () => {
    if (!authStore.user) {
        await authStore.fetchUserInfo();
    }
});

</script>

<template>
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div
            class="bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-xl p-3 lg:p-6 h-[90%] w-5/6 md:w-3/6 lg:w-2/6 text-gray-700 dark:text-gray-100 overflow-y-auto">
            <h3 class="text-xl font-semibold text-center">Adicionar Empreendimento</h3>

            <form @submit.prevent="submitAdd" class="text-gray-100 font-semibold text-lg">

                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Empreendimento</label>
                    <div class="grid grid-cols-3 gap-x-3">

                        <div class="col-span-2">
                            <label class="text-gray-300 place">Título</label>
                            <input v-model="newBuilding.title" type="text" required
                                placeholder="Título do Empreendimento"
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="">
                            <label class="text-gray-300">Data</label>
                            <input v-model="newBuilding.buildingDate" type="date" required
                                class="w-full font-normal text-gray-600 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="col-span-3">
                            <label class="text-gray-300">Descrição</label>
                            <textarea v-model="newBuilding.description" required
                                placeholder="Descrição do Empreendimento"
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md"></textarea>
                        </div>

                    </div>
                </div>

                <!-- Campo para Endereço -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Endereço</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input v-model="newBuilding.address.zip_code" placeholder="CEP"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newBuilding.address.state" placeholder="Estado"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newBuilding.address.city" placeholder="Cidade"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newBuilding.address.neighborhood" placeholder="Bairro"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newBuilding.address.street" placeholder="Rua"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newBuilding.address.number" placeholder="Número"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                    </div>
                </div>

                <!-- Campo para Estádgio de Obra -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Estágio de Obra</label>
                    <Select v-model="newBuilding.stage" :options="optionsStage" placeholder="Estágio de Obra"
                        required />
                </div>

                <!-- Campo para Tags -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Tags</label>
                    <div class="flex">
                        <input v-model="newTag" placeholder="Adicionar tag" @keyup.enter="addTag"
                            class="p-2 border rounded-l-md w-full" />
                        <button type="button" @click="addTag"
                            class="bg-gray-200 hover:bg-gray-300 text-gray-700 text-3xl px-4 py-1 rounded-r-md">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="flex gap-3 mt-2 overflow-x-auto">
                        <div v-for="(tag, index) in newBuilding.tags" :key="index"
                            class="flex w-auto relative flex-shrink-0 items-center justify-between bg-gray-200 text-gray-800 px-2 py-1 my-1 rounded-md">
                            {{ tag }}
                            <i class="fas fa-xmark cursor-pointer text-xl ms-2" @click="removeTag(index)"></i>
                        </div>
                    </div>
                </div>

                <!-- Campo para Imagens -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Imagens</label>
                    <div class="flex">
                        <input v-model="newImageUrl" placeholder="Link da imagem" @keyup.enter="addImage"
                            class="p-2 border rounded-l-md w-full" />
                        <button type="button" @click="addImage"
                            class="bg-gray-200 hover:bg-gray-300 text-gray-700 text-3xl px-4 py-1 rounded-r-md">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>

                    <!-- Contêiner para imagens com rolagem lateral -->
                    <div class="flex gap-3 mt-2 overflow-x-auto">
                        <div v-for="(image, index) in newBuilding.images" :key="index"
                            class="relative flex-shrink-0 my-1">
                            <img :src="image" class="w-full h-40 object-cover rounded-md" />
                            <button @click="removeImage(index)"
                                class="absolute top-0 right-2 text-2xl text-white filter drop-shadow">
                                <i class="fas fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-2">
                    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded-md">Salvar
                        Alterações</button>
                    <button type="button" @click="$emit('close')"
                        class="bg-gray-500 text-white px-4 py-2 rounded-md">Cancelar</button>
                </div>

            </form>
        </div>
    </div>
</template>
