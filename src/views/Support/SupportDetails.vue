<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSupportStore } from '@/stores/Support/supportStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useToast } from 'vue-toastification';

//
// ===== THEME CENTRALIZADO POR STATUS =====
const statusTheme = {
    pending: {
        solid: 'bg-orange-600 hover:bg-orange-700 text-white',
        soft: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        ring: 'ring-orange-500/30',
        border: 'border-orange-300 dark:border-orange-600/70',
        header: 'bg-orange-600',
        avatar: 'bg-orange-600 text-white',
        icon: 'text-orange-600',
    },
    in_progress: {
        solid: 'bg-yellow-500/80 hover:bg-yellow-600 text-white',
        soft: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-300',
        ring: 'ring-yellow-500/30',
        border: 'border-yellow-300 dark:border-yellow-500/70',
        header: 'bg-yellow-500/80',
        avatar: 'bg-yellow-500/80 text-white',
        icon: 'text-yellow-500/80',
    },
    resolved: {
        solid: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        ring: 'ring-emerald-500/30',
        border: 'border-emerald-300 dark:border-emerald-600/70',
        header: 'bg-emerald-600',
        avatar: 'bg-emerald-600 text-white',
        icon: 'text-emerald-600',
    },
    closed: {
        solid: 'bg-red-700 hover:bg-red-800 text-white',
        soft: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-300',
        ring: 'ring-red-500/30',
        border: 'border-red-300 dark:border-red-700',
        header: 'bg-red-700',
        avatar: 'bg-red-700 text-white',
        icon: 'text-red-600',
    },
};

const themeFor = (status) => statusTheme[status] ?? statusTheme.pending;
//
// =========================================

const route = useRoute();
const router = useRouter();
const toast = useToast();

const support = useSupportStore();
const auth = useAuthStore();

const ticket = computed(() => support.current);
const messages = computed(() => ticket.value?.messages ?? []);
const isAdmin = computed(() => auth.user?.role === 'admin');

// tema reativo do ticket atual (fallback = pending)
const currentTheme = computed(() => themeFor(ticket.value?.status || 'pending'));

const statusMap = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    resolved: 'Resolvido',
    closed: 'Fechado',
};

const nextStatus = ref('pending');
const replyText = ref('');
const sending = ref(false);

const priorityClass = (priority) => {
    const map = {
        critical: 'bg-red-500/20 text-red-200 border border-red-400/30',
        high: 'bg-orange-500/20 text-orange-200 border border-orange-400/30',
        medium: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30',
        low: 'bg-green-500/20 text-green-200 border border-green-400/30',
    };
    return map[priority] || 'bg-gray-500/20 text-gray-200 border border-gray-400/30';
};

// usa SEMPRE a paleta centralizada
const statusChipClass = (status) => themeFor(status).soft;

const formatProblemType = (type) => {
    const map = {
        bug: 'Bug/Erro',
        performance: 'Performance',
        ui: 'Interface/Visual',
        feature: 'Sugestão',
        security: 'Segurança',
        other: 'Outro',
    };
    return map[type] || type;
};

const formatFullDate = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const load = async () => {
    const rawId = route.params.id;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
        toast.error('ID inválido');
        router.push({ name: 'Suporte' });
        return;
    }
    try {
        await support.fetchTicket(id);
        nextStatus.value = ticket.value?.status || 'pending';
    } catch {
        toast.error('Falha ao carregar ticket');
        router.push({ name: 'Suporte' });
    } finally {
        // noop
    }
};

onMounted(load);

const sendReply = async () => {
    if (!isAdmin.value) {
        toast.warning('Apenas administradores podem responder.');
        return;
    }
    try {
        sending.value = true;
        await support.reply(ticket.value.id, replyText.value);
        replyText.value = '';
        toast.success('Resposta enviada e e-mail encaminhado ao solicitante.');
    } catch (e) {
        toast.error(e.message || 'Falha ao enviar resposta');
    } finally {
        sending.value = false;
    }
};

