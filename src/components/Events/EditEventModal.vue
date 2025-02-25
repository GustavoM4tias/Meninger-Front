<!-- src/components/Events/EditEventModal.vue -->
<script setup>
import { ref, watch } from 'vue';
import { updateEvent } from '../../utils/Event/apiEvents';
import { getAddress } from '../../utils/Building/apiBuilding';

const props = defineProps({ event: Object });
const emit = defineEmits(['close']);

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

// Função para buscar e preencher o endereço automaticamente
const fetchAddress = async (cep) => {
    try {
        const data = await getAddress(cep);
        editedEvent.value.address.street = data.logradouro || '';
        editedEvent.value.address.neighborhood = data.bairro || '';
        editedEvent.value.address.city = data.localidade || '';
        editedEvent.value.address.state = data.uf || '';
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
    }
};

// Watch para monitorar alterações no CEP e buscar o endereço
watch(
    () => editedEvent.value.address.zip_code,
    (newCep) => {
        if (newCep.length === 8) {  // Verifica se o CEP tem 8 dígitos
            fetchAddress(newCep);  // Chama a função para buscar o endereço
        } else if (newCep.length === 0) {  // Se o CEP for apagado, limpa o endereço
            editedEvent.value.address = {
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
        <div
            class="bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-xl p-6 h-[90%] w-5/6 md:w-3/6 lg:w-2/6 text-gray-700 dark:text-gray-100 overflow-y-auto">
            <h3 class="text-xl font-semibold text-center">Editar Evento</h3>
            <form class="text-gray-100 font-semibold text-lg">

                <div class="relative my-2 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Info Evento</label>
                    <div class="grid grid-cols-3 gap-x-3">

                        <div class="col-span-2">
                            <label class="text-gray-300">Título</label>
                            <input v-model="editedEvent.title" type="text" required
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="">
                            <label class="text-gray-300">Data</label>
                            <input v-model="editedEvent.eventDate" type="date" required
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        </div>

                        <div class="col-span-3">
                            <label class="text-gray-300">Descrição</label>
                            <textarea v-model="editedEvent.description" required
                                class="w-full font-normal text-gray-700 py-1 px-2 border rounded-md"></textarea>
                        </div>

                    </div>
                </div>

                <!-- Campo para Endereço -->
                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                    <label class="absolute -top-5">Endereço</label>
                    <div class="grid grid-cols-2 gap-3">
                        <input v-model="editedEvent.address.zip_code" placeholder="CEP"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="editedEvent.address.state" placeholder="Estado"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="editedEvent.address.city" placeholder="Cidade"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="editedEvent.address.neighborhood" placeholder="Bairro"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="editedEvent.address.street" placeholder="Rua"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
                        <input v-model="editedEvent.address.number" type="number" placeholder="Número"
                            class="font-normal text-gray-700 py-1 px-2 border rounded-md" />
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
                        <div v-for="(tag, index) in editedEvent.tags" :key="index"
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
                        <div v-for="(image, index) in editedEvent.images" :key="index"
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
                    <button type="button" @click="submitEdit"
                        class="bg-green-500 text-white px-4 py-2 rounded-md">Salvar
                        Alterações</button>
                    <button type="button" @click="$emit('close')"
                        class="bg-gray-500 text-white px-4 py-2 rounded-md">Cancelar</button>
                </div>

            </form>

        </div>
    </div>
</template>
