<template>
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div class="w-full max-w-lg">
            <!-- Marca -->
            <div class="mb-6 text-center">
                <div class="text-lg font-extrabold uppercase tracking-widest text-slate-900 dark:text-white">
                    Menin Academy
                </div>
                <div class="text-xs text-slate-400 dark:text-slate-500">Verificação de certificado</div>
            </div>

            <div class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <!-- Loading -->
                <div v-if="loading" class="p-10 text-center">
                    <i class="fa-solid fa-spinner fa-spin text-2xl text-slate-300 dark:text-slate-600"></i>
                    <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Verificando autenticidade...</p>
                </div>

                <template v-else-if="data">
                    <!-- Faixa de status -->
                    <div class="px-6 py-5 text-center" :class="statusBg">
                        <i class="fa-solid text-3xl" :class="statusIcon"></i>
                        <div class="mt-2 text-lg font-bold" :class="statusText">{{ statusTitle }}</div>
                    </div>

                    <!-- Detalhes -->
                    <div class="p-6 space-y-4">
                        <div v-if="data.valid || data.userName">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Certificado de conclusão
                            </div>
                            <div class="mt-1 text-xl font-bold text-slate-900 dark:text-white">{{ data.userName }}</div>
                            <div class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                                concluiu a trilha <strong>{{ data.trackTitle }}</strong>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 pt-2">
                            <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-3 py-2">
                                <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Emitido em</div>
                                <div class="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">{{ fmtDate(data.issuedAt) }}</div>
                            </div>
                            <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-3 py-2">
                                <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Validade</div>
                                <div class="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {{ data.expiresAt ? fmtDate(data.expiresAt) : 'Sem expiração' }}
                                </div>
                            </div>
                        </div>

                        <div v-if="data.revokedReason"
                            class="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
                            Motivo da revogação: {{ data.revokedReason }}
                        </div>

                        <div class="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-center">
                            <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Código</div>
                            <div class="font-mono text-sm text-slate-600 dark:text-slate-300">{{ code }}</div>
                        </div>

                        <a v-if="data.valid" :href="pdfUrl" target="_blank" rel="noopener"
                            class="block w-full rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-center text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all active:scale-95">
                            <i class="fa-solid fa-file-pdf mr-1.5"></i>Baixar PDF do certificado
                        </a>
                    </div>
                </template>

                <!-- Não encontrado / erro -->
                <div v-else class="p-10 text-center">
                    <i class="fa-solid fa-circle-question text-3xl text-slate-300 dark:text-slate-600"></i>
                    <div class="mt-3 text-base font-bold text-slate-900 dark:text-white">Certificado não encontrado</div>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        O código informado não corresponde a nenhum certificado emitido.
                    </p>
                </div>
            </div>

            <p class="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Esta página comprova a autenticidade de certificados emitidos pelo Menin Academy.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

const route = useRoute();
const code = computed(() => String(route.params.code || ''));

const loading = ref(true);
const data = ref(null);

const status = computed(() => String(data.value?.status || '').toUpperCase());

const statusTitle = computed(() => ({
    ACTIVE: 'Certificado válido',
    REVOKED: 'Certificado revogado',
    EXPIRED: 'Certificado expirado',
}[status.value] || 'Certificado inválido'));

const statusBg = computed(() => ({
    ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20',
    REVOKED: 'bg-rose-50 dark:bg-rose-900/20',
    EXPIRED: 'bg-amber-50 dark:bg-amber-900/20',
}[status.value] || 'bg-slate-100 dark:bg-slate-800'));

const statusIcon = computed(() => ({
    ACTIVE: 'fa-circle-check text-emerald-500',
    REVOKED: 'fa-circle-xmark text-rose-500',
    EXPIRED: 'fa-clock text-amber-500',
}[status.value] || 'fa-circle-question text-slate-400'));

const statusText = computed(() => ({
    ACTIVE: 'text-emerald-700 dark:text-emerald-300',
    REVOKED: 'text-rose-700 dark:text-rose-300',
    EXPIRED: 'text-amber-700 dark:text-amber-300',
}[status.value] || 'text-slate-700 dark:text-slate-300'));

const pdfUrl = computed(() => {
    const base = String(API_URL || '').replace(/\/$/, '');
    return `${base}/academy/cert/pdf/${encodeURIComponent(code.value)}`;
});

function fmtDate(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

onMounted(async () => {
    try {
        // endpoint público — não exige auth
        const res = await requestWithAuth(`/academy/cert/verify/${encodeURIComponent(code.value)}`);
        // verify devolve { valid:false, reason } quando não existe
        data.value = (res && (res.valid || res.status)) ? res : null;
    } catch {
        data.value = null;
    } finally {
        loading.value = false;
    }
});
</script>