const changeStatus = async () => {
    try {
        await support.updateStatus(ticket.value.id, nextStatus.value);
        toast.success('Status atualizado (o solicitante será notificado).');
    } catch (e) {
        toast.error(e.message || 'Falha ao atualizar status');
    }
};
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div class="max-w-6xl mx-auto px-6 py-8">
            <!-- Back Button -->
            <RouterLink :to="{ name: 'Suporte' }"
                class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
                <i class="fas fa-arrow-left"></i>
                <span>Voltar para lista</span>
            </RouterLink>

            <div v-if="ticket" class="space-y-6">
                <!-- Header Card -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div class="px-6 py-4" :class="currentTheme.header">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="text-white/90 font-mono text-sm">#{{ ticket.protocol }}</span>
                                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize shadow"
                                        :class="priorityClass(ticket.priority)">
                                        {{ ticket.priority }}
                                    </span>
                                </div>
                                <h1 class="text-2xl font-bold text-white mb-2">{{ ticket.title }}</h1>
                                <div class="flex items-center gap-4 text-sm text-white/80">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-user"></i>
                                        <span>{{ ticket.requester?.username }}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-envelope"></i>
                                        <span>{{ ticket.requester?.email }}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-clock"></i>
                                        <span>{{ formatFullDate(ticket.created_at) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Info Grid -->
                    <div class="p-6">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                    Status
                                </label>

                                <!-- Admin: seletor + botão themed -->
                                <div v-if="isAdmin" class="flex items-center gap-2">
                                    <select v-model="nextStatus"
                                        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2"
                                        :class="currentTheme.ring">
                                        <option value="pending">Pendente</option>
                                        <option value="in_progress">Em andamento</option>
                                        <option value="resolved">Resolvido</option>
                                        <option value="closed">Fechado</option>
                                    </select>
                                    <button v-if="nextStatus !== ticket.status" @click="changeStatus"
                                        class="px-3 py-2 rounded-lg transition-colors" :class="currentTheme.solid">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </div>

                                <!-- Viewer: chip themed -->
                                <div v-else class="px-3 py-2 rounded-lg text-sm font-medium"
                                    :class="statusChipClass(ticket.status)">
                                    {{ statusMap[ticket.status] || ticket.status }}
                                </div>
                            </div>

                            <div v-if="ticket.module">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                    Módulo
                                </label>
                                <p class="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                    {{ ticket.module }}
                                </p>
                            </div>

                            <div v-if="ticket.problemType">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                    Tipo
                                </label>
                                <p class="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                    {{ formatProblemType(ticket.problemType) }}
                                </p>
                            </div>

                            <div v-if="ticket.browser || ticket.os">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                    Ambiente
                                </label>
                                <p class="text-sm text-gray-700 dark:text-gray-300">
                                    {{ ticket.browser || 'N/A' }} · {{ ticket.os || 'N/A' }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Description Card -->
                <div v-if="ticket.description"
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i class="fas fa-file-alt" :class="currentTheme.icon"></i>
                        Descrição do Problema
                    </h2>
                    <div class="prose prose-sm max-w-none dark:prose-invert">
                        <pre
                            class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans">{{ ticket.description }}</pre>
                    </div>

                    <div v-if="ticket.stepsToReproduce" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Passos para Reproduzir</h3>
                        <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
{{ ticket.stepsToReproduce }}
            </pre>
                    </div>

                    <div v-if="ticket.pageUrl" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">URL da Página</h3>
                        <a :href="ticket.pageUrl" target="_blank" class="text-sm hover:underline break-all"
                            :class="currentTheme.soft">
                            {{ ticket.pageUrl }}
                        </a>
                    </div>
                </div>

                <!-- Messages Thread -->
                <div
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <i class="fas fa-comments" :class="currentTheme.icon"></i>
                            Conversas
                            <span class="text-sm font-normal text-gray-500">({{ messages.length }})</span>
                        </h2>
                    </div>

                    <div class="p-6">
                        <div v-if="messages.length" class="space-y-4">
                            <div v-for="m in messages" :key="m.id"
                                class="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <div class="flex-shrink-0">
                                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                        :class="currentTheme.avatar">
                                        {{ (m.author_name || 'U')[0].toUpperCase() }}
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <p class="font-semibold text-gray-900 dark:text-white">
                                                {{ m.author_name || 'Usuário' }}
                                            </p>
                                            <p v-if="m.author_email" class="text-xs text-gray-500 dark:text-gray-400">
                                                {{ m.author_email }}
                                            </p>
                                        </div>
                                        <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {{ formatFullDate(m.created_at) }}
                                        </span>
                                    </div>
                                    <pre
                                        class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">{{ m.body }}</pre>
                                    <div v-if="m.attachments?.length"
                                        class="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                        <i class="fas fa-paperclip"></i>
                                        <span>{{ m.attachments.length }} anexo(s)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else class="text-center py-12">
                            <i class="fas fa-comment-slash text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                            <p class="text-gray-500 dark:text-gray-400">Nenhuma mensagem ainda</p>
                        </div>
                    </div>
                </div>

                <!-- Reply Form (Admin Only) -->
                <div v-if="isAdmin"
                    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div class="px-6 py-4" :class="currentTheme.header">
                        <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                            <i class="fas fa-reply"></i>
                            Responder ao Solicitante
                        </h2>
                    </div>

                    <div class="p-6">
                        <textarea v-model="replyText" rows="5"
                            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:border-transparent resize-none"
                            :class="currentTheme.ring"
                            placeholder="Digite sua resposta detalhada para o usuário..."></textarea>

                        <div class="mt-4 flex items-center justify-between">
                            <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <i class="fas fa-info-circle"></i>
                                O usuário receberá um e-mail com esta resposta
                            </p>
                            <button @click="sendReply" :disabled="!replyText.trim() || sending"
                                class="px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                                :class="currentTheme.solid">
                                <i v-if="sending" class="fas fa-spinner fa-spin"></i>
                                <i v-else class="fas fa-paper-plane"></i>
                                <span>{{ sending ? 'Enviando...' : 'Enviar Resposta' }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty -->
            <div v-else
                class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
                <i class="fas fa-exclamation-circle text-4xl" :class="currentTheme.icon + ' mb-4'"></i>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ticket não encontrado</h2>
                <p class="text-gray-500 dark:text-gray-400 mb-6">O ticket solicitado não existe ou foi removido.</p>
                <RouterLink :to="{ name: 'Suporte' }"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    :class="currentTheme.solid">
                    <i class="fas fa-arrow-left"></i>
                    <span>Voltar para lista</span>
                </RouterLink>
            </div>
        </div>
    </div>
</template>
