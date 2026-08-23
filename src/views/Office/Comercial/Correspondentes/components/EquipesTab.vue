<script setup>
// Empresas correspondentes com suas equipes. A lista vem do espelho local de
// usuários (o GET de usuários do CV funciona) cruzado com o cadastro local de
// empresas, cujo nome é resolvido pelos pré-cadastros - o GET de empresas do
// CV está fora do ar.
//
// Ordem padrão: quem tem mais gente primeiro. É o que responde "quais
// correspondentes realmente operam com a gente".

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';
import { cvEmpresasUrl } from '@/utils/cvLinks';

import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import CompanyDetailModal from './CompanyDetailModal.vue';

const props = defineProps({
    initialQuery: { type: String, default: '' },
});
const emit = defineEmits(['cadastrar', 'registrar']);

const store = useCorrespondentStore();
const toast = useToast();

// ── Filtros ─────────────────────────────────────────────────────────────────
const q = ref(props.initialQuery);
const ordem = ref('pessoas');
const minPessoas = ref('');

const ORDEM_OPTIONS = [
    { value: 'pessoas', label: 'Mais pessoas primeiro' },
    { value: 'pessoas_asc', label: 'Menos pessoas primeiro' },
    { value: 'nome', label: 'Nome (A-Z)' },
];
const MIN_OPTIONS = [
    { value: '', label: 'Qualquer quantidade' },
    { value: '1', label: 'Com pelo menos 1 pessoa' },
    { value: '3', label: 'Com 3 ou mais' },
    { value: '10', label: 'Com 10 ou mais' },
];

// Fechado por padrão em qualquer tela: a lista é o que interessa ao abrir, e
// o badge de filtros ativos já avisa quando algo está restringindo o resultado.
const isExpanded = ref(false);
const activeFiltersCount = computed(() => {
    let n = 0;
    if (q.value.trim()) n++;
    if (minPessoas.value) n++;
    if (ordem.value !== 'pessoas') n++;
    return n;
});
function limpar() {
    q.value = '';
    ordem.value = 'pessoas';
    minPessoas.value = '';
}

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const chaveDe = (e) => `${e.id || 'x'}:${e.cv_idempresa || 0}`;

const linhas = computed(() => {
    const termo = norm(q.value);
    const digitos = soDigitos(q.value);
    const minimo = Number(minPessoas.value) || 0;

    const lista = store.empresas
        .map((e) => {
            let usuarios = e.usuarios || [];
            if (termo && !norm(e.nome).includes(termo)) {
                usuarios = usuarios.filter(u =>
                    norm(u.nome).includes(termo)
                    || norm(u.email).includes(termo)
                    || (digitos.length >= 3 && soDigitos(u.documento).includes(digitos)));
            }
            const ativos = usuarios.filter(u => u.ativo_login).length;
            return { ...e, usuarios, total_usuarios: usuarios.length, total_ativos: ativos };
        })
        .filter((e) => {
            if (e.total_usuarios < minimo) return false;
            if (!termo) return true;
            return e.usuarios.length > 0 || norm(e.nome).includes(termo);
        });

    if (ordem.value === 'nome') return lista.sort((a, b) => a.nome.localeCompare(b.nome));
    const dir = ordem.value === 'pessoas_asc' ? 1 : -1;
    return lista.sort((a, b) => (a.total_usuarios - b.total_usuarios) * dir || a.nome.localeCompare(b.nome));
});

const totais = computed(() => ({
    empresas: linhas.value.length,
    pessoas: linhas.value.reduce((s, e) => s + e.usuarios.length, 0),
}));

// Anti-stale: o modal resolve a empresa pela chave contra a lista viva, para
// não continuar exibindo dados velhos depois de um sync.
const selecionadaChave = ref(null);
const selecionada = computed(() =>
    selecionadaChave.value ? linhas.value.find(e => chaveDe(e) === selecionadaChave.value) || null : null);

// ── Vincular código do CV ───────────────────────────────────────────────────
const vinculando = ref(null);
const codigoCv = ref('');
const salvandoVinculo = ref(false);

function abrirVinculo(empresa) {
    vinculando.value = empresa;
    codigoCv.value = store.codigoSugerido ? String(store.codigoSugerido) : '';
}

/**
 * Vincula direto o código provável, sem abrir o modal.
 * O servidor recusa se o número já for de outra empresa (ele confere o espelho
 * de usuários), então o caminho rápido não vira cadastro no lugar errado.
 */
