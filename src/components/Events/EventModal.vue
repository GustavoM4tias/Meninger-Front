<!-- src/components/Events/EventModal.vue -->
<script setup>
import { ref, computed } from 'vue';
import { defineProps, defineEmits } from 'vue';
import EditEventModal from './EditEventModal.vue';

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
                <div class="img col-span-1 sm:col-span-2 relative rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none h-100 w-full h-full overflow-hidden">
                    <img :src="event.images[imagemAtual] || '/noimg.jpg'" class="w-full h-full object-cover" />

                    <!-- Botões de navegação -->
                    <div class="absolute top-1/2 left-4 transform -translate-y-1/2">
                        <i class="fas fa-chevron-left cursor-pointer text-2xl text-gray-200 hover:text-gray-400 duration-200"
                            @click="anterior"></i>
                    </div>
                    <div class="absolute top-1/2 right-4 transform -translate-y-1/2">
                        <i class="fas fa-chevron-right cursor-pointer text-2xl text-gray-200 hover:text-gray-400 duration-200"
                            @click="proximo"></i>
                    </div>

                    <!-- Indicadores de posição -->
                    <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <span v-for="(img, index) in event.images" :key="index" class="h-2 w-2 rounded-full"
                            :class="{ 'bg-blue-500': imagemAtual === index, 'bg-gray-300': imagemAtual !== index }"></span>
                    </div>
                </div>



                <div class="text flex flex-col py-4 px-4 md:px-6">

                    <div class="text flex flex-col py-4 px-4 md:px-6">
                        <h2 class="text-xl md:text-2xl font-bold truncate mt-2 mb-2 md:mt-6 md:mb-4 text-center">{{
                            event.title }}</h2>
                        <p class="text-gray-600 font-bold mb-1 md:mb-2">Data do evento: <span class="font-normal">
                                {{ new Date(event.event_date).toLocaleDateString() }} <!-- Editar dia/mes -->
                            </span></p>
                        <!-- <p class="text-gray-600 font-bold mb-1 md:mb-2">Endereço: <span class="font-normal">{{
                            event?.endereco }}</span></p> -->

                        <div class="tags mb-2 md:mb-4">
                            <!-- <p class="text-gray-600 font-bold mb-1 md:mb-2">Tags:</p> -->
                            <ul class="flex flex-wrap">
                                <li class="bg-gray-100 hover:bg-gray-200 cursor-pointer duration-200 shadow px-2 py-1 m-1 rounded-xl"
                                    v-for="tag in event.tags" :key="tag">{{ tag }}</li>
                            </ul>
                        </div>

                        <div class="descricao mb-6">
                            <p class="text-gray-600 mb-1 md:mb-2 pl-2">Descrição:</p>
                            <p class="text-md border rounded-xl  md:rounded-2xl p-2 md:p-3">{{ event?.description }}</p>
                        </div>

                        <div class="images">
                            <img v-for="(image, index) in event.images" :key="index" :src="image"
                                alt="Imagem do evento" />
                        </div>

                        <!-- Botões para fechar e editar o evento -->
                        <button @click="closeModal">Fechar</button>
                        <button @click="openEditModal">Editar Evento</button>

                        <!-- Modal de Edição do Evento -->
                        <EditEventModal v-if="isEditModalOpen" :event="event" @close="isEditModalOpen = false"
                            @event-deleted="handleEventDeleted" />

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
    </div>
</template>
