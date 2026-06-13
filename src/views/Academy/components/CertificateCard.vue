<template>
    <div
        class="flex items-center gap-4 rounded-2xl border p-4 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] transition-colors"
        :class="statusBorder">
        <!-- Selo -->
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            :class="statusBadgeBg">
            <i class="fa-solid fa-award text-2xl" :class="statusIconColor"></i>
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {{ cert.trackTitle || cert.trackSlug }}
            </div>
            <div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Emitido em {{ fmtDate(cert.issuedAt) }}
                <span v-if="cert.expiresAt"> • Válido até {{ fmtDate(cert.expiresAt) }}</span>
            </div>
            <div class="mt-1 flex items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    :class="statusChip">
                    {{ statusLabel }}
                </span>
                <span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">{{ cert.code }}</span>
            </div>
        </div>

        <!-- Ações -->
        <div class="flex shrink-0 items-center gap-2">
            <a :href="pdfUrl" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <i class="fa-solid fa-file-pdf"></i>
                <span class="hidden sm:inline">PDF</span>
            </a>
            <button type="button" @click="copyVerify"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <i class="fa-solid" :class="copied ? 'fa-check text-emerald-500' : 'fa-link'"></i>
                <span class="hidden sm:inline">{{ copied ? 'Copiado' : 'Verificar' }}</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAcademyCertificatesStore } from '@/stores/Academy/academyCertificatesStore';

const props = defineProps({
    cert: { type: Object, required: true },
});

const certStore = useAcademyCertificatesStore();
const copied = ref(false);

const status = computed(() => String(props.cert.displayStatus || props.cert.status || 'ACTIVE').toUpperCase());

const pdfUrl = computed(() => certStore.pdfUrl(props.cert.code));

const statusLabel = computed(() => ({
    ACTIVE: 'Válido', REVOKED: 'Revogado', EXPIRED: 'Expirado',
}[status.value] || 'Válido'));

const statusBorder = computed(() => ({
    ACTIVE: 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900',
    REVOKED: 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-900/10',
    EXPIRED: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-900/10',
}[status.value]));

const statusBadgeBg = computed(() => ({
    ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20',
    REVOKED: 'bg-rose-50 dark:bg-rose-900/20',
    EXPIRED: 'bg-amber-50 dark:bg-amber-900/20',
}[status.value]));

const statusIconColor = computed(() => ({
    ACTIVE: 'text-emerald-500', REVOKED: 'text-rose-500', EXPIRED: 'text-amber-500',
}[status.value]));

const statusChip = computed(() => ({
    ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    REVOKED: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    EXPIRED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}[status.value]));

function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

async function copyVerify() {
    const url = `${window.location.origin}/cert/${props.cert.code}`;
    try {
        await navigator.clipboard.writeText(url);
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
    } catch {
        // fallback: abre em nova aba
        window.open(url, '_blank');
    }
}
</script>
