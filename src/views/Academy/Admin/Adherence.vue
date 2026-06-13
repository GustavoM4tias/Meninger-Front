<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Aderência" subtitle="Acompanhe quem concluiu, está em andamento ou em atraso"
            :backTo="{ name: 'AcademyAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Aderência' }
            ]">
            <template #actions>
                <button v-if="selectedTrack" type="button" @click="exportXlsx"
                    class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95">
                    <i class="fa-solid fa-file-excel"></i>
                    Exportar Excel
                </button>
            </template>
        </AcademyPageHeader>

        <!-- Seletor de trilha -->
        <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
            <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <i class="fa-solid fa-route mr-1 text-indigo-500"></i>
                Trilha
            </label>
            <select v-model="selectedTrack" @change="loadAdherence"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                <option value="">Selecione uma trilha</option>
                <option v-for="t in tracks" :key="t.slug" :value="t.slug">
                    {{ t.title }}
                </option>
            </select>
        </div>

        <!-- Cards de resumo -->
        <div v-if="adherence" class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div
                class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <i class="fa-solid fa-users"></i> Total
                </div>
                <div class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{{ adherence.total }}</div>
            </div>
            <div
                class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <i class="fa-solid fa-circle-check"></i> Concluído
                </div>
                <div class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{{ adherence.completed }}
                </div>
            </div>
            <div
                class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    <i class="fa-solid fa-hourglass-half"></i> Em andamento
                </div>
                <div class="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{{ adherence.inProgress }}</div>
            </div>
            <div
                class="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    <i class="fa-solid fa-triangle-exclamation"></i> Em atraso
                </div>
                <div class="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">{{ adherence.overdue }}</div>
            </div>
        </div>

        <!-- Tabela -->
        <div v-if="adherence"
            class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
            <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                    <i class="fa-solid fa-users-line text-indigo-500"></i>
                    Alunos atribuídos
                </h2>
                <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Ordenados por urgência (atraso primeiro)
                </p>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-slate-50 dark:bg-slate-800/50">
                        <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <th class="px-5 py-3">Nome</th>
                            <th class="px-5 py-3">Cargo</th>
                            <th class="px-5 py-3">Cidade</th>
                            <th class="px-5 py-3">Status</th>
                            <th class="px-5 py-3">Progresso</th>
                            <th class="px-5 py-3">Prazo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in adherence.users" :key="row.user.id"
                            class="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                            <td class="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                                {{ row.user.username }}
                            </td>
                            <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ row.user.position || '—' }}</td>
                            <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ row.user.city || '—' }}</td>
                            <td class="px-5 py-3">
                                <span :class="statusClass(row.status)"
                                    class="inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold">
                                    {{ statusLabel(row.status) }}
                                </span>
                            </td>
                            <td class="px-5 py-3">
                                <div class="flex items-center gap-2">
                                    <div class="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div class="h-2 rounded-full transition-all"
                                            :class="progressBarColor(row.status)"
                                            :style="{ width: `${row.progressPercent}%` }"></div>
                                    </div>
                                    <span class="text-xs font-medium text-slate-500 dark:text-slate-400">{{
                                        row.progressPercent }}%</span>
                                </div>
                            </td>
                            <td class="px-5 py-3 text-xs font-medium"
                                :class="row.status === 'OVERDUE' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'">
                                {{ formatDue(row.dueAt) }}
                            </td>
                        </tr>
                        <tr v-if="!adherence.users?.length">
                            <td colspan="6" class="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum aluno com esta trilha como obrigatória ainda.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-else-if="selectedTrack"
            class="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <i class="fa-solid fa-spinner fa-spin text-indigo-500"></i>
            Carregando aderência…
        </div>

        <div v-else
            class="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <i class="fa-solid fa-chart-line text-3xl text-slate-300 dark:text-slate-700"></i>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Selecione uma trilha acima para visualizar a aderência.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const tracks = ref([]);
const selectedTrack = ref('');
const adherence = ref(null);

const STATUS_LABEL = {
    COMPLETED: 'Concluído',
    IN_PROGRESS: 'Em andamento',
    NOT_STARTED: 'Não iniciado',
    OVERDUE: 'Em atraso',
};

function statusLabel(s) {
    return STATUS_LABEL[s] || s;
}

function statusClass(s) {
    switch (s) {
        case 'COMPLETED': return 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/10';
        case 'IN_PROGRESS': return 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/10';
        case 'OVERDUE': return 'border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-900/10';
        default: return 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50';
    }
}

function progressBarColor(s) {
    switch (s) {
        case 'COMPLETED': return 'bg-emerald-500';
        case 'OVERDUE': return 'bg-rose-500';
        case 'IN_PROGRESS': return 'bg-amber-500';
        default: return 'bg-slate-400';
    }
}

function formatDue(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR');
}

async function loadTracks() {
    try {
        const data = await requestWithAuth('/academy/tracks-admin');
        tracks.value = data?.results || [];
    } catch (err) {
        console.error('Erro ao carregar trilhas:', err);
    }
}

async function loadAdherence() {
    if (!selectedTrack.value) {
        adherence.value = null;
        return;
    }
    try {
        const slug = encodeURIComponent(selectedTrack.value);
        const data = await requestWithAuth(`/academy/tracks-admin/${slug}/adherence`);
        adherence.value = data;
    } catch (err) {
        console.error('Erro ao carregar aderência:', err);
        adherence.value = null;
    }
}

function exportXlsx() {
    // Export client-side em CSV (UTF-8 com BOM, abre direto no Excel).
    // Não depende de endpoint backend — usa os dados já carregados.
    const a = adherence.value;
    if (!a?.users?.length) return;

    const header = ['Usuario', 'Email', 'Cargo', 'Cidade', 'Progresso(%)', 'Prazo', 'Status'];
    const rows = a.users.map((r) => [
        r.user?.username || '',
        r.user?.email || '',
        r.user?.position || '',
        r.user?.city || '',
        r.progressPercent ?? 0,
        r.dueAt ? new Date(r.dueAt).toLocaleDateString('pt-BR') : '',
        statusLabel(r.status),
    ]);
    const csv = [header, ...rows]
        .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aderencia-${selectedTrack.value}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

onMounted(() => {
    loadTracks();
});
</script>