async function vincularSugerido(empresa) {
    // Guardado antes: o vínculo recarrega o panorama e a sugestão anda para o
    // próximo número.
    const codigo = store.codigoSugerido;
    salvandoVinculo.value = true;
    try {
        await store.linkCompany(empresa.id, codigo);
        toast.success(`Empresa vinculada ao código ${codigo}.`);
    } catch (err) {
        toast.error(err?.message || 'Não foi possível vincular.');
    } finally {
        salvandoVinculo.value = false;
    }
}

async function salvarVinculo() {
    if (!codigoCv.value) return toast.error('Informe o código da empresa no CV.');
    salvandoVinculo.value = true;
    try {
        await store.linkCompany(vinculando.value.id, codigoCv.value);
        toast.success('Empresa vinculada! Agora dá para cadastrar pessoas nela.');
        vinculando.value = null;
    } catch (err) {
        toast.error(err?.message || 'Não foi possível vincular.');
    } finally {
        salvandoVinculo.value = false;
    }
}

/**
 * Manda de novo ao CV uma empresa que ficou pendente. Serve para o caso em que
 * o cadastro foi recusado em silêncio (o CV responde igual gravando ou não) -
 * quem já tem código não chega aqui, o servidor recusa para não duplicar.
 */
async function reenviar(empresa) {
    try {
        await store.resendCompany(empresa.id);
        toast.success('Empresa reenviada ao CV. Confirme o código para liberar as pessoas.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível reenviar.');
    }
}

onMounted(() => { if (!store.empresas.length) store.fetchOverview(); });
</script>

