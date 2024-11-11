<script setup>
import { ref, onMounted } from 'vue';
import { addEvent } from '../../utils/apiEvents'; // Certifique-se de que esta função está corretamente implementada
import { useUserStore } from '../../stores/userStore';

const userStore = useUserStore();

const emit = defineEmits(['close']); // Para fechar o modal
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
    created_by: userStore.user.username
});

// Defina as variáveis para tags e imagens
const newTag = ref('');
const newImageUrl = ref('');

const submitAdd = async () => {
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
    if (!userStore.user) {
        await userStore.fetchUserInfo(); 
    }
});

</script>

<template>
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 class="text-xl font-semibold mb-4 text-center">Adicionar Evento</h3>
            <form @submit.prevent="submitAdd" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Título</label>
                    <input v-model="newEvent.title" type="text" required class="w-full p-2 border rounded-md" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Descrição</label>
                    <textarea v-model="newEvent.description" required class="w-full p-2 border rounded-md"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Data do Evento</label>
                    <input v-model="newEvent.eventDate" type="date" required class="w-full p-2 border rounded-md" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Endereço</label>
                    <div class="space-y-2">
                        <input v-model="newEvent.address.street" placeholder="Rua"
                            class="w-full p-2 border rounded-md" />
                        <input v-model="newEvent.address.number" placeholder="Número"
                            class="w-full p-2 border rounded-md" />
                        <input v-model="newEvent.address.neighborhood" placeholder="Bairro"
                            class="w-full p-2 border rounded-md" />
                        <input v-model="newEvent.address.city" placeholder="Cidade"
                            class="w-full p-2 border rounded-md" />
                        <input v-model="newEvent.address.state" placeholder="Estado"
                            class="w-full p-2 border rounded-md" />
                        <input v-model="newEvent.address.zip_code" placeholder="CEP"
                            class="w-full p-2 border rounded-md" />
                    </div>
                </div>

                <!-- Campo para Tags -->
                <div>
                    <label class="block text-sm font-medium mb-1">Tags</label>
                    <div class="flex items-center gap-2 flex-wrap">
                        <input v-model="newTag" placeholder="Adicionar tag" @keyup.enter="addTag"
                            class="p-2 border rounded-md w-full md:w-auto" />
                        <button type="button" @click="addTag"
                            class="bg-blue-500 text-white px-4 py-1 rounded-md">Adicionar Tag</button>
                    </div>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        <span v-for="(tag, index) in newEvent.tags" :key="index"
                            class="flex items-center bg-gray-200 text-gray-800 px-2 py-1 rounded-md">
                            {{ tag }}
                            <button @click="removeTag(index)" class="text-red-500 ml-2">x</button>
                        </span>
                    </div>
                </div>

                <!-- Campo para Imagens -->
                <div>
                    <label class="block text-sm font-medium mb-1">Imagens</label>
                    <div class="flex items-center gap-2 flex-wrap">
                        <input v-model="newImageUrl" placeholder="URL da imagem" @keyup.enter="addImage"
                            class="p-2 border rounded-md w-full md:w-auto" />
                        <button type="button" @click="addImage"
                            class="bg-blue-500 text-white px-4 py-1 rounded-md">Adicionar Imagem</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div v-for="(image, index) in newEvent.images" :key="index" class="relative">
                            <img :src="image" alt="Imagem do evento" class="w-full h-32 object-cover rounded-md" />
                            <button @click="removeImage(index)"
                                class="absolute top-1 right-1 text-red-500 bg-white rounded-full p-1">x</button>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-4">
                    <button type="button" @click="$emit('close')"
                        class="bg-gray-500 text-white px-4 py-2 rounded-md">Cancelar</button>
                    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded-md">Adicionar Evento</button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
/* Estilos adicionais se necessário */
</style>
