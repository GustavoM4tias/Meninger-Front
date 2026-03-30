<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import panzoom from "@panzoom/panzoom";
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import OrganizationChart from 'primevue/organizationchart';
import Favorite from "@/components/config/Favorite.vue";
import API_URL from '@/config/apiUrl';

const store = useAuthStore();
const data = ref(null);
const zoomContainer = ref(null);
let panZoomInstance = null;

const totalVisible = ref(0);
const allUsersMap = ref({});
const positionDescMap = ref({});
const selectedPerson = ref(null);

function avatarUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&rounded=true&background=random&bold=true&format=svg&size=96`;
}

function whatsappUrl(phone) {
    const digits = String(phone).replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
}

function buildHierarchy(user, visibleUsers) {
    return {
        key: String(user.id),
        type: 'person',
        data: {
            id: user.id,
            image: avatarUrl(user.username),
            name: user.username,
            city: user.city,
            title: user.position,
            email: user.email,
            phone: user.phone || null,
            manager_id: user.manager_id,
        },
        children: user.subordinates
            .map(sub => visibleUsers.find(u => u.id === sub.id))
            .filter(Boolean)
            .map(sub => buildHierarchy(sub, visibleUsers))
            .filter(Boolean)
    };
}

function openPerson(nodeData) {
    const full = allUsersMap.value[nodeData.id];
    selectedPerson.value = {
        ...nodeData,
        managerName: full?.manager?.username ?? null,
        positionDesc: positionDescMap.value[nodeData.title] || '',
    };
}

function closePerson() {
    selectedPerson.value = null;
}

const zoomIn = () => panZoomInstance?.zoomIn();
const zoomOut = () => panZoomInstance?.zoomOut();
const resetZoom = () => panZoomInstance?.reset();

function handleKeyboardZoom(e) {
    if (e.ctrlKey && document.activeElement === document.body) {
        if (e.key === '+') { zoomIn(); e.preventDefault(); }
        else if (e.key === '-') { zoomOut(); e.preventDefault(); }
        else if (e.key === '0') { resetZoom(); e.preventDefault(); }
    }
}

function handleMouseWheel(event) {
    if (!event.ctrlKey) {
        event.preventDefault();
        if (event.deltaY < 0) zoomIn();
        else if (event.deltaY > 0) zoomOut();
    }
}

onMounted(async () => {
    // Busca usuários e posições em paralelo
    const [, resPos] = await Promise.allSettled([
        store.getAllUsers(),
        fetch(`${API_URL}/admin/positions`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
    ]);

    // Mapa de descrições por cargo
    if (resPos.status === 'fulfilled') {
        const posData = await resPos.value.json();
        const posList = Array.isArray(posData) ? posData : (posData?.data || []);
        positionDescMap.value = Object.fromEntries(
            posList.filter(p => p?.active).map(p => [p.name, p.description || ''])
        );
    }

    const users = store.users;
    allUsersMap.value = Object.fromEntries(users.map(u => [u.id, u]));

    const visibleUsers = users.filter(u => u.status && u.show_in_organogram);
    const visibleIds = new Set(visibleUsers.map(u => u.id));
    totalVisible.value = visibleUsers.length;

    const topLevelUsers = visibleUsers.filter(u =>
        u.manager_id === null || !visibleIds.has(u.manager_id)
    );

    data.value = {
        key: 'root',
        type: 'company',
        data: { image: '/Mlogo.png', name: 'Menin Engenharia', city: 'Marília, SP' },
        children: topLevelUsers.map(top => buildHierarchy(top, visibleUsers)).filter(Boolean)
    };

    if (zoomContainer.value) {
        panZoomInstance = panzoom(zoomContainer.value, {
            smoothScroll: false,
            zoomSpeed: 0.065,
            boundsPadding: 0.9,
        });
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
    <div class="w-full h-[calc(100vh-4rem)] relative overflow-hidden" @click="closePerson">

        <div
            class="grid-container bg-white dark:bg-gray-900 rounded-xl bg-center bg-contain h-[95%] w-[95%] z-10 relative flex justify-center items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">

            <!-- Header -->
            <div class="flex items-center justify-between absolute top-0 left-0 right-0 p-4 z-20">
                <div class="flex items-center gap-2">
                    <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Organograma</h1>
                    <Favorite :router="'/settings/organograma'" :section="'Organograma'" />
                </div>

                <div class="flex items-center gap-3">
                    <div v-if="totalVisible > 0"
                        class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                        <i class="fas fa-users text-[11px]"></i>
                        <span>{{ totalVisible }} {{ totalVisible === 1 ? 'pessoa' : 'pessoas' }}</span>
                    </div>
                    <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button @click.stop="zoomOut"
                            class="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition text-xs">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button @click.stop="resetZoom"
                            class="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition text-xs">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button @click.stop="zoomIn"
                            class="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition text-xs">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Estado vazio -->
            <div v-if="data && data.children.length === 0"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8 z-10 pointer-events-none">
                <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <i class="fas fa-sitemap text-2xl text-gray-300 dark:text-gray-600"></i>
                </div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum colaborador no organograma</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                    Acesse o painel de usuários e ative "Exibir no organograma" para cada colaborador.
                </p>
            </div>

            <!-- Área pan/zoom -->
            <div ref="zoomContainer" class="absolute panzoom-container m-auto py-[10rem] px-[30rem]">
                <div v-if="data">
                    <OrganizationChart :value="data" collapsible>

                        <!-- Card de pessoa -->
                        <template #person="slotProps">
                            <div class="person-card flex items-center gap-3 px-4 py-3 min-w-[200px] max-w-[240px] cursor-pointer"
                                @click.stop="openPerson(slotProps.node.data)">
                                <div class="shrink-0">
                                    <img :alt="slotProps.node.data.name" :src="slotProps.node.data.image"
                                        class="w-11 h-11 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm" />
                                </div>
                                <div class="flex flex-col min-w-0">
                                    <span
                                        class="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">
                                        {{ slotProps.node.data.name }}
                                    </span>
                                    <span
                                        class="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5 leading-tight">
                                        {{ slotProps.node.data.title }}
                                    </span>
                                    <span
                                        class="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                                        <i class="fas fa-location-dot text-[9px]"></i>
                                        {{ slotProps.node.data.city }}
                                    </span>
                                </div>
                            </div>
                        </template>

                        <!-- Card da empresa (raiz) -->
                        <template #company="slotProps">
                            <div class="company-card flex flex-col items-center px-6 py-5" @click.stop>
                                <div
                                    class="w-14 h-14 rounded-2xl bg-white/20 shadow-md flex items-center justify-center mb-3">
                                    <img v-if="slotProps.node.data.image" :alt="slotProps.node.data.name"
                                        :src="slotProps.node.data.image" class="w-10 h-10 object-contain" />
                                </div>
                                <span class="font-bold text-base text-white text-center leading-tight">
                                    {{ slotProps.node.data.name }}
                                </span>
                                <span class="text-xs text-white/60 flex items-center gap-1 mt-1.5">
                                    <i class="fas fa-location-dot text-[10px]"></i>
                                    {{ slotProps.node.data.city }}
                                </span>
                            </div>
                        </template>

                    </OrganizationChart>
                </div>
            </div>
        </div>

        <!-- Painel de informações -->
        <Transition name="slide-up">
            <div v-if="selectedPerson"
                class="info-panel fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
                @click.stop>

                <!-- Banner -->
                <div class="flex justify-between bg-gradient-to-r from-blue-700 to-blue-500 relative shrink-0">
                    <div class="flex items-end gap-3 p-3">
                        <img :src="selectedPerson.image" :alt="selectedPerson.name"
                            class="w-10 h-10 rounded-xl shadow-md shrink-0" />
                        <div class="pb-1 min-w-0">
                            <h3 class="font-bold text-sm text-gray-900 dark:text-white truncate leading-tight">
                                {{ selectedPerson.name }}
                            </h3>
                            <span
                                class="text-xs font-medium text-blue-700 dark:text-blue-300 leading-tight block truncate">
                                {{ selectedPerson.title }}
                            </span>
                        </div>
                    </div>

                    <button @click="closePerson"
                        class="m-auto me-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>

                <!-- Avatar + info -->
                <div class="px-5 py-5">

                    <!-- Descrição do cargo -->
                    <div v-if="selectedPerson.positionDesc"
                        class="mb-4 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                        <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{{
                            selectedPerson.positionDesc }}
                        </p>
                    </div>

                    <!-- Dados -->
                    <div class="space-y-2 mb-4">
                        <!-- Cidade -->
                        <div class="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                            <div
                                class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <i class="fas fa-location-dot text-gray-400 text-xs"></i>
                            </div>
                            <span class="truncate text-xs">{{ selectedPerson.city }}</span>
                        </div>

                        <!-- Gestor -->
                        <div v-if="selectedPerson.managerName" class="flex items-center gap-2.5">
                            <div
                                class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <i class="fas fa-user-tie text-gray-400 text-xs"></i>
                            </div>
                            <span class="truncate text-xs text-gray-600 dark:text-gray-400">{{
                                selectedPerson.managerName
                                }}</span>
                        </div>

                        <!-- Telefone -->
                        <div v-if="selectedPerson.phone" class="flex items-center gap-2.5">
                            <div
                                class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <i class="fas fa-phone text-gray-400 text-xs"></i>
                            </div>
                            <span class="truncate text-xs text-gray-600 dark:text-gray-400">{{ selectedPerson.phone
                                }}</span>
                        </div>
                    </div>

                    <!-- Ações rápidas -->
                    <div class="grid gap-2" :class="selectedPerson.phone ? 'grid-cols-2' : 'grid-cols-1'">
                        <!-- Email -->
                        <a v-if="selectedPerson.email" :href="`mailto:${selectedPerson.email}`"
                            class="action-btn flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">
                            <i class="fas fa-envelope text-[11px]"></i>
                            Enviar e-mail
                        </a>

                        <!-- WhatsApp -->
                        <a v-if="selectedPerson.phone" :href="whatsappUrl(selectedPerson.phone)" target="_blank"
                            rel="noopener noreferrer"
                            class="action-btn flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition">
                            <i class="fab fa-whatsapp text-sm"></i>
                            WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </Transition>

    </div>
</template>

<style scoped>
.grid-container {
    background-image: url('@/assets/Grid-3.svg');
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

:deep(.p-organizationchart-node-content) {
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
}

:deep(.p-organizationchart-node-content.p-highlight),
:deep(.p-organizationchart-node-content:focus),
:deep(.p-organizationchart-node-content:focus-within),
:deep(.p-organizationchart-node-content.p-focus) {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
    outline: none !important;
}

:deep(.p-organizationchart-node) {
    outline: none !important;
}

.person-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.person-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
}

.dark .person-card {
    background: #111827;
    border-color: #1f2937;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.dark .person-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.company-card {
    background: linear-gradient(135deg, #14296d 0%, #2756a3 100%);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
    min-width: 180px;
}

:deep(.p-organizationchart-line-down),
:deep(.p-organizationchart-line-left),
:deep(.p-organizationchart-line-right),
:deep(.p-organizationchart-line-top) {
    border-color: #cbd5e1 !important;
}

.dark :deep(.p-organizationchart-line-down),
.dark :deep(.p-organizationchart-line-left),
.dark :deep(.p-organizationchart-line-right),
.dark :deep(.p-organizationchart-line-top) {
    border-color: #374151 !important;
}

:deep(.p-organizationchart-node-toggle-button) {
    background: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
    width: 18px !important;
    height: 18px !important;
    box-shadow: 0 1px 4px rgba(59, 130, 246, 0.4);
}

:deep(.p-organizationchart-node-toggle-button:hover) {
    background: #2563eb !important;
    border-color: #2563eb !important;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(12px);
}
</style>
