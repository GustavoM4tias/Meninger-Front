<!-- src/components/Events/EventModal.vue -->
<script setup>
import { ref, computed } from 'vue';
import { defineProps, defineEmits } from 'vue';
import EditEventModal from './EditEventModal.vue';
import { deleteEvent } from '../../utils/apiEvents';

const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['close', 'event-deleted']);

const closeModal = () => {
    emit('close');
};

const isEditModalOpen = ref(false);

const openEditModal = () => {
    isEditModalOpen.value = true;
};

// Função para gerenciar a exclusão e emitir evento
const handleEventDeleted = () => {
    emit('event-deleted'); // Emite o evento para `Events.vue`
};

const excluirEmpreendimento = async () => {
    const confirmar = confirm('Você tem certeza que deseja excluir este evento?');
    if (confirmar === true) {
        try {
            await deleteEvent(props.event.id); // Chama a API de exclusão com o ID do evento
            emit('event-deleted'); // Emite o evento de exclusão
            closeModal(); // Fecha o modal
        } catch (error) {
            console.error("Erro ao excluir evento:", error);
        }
    }
};

// Funções de navegação de imagens
const imagemAtual = ref(0);

const imagemTotal = computed(() => {
    return props.event && props.event.images ? props.event.images.length - 1 : -1;
});

const proximo = () => {
    if (imagemAtual.value >= imagemTotal.value) {
        imagemAtual.value = 0;
    } else {
        imagemAtual.value += 1;
    }
};

const anterior = () => {
    if (imagemAtual.value === 0) {
        imagemAtual.value = imagemTotal.value;
    } else {
        imagemAtual.value -= 1;
    }
};


</script>

<template>

    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
        <div class="bg-white sm:h-5/6 sm:w-8/12 w-11/12 rounded-lg mx-auto relative">
            <div class="content h-full grid grid-cols-1 lg:grid-cols-3">
                <div
                    class="img col-span-1 sm:col-span-2 relative rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none h-100 w-full h-full overflow-hidden">
                    <img :src="event.images[imagemAtual] || '/noimg.jpg'" class="w-full h-full object-cover" />

                    <div class="absolute top-0 left-0 m-5">
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-50 mb-2 mr-5 drop-shadow-xl">{{
                            event.title }}</h2>
                        <ul class="flex flex-wrap">
                            <li class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 font-semibold border-2 hover:border-gray-50 border-gray-300 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg"
                                v-for="tag in event.tags" :key="tag">{{ tag }}</li>
                        </ul>
                    </div>

                    <!-- Botões de navegação -->
                    <div class="nav" v-if="event.images.length > 0">
                        <div class="absolute top-1/2 left-4 transform -translate-y-1/2">
                            <i class="fas fa-chevron-left cursor-pointer text-2xl text-gray-800 hover:text-gray-600 duration-200"
                                @click="anterior"></i>
                        </div>
                        <div class="absolute top-1/2 right-4 transform -translate-y-1/2">
                            <i class="fas fa-chevron-right cursor-pointer text-2xl text-gray-800 hover:text-gray-600 duration-200"
                                @click="proximo"></i>
                        </div>
                    </div>

                    <!-- Indicadores de posição -->
                    <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <span v-for="(img, index) in event.images" :key="index" class="h-2 w-2 rounded-full"
                            :class="{ 'bg-blue-500': imagemAtual === index, 'bg-gray-300': imagemAtual !== index }"></span>
                    </div>
                </div>



                <div class="text flex flex-col">

                    <div class="text flex flex-col py-4 px-4 md:px-6">

                        <div x-data="{ isActive: false }" class="relative">
                            <div class="inline-flex items-center overflow-hidden">
                                <i x-on:click="isActive = !isActive"
                                    class="fas fa-ellipsis-vertical text-2xl m-1.5 cursor-pointer text-gray-800 hover:text-gray-700 duration-200"></i>
                            </div>

                            <div class="absolute end-0 z-10 w-auto rounded-md border border-gray-100 bg-white shadow-lg"
                                role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                                x-on:keydown.escape.window="isActive = false">
                                <div class="p-2">
                                    <a class="block rounded-lg px-4 py-2 cursor-pointer text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                        role="menuitem" @click="openEditModal">
                                        <i class="fas text-xl fa-pencil mr-1"></i>
                                        Editar Empreendimento
                                    </a>
                                    <button @click="excluirEmpreendimento"
                                        class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                        role="menuitem">
                                        <i class="far text-red-700 text-xl fa-trash-can mr-1"></i>
                                        Excluir Empreendimento
                                    </button>
                                </div>
                            </div>
                        </div>

                        <span class="text-gray-600 font-normal">
                            {{ new Date(event.event_date).toLocaleDateString() }} <!-- Editar dia/mes -->
                        </span>
                        <div class="descricao text-gray-600  mb-6">
                            <p class="pl-2">Descrição:</p>
                            <p class="text-md border rounded-xl  md:rounded-2xl p-2 md:p-3">{{ event?.description }}</p>
                        </div>
                        <!-- 
                        <div class="criador">
                            <p class="text-gray-600 text-sm absolute bottom-0 right-0 m-1 md:m-3">{{
                                formatarData(event?.dataHoraPostagem, false) }}, <span class="font-bold text-lg">{{
                                    event?.criador }}.</span></p>
                        </div> -->
                    </div>

                    <i class="fas fa-xmark absolute text-2xl top-0 right-0 m-5 cursor-pointer text-gray-800 hover:text-gray-700 duration-200"
                        @click="closeModal"></i>
                </div>
            </div>
        </div>
        <!-- Modal de Edição do Evento -->
        <EditEventModal v-if="isEditModalOpen" :event="event" @close="isEditModalOpen = false"
            @event-deleted="handleEventDeleted" />
    </div>
</template>
