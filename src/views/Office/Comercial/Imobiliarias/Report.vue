<script setup>
// Relatório de imobiliárias: lê o backup local do CV (cv_imobiliarias) com
// filtros por cidade, empreendimento e busca. A cidade da imobiliária vem do
// cadastro dela no CV; quando não tem endereço, é herdada das cidades dos
// empreendimentos vinculados (cadastros do Office + atividade em reservas).
// Filtros aplicados no cliente: a lista completa chega de uma vez (escopada
// por cidade do usuário no backend) e as opções derivam dos próprios dados.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import ReportDetailModal from './components/ReportDetailModal.vue';

const store = useRealEstateStore();
const toast = useToast();

const q = ref('');
const cidade = ref('');
const empreendimento = ref('');

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const all = computed(() => store.report?.imobiliarias || []);

const cidadeOptions = computed(() => {
    const set = new Set();
    for (const i of all.value) for (const c of (i.cidades || [])) set.add(c);
    return [{ value: '', label: 'Todas as cidades' },
        ...[...set].sort((a, b) => a.localeCompare(b)).map(c => ({ value: c, label: c }))];
});

const empreendimentoOptions = computed(() => {
    const set = new Set();
    for (const i of all.value) for (const e of (i.empreendimentos || [])) set.add(e.nome);
    return [{ value: '', label: 'Todos os empreendimentos' },
        ...[...set].sort((a, b) => a.localeCompare(b)).map(e => ({ value: e, label: e }))];
});

const rows = computed(() => all.value.filter(i => {
    if (cidade.value && !(i.cidades || []).includes(cidade.value)) return false;
    if (empreendimento.value && !(i.empreendimentos || []).some(e => e.nome === empreendimento.value)) return false;
    if (q.value.trim()) {
        const alvo = norm(`${i.nome} ${i.razao_social} ${i.cnpj} ${i.gerente_nome || ''} ${i.email || ''}`);
        if (!alvo.includes(norm(q.value))) return false;
    }
    return true;
}));

const ativas = computed(() => rows.value.filter(i => i.ativo === 'S').length);

const fmtCnpj = (c) => {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length !== 14) return c || '-';
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};
const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

// Ficha da imobiliária no painel gestor do CV.
const cvUrl = (i) => `https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias/${i.idimobiliaria}/editar`;

// Detalhe por ID contra a store: refetch/sync atualizam o modal aberto.
const selectedId = ref(null);
const selected = computed(() => all.value.find(i => i.idimobiliaria === selectedId.value) || null);

const initials = (i) => {
    const sigla = String(i.sigla || '').trim();
    if (sigla) return sigla.slice(0, 2).toUpperCase();
    const words = String(i.nome || '').trim().split(/\s+/);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
};

async function syncNow() {
    try {
        await store.syncImobiliarias();
        toast.success('Imobiliárias sincronizadas com o CV!');
    } catch (err) {
        toast.error(err?.message || 'Erro ao sincronizar.');
    }
}