<template>
    <div>
        <!-- Filtros (padrão do sistema: seção recolhível + toolbar) -->
        <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4">
            <div class="filters-toolbar">
                <button class="filters-toolbar-trigger" @click="isExpanded = !isExpanded">
                    <i class="fas fa-filter text-xs text-ink-muted"></i>
                    <span>Filtros</span>
                    <Badge v-if="activeFiltersCount" variant="accent" size="sm">
                        {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
                    </Badge>
                    <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
                        :class="{ 'rotate-180': isExpanded }"></i>
                </button>

                <div class="ml-auto flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="limpar">
                        <span class="hidden sm:inline">Limpar</span>
                    </Button>
                </div>
            </div>

            <div v-show="isExpanded" class="p-3 sm:p-4 animate-fade-in">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input v-model="q" label="Buscar" placeholder="Empresa, pessoa, CPF ou e-mail"
                        icon-left="fas fa-magnifying-glass" />
                    <Select v-model="ordem" :options="ORDEM_OPTIONS" label="Ordenar por" />
                    <Select v-model="minPessoas" :options="MIN_OPTIONS" label="Tamanho da equipe" />
                </div>
            </div>
        </section>

        <div class="flex flex-wrap items-center gap-2 mb-4 text-xs text-ink-muted">
            <Badge variant="accent" outlined>{{ totais.empresas }} empresas</Badge>
            <Badge variant="neutral" outlined>{{ totais.pessoas }} pessoas</Badge>
            <a :href="cvEmpresasUrl()" target="_blank" rel="noopener" class="hover:text-accent">
                <i class="fas fa-arrow-up-right-from-square mr-1"></i>Abrir empresas no CV
            </a>
        </div>

        <div v-if="store.loading && !store.empresas.length" class="flex justify-center py-16">
            <Spinner />
        </div>

        <EmptyState
            v-else-if="!linhas.length"
            icon="fas fa-people-group"
            title="Nenhum correspondente encontrado"
            description="Ajuste a busca ou sincronize com o CV."
        />

        <div v-else class="space-y-2.5">
            <div v-for="e in linhas" :key="chaveDe(e)" class="rounded-xl border border-line bg-surface-raised overflow-hidden">
                <button type="button"
                    class="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-surface-sunken/60 hover:bg-surface-sunken/40 transition-colors"
                    @click="selecionadaChave = chaveDe(e)">
                    <div class="h-10 w-10 shrink-0 rounded-xl bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold">
                        {{ iniciais(e.nome) }}
                    </div>

                    <div class="min-w-0 flex-1">
                        <p class="font-medium text-ink truncate leading-tight">
                            {{ e.nome }}
                            <span v-if="e.cv_idempresa" class="text-ink-subtle font-normal text-xs">#{{ e.cv_idempresa }}</span>
                        </p>
                        <p class="text-xs text-ink-muted truncate">
                            <template v-if="e.cidade">
                                <i class="fas fa-location-dot mr-1"></i>{{ e.cidade }}<template v-if="e.estado">/{{ e.estado }}</template>
                            </template>
                            <template v-else-if="e.nome_inferido">Cadastro não completado no Office</template>
                            <template v-else>Sem cidade informada</template>
                        </p>
                    </div>

                    <div class="shrink-0 flex items-center gap-1.5">
                        <Badge v-if="e.origem === 'pendente'" variant="warning" size="sm">Falta código</Badge>
                        <Badge variant="neutral" size="sm" v-tippy="`${e.total_ativos} ativo(s) de ${e.total_usuarios}`">
                            {{ e.total_ativos }}<span class="text-ink-subtle">/{{ e.total_usuarios }}</span>
                        </Badge>
                        <i class="fas fa-chevron-right text-ink-subtle text-xs ml-1"></i>
                    </div>
                </button>

                <div v-if="e.origem === 'pendente'" class="px-4 pb-3 -mt-1">
                    <div class="rounded-lg border border-data-warn/30 bg-data-warn/10 p-3 text-xs text-ink">
                        <p class="mb-2">
                            <i class="fas fa-triangle-exclamation mr-1 text-data-warn"></i>
                            O CV não devolve o código no cadastro.
                            <template v-if="store.codigoSugerido">
                                Como ele numera em sequência, o próximo é o
                                <strong>{{ store.codigoSugerido }}</strong> - confirme para liberar o cadastro de pessoas.
                            </template>
                            <template v-else>
                                Informe o código para liberar o cadastro de pessoas.
                            </template>
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <button v-if="store.codigoSugerido" type="button"
                                class="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-2.5 py-1.5 min-h-[40px]"
                                :disabled="salvandoVinculo" @click.stop="vincularSugerido(e)">
                                <i class="fas fa-check"></i> Vincular #{{ store.codigoSugerido }}
                            </button>
                            <button type="button"
                                class="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 min-h-[40px] hover:text-accent hover:border-accent/60"
                                @click.stop="abrirVinculo(e)">
                                <i class="fas fa-link"></i> Informar outro
                            </button>
                            <button type="button"
                                class="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 min-h-[40px] hover:text-accent hover:border-accent/60"
                                :disabled="store.saving" @click.stop="reenviar(e)">
                                <i class="fas fa-rotate-right"></i> Reenviar ao CV
                            </button>
                            <a :href="cvEmpresasUrl(e.nome)" target="_blank" rel="noopener"
                                class="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 min-h-[40px] hover:text-accent hover:border-accent/60">
                                <i class="fas fa-arrow-up-right-from-square"></i> Conferir no CV
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <CompanyDetailModal
            :empresa="selecionada"
            @close="selecionadaChave = null"
            @cadastrar="() => { selecionadaChave = null; emit('cadastrar'); }"
            @registrar="(emp) => { selecionadaChave = null; emit('registrar', emp); }"
            @vincular="(emp) => { selecionadaChave = null; abrirVinculo(emp); }"
        />

        <!-- Vincular código do CV -->
        <Modal :open="!!vinculando" size="sm" title="Código da empresa no CV"
            :subtitle="vinculando?.nome" @close="vinculando = null">
            <p class="text-sm text-ink-muted mb-3">
                <template v-if="store.codigoSugerido">
                    O CV numera as empresas em sequência, então <strong class="text-ink">{{ store.codigoSugerido }}</strong>
                    é o código provável de <strong class="text-ink">{{ vinculando?.nome }}</strong>. Troque só se souber outro.
                </template>
                <template v-else>
                    Abra a listagem de empresas no CV, localize <strong class="text-ink">{{ vinculando?.nome }}</strong>
                    e copie o número da coluna de código.
                </template>
            </p>
            <a v-if="vinculando" :href="cvEmpresasUrl(vinculando.nome)" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mb-4">
                <i class="fas fa-arrow-up-right-from-square"></i> Abrir listagem filtrada no CV
            </a>
            <Input v-model="codigoCv" type="number" label="Código no CV" placeholder="Ex.: 36" required />
            <template #footer>
                <Button variant="ghost" @click="vinculando = null">Cancelar</Button>
                <Button variant="primary" :loading="salvandoVinculo" @click="salvarVinculo">Vincular</Button>
            </template>
        </Modal>
    </div>
</template>
