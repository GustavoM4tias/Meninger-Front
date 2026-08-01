<script setup>
// Empresas correspondentes com suas equipes. A lista vem do espelho local de
// usuários (o GET de usuários do CV funciona) cruzado com o cadastro local de
// empresas. O nome das empresas que nunca passaram pelo Office é deduzido dos
// pré-cadastros, já que o GET de empresas do CV está fora do ar.

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

const q = ref(props.initialQuery);
const papel = ref('');
const situacao = ref('');

const PAPEL_OPTIONS = [
    { value: '', label: 'Gerentes e demais' },
    { value: 'gerente', label: 'Só gerentes' },
    { value: 'comum', label: 'Só não gerentes' },
];
const SITUACAO_OPTIONS = [
    { value: '', label: 'Todas as situações' },
    { value: 'ativo', label: 'Login ativo' },
    { value: 'inativo', label: 'Login inativo' },
];

const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const chaveDe = (e) => `${e.id || 'x'}:${e.cv_idempresa || 0}`;

const linhas = computed(() => {
    const termo = norm(q.value);
    const digitos = soDigitos(q.value);

    return store.empresas
        .map((e) => {
            let usuarios = e.usuarios || [];
            if (papel.value) usuarios = usuarios.filter(u => (papel.value === 'gerente' ? u.gerente : !u.gerente));
            if (situacao.value) usuarios = usuarios.filter(u => (situacao.value === 'ativo' ? u.ativo_login : !u.ativo_login));
            if (termo && !norm(e.nome).includes(termo)) {
                usuarios = usuarios.filter(u =>
                    norm(u.nome).includes(termo)
                    || norm(u.email).includes(termo)
                    || (digitos.length >= 3 && soDigitos(u.documento).includes(digitos)));
            }
            return { ...e, usuarios, total_usuarios: usuarios.length, total_gerentes: usuarios.filter(u => u.gerente).length };
        })
        .filter((e) => {
            const semFiltro = !q.value && !papel.value && !situacao.value;
            if (semFiltro) return true;
            if (e.usuarios.length) return true;
            return !!termo && norm(e.nome).includes(termo);
        });
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
    codigoCv.value = '';
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

onMounted(() => { if (!store.empresas.length) store.fetchOverview(); });
</script>

<template>
    <div>
        <!-- Filtros -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input v-model="q" placeholder="Buscar pessoa, empresa, CPF ou e-mail..."
                icon-left="fas fa-magnifying-glass" class="col-span-2" />
            <Select v-model="papel" :options="PAPEL_OPTIONS" />
            <Select v-model="situacao" :options="SITUACAO_OPTIONS" />
        </div>

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
                            <i v-if="e.nome_inferido" class="fas fa-wand-magic-sparkles ml-1 text-[10px] text-ink-subtle"
                                v-tippy="'Nome deduzido dos pré-cadastros'"></i>
                        </p>
                        <p class="text-xs text-ink-muted truncate">
                            <template v-if="e.cidade">
                                <i class="fas fa-location-dot mr-1"></i>{{ e.cidade }}<template v-if="e.estado">/{{ e.estado }}</template>
                            </template>
                            <template v-else>{{ e.total_usuarios }} pessoa(s) · sem cadastro no Office</template>
                        </p>
                    </div>

                    <div class="shrink-0 flex items-center gap-1.5">
                        <Badge v-if="e.origem === 'pendente'" variant="warning" size="sm">Falta código</Badge>
                        <Badge v-if="e.total_usuarios" variant="neutral" size="sm">{{ e.total_usuarios }}</Badge>
                        <Badge v-if="e.total_gerentes" variant="accent" size="sm" v-tippy="`${e.total_gerentes} gerente(s)`">
                            <i class="fas fa-user-tie"></i>
                        </Badge>
                        <i class="fas fa-chevron-right text-ink-subtle text-xs ml-1"></i>
                    </div>
                </button>

                <div v-if="e.origem === 'pendente'" class="px-4 pb-3 -mt-1">
                    <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-ink">
                        <p class="mb-2">
                            <i class="fas fa-triangle-exclamation mr-1 text-amber-500"></i>
                            O CV não devolve o código da empresa no cadastro. Copie o código na listagem do CV e informe aqui
                            para liberar o cadastro de pessoas.
                        </p>
                        <div class="flex flex-wrap gap-2">
                            <a :href="cvEmpresasUrl(e.nome)" target="_blank" rel="noopener"
                                class="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:text-accent hover:border-accent/60">
                                <i class="fas fa-arrow-up-right-from-square"></i> Ver no CV
                            </a>
                            <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-2.5 py-1.5"
                                @click.stop="abrirVinculo(e)">
                                <i class="fas fa-link"></i> Informar código
                            </button>
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
                Abra a listagem de empresas no CV, localize <strong class="text-ink">{{ vinculando?.nome }}</strong>
                e copie o número da coluna de código.
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
