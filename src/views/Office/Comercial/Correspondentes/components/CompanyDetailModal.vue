<script setup>
// Detalhe da empresa correspondente: dados, equipe e atalhos, no mesmo
// princípio do detalhe de Imobiliárias. Tudo que a tela sabe da empresa cabe
// aqui, para não obrigar ninguém a abrir o CV só para conferir um contato.

import { computed, ref, watch } from 'vue';
import { whatsappUrl, mailtoUrl } from '@/utils/contactLinks';
import { cvUsuariosUrl, cvEmpresasUrl } from '@/utils/cvLinks';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    empresa: { type: Object, default: null },
});
const emit = defineEmits(['close', 'cadastrar', 'registrar', 'vincular']);

const e = computed(() => props.empresa);

const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

const fmtCpf = (c) => {
    const d = String(c || '').replace(/\D/g, '');
    return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : (c || '-');
};
const fmtData = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : null);
const fmtDataHora = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');

const porNome = (a, b) => String(a.nome).localeCompare(String(b.nome));

// Quem tem login ativo é o que interessa no dia a dia. Inativo vai para o fim,
// recolhido, e só aparece quando existe.
const equipe = computed(() => (e.value?.usuarios || []).filter(u => u.ativo_login).sort(porNome));
const inativos = computed(() => (e.value?.usuarios || []).filter(u => !u.ativo_login).sort(porNome));

const verInativos = ref(false);
watch(() => e.value?.cv_idempresa, () => { verInativos.value = false; });

const dados = computed(() => {
    if (!e.value) return [];
    return [
        { rotulo: 'Região', valor: e.value.regiao, icone: 'fas fa-map' },
        { rotulo: 'Cidade', valor: e.value.cidade ? `${e.value.cidade}${e.value.estado ? `/${e.value.estado}` : ''}` : null, icone: 'fas fa-location-dot' },
        { rotulo: 'Endereço', valor: e.value.endereco, icone: 'fas fa-road' },
        { rotulo: 'Dias de agendamento', valor: e.value.dias_agendamento, icone: 'fas fa-calendar-day' },
    ].filter(d => d.valor);
});
</script>

