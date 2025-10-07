<template>
    <div class="h-full py-8 px-4">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="mb-6">
                <h1 class="flex text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Minha Conta
                    <Favorite class="my-auto" :router="'/settings/Account'" :section="'Minha Conta'" />
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    Gerencie suas informações pessoais e configurações de perfil
                </p>
            </div>

            <!-- Card Principal -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">

                <!-- Seção do Perfil -->
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                            Informações do Perfil
                        </h2>

                        <!-- Botão de Editar/Cancelar -->
                        <button @click="toggleDisabled" :class="[
                            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200',
                            isDisabled
                                ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        ]">
                            <i :class="isDisabled ? 'fas fa-pen' : 'fas fa-times'" class="text-sm"></i>
                            {{ isDisabled ? 'Editar' : 'Cancelar' }}
                        </button>
                    </div>

                    <!-- Avatar e Informações Básicas -->
                    <div class="flex flex-col md:flex-row gap-6">
                        <!-- Avatar -->
                        <div class="flex-shrink-0 flex flex-col items-center">
                            <div class="relative">
                                <img class="w-20 h-20 rounded-full" :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    (authStore.user?.username ?? '')
                                        .split(' ')
                                        .slice(0, 2)
                                        .map(n => n[0]?.toUpperCase())
                                        .join(' ')
                                )}&background=random`" alt="usuario foto" />
                            </div>

                            <!-- Data de Cadastro -->
                            <div class="mt-4 text-center">
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Membro desde
                                </p>
                                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 -mb-1">
                                    {{ new Date(authStore.user?.created_at).toLocaleDateString("pt-BR", {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    }) }}
                                </p>
                                <span class="text-gray-500 text-xs">{{ calculateDaysInSystem() }} dias no sistema.</span>
                            </div>
                        </div>

                        <!-- Status Badge -->
                        <div class="flex-grow">
                            <div class="flex items-start justify-between">
                                <div>
                                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                                        {{ authStore.user?.username }}
                                    </h3>
                                    <p class="text-gray-600 dark:text-gray-400 mt-1">
                                        {{ authStore.user?.position || 'Cargo não definido' }}
                                    </p>
                                    <p class="text-gray-500 dark:text-gray-500 text-sm">
                                        {{ authStore.user?.city || 'Cidade não informada' }}
                                    </p>
                                </div>

                                <span :class="[
                                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                                    authStore.user?.status
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                ]">
                                    <div :class="[
                                        'w-2 h-2 rounded-full mr-2',
                                        authStore.user?.status ? 'bg-green-400' : 'bg-red-400'
                                    ]"></div>
                                    {{ authStore.user?.status ? 'Ativo' : 'Inativo' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Formulário -->
                <div class="p-6">
                    <form @submit.prevent="updateUser" class="space-y-6">

                        <!-- Grid de Campos -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <!-- Nome Completo -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nome Completo
                                </label>
                                <Input v-model="editableUser.username" :disabled="isDisabled" type="text"
                                    placeholder="Digite seu nome completo" required />
                            </div>

                            <!-- Email -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <Input v-model="editableUser.email" :disabled="isDisabled" type="email"
                                    placeholder="seu@email.com" required />
                            </div>

                            <!-- Data de Nascimento -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data de Nascimento
                                </label>
                                <Input v-model="editableUser.birth_date" :disabled="isDisabled" type="date" required />
                            </div>

                            <!-- Cidade -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cidade
                                </label>
                                <Input v-model="editableUser.city" :disabled="isDisabled" type="text"
                                    placeholder="Sua cidade" required />
                            </div>

                            <!-- Cargo -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cargo
                                </label>
                                <Input v-model="editableUser.position" :disabled="isDisabled" type="text"
                                    placeholder="Seu cargo atual" required />
                            </div>
                        </div>

                        <!-- Botões de Ação -->
                        <div v-if="!isDisabled"
                            class="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="submit"
                                class="flex-1 sm:flex-none sm:w-auto">
                                <i class="fas fa-save mr-2"></i>
                                Salvar Alterações
                            </Button>

                            <Button type="button" @click="cancelEdit"
                                class="flex-1 sm:flex-none sm:w-auto ">
                                <i class="fas fa-times mr-2"></i>
                                Cancelar
                            </Button>
                        </div>

                        <!-- Mensagem de Sucesso -->
                        <div v-if="message"
                            class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-check-circle text-green-500 mr-3"></i>
                                <p class="text-green-700 dark:text-green-300">{{ message }}</p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
 
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { updateMeInfo } from '../../utils/Auth/apiAuth';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';
import Favorite from "@/components/config/Favorite.vue";
import { useToast } from 'vue-toastification';

const toast = useToast();
const authStore = useAuthStore();

console.log(authStore.user)

const editableUser = ref({
    username: '',
    email: '',
    city: '',
    position: '',
    birth_date: '',
    status: ''
});

const message = ref('');
const isDisabled = ref(true);
const originalUser = ref({});

const preencherEditableUser = () => {
    if (authStore.user) {
        const userData = {
            username: authStore.user.username,
            email: authStore.user.email,
            city: authStore.user.city,
            position: authStore.user.position,
            birth_date: authStore.user.birth_date,
            status: authStore.user.status
        };
        editableUser.value = { ...userData };
        originalUser.value = { ...userData };
    }
};

const calculateDaysInSystem = () => {
    if (!authStore.user?.created_at) return 'N/A';
    const createdDate = new Date(authStore.user.created_at);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

watch(() => authStore.user, preencherEditableUser);

onMounted(async () => {
    if (!authStore.user) {
        await authStore.fetchUserInfo();
    }
    preencherEditableUser();
});

const updateUser = async () => {
    try {
        const response = await updateMeInfo(
            editableUser.value.username,
            editableUser.value.email,
            editableUser.value.position,
            editableUser.value.city,
            editableUser.value.birth_date,
            editableUser.value.status
        );
        message.value = response.message;
        await authStore.fetchUserInfo();
        preencherEditableUser();
        isDisabled.value = true;
        toast.success("Atualizado com Sucesso!");

        // Clear message after 3 seconds
        setTimeout(() => {
            message.value = '';
        }, 3000);

    } catch (error) {
        console.error(error);
        toast.error("Erro ao atualizar informações!");
    }
};

const toggleDisabled = () => {
    isDisabled.value = !isDisabled.value;
    if (!isDisabled.value) {
        message.value = '';
    }
};

const cancelEdit = () => {
    editableUser.value = { ...originalUser.value };
    isDisabled.value = true;
    message.value = '';
};
</script>