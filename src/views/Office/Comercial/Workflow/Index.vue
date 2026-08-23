<script setup>
/**
 * Grupos de Workflow — quais situações do CV formam uma etapa.
 *
 * É tela de CONFIGURAÇÃO, e o efeito não fica aqui: o grupo define o que o
 * Faturamento conta como PRÓXIMA ENTRADA na projeção. Por isso a tela mostra o
 * alcance antes de salvar e o que se perde antes de excluir.
 */
import { ref, computed, onMounted } from 'vue';
import Favorite from '@/components/config/Favorite.vue';
import { useWorkflowGroupsStore } from '@/stores/Comercial/Workflow/groupsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Modal from '@/components/UI/Modal.vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useWorkflowGroupsStore();

/* Nasce CARREGANDO: com `false`, o primeiro quadro mostra "nenhum grupo" antes
   de o onMounted rodar. */
const loading = ref(true);
const salvando = ref(false);
const excluindo = ref(false);
const erroLocal = ref('');
/* `fetchGrupos` captura o próprio erro e o guarda em `store.error` em vez de
   relançar. Sem juntar os dois, uma falha ao trocar de tipo ficava calada. */
const erro = computed(() => erroLocal.value || store.error || '');
const salvo = ref(false);

const showModal = ref(false);
const editing = ref(null);
const aExcluir = ref(null);
const form = ref({ nome: '', descricao: '', segmentoSelecionado: '', stale_days: 30 });
const selectedSituacoes = ref([]);
const q = ref('');

const TIPOS = [
    { value: 'reservas', label: 'Reservas', icon: 'fas fa-clipboard-list' },
    { value: 'repasses', label: 'Repasses', icon: 'fas fa-hand-holding-dollar' },
];
const rotuloTipo = computed(() => store.tipo === 'reservas' ? 'Reservas' : 'Repasses');

const segmentoOptions = computed(() => [
    { value: '', label: 'Todos os segmentos' },
    ...(store.segmentos || []).map(s => ({ value: s, label: s })),
]);

const filteredWorkflow = computed(() => {
    const term = q.value.trim().toLowerCase();
    if (!term) return store.workflow || [];
    return (store.workflow || []).filter(e => String(e?.nome || '').toLowerCase().includes(term));
});

/* Situações já usadas por OUTRO grupo do mesmo tipo. Uma situação em dois
   grupos faz o Faturamento contar a mesma reserva duas vezes, então isso
   precisa aparecer na hora de marcar, não depois. */
const usadasPorOutro = computed(() => {
    const mapa = new Map();
    for (const g of store.grupos || []) {
        if (editing.value && g.idgroup === editing.value.idgroup) continue;
        for (const s of g.situacoes || []) mapa.set(String(s.id), g.nome);
    }
    return mapa;
});
const conflitos = computed(() =>
    selectedSituacoes.value.filter(id => usadasPorOutro.value.has(String(id)))
);

async function switchTipo(t) {
    loading.value = true;
    erroLocal.value = '';
    try {
        await Promise.all([store.fetchWorkflow(t), store.fetchGrupos(t)]);
    } catch (e) {
        erroLocal.value = e.message || 'Erro ao trocar de tipo.';
    } finally {
        loading.value = false;
    }
}

function openModal(grupo) {
    erroLocal.value = '';
    editing.value = grupo;
    q.value = '';
    if (grupo) {
        form.value = {
            nome: grupo.nome,
            descricao: grupo.descricao || '',
            segmentoSelecionado: Array.isArray(grupo.segmentos) && grupo.segmentos.length ? grupo.segmentos[0] : '',
            stale_days: grupo.stale_days ?? 30,
        };
        selectedSituacoes.value = (grupo.situacoes || []).map(s => s.id);
    } else {
        form.value = { nome: '', descricao: '', segmentoSelecionado: '', stale_days: 30 };
        selectedSituacoes.value = [];
    }
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
    editing.value = null;
    q.value = '';
}

async function saveGroup() {
    if (!form.value.nome.trim()) {
        erroLocal.value = 'Informe um nome para o grupo.';
        return;
    }
    salvando.value = true;
    erroLocal.value = '';
    try {
        await store.saveGrupo({
            tipo: store.tipo,
            nome: form.value.nome.trim(),
            descricao: form.value.descricao.trim(),
            situacoes_ids: selectedSituacoes.value,
            segmentos: form.value.segmentoSelecionado ? [form.value.segmentoSelecionado] : [],
            stale_days: Number.isFinite(Number(form.value.stale_days)) ? Number(form.value.stale_days) : 30,
        });
        closeModal();
        salvo.value = true;
        setTimeout(() => { salvo.value = false; }, 3000);
    } catch (e) {
        erroLocal.value = e.message || 'Erro ao salvar o grupo.';
    } finally {
        salvando.value = false;
    }
}

