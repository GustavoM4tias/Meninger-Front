<script setup>
import { ref, onMounted, watch } from 'vue';
import { addEvent } from '../../utils/Event/apiEvents';
import { getAddress } from '../../utils/Config/apiExternalBuilding';
import { useAuthStore } from '../../stores/Auth/authStore';
import Notification from '../Navigation/components/Notification.vue';

const authStore = useAuthStore();

const emit = defineEmits(['close']); // Para fechar o modal

const notification = ref(false);
 
const handleNotification = () => {
    notification.value = !notification.value;
};

const newEvent = ref({
    title: '',
    description: '',
    eventDate: '',
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
    notification: notification
});

// Função para buscar e preencher o endereço automaticamente
const fetchAddress = async (cep) => {
    try {
        const data = await getAddress(cep);
        newEvent.value.address.street = data.logradouro || '';
        newEvent.value.address.neighborhood = data.bairro || '';
        newEvent.value.address.city = data.localidade || '';
        newEvent.value.address.state = data.uf || '';
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
    }
};

// Watch para monitorar alterações no CEP e buscar o endereço
watch(
    () => newEvent.value.address.zip_code,
    (newCep) => {
        if (newCep.length === 8) {  // Verifica se o CEP tem 8 dígitos
            fetchAddress(newCep);  // Chama a função para buscar o endereço
        } else if (newCep.length === 0) {  // Se o CEP for apagado, limpa o endereço
            newEvent.value.address = {
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

// Defina as variáveis para tags e imagens
const newTag = ref('');
const newImageUrl = ref('');

const submitAdd = async () => {
    console.log(newEvent.value)
    try {
        await addEvent(newEvent.value);
        emit('close'); // Fecha o modal após adicionar o evento
    } catch (error) {
        console.error('Erro ao adicionar o evento:', error);
    }
};

// Funções para gerenciar tags e imagens
const addTag = () => {
    if (newTag.value) {
        newEvent.value.tags.push(newTag.value); // Adiciona a tag ao evento
        newTag.value = ''; // Limpa o campo após adicionar
    }
};

const removeTag = (index) => {
    newEvent.value.tags.splice(index, 1); // Remove a tag pelo índice
};

const addImage = () => {
    if (newImageUrl.value) {
        newEvent.value.images.push(newImageUrl.value); // Adiciona a imagem ao evento
        newImageUrl.value = ''; // Limpa o campo após adicionar
    }
};

const removeImage = (index) => {
    newEvent.value.images.splice(index, 1); // Remove a imagem pelo índice
};

onMounted(async () => {
    if (!authStore.user) {
        await authStore.fetchUserInfo();
    }
});

</script>

<template>
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div
            class="bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-xl p-6 h-[90%] w-5/6 md:w-3/6 lg:w-2/6 text-gray-700 dark:text-gray-100 overflow-y-auto">
            <h3 class="text-xl font-semibold text-center">Adicionar Evento</h3>

            <form @submit.prevent="submitAdd" class="text-gray-100 font-semibold text-lg">

                <div class="relative my-2 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Info Evento</label>
                    <div class="grid grid-cols-3 gap-x-3">

                        <div class="col-span-2">
                            <label class="text-gray-300 place">Título</label>
                            <input v-model="newEvent.title" type="text" required placeholder="Título do Evento"
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="">
                            <label class="text-gray-300">Data</label>
                            <input v-model="newEvent.eventDate" type="date" required
                                class="w-full font-normal text-gray-600 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="col-span-3">
                            <label class="text-gray-300">Descrição</label>
                            <textarea v-model="newEvent.description" required placeholder="Descrição do Evento"
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md"></textarea>
                        </div>

                    </div>
                </div>

                <!-- Campo para Endereço -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Endereço</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input v-model="newEvent.address.zip_code" placeholder="CEP"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newEvent.address.state" placeholder="Estado"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newEvent.address.city" placeholder="Cidade"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newEvent.address.neighborhood" placeholder="Bairro"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newEvent.address.street" placeholder="Rua"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="newEvent.address.number" placeholder="Número"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                    </div>
                </div>


                <!-- Campo para Endereço -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Notificação</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input v-model="newEvent.notification" placeholder="CEP"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                            <p @click="handleNotification">teste</p>
                    </div>
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
                        <div v-for="(tag, index) in newEvent.tags" :key="index"
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
                        <div v-for="(image, index) in newEvent.images" :key="index" class="relative flex-shrink-0 my-1">
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
