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
            <!-- Mobile: cards -->
            <div class="md:hidden space-y-3">
                <div v-for="i in rows" :key="i.idimobiliaria" class="rounded-xl border border-line bg-surface-raised p-4 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-medium text-ink truncate">{{ i.nome }}</p>
                            <p class="text-xs text-ink-muted">{{ fmtCnpj(i.cnpj) }} · CRECI {{ i.creci || '-' }}</p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <Badge :variant="i.ativo === 'S' ? 'success' : 'neutral'" size="sm">{{ i.ativo === 'S' ? 'Ativa' : 'Inativa' }}</Badge>
                            <a :href="cvUrl(i)" target="_blank" rel="noopener"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60"
                                title="Abrir no CV">
                                <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                            </a>
                        </div>
                    </div>
                    <p class="text-xs text-ink-muted truncate">
                        <i class="fas fa-location-dot mr-1"></i>{{ (i.cidades || []).join(', ') || '-' }}
                        <Badge v-if="i.cidade_origem === 'empreendimentos'" variant="info" size="sm" outlined class="ml-1">via empreendimentos</Badge>
                    </p>
                    <p v-if="i.gerente_nome" class="text-xs text-ink-muted truncate">
                        <i class="fas fa-user-tie mr-1"></i>{{ i.gerente_nome }}
                    </p>
                    <p class="text-xs text-ink-muted truncate">
                        <i class="fas fa-envelope mr-1"></i>{{ i.email || '-' }}
                        <template v-if="i.telefone || i.celular"> · <i class="fas fa-phone mr-1"></i>{{ i.telefone || i.celular }}</template>
                    </p>
                    <div v-if="(i.empreendimentos || []).length" class="flex flex-wrap gap-1 pt-1">
                        <span v-for="e in i.empreendimentos" :key="e.nome"
                            class="inline-flex items-center rounded-full bg-surface-sunken border border-line-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                            {{ e.nome }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Desktop: tabela -->
            <div class="hidden md:block rounded-xl border border-line bg-surface-raised overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-line">
                            <th class="px-4 py-3">Imobiliária</th>
                            <th class="px-4 py-3">Contato</th>
                            <th class="px-4 py-3">Gerente</th>
                            <th class="px-4 py-3">Cidade</th>
                            <th class="px-4 py-3">Empreendimentos</th>
                            <th class="px-4 py-3">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="i in rows" :key="i.idimobiliaria" class="border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60">
                            <td class="px-4 py-3">
                                <p class="font-medium text-ink">{{ i.nome }}</p>
                                <p class="text-xs text-ink-muted">{{ fmtCnpj(i.cnpj) }} · CRECI {{ i.creci || '-' }}</p>
                            </td>
                            <td class="px-4 py-3 text-ink-muted">
                                <p class="truncate max-w-[220px]">{{ i.email || '-' }}</p>
                                <p class="text-xs">{{ i.telefone || i.celular || '-' }}</p>
                            </td>
                            <td class="px-4 py-3 text-ink-muted">
                                <p class="truncate max-w-[180px]">{{ i.gerente_nome || '-' }}</p>
                                <p class="text-xs truncate max-w-[180px]">{{ i.gerente_email || i.gerente_celular || '' }}</p>
                            </td>
                            <td class="px-4 py-3 text-ink-muted whitespace-nowrap">
                                {{ (i.cidades || []).join(', ') || '-' }}
                                <i v-if="i.cidade_origem === 'empreendimentos'"
                                    class="fas fa-building ml-1 text-ink-subtle"
                                    title="Cidade herdada dos empreendimentos vinculados"></i>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex flex-wrap gap-1 max-w-[280px]">
                                    <span v-for="e in i.empreendimentos" :key="e.nome"
                                        class="inline-flex items-center rounded-full bg-surface-sunken border border-line-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                                        {{ e.nome }}
                                    </span>
                                    <span v-if="!(i.empreendimentos || []).length" class="text-ink-subtle text-xs">-</span>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <Badge :variant="i.ativo === 'S' ? 'success' : 'neutral'" size="sm">{{ i.ativo === 'S' ? 'Ativa' : 'Inativa' }}</Badge>
                                    <a :href="cvUrl(i)" target="_blank" rel="noopener"
                                        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60"
                                        title="Abrir no CV">
                                        <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                                    </a>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </PageContainer>
</template>
