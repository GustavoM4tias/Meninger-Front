<script setup>
// Log dos cadastros feitos pelo Office, agrupados por lote (uma colagem = um
// lote). O status aqui é o CONFERIDO no CV, não o que o POST respondeu.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';
import { cvUsuariosUrl } from '@/utils/cvLinks';

import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useCorrespondentStore();
const toast = useToast();

const filtro = ref('');
const reprocessando = ref(null);

const FILTRO_OPTIONS = [
    { value: '', label: 'Todos os cadastros' },
    { value: 'error', label: 'Só com falha' },
    { value: 'duplicate', label: 'Só já existentes' },
    { value: 'completed', label: 'Só concluídos' },
];

const STATUS_INFO = {
    completed: { label: 'Cadastrado', variant: 'success', icon: 'fas fa-check' },
    duplicate: { label: 'Já existia', variant: 'warning', icon: 'fas fa-clone' },
    error: { label: 'Falhou', variant: 'danger', icon: 'fas fa-xmark' },
    pending: { label: 'Pendente', variant: 'neutral', icon: 'fas fa-clock' },
};

const fmtCpf = (c) => {
    const d = String(c || '').replace(/\D/g, '');
    return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : (c || '-');
};
const fmtData = (d) => (d ? new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '-');

// Agrupa por lote, mantendo a ordem decrescente que veio da API.
const lotes = computed(() => {
    const filtrados = filtro.value
        ? store.registros.filter(r => r.status === filtro.value)
        : store.registros;

    const mapa = new Map();
    for (const r of filtrados) {
        if (!mapa.has(r.batch_id)) {
            mapa.set(r.batch_id, {
                batch_id: r.batch_id,
                empresa: r.company?.nome || `Empresa #${r.cv_idempresa}`,
                criado_por: r.creator?.username || null,
                em: r.createdAt || r.created_at,
                itens: [],
            });
        }
        mapa.get(r.batch_id).itens.push(r);
    }
    return [...mapa.values()];
});

async function reprocessar(registro) {
    reprocessando.value = registro.id;
    try {
        await store.retry(registro.id);
        toast.success('Reenviado. Confira o novo status.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao reenviar.');
    } finally {
        reprocessando.value = null;
    }
}

// ── Links públicos ──────────────────────────────────────────────────────────
const LP_BASE = import.meta.env.VITE_LP_URL || 'https://lp.menin.com.br';
const linkDe = (c) => `${LP_BASE}/correspondente/${c.token}`;

const convitesAtivos = computed(() => store.convites.filter(c => c.status === 'invite'));

async function copiarLink(c) {
    try {
        await navigator.clipboard.writeText(linkDe(c));
        toast.success('Link copiado!');
    } catch {
        toast.error('Não consegui copiar.');
    }
}

async function cancelarLink(c) {
    try {
        await store.revokeInvite(c.id);
        toast.success('Link cancelado.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao cancelar.');
    }
}

const totalEnvios = (c) => (Array.isArray(c.submissions) ? c.submissions.length : 0);
const totalPessoas = (c) => (Array.isArray(c.submissions) ? c.submissions.reduce((s, x) => s + (x.quantidade || 0), 0) : 0);

onMounted(() => {
    if (!store.registros.length) store.fetchRegistrations();
    if (!store.convites.length) store.fetchInvites();
});
</script>