async function confirmarExclusao() {
    excluindo.value = true;
    erroLocal.value = '';
    try {
        await store.deleteGrupo(aExcluir.value.idgroup);
        aExcluir.value = null;
    } catch (e) {
        erroLocal.value = e.message || 'Erro ao excluir o grupo.';
        aExcluir.value = null;
    } finally {
        excluindo.value = false;
    }
}

const selectAllSituacoes = () => {
    selectedSituacoes.value = (store.workflow || []).map(w => w.idsituacao);
};
const clearSituacoes = () => { selectedSituacoes.value = []; };

onMounted(async () => {
    try {
        await Promise.all([store.fetchWorkflow(), store.fetchGrupos(), store.fetchSegmentos()]);
    } catch (e) {
        erroLocal.value = e.message || 'Erro ao carregar a tela.';
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <PageContainer size="lg">
        <PageHeader
            title="Grupos de Workflow"
            subtitle="Quais situações do CV formam cada etapa de Reservas e Repasses"
            icon="fas fa-diagram-project">
            <template #title>
                <span>Grupos de Workflow</span>
                <Favorite :router="'/comercial/workflow/groups'" :section="'Grupos Workflow'" />
            </template>
            <template #actions>
                <PageHelp
                    storage-key="workflow-grupos"
                    title="Como usar os Grupos de Workflow"
                    intro="Um grupo junta situações do CV sob um nome só. Quem lê esse agrupamento é o Faturamento: as situações de um grupo é que contam como PRÓXIMA ENTRADA na projeção de vendas."
                    :steps="[
                        { title: 'Escolha o tipo', text: 'Reservas e Repasses têm workflows separados no CV, então têm grupos separados aqui. O botão no topo troca entre os dois.' },
                        { title: 'Monte o grupo', text: 'Dê um nome, marque as situações que entram e, se quiser, restrinja a um segmento de empreendimento.' },
                        { title: 'Defina o corte de encalhe', text: 'Reserva ou repasse parado há mais dias que o corte deixa de contar na projeção. Encalhado não é previsão de venda. Zero desliga o corte.' },
                    ]"
                    :tips="[
                        'Uma situação em dois grupos do mesmo tipo faz o Faturamento contar a mesma reserva duas vezes. A tela avisa quando isso vai acontecer.',
                        'A cor do quadradinho é a que a própria situação tem no CV, não uma cor daqui.',
                        'Mexer num grupo muda a projeção do Faturamento na hora seguinte; não é só organização visual.',
                    ]" />
                <Button icon="fas fa-plus" size="sm" @click="openModal(null)">
                    <span class="hidden sm:inline">Novo grupo</span>
                </Button>
            </template>
        </PageHeader>

        <!-- Tipo: dois workflows separados no CV, dois conjuntos de grupos aqui -->
        <div class="mb-4">
            <SegmentedControl :model-value="store.tipo" :options="TIPOS" @change="switchTipo" />
        </div>

        <p v-if="erro"
            class="mb-4 flex items-center gap-2 rounded-xl border border-data-neg/25 bg-data-neg/10 p-3 text-sm text-data-neg">
            <i class="fas fa-circle-exclamation shrink-0"></i>{{ erro }}
        </p>
        <p v-if="salvo"
            class="mb-4 flex items-center gap-2 rounded-xl border border-data-pos/25 bg-data-pos/10 p-3 text-sm text-data-pos">
            <i class="fas fa-circle-check shrink-0"></i>
            Grupo salvo. A projeção do Faturamento já considera esta configuração.
        </p>

        <!-- Carregando: a forma dos cartões, para a tela não saltar -->
        <div v-if="loading" class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Skeleton v-for="i in 3" :key="i" variant="card" class="h-56" />
        </div>

        <EmptyState v-else-if="!store.grupos.length"
            size="lg" icon="fas fa-diagram-project"
            :title="`Nenhum grupo em ${rotuloTipo}`"
            description="Um grupo junta situações do CV sob um nome só, e é ele que o Faturamento lê para projetar as próximas entradas.">
            <template #actions>
                <Button icon="fas fa-plus" @click="openModal(null)">Criar o primeiro grupo</Button>
            </template>
        </EmptyState>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger-in">
            <Panel v-for="g in store.grupos" :key="g.idgroup" :padded="false">
                <div class="p-4 sm:p-5 border-b border-line flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <h2 class="text-base font-semibold text-ink truncate">{{ g.nome }}</h2>
                        <p v-if="g.descricao" class="text-xs text-ink-muted mt-0.5 line-clamp-2">{{ g.descricao }}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <IconButton icon="fas fa-pen" size="sm" title="Editar grupo" @click="openModal(g)" />
                        <IconButton icon="fas fa-trash" size="sm" variant="danger"
                            title="Excluir grupo" @click="aExcluir = g" />
                    </div>
                </div>

                <div class="p-4 sm:p-5 space-y-3">
                    <!-- O que o grupo alcança: segmento, quantas situações e o
                         corte de encalhe. O corte estava só dentro do modal, e
                         é ele que decide o que entra na projeção. -->
                    <div class="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral" size="sm">
                            <i class="fas fa-layer-group mr-1 text-micro"></i>
                            <template v-if="Array.isArray(g.segmentos) && g.segmentos.length">
                                {{ g.segmentos.join(', ') }}
                            </template>
                            <template v-else>Todos os segmentos</template>
                        </Badge>
                        <Badge variant="accent" size="sm">
                            {{ (g.situacoes || []).length }} situaç{{ (g.situacoes || []).length === 1 ? 'ão' : 'ões' }}
                        </Badge>
                        <Badge :variant="Number(g.stale_days) > 0 ? 'warning' : 'neutral'" size="sm"
                            v-tippy="Number(g.stale_days) > 0
                                ? `Parado há mais de ${g.stale_days} dias sai da projeção`
                                : 'Sem corte: nada é descartado por encalhe'">
                            <i class="far fa-clock mr-1 text-micro"></i>
                            <template v-if="Number(g.stale_days) > 0">corte {{ g.stale_days }}d</template>
                            <template v-else>sem corte</template>
                        </Badge>
                    </div>

                    <div v-if="(g.situacoes || []).length" class="grid gap-1.5 max-h-44 overflow-y-auto pr-1">
                        <div v-for="s in g.situacoes" :key="s.id"
                            class="flex items-center gap-2 text-xs bg-surface-sunken border border-line rounded-lg px-3 py-1.5 min-w-0">
                            <!-- A cor vem do CV: é a identidade da situação lá,
                                 não uma cor do design system. -->
                            <span class="w-3 h-3 rounded-sm border border-line shrink-0"
                                :style="{ backgroundColor: s.cor_bg }"></span>
                            <span class="font-mono tabular-nums text-ink-subtle shrink-0">{{ s.id }}</span>
                            <span class="truncate text-ink-muted">{{ s.nome }}</span>
                        </div>
                    </div>
                    <p v-else class="text-xs text-ink-subtle italic">
                        Sem situações: este grupo não entra na projeção.
                    </p>
                </div>
            </Panel>
        </div>
    </PageContainer>

    <!-- ── Criar / editar ─────────────────────────────────────────────────── -->
    <Modal :open="showModal" size="lg"
        :title="editing ? 'Editar grupo' : 'Novo grupo'"
        :subtitle="`Em ${rotuloTipo}`"
        @close="closeModal">
        <div class="space-y-5">
            <Input v-model="form.nome" label="Nome do grupo" placeholder="Ex: Etapas de assinatura" />

            <div>
                <label class="wf-rotulo">Descrição <span class="normal-case tracking-normal font-normal">(opcional)</span></label>
                <textarea v-model="form.descricao" rows="2" class="wf-campo resize-none"
                    placeholder="Para que serve este agrupamento"></textarea>
            </div>

            <Select v-model="form.segmentoSelecionado" :options="segmentoOptions"
                label="Segmento do empreendimento"
                hint="Sem segmento, o grupo vale para todos. As opções vêm de cv_enterprises.segmento_nome." />

            <div>
                <label class="wf-rotulo">Ignorar paradas há mais de (dias)</label>
                <input v-model.number="form.stale_days" type="number" min="0" step="1"
                    placeholder="30" class="wf-campo font-mono tabular-nums" />
                <p class="text-xs text-ink-muted mt-1.5 leading-relaxed">
                    Reserva ou repasse sem movimentação há mais dias que isso deixa de contar como próxima
                    entrada na projeção do Faturamento — encalhado não é previsão de venda.
                    <strong>0</strong> desliga o corte.
                </p>
            </div>

            <!-- Situações -->
            <div>
                <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <label class="wf-rotulo mb-0">Situações do workflow</label>
                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" @click="selectAllSituacoes">Todas</Button>
                        <Button variant="ghost" size="sm" :disabled="!selectedSituacoes.length"
                            @click="clearSituacoes">Limpar</Button>
                    </div>
                </div>

                <Input v-model="q" size="sm" placeholder="Buscar pelo nome da situação"
                    iconLeft="fas fa-magnifying-glass" class="mb-2" />

                <div class="border border-line rounded-xl max-h-60 overflow-y-auto divide-y divide-line">
                    <label v-for="etapa in filteredWorkflow" :key="etapa.idsituacao"
                        class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-sunken transition duration-120 ease-out-expo">
                        <input type="checkbox" v-model="selectedSituacoes" :value="etapa.idsituacao"
                            class="w-4 h-4 rounded accent-accent shrink-0" />
                        <span class="w-3.5 h-3.5 rounded-sm border border-line shrink-0"
                            :style="{ backgroundColor: etapa.cor_bg }"></span>
                        <span class="text-sm text-ink truncate flex-1 min-w-0">{{ etapa.nome }}</span>
                        <span v-if="usadasPorOutro.has(String(etapa.idsituacao))"
                            class="text-micro text-data-warn shrink-0"
                            v-tippy="`Já está no grupo &quot;${usadasPorOutro.get(String(etapa.idsituacao))}&quot;`">
                            <i class="fas fa-triangle-exclamation"></i>
                        </span>
                    </label>
                    <p v-if="!filteredWorkflow.length" class="px-3 py-6 text-center text-sm text-ink-subtle">
                        Nenhuma situação encontrada.
                    </p>
                </div>

                <!-- O efeito ANTES de salvar: quanto o grupo alcança e o que
                     vai dar errado se houver situação repetida. -->
                <p class="text-xs text-ink-muted mt-2">
                    <strong class="font-mono tabular-nums text-ink">{{ selectedSituacoes.length }}</strong>
                    situaç{{ selectedSituacoes.length === 1 ? 'ão marcada' : 'ões marcadas' }}
                    de {{ (store.workflow || []).length }}.
                </p>
                <p v-if="conflitos.length" class="wf-aviso mt-2">
                    <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
                    <span>
                        <strong>{{ conflitos.length }}</strong>
                        situaç{{ conflitos.length === 1 ? 'ão já está' : 'ões já estão' }} em outro grupo de
                        {{ rotuloTipo.toLowerCase() }}. Salvando assim, o Faturamento conta
                        {{ conflitos.length === 1 ? 'essa reserva' : 'essas reservas' }} duas vezes na projeção.
                    </span>
                </p>
                <p v-else-if="!selectedSituacoes.length" class="wf-aviso mt-2">
                    <i class="fas fa-circle-info shrink-0 mt-0.5"></i>
                    <span>Sem situação marcada o grupo existe, mas não entra na projeção do Faturamento.</span>
                </p>
            </div>
        </div>

        <template #footer>
            <Button variant="ghost" @click="closeModal">Cancelar</Button>
            <Button icon="fas fa-save" :loading="salvando" :disabled="salvando || !form.nome.trim()"
                @click="saveGroup">Salvar grupo</Button>
        </template>
    </Modal>

    <!-- ── Excluir ────────────────────────────────────────────────────────── -->
    <ConfirmDialog :open="!!aExcluir" tone="danger"
        :title="`Excluir o grupo ${aExcluir?.nome}?`"
        :consequence="(aExcluir?.situacoes || []).length
            ? `As ${(aExcluir?.situacoes || []).length} situações deste grupo deixam de contar como próxima entrada na projeção do Faturamento.`
            : 'O grupo está vazio, então a projeção do Faturamento não muda.'"
        hint="As situações continuam existindo no CV; só o agrupamento é apagado."
        confirm-label="Excluir grupo" :loading="excluindo"
        @confirm="confirmarExclusao" @cancel="aExcluir = null" />
</template>

<style scoped>
.wf-rotulo { @apply block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5; }
.wf-campo {
    @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-sunken border border-line rounded-lg
           placeholder:text-ink-subtle outline-none transition duration-120 ease-out-expo
           focus:border-accent focus:ring-2 focus:ring-accent/15;
}
/* Aviso de consequência: a configuração é válida, mas alguém vai sentir. */
.wf-aviso {
    @apply flex items-start gap-2 p-3 rounded-lg border text-xs
           bg-data-warn/10 border-data-warn/25 text-data-warn;
}
</style>
