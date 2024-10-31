<!-- src/components/Events/EditEventModal.vue -->
<script setup>
import { ref } from 'vue';
import { updateEvent } from '../../utils/apiEvents';

const props = defineProps({ event: Object });
const emit = defineEmits(['close', 'event-deleted']);

const editedEvent = ref({ ...props.event });

// Garantir que o endereço exista como um objeto dentro de editedEvent
if (!editedEvent.value.address) {
    editedEvent.value.address = {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: ''
    };
}

// Formatar a data para o HTML
editedEvent.value.eventDate = new Date(editedEvent.value.event_date).toISOString().split('T')[0];

const submitEdit = async () => {
    try {
        await updateEvent(editedEvent.value);
        emit('close'); // Fecha o modal após salvar as mudanças
    } catch (error) {
        console.error('Erro ao atualizar o evento:', error);
    }
};

// Funções para gerenciar tags e imagens
const newTag = ref('');
const newImageUrl = ref('');

const addTag = () => {
    if (newTag.value) {
        editedEvent.value.tags.push(newTag.value);
        newTag.value = '';
    }
};

const removeTag = (index) => {
    editedEvent.value.tags.splice(index, 1);
};

const addImage = () => {
    if (newImageUrl.value) {
        editedEvent.value.images.push(newImageUrl.value);
        newImageUrl.value = '';
    }
};

const removeImage = (index) => {
    editedEvent.value.images.splice(index, 1);
};
</script>

<template>
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg text-gray-600">
            <h3 class="text-xl font-semibold mb-4 text-center">Editar Evento</h3>
            <form class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Título</label>
                    <input v-model="editedEvent.title" type="text" required class="w-full p-2 border rounded-md" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Descrição</label>
                    <textarea v-model="editedEvent.description" required class="w-full p-2 border rounded-md"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Data do Evento</label>
                    <input v-model="editedEvent.eventDate" type="date" required class="w-full p-2 border rounded-md" />
                </div>

                <!-- Campo para Endereço -->
                <div>
                    <label class="block text-sm font-medium mb-1">Endereço</label>
                    <div class="space-y-2">
                        <input v-model="editedEvent.address.street" placeholder="Rua" class="w-full p-2 border rounded-md" />
                        <input v-model="editedEvent.address.number" placeholder="Número" class="w-full p-2 border rounded-md" />
                        <input v-model="editedEvent.address.neighborhood" placeholder="Bairro" class="w-full p-2 border rounded-md" />
                        <input v-model="editedEvent.address.city" placeholder="Cidade" class="w-full p-2 border rounded-md" />
                        <input v-model="editedEvent.address.state" placeholder="Estado" class="w-full p-2 border rounded-md" />
                        <input v-model="editedEvent.address.zip_code" placeholder="CEP" class="w-full p-2 border rounded-md" />
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
                        <span v-for="(tag, index) in editedEvent.tags" :key="index"
                              class="flex items-center bg-gray-200 text-gray-800 px-2 py-1 rounded-md">
                            {{ tag }}
                            <button type="button" @click="removeTag(index)" class="text-red-500 ml-2">x</button>
                        </span>
                    </div>
                </div>

                <!-- Campo para Imagens -->
                <div>
                    <label class="block text-sm font-medium mb-1">Imagens</label>
                    <div class="flex items-center gap-2 flex-wrap">
                        <input v-model="newImageUrl" placeholder="URL da imagem"
                               @keyup.enter="addImage" class="p-2 border rounded-md w-full md:w-auto" />
                        <button type="button" @click="addImage"
                                class="bg-blue-500 text-white px-4 py-1 rounded-md">Adicionar Imagem</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div v-for="(image, index) in editedEvent.images" :key="index" class="relative">
                            <img :src="image" alt="Imagem do evento" class="w-full h-32 object-cover rounded-md" />
                            <button @click="removeImage(index)" class="absolute top-1 right-1 text-red-500 bg-white rounded-full p-1">x</button>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-4">
                    <button type="button" @click="submitEdit" class="bg-green-500 text-white px-4 py-2 rounded-md">Salvar Alterações</button>
                    <button type="button" @click="$emit('close')" class="bg-gray-500 text-white px-4 py-2 rounded-md">Cancelar</button>
                </div>
            </form>
        </div>
    </div>
</template>