onMounted(() => store.fetchReport());
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Relatório de Imobiliárias"
            subtitle="Imobiliárias cadastradas no CV, com cidades e empreendimentos vinculados"
            icon="fas fa-house-flag"
        >
            <template #actions>
                <PageHelp
                    storage-key="comercial-imobiliarias-report"
                    title="Como usar o Relatório de Imobiliárias"
                    intro="A lista espelha as imobiliárias cadastradas no CV (backup local sincronizado)."
                    :steps="[
                        { title: 'Filtre', text: 'Use a busca (nome, CNPJ, gerente) e os filtros de cidade e empreendimento para achar a imobiliária.' },
                        { title: 'Cidade da imobiliária', text: 'Quando a imobiliária não tem endereço no CV, a cidade mostrada é herdada dos empreendimentos em que ela atua (marcada com o selo \'via empreendimentos\').' },
                        { title: 'Sincronize', text: 'O botão Sincronizar busca a lista mais recente no CV. Cadastros feitos pelo Office já entram automaticamente.' },
                    ]"
                    :tips="[
                        'Os empreendimentos vinculados vêm dos cadastros feitos pelo Office e da atividade de reservas no CV.',
                        'Para cadastrar uma nova imobiliária, use a tela Cadastro no menu Imobiliárias.',
                    ]"
                />
                <Button variant="secondary" icon="fas fa-rotate" :loading="store.syncing" @click="syncNow">Sincronizar</Button>
                <Button variant="primary" icon="fas fa-plus" @click="$router.push('/comercial/imobiliarias')">Cadastro</Button>
            </template>
        </PageHeader>

        <!-- Filtros -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Input v-model="q" placeholder="Buscar por nome, CNPJ, gerente..." icon-left="fas fa-magnifying-glass" />
            <Select v-model="cidade" :options="cidadeOptions" placeholder="Todas as cidades" />
            <Select v-model="empreendimento" :options="empreendimentoOptions" placeholder="Todos os empreendimentos" />
        </div>

        <!-- Resumo -->
        <div class="flex flex-wrap items-center gap-2 mb-4 text-xs text-ink-muted">
            <Badge variant="accent" outlined>{{ rows.length }} imobiliárias</Badge>
            <Badge variant="success" outlined>{{ ativas }} ativas</Badge>
            <span v-if="store.report?.last_sync">Última sincronização: {{ fmtDate(store.report.last_sync) }}</span>
        </div>

        <div v-if="store.loadingReport && !all.length" class="flex justify-center py-16">
            <Spinner />
        </div>

        <EmptyState
            v-else-if="!rows.length"
            icon="fas fa-house-flag"
            title="Nenhuma imobiliária encontrada"
            description="Ajuste os filtros ou sincronize com o CV."
        />

        <template v-else>
            <!-- Mobile: cards compactos (altura fixa, detalhe no modal) -->
            <div class="md:hidden space-y-2.5">
                <button
                    v-for="i in rows" :key="i.idimobiliaria"
                    type="button"
                    class="w-full h-[76px] rounded-xl border border-line bg-surface-raised px-3.5 flex items-center gap-3 text-left active:bg-surface-sunken/60 transition-colors"
                    @click="selectedId = i.idimobiliaria"
                >
                    <div class="h-10 w-10 shrink-0 rounded-xl bg-accent-soft text-accent flex items-center justify-center text-sm font-semibold">
                        {{ initials(i) }}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium text-ink truncate leading-tight">{{ i.nome }}</p>
                        <p class="text-xs text-ink-muted truncate">
                            <i class="fas fa-location-dot mr-1"></i>{{ (i.cidades || [])[0] || 'Sem cidade' }}
                            <template v-if="(i.empreendimentos || []).length">
                                · <i class="fas fa-building mx-1"></i>{{ i.empreendimentos.length }}
                            </template>
                        </p>
                        <p class="text-xs text-ink-subtle truncate">{{ fmtCnpj(i.cnpj) }}</p>
                    </div>
                    <div class="shrink-0 flex flex-col items-end gap-1.5">
                        <span class="h-2 w-2 rounded-full" :class="i.ativo === 'S' ? 'bg-emerald-500' : 'bg-slate-400'"
                            :title="i.ativo === 'S' ? 'Ativa' : 'Inativa'"></span>
                        <i class="fas fa-chevron-right text-ink-subtle text-xs"></i>
                    </div>
                </button>
            </div>

            <!-- Desktop: tabela com linhas de altura fixa -->
            <div class="hidden md:block rounded-xl border border-line bg-surface-raised overflow-x-auto">
                <table class="w-full text-sm table-fixed min-w-[960px]">
                    <thead>
                        <tr class="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-line">
                            <th class="px-4 py-3 w-[28%]">Imobiliária</th>
                            <th class="px-4 py-3 w-[20%]">Contato</th>
                            <th class="px-4 py-3 w-[16%]">Gerente</th>
                            <th class="px-4 py-3 w-[12%]">Cidade</th>
                            <th class="px-4 py-3 w-[14%]">Empreendimentos</th>
                            <th class="px-4 py-3 w-[10%] text-right">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="i in rows" :key="i.idimobiliaria"
                            class="h-[64px] border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60 cursor-pointer transition-colors"
                            @click="selectedId = i.idimobiliaria"
                        >
                            <td class="px-4">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="h-9 w-9 shrink-0 rounded-lg bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold">
                                        {{ initials(i) }}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="font-medium text-ink truncate">{{ i.nome }}</p>
                                        <p class="text-xs text-ink-muted truncate">{{ fmtCnpj(i.cnpj) }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-4">
                                <p class="text-ink-muted truncate text-xs">
                                    <i class="fas fa-envelope mr-1.5 text-ink-subtle"></i>{{ i.email || '-' }}
                                </p>
                                <p class="text-ink-muted truncate text-xs mt-0.5">
                                    <i class="fas fa-phone mr-1.5 text-ink-subtle"></i>{{ i.telefone || i.celular || '-' }}
                                </p>
                            </td>
                            <td class="px-4">
                                <p class="text-ink-muted truncate text-xs">
                                    <i class="fas fa-user-tie mr-1.5 text-ink-subtle"></i>{{ i.gerente_nome || '-' }}
                                </p>
                            </td>
                            <td class="px-4">
                                <p class="text-ink-muted truncate text-xs">
                                    <i class="fas fa-location-dot mr-1.5 text-ink-subtle"></i>{{ (i.cidades || [])[0] || '-' }}<template v-if="(i.cidades || []).length > 1"> +{{ i.cidades.length - 1 }}</template>
                                    <i v-if="i.cidade_origem === 'empreendimentos'"
                                        class="fas fa-building ml-1 text-ink-subtle"
                                        v-tippy="'Cidade herdada dos empreendimentos vinculados'"></i>
                                </p>
                            </td>
                            <td class="px-4">
                                <div v-if="(i.empreendimentos || []).length" class="flex items-center gap-1 min-w-0">
                                    <span class="truncate rounded-full bg-surface-sunken border border-line-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                                        {{ i.empreendimentos[0].nome }}
                                    </span>
                                    <span v-if="i.empreendimentos.length > 1"
                                        class="shrink-0 rounded-full bg-accent-soft text-accent px-1.5 py-0.5 text-[11px] font-medium"
                                        v-tippy="i.empreendimentos.slice(1).map(e => e.nome).join(', ')">
                                        +{{ i.empreendimentos.length - 1 }}
                                    </span>
                                </div>
                                <span v-else class="text-ink-subtle text-xs">-</span>
                            </td>
                            <td class="px-4" @click.stop>
                                <div class="flex items-center justify-end gap-2">
                                    <Badge :variant="i.ativo === 'S' ? 'success' : 'neutral'" size="sm">{{ i.ativo === 'S' ? 'Ativa' : 'Inativa' }}</Badge>
                                    <a :href="cvUrl(i)" target="_blank" rel="noopener"
                                        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60"
                                        v-tippy="`Abrir no CV (#${i.idimobiliaria})`">
                                        <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <ReportDetailModal :imobiliaria="selected" @close="selectedId = null" />
    </PageContainer>
</template>
