<script setup>
// Aba "Cadastros e convites" da tela unificada: acompanhamento dos cadastros
// feitos pelo Office (internos e via link público), com cópia de link,
// revogação, detalhe por etapa e reprocessamento.
//
// Duas correções de 2026-08-24:
//  - a lista não tinha NENHUM filtro, só ordem por id. Agora tem busca e
//    recorte por status, que é como se acha "aquele convite que deu erro".
//  - cada preenchimento de link múltiplo cria um registro-FILHO (parent_id), e
//    ele aparecia solto no meio da lista, sem nenhum vínculo visível com o
//    convite que o gerou. Agora o filho fica DENTRO do pai, que abre e fecha.

import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { useCan } from '@/composables/useCan';

import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import DetailModal from './DetailModal.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';

const LP_BASE = import.meta.env.VITE_LP_URL || 'https://lp.menin.com.br';

const store = useRealEstateStore();
const toast = useToast();
const can = useCan('/comercial/imobiliarias');

const STATUS = {
    invite:     { label: 'Aguardando preenchimento', variant: 'info' },
    processing: { label: 'Processando',              variant: 'warning' },
    completed:  { label: 'Concluída',                variant: 'success' },
    error:      { label: 'Erro',                     variant: 'danger' },
    revoked:    { label: 'Revogado',                 variant: 'neutral' },
};
const WINDOW = {
    not_started: { label: 'Agendado', variant: 'info' },
    open:        { label: 'Ativo',     variant: 'success' },
    expired:     { label: 'Encerrado', variant: 'neutral' },
};
// Convite multi-uso mostra o estado da janela; os demais, o status normal.
const statusOf = (r) => {
    if (r.status === 'revoked') return STATUS.revoked;
    if (r.multi_use) return WINDOW[r.window_state] || STATUS.invite;
    return STATUS[r.status] || { label: r.status, variant: 'neutral' };
};

// Link multi-uso ainda utilizável (dá para copiar/enviar).
const isLiveMulti = (r) => r.multi_use && r.status !== 'revoked' && r.window_state !== 'expired';

