<script setup>
/**
 * SiengeCredentialsModal.vue
 * Gate exibido quando o usuário acessa o Payment Flow sem ter
 * configurado suas credenciais Sienge.
 */
import { ref, reactive, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

const emit = defineEmits(['saved', 'close']);

const loading = ref(false);
const error = ref(null);
const showPassword = ref(false);
const form = reactive({ email: '', password: '', confirmPassword: '' });

const canSubmit = computed(() =>
    form.email?.trim() &&
    form.password?.trim() &&
    form.password === form.confirmPassword
);

async function handleSave() {
    if (!canSubmit.value) return;
    loading.value = true;
    error.value = null;
    try {
        await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`, {
            method: 'PUT',
            body: JSON.stringify({ email: form.email.trim(), password: form.password }),
        });
        emit('saved');
    } catch (err) {
        error.value = err.message || 'Erro ao salvar credenciais.';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">

            <!-- Header -->
            <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3 mb-1">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <i class="fas fa-plug text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-gray-900 dark:text-white">Configurar Credenciais Sienge</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Necessário para criar contratos automaticamente</p>
                    </div>
                </div>
            </div>

            <div class="px-6 py-5 space-y-4">
                <!-- LGPD -->
                <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                    <i class="fas fa-shield-halved mr-1.5"></i>
                    <strong>Seus dados estão seguros.</strong> As credenciais são criptografadas com AES-256 e armazenadas exclusivamente na sua conta. Nenhum outro usuário tem acesso a elas. Elas serão usadas apenas para automatizar processos no Sienge em seu nome.
                </div>

                <!-- Email -->
                <div class="space-y-1">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        E-mail Sienge
                    </label>
                    <input v-model="form.email" type="email" placeholder="seu@email.com" autocomplete="off"
                        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500" />
                </div>

                <!-- Senha -->
                <div class="space-y-1">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Senha Sienge
                    </label>
                    <div class="relative">
                        <input v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="Sua senha" autocomplete="new-password"
                            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500" />
                        <button type="button"
                            class="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-gray-400 hover:text-gray-600"
                            @click="showPassword = !showPassword">
                            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Confirmar Senha -->
                <div class="space-y-1">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Confirmar Senha
                    </label>
                    <input v-model="form.confirmPassword"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Repita a senha" autocomplete="new-password"
                        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500" />
                    <p v-if="form.confirmPassword && form.password !== form.confirmPassword"
                        class="text-xs text-red-500 mt-1">
                        <i class="fas fa-exclamation-circle mr-1"></i>As senhas não coincidem.
                    </p>
                </div>

                <!-- Erro -->
                <div v-if="error"
                    class="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    <i class="fas fa-triangle-exclamation mr-1"></i>{{ error }}
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                <a href="/settings/Account" class="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1">
                    <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                    Configurar em Minha Conta
                </a>
                <button
                    class="px-5 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition disabled:cursor-not-allowed flex items-center gap-2"
                    :disabled="!canSubmit || loading"
                    @click="handleSave">
                    <i v-if="loading" class="fas fa-spinner fa-spin text-xs"></i>
                    <i v-else class="fas fa-floppy-disk text-xs"></i>
                    {{ loading ? 'Salvando...' : 'Salvar e continuar' }}
                </button>
            </div>
        </div>
    </div>
</template>
