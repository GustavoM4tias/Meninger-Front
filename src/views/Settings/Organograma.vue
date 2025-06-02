<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import panzoom from "@panzoom/panzoom";
import { useAuthStore } from '@/stores/Auth/authStore';
import OrganizationChart from 'primevue/organizationchart';
import Favorite from "@/components/config/Favorite.vue";

const store = useAuthStore();
const data = ref(null);
const selection = ref({});
const zoomContainer = ref(null);
let panZoomInstance = null;

function buildHierarchy(user, allUsers) {
    if (!user.status) return null; // Ignora usuário inativo

    return {
        key: String(user.id),
        type: 'person',
        data: {
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&rounded=true&background=random&bold=true&format=svg`,
            name: user.username,
            city: user.city,
            title: user.position
        },
        children: user.subordinates
            .map(sub => allUsers.find(u => u.id === sub.id))
            .filter(Boolean) // Remove nulos
            .map(sub => buildHierarchy(sub, allUsers))
            .filter(Boolean) // Remove subárvores nulas (subordinados inativos)
    };
}

const zoomIn = () => panZoomInstance?.zoomIn();
const zoomOut = () => panZoomInstance?.zoomOut();

function handleKeyboardZoom(e) {
    if (e.ctrlKey && document.activeElement === document.body) {
        if (e.key === '+') {
            zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            zoomOut();
            e.preventDefault();
        } else if (e.key === '0') {
            resetZoom();
            e.preventDefault();
        }
    }
}

function handleMouseWheel(event) {
    if (!event.ctrlKey) { // Impede conflito com o zoom nativo do navegador (Ctrl + scroll)
        event.preventDefault();
        if (event.deltaY < 0) {
            zoomIn();
        } else if (event.deltaY > 0) {
            zoomOut();
        }
    }
}

onMounted(async () => {
    await store.getAllUsers();
    const users = store.users;
    const topLevelUsers = users.filter(u => u.manager_id === null);

    data.value = topLevelUsers.length === 1
        ? buildHierarchy(topLevelUsers[0], users)
        : {
            key: 'root',
            type: 'person',
            data: {
                image: '',
                name: 'Empresa',
                city: 'Cidade',
                title: 'Organograma'
            },
            children: topLevelUsers.map(top => buildHierarchy(top, users))
        };

    if (zoomContainer.value) {
        panZoomInstance = panzoom(zoomContainer.value, {
            smoothScroll: false,
            zoomSpeed: 0.065,
            boundsPadding: 0.9,
        });

        // Adiciona evento de scroll
        zoomContainer.value.addEventListener('wheel', handleMouseWheel, { passive: false });
    }

    window.addEventListener('keydown', handleKeyboardZoom);
});

onBeforeUnmount(() => {
    if (zoomContainer.value) {
        zoomContainer.value.removeEventListener('wheel', handleMouseWheel);
    }
    window.removeEventListener('keydown', handleKeyboardZoom);
});
</script>

<template>
    <div class="w-full h-[calc(100vh-4rem)] relative overflow-hidden bg-gray-800">


        <div
            class="grid-container bg-gray-900 shadow-xl shadow-white/5 rounded-xl bg-center bg-contain h-[95%] w-[95%] z-10 relative flex justify-center items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">

            <div class="flex items-center absolute top-0 left-0 p-3 z-20">
                <h1 class="text-xl md:text-2xl font-bold">Organograma</h1>
                <Favorite :router="'/settings/organograma'" :section="'Organograma'" />
            </div>

            <!-- Barra de controle fixa -->
            <div class="absolute top-2 right-2 z-10 flex gap-2">
                <button @click="zoomIn" class="px-2 py-1 text-white hover:text-gray-200"><i
                        class="fas fa-plus"></i></button>
                <button @click="zoomOut" class="px-2 py-1 text-white hover:text-gray-200"><i
                        class="fas fa-minus"></i></button>
            </div>

            <!-- Área de movimentação -->
            <div ref="zoomContainer" class="absolute panzoom-container m-auto py-[10rem] px-[30rem]">
                <div v-if="data">
                    <OrganizationChart v-model:selectionKeys="selection" :value="data" collapsible
                        selectionMode="multiple">
                        <template #person="slotProps">
                            <div class="flex flex-col">
                                <div class="flex flex-col items-center">
                                    <img :alt="slotProps.node.data.name" :src="slotProps.node.data.image"
                                        class="w-12 h-12" />
                                    <span class="text-gray-500 my-1.5 text-xs">{{ slotProps.node.data.city }}</span>
                                    <span class="font-medium mb-2">{{ slotProps.node.data.name }}</span>
                                    <span class="text-xs text-gray-400 -mt-2">{{ slotProps.node.data.title }}</span>
                                </div>
                            </div>
                        </template>
                        <template #default="slotProps">
                            <span>{{ slotProps.node.label }}</span>
                        </template>
                    </OrganizationChart>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.grid-container {
    background-image: url('../../assets/Grid-3.svg');
}

.panzoom-container {
    transform-origin: center center;
    touch-action: none;
    cursor: grab;
    user-select: none;
}

.panzoom-container:active {
    cursor: grabbing;
}
</style>