<template>
    <Modal :open="!!empresa" size="xl" :title="empresa?.nome || ''" @close="emit('close')">
        <template v-if="e">
            <!-- Cabeçalho -->
            <div class="flex items-start gap-3 mb-4">
                <div class="h-12 w-12 shrink-0 rounded-xl bg-accent-soft text-accent flex items-center justify-center text-sm font-semibold">
                    {{ iniciais(e.nome) }}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5 mb-1">
                        <Badge v-if="e.cv_idempresa" variant="neutral" size="sm">CV #{{ e.cv_idempresa }}</Badge>
                        <Badge v-if="e.origem === 'office'" variant="accent" size="sm">Cadastrada aqui</Badge>
                        <Badge v-else-if="e.origem === 'pendente'" variant="warning" size="sm">Falta código do CV</Badge>
                        <Badge v-else variant="neutral" size="sm" outlined>Só no CV</Badge>
                    </div>
                    <p v-if="e.nome_inferido" class="text-xs text-ink-muted">
                        <i class="fas fa-wand-magic-sparkles mr-1"></i>
                        Nome deduzido dos pré-cadastros - o CV não permite ler o cadastro da empresa por integração.
                    </p>
                </div>
            </div>

            <!-- Números -->
            <div class="grid grid-cols-2 gap-2 mb-4">
                <div class="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 text-center">
                    <p class="text-lg font-semibold text-ink leading-none">{{ equipe.length }}</p>
                    <p class="text-[11px] text-ink-muted mt-1">com acesso ativo</p>
                </div>
                <div class="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 text-center">
                    <p class="text-lg font-semibold text-ink leading-none">{{ e.total_usuarios }}</p>
                    <p class="text-[11px] text-ink-muted mt-1">cadastradas no total</p>
                </div>
            </div>

            <!-- Contato da empresa -->
            <div v-if="e.email || e.telefone" class="flex flex-wrap gap-2 mb-4">
                <a v-if="e.email" :href="mailtoUrl(e.email)"
                    class="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:text-accent hover:border-accent/60">
                    <i class="fas fa-envelope"></i>{{ e.email }}
                </a>
                <a v-if="e.telefone" :href="whatsappUrl(e.telefone)" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:text-emerald-500 hover:border-emerald-500/60">
                    <i class="fab fa-whatsapp"></i>{{ e.telefone }}
                </a>
            </div>

            <!-- Dados cadastrais -->
            <div v-if="dados.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div v-for="d in dados" :key="d.rotulo"
                    class="rounded-lg border border-line-subtle bg-surface-raised px-3 py-2">
                    <p class="text-[11px] uppercase tracking-wide text-ink-subtle">{{ d.rotulo }}</p>
                    <p class="text-sm text-ink truncate"><i :class="d.icone" class="mr-1.5 text-ink-subtle"></i>{{ d.valor }}</p>
                </div>
            </div>

            <!-- Empresa só no CV: convite para adotar -->
            <div v-if="e.origem === 'cv'" class="rounded-lg border border-line bg-surface-sunken/50 p-3 mb-4 text-xs text-ink-muted">
                <p class="mb-2">
                    Esta empresa existe no CV mas não tem cadastro no Office, então não temos região, cidade nem endereço dela.
                    Registrar aqui libera esses dados e permite cadastrar pessoas por esta tela.
                </p>
                <Button variant="secondary" size="sm" icon="fas fa-plus" @click="emit('registrar', e)">Registrar aqui</Button>
            </div>

            <!-- Falta código -->
            <div v-else-if="e.origem === 'pendente'" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4 text-xs text-ink">
                <p class="mb-2">
                    <i class="fas fa-triangle-exclamation mr-1 text-amber-500"></i>
                    Falta informar o código desta empresa no CV. Sem ele não dá para cadastrar pessoas.
                </p>
                <Button variant="secondary" size="sm" icon="fas fa-link" @click="emit('vincular', e)">Informar código</Button>
            </div>

            <!-- Equipe -->
            <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-ink">Equipe</p>
                <Button v-if="e.cv_idempresa && e.origem !== 'cv'" variant="ghost" size="sm" icon="fas fa-user-plus"
                    @click="emit('cadastrar', e)">Cadastrar pessoas</Button>
            </div>

            <p v-if="!equipe.length && !inativos.length" class="text-sm text-ink-muted py-6 text-center">
                Nenhuma pessoa nesta empresa.
            </p>
            <p v-else-if="!equipe.length" class="text-sm text-ink-muted py-4 text-center">
                Ninguém com acesso ativo nesta empresa.
            </p>

            <div v-if="equipe.length" class="rounded-xl border border-line divide-y divide-line-subtle max-h-[42vh] overflow-y-auto">
                <div v-for="u in equipe" :key="u.idusuario" class="px-3 py-2.5 flex items-center gap-3">
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-ink truncate">{{ u.nome }}</p>
                        <p class="text-xs text-ink-muted truncate">
                            {{ fmtCpf(u.documento) }}
                            <template v-if="fmtData(u.data_nasc)"> · nasc. {{ fmtData(u.data_nasc) }}</template>
                            <template v-if="u.data_cad"> · desde {{ fmtDataHora(u.data_cad) }}</template>
                        </p>
                        <p v-if="u.email" class="text-xs text-ink-subtle truncate">{{ u.email }}</p>
                    </div>

                    <div class="shrink-0 flex items-center gap-1">
                        <a v-if="u.email" :href="mailtoUrl(u.email)" v-tippy="'Enviar e-mail'"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60">
                            <i class="fas fa-envelope text-xs"></i>
                        </a>
                        <a v-if="u.telefone || u.celular" :href="whatsappUrl(u.telefone || u.celular)" target="_blank" rel="noopener"
                            v-tippy="'Abrir no WhatsApp'"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-emerald-500 hover:border-emerald-500/60">
                            <i class="fab fa-whatsapp text-xs"></i>
                        </a>
                        <a :href="cvUsuariosUrl(u.nome)" target="_blank" rel="noopener" v-tippy="`Abrir no CV (#${u.idusuario})`"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60">
                            <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Inativos: no fim, recolhidos, e só quando existem -->
            <div v-if="inativos.length" class="mt-3">
                <button type="button" class="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
                    @click="verInativos = !verInativos">
                    <i class="fas text-[10px]" :class="verInativos ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                    {{ inativos.length }} sem acesso ativo
                </button>

                <div v-if="verInativos" class="mt-2 rounded-xl border border-line-subtle divide-y divide-line-subtle">
                    <div v-for="u in inativos" :key="u.idusuario" class="px-3 py-2 flex items-center gap-3">
                        <div class="min-w-0 flex-1">
                            <p class="text-sm text-ink-muted truncate">{{ u.nome }}</p>
                            <p class="text-xs text-ink-subtle truncate">{{ fmtCpf(u.documento) }}</p>
                        </div>
                        <a :href="cvUsuariosUrl(u.nome)" target="_blank" rel="noopener" v-tippy="`Abrir no CV (#${u.idusuario})`"
                            class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-accent hover:border-accent/60">
                            <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>

            <p class="text-[11px] text-ink-subtle mt-3">
                Para corrigir uma pessoa, edite ou exclua na tela do CV - a integração não tem edição.
            </p>
        </template>

        <template #footer>
            <a v-if="e" :href="cvEmpresasUrl(e.nome_inferido || e.origem !== 'cv' ? e.nome : '')" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink-muted hover:text-accent hover:border-accent/60">
                <i class="fas fa-arrow-up-right-from-square"></i> Abrir no CV
            </a>
            <Button variant="primary" @click="emit('close')">Fechar</Button>
        </template>
    </Modal>
</template>