<template>
    <div>
        <!-- Links públicos de auto-cadastro -->
        <div v-if="convitesAtivos.length" class="mb-5">
            <p class="text-sm font-medium text-ink mb-2">
                <i class="fas fa-link mr-1.5 text-ink-subtle"></i>Links de cadastro ativos
            </p>
            <div class="space-y-2">
                <div v-for="c in convitesAtivos" :key="c.id"
                    class="rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 flex flex-wrap items-center gap-2">
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-ink truncate">{{ c.label || c.company?.nome }}</p>
                        <p class="text-xs text-ink-muted truncate font-mono">{{ linkDe(c) }}</p>
                        <p class="text-xs text-ink-subtle">
                            {{ totalEnvios(c) }} envio(s) · {{ totalPessoas(c) }} pessoa(s)
                            <template v-if="c.expires_at"> · vale até {{ new Date(`${c.expires_at}T12:00:00`).toLocaleDateString('pt-BR') }}</template>
                        </p>
                    </div>
                    <div class="shrink-0 flex items-center gap-1">
                        <button type="button" v-tippy="'Copiar link'" @click="copiarLink(c)"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60">
                            <i class="fas fa-copy text-xs"></i>
                        </button>
                        <button type="button" v-tippy="'Cancelar link'" @click="cancelarLink(c)"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-rose-500 hover:border-rose-500/60">
                            <i class="fas fa-ban text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 mb-4">
            <Select v-model="filtro" :options="FILTRO_OPTIONS" class="w-full sm:w-64" />
            <Badge variant="neutral" outlined>{{ store.registros.length }} registros</Badge>
        </div>

        <div v-if="store.loading && !store.registros.length" class="flex justify-center py-16">
            <Spinner />
        </div>

        <EmptyState
            v-else-if="!lotes.length"
            icon="fas fa-list-check"
            title="Nenhum cadastro por aqui ainda"
            description="Os cadastros feitos pela tela aparecem aqui, com o resultado conferido no CV."
        />

        <div v-else class="space-y-4">
            <div v-for="lote in lotes" :key="lote.batch_id" class="rounded-xl border border-line bg-surface-raised overflow-hidden">
                <div class="px-4 py-3 border-b border-line-subtle flex flex-wrap items-center gap-2">
                    <div class="min-w-0 flex-1">
                        <p class="font-medium text-ink truncate">{{ lote.empresa }}</p>
                        <p class="text-xs text-ink-muted truncate">
                            {{ fmtData(lote.em) }}
                            <template v-if="lote.criado_por"> · {{ lote.criado_por }}</template>
                        </p>
                    </div>
                    <Badge variant="neutral" size="sm">{{ lote.itens.length }} pessoas</Badge>
                </div>

                <div v-for="r in lote.itens" :key="r.id"
                    class="px-4 py-2.5 border-b border-line-subtle last:border-0 flex items-center gap-3">
                    <Badge :variant="STATUS_INFO[r.status]?.variant || 'neutral'" size="sm" class="shrink-0">
                        <i :class="STATUS_INFO[r.status]?.icon" class="mr-1"></i>
                        <span class="hidden sm:inline">{{ STATUS_INFO[r.status]?.label || r.status }}</span>
                    </Badge>

                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-ink truncate">
                            {{ r.nome }}
                            <i v-if="r.gerente" class="fas fa-user-tie ml-1 text-[10px] text-accent" v-tippy="'Gerente'"></i>
                            <i v-if="r.origem === 'link'" class="fas fa-link ml-1 text-[10px] text-ink-subtle"
                                v-tippy="'Cadastrado pela própria correspondente, via link'"></i>
                        </p>
                        <p class="text-xs text-ink-muted truncate">
                            {{ fmtCpf(r.documento) }}
                            <template v-if="r.cv_idusuario"> · CV #{{ r.cv_idusuario }}</template>
                        </p>
                        <p v-if="r.error" class="text-xs text-amber-600 dark:text-amber-400 truncate" v-tippy="r.error">{{ r.error }}</p>
                    </div>

                    <div class="shrink-0 flex items-center gap-1">
                        <button v-if="r.status === 'error'" type="button"
                            v-tippy="'Reenviar ao CV (seguro: CPF repetido é recusado)'"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60 disabled:opacity-50"
                            :disabled="reprocessando === r.id"
                            @click="reprocessar(r)">
                            <i class="fas text-xs" :class="reprocessando === r.id ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
                        </button>
                        <a :href="cvUsuariosUrl(r.nome)" target="_blank" rel="noopener" v-tippy="'Procurar no CV'"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60">
                            <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