const displayName = (r) => r.form?.imobiliaria?.nome || r.label || `Cadastro #${r.id}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const originIcon = (r) => r.multi_use ? 'fas fa-link' : (r.source === 'public' ? 'fas fa-link' : 'fas fa-desktop');
const originLabel = (r) => r.multi_use ? 'Link múltiplo' : (r.source === 'public' ? 'Via link' : 'Interno');
// Resumo dos empreendimentos, ou contagem de cadastros num link múltiplo.
const summaryText = (r) => r.multi_use
    ? `${r.submissions_count || 0} cadastro(s) · ${(r.enterprises || []).length} empreend.`
    : ((r.enterprises || []).map(e => e.nome).join(', ') || '-');

// ── Filtros ──────────────────────────────────────────────────────────────────
const q = ref('');
const statusFiltro = ref('');
const STATUS_OPTIONS = [
    { value: '', label: 'Todos os status' },
    { value: 'invite', label: 'Aguardando preenchimento' },
    { value: 'processing', label: 'Processando' },
    { value: 'completed', label: 'Concluída' },
    { value: 'error', label: 'Erro' },
    { value: 'revoked', label: 'Revogado' },
];

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const filtroAtivo = computed(() => !!q.value.trim() || !!statusFiltro.value);

const passa = (r) => {
    if (statusFiltro.value && r.status !== statusFiltro.value) return false;
    if (q.value.trim()) {
        const alvo = norm(`${displayName(r)} ${r.label || ''} ${r.creator_name || ''} ${(r.enterprises || []).map(e => e.nome).join(' ')}`);
        if (!alvo.includes(norm(q.value))) return false;
    }
    return true;
};

// ── Hierarquia: convite múltiplo (pai) x preenchimentos dele (filhos) ─────────
const todos = computed(() => store.registrations);
const idsPresentes = computed(() => new Set(todos.value.map(r => r.id)));

const filhosDe = computed(() => {
    const m = new Map();
    for (const r of todos.value) {
        if (!r.parent_id || !idsPresentes.value.has(r.parent_id)) continue;
        if (!m.has(r.parent_id)) m.set(r.parent_id, []);
        m.get(r.parent_id).push(r);
    }
    return m;
});

// Raiz = tudo que não é filho de um convite que ESTÁ na lista. Filho órfão
// (pai fora do escopo ou do teto de linhas) sobe para a raiz em vez de sumir.
const raizes = computed(() => todos.value.filter(r => !r.parent_id || !idsPresentes.value.has(r.parent_id)));

const abertos = ref(new Set());
function alternar(id) {
    const s = new Set(abertos.value);
    if (s.has(id)) s.delete(id); else s.add(id);
    abertos.value = s;
}
// Com filtro ativo o pai abre sozinho: senão o filho que casou com o termo
// ficaria escondido dentro de um pai fechado.
const aberto = (id) => abertos.value.has(id) || filtroAtivo.value;

// Lista achatada para render, com o nível de cada linha.
const linhas = computed(() => {
    const out = [];
    for (const pai of raizes.value) {
        const todosFilhos = filhosDe.value.get(pai.id) || [];
        const filhos = todosFilhos.filter(passa);
        if (!passa(pai) && !filhos.length) continue;
        out.push({ r: pai, filho: false, nFilhos: todosFilhos.length });
        if (aberto(pai.id)) for (const f of filhos) out.push({ r: f, filho: true, nFilhos: 0 });
    }
    return out;
});

// Quantos o FILTRO está escondendo. Não conta filho recolhido: aquele está
// visível dentro do pai, é só clicar - e o pai diz quantos são.
const ocultos = computed(() => todos.value.filter(r => !passa(r)).length);

function limparFiltros() {
    q.value = '';
    statusFiltro.value = '';
}

// Detalhe por ID contra a store: reprocessar/revogar atualizam o modal aberto.
const detailId = ref(null);
const detail = computed(() => todos.value.find(x => x.id === detailId.value) || null);

const publicUrl = (r) => `${LP_BASE}/imobiliaria/${r.token}`;

async function copyLink(r) {
    try {
        await navigator.clipboard.writeText(publicUrl(r));
        toast.success('Link copiado!');
    } catch {
        toast.error('Não foi possível copiar. Copie manualmente na tela de detalhes.');
    }
}

async function revoke(r) {
    if (!await pedirConfirmacao({
        title: 'Revogar este link de cadastro?',
        consequence: 'Quem recebeu o link para de conseguir preencher, na hora. Quem ja enviou continua cadastrado.',
        hint: 'Para liberar de novo e preciso gerar um link novo.',
        confirmLabel: 'Revogar link',
    })) return;
    try {
        await store.revokeInvite(r.id);
        toast.success('Link revogado.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao revogar.');
    }
}

const retrying = ref(null);
async function retry(r) {
    retrying.value = r.id;
    try {
        await store.retryRegistration(r.id);
        toast.success('Cadastro reprocessado com sucesso!');
    } catch (err) {
        toast.error(err?.message || 'O reprocessamento falhou. Veja o detalhe.');
    } finally {
        retrying.value = null;
    }
}
</script>

<template>
    <div>
        <!-- Filtros -->
        <div v-if="todos.length" class="flex flex-col sm:flex-row gap-3 mb-4">
            <Input v-model="q" class="flex-1" placeholder="Buscar por imobiliária, convite, empreendimento ou quem criou"
                icon-left="fas fa-magnifying-glass" />
            <Select v-model="statusFiltro" :options="STATUS_OPTIONS" class="sm:w-64" />
        </div>

        <div v-if="todos.length" class="flex flex-wrap items-center gap-2 mb-4 text-xs text-ink-muted">
            <Badge variant="accent" outlined>
                {{ linhas.filter(l => !l.filho).length }} de {{ store.registrationsTotal || todos.length }}
            </Badge>
            <button v-if="ocultos > 0" type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 hover:text-accent hover:border-accent/60 transition-colors"
                @click="limparFiltros">
                <i class="fas fa-eye-slash text-ink-subtle"></i>
                {{ ocultos }} oculto{{ ocultos > 1 ? 's' : '' }} pelos filtros - mostrar todos
            </button>
            <!-- Teto de linhas: se um dia estourar, a tela avisa em vez de omitir calado. -->
            <span v-if="store.registrationsTruncated" class="text-data-warn">
                <i class="fas fa-triangle-exclamation mr-1"></i>
                Mostrando os {{ todos.length }} mais recentes de {{ store.registrationsTotal }}.
            </span>
        </div>

        <Skeleton v-if="store.loading && !todos.length" variant="row" :lines="4" />

        <!-- Falha de carga é ERRO, não "nenhum cadastro". -->
        <EmptyState
            v-else-if="store.errorRegistrations && !todos.length"
            icon="fas fa-triangle-exclamation"
            title="Não foi possível carregar os cadastros"
            :description="store.errorRegistrations"
        >
            <template #actions>
                <Button variant="outline" icon="fas fa-rotate-right" :loading="store.loading"
                    @click="store.fetchRegistrations().catch(() => {})">Tentar de novo</Button>
            </template>
        </EmptyState>

        <EmptyState
            v-else-if="!todos.length"
            icon="fas fa-file-signature"
            title="Nenhum cadastro ainda"
            description="Cadastre uma imobiliária ou gere um link para o responsável preencher."
        />

        <EmptyState
            v-else-if="!linhas.length"
            icon="fas fa-filter-circle-xmark"
            :title="`Nenhum dos ${todos.length} cadastros passa nos filtros`"
            description="Limpe a busca e o status para ver a lista completa."
        >
            <template #actions>
                <Button variant="outline" icon="fas fa-eraser" @click="limparFiltros">Limpar filtros</Button>
            </template>
        </EmptyState>

        <template v-else>
            <!-- Mobile: cards -->
            <div class="md:hidden space-y-2.5">
                <div
                    v-for="l in linhas" :key="l.r.id"
                    role="button" tabindex="0"
                    class="rounded-xl border border-line bg-surface-raised p-4 space-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    :class="l.filho ? 'ml-4 border-l-2 border-l-accent/40' : ''"
                    @click="detailId = l.r.id"
                    @keydown.enter.prevent="detailId = l.r.id"
                    @keydown.space.prevent="detailId = l.r.id"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-medium text-ink truncate">
                                <i v-if="l.filho" class="fas fa-turn-up fa-rotate-90 text-ink-subtle text-xs mr-1.5"></i>
                                {{ displayName(l.r) }}
                            </p>
                            <p class="text-xs text-ink-muted">
                                <i :class="originIcon(l.r)" class="mr-1"></i>
                                {{ originLabel(l.r) }} · {{ fmtDate(l.r.createdAt) }}
                            </p>
                        </div>
                        <Badge :variant="statusOf(l.r).variant" size="sm">{{ statusOf(l.r).label }}</Badge>
                    </div>
                    <p class="text-xs text-ink-muted truncate">
                        <i class="fas fa-building mr-1"></i>{{ summaryText(l.r) }}
                    </p>
                    <div v-if="l.nFilhos || can('register')" class="flex flex-wrap gap-2 pt-1" @click.stop>
                        <Button v-if="l.nFilhos" variant="ghost" size="sm"
                            :icon="aberto(l.r.id) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                            @click="alternar(l.r.id)">
                            {{ l.nFilhos }} cadastro{{ l.nFilhos > 1 ? 's' : '' }}
                        </Button>
                        <template v-if="can('register')">
                            <Button v-if="isLiveMulti(l.r) || l.r.status === 'invite'" variant="outline" size="sm" icon="fas fa-copy" @click="copyLink(l.r)">Copiar link</Button>
                            <Button v-if="isLiveMulti(l.r) || l.r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(l.r)">Revogar</Button>
                            <Button v-if="l.r.status === 'error'" variant="outline" size="sm" icon="fas fa-rotate-right" :loading="retrying === l.r.id" @click="retry(l.r)">Reprocessar</Button>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Desktop: tabela -->
            <div class="hidden md:block rounded-xl border border-line bg-surface-raised overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-line">
                            <th class="px-4 py-3">Imobiliária / convite</th>
                            <th class="px-4 py-3">Origem</th>
                            <th class="px-4 py-3">Empreendimentos</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Criado por</th>
                            <th class="px-4 py-3">Data</th>
                            <th class="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="l in linhas" :key="l.r.id"
                            class="h-[56px] border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60 cursor-pointer"
                            :class="l.filho ? 'bg-surface-sunken/30' : ''"
                            @click="detailId = l.r.id"
                        >
                            <td class="px-4 font-medium text-ink truncate max-w-[280px]">
                                <span v-if="l.filho" class="inline-block w-6 text-ink-subtle text-xs">
                                    <i class="fas fa-turn-up fa-rotate-90"></i>
                                </span>
                                <button v-else-if="l.nFilhos" type="button"
                                    class="mr-1.5 h-5 w-5 rounded text-ink-subtle hover:text-accent"
                                    v-tippy="aberto(l.r.id) ? 'Recolher os cadastros deste link' : 'Ver os cadastros deste link'"
                                    @click.stop="alternar(l.r.id)">
                                    <i :class="aberto(l.r.id) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" class="text-xs"></i>
                                </button>
                                <span v-else class="inline-block w-6"></span>
                                {{ displayName(l.r) }}
                            </td>
                            <td class="px-4 text-ink-muted whitespace-nowrap">
                                <i :class="originIcon(l.r)" class="mr-1.5 text-ink-subtle"></i>{{ originLabel(l.r) }}
                            </td>
                            <td class="px-4 text-ink-muted max-w-[280px] truncate">{{ summaryText(l.r) }}</td>
                            <td class="px-4"><Badge :variant="statusOf(l.r).variant" size="sm">{{ statusOf(l.r).label }}</Badge></td>
                            <td class="px-4 text-ink-muted truncate max-w-[140px]">{{ l.r.creator_name || '-' }}</td>
                            <td class="px-4 text-ink-muted whitespace-nowrap">{{ fmtDate(l.r.createdAt) }}</td>
                            <td class="px-4" @click.stop>
                                <div class="flex justify-end gap-1.5">
                                    <template v-if="can('register')">
                                        <Button v-if="isLiveMulti(l.r) || l.r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-copy" @click="copyLink(l.r)" v-tippy="'Copiar link'" />
                                        <Button v-if="isLiveMulti(l.r) || l.r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(l.r)" v-tippy="'Revogar link'" />
                                        <Button v-if="l.r.status === 'error'" variant="ghost" size="sm" icon="fas fa-rotate-right" :loading="retrying === l.r.id" @click="retry(l.r)" v-tippy="'Reprocessar'" />
                                    </template>
                                    <Button variant="ghost" size="sm" icon="fas fa-eye" @click="detailId = l.r.id" v-tippy="'Detalhes'" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <DetailModal :registration="detail" :retrying="retrying === detail?.id" @close="detailId = null" @retry="retry" @copy="copyLink" />
    </div>
</template>
