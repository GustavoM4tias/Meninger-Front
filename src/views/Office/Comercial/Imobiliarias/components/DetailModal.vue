<script setup>
// Detalhe de um cadastro/convite: dados preenchidos, empreendimentos,
// andamento das etapas no CV e ações (copiar link, reprocessar).

import { computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    registration: { type: Object, default: null },
    retrying: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'retry', 'copy']);

const r = computed(() => props.registration);

const STATUS = {
    invite: { label: 'Aguardando preenchimento', variant: 'info' },
    processing: { label: 'Processando', variant: 'warning' },
    completed: { label: 'Concluída', variant: 'success' },
    error: { label: 'Erro', variant: 'danger' },
    revoked: { label: 'Revogado', variant: 'neutral' },
};
const status = computed(() => STATUS[r.value?.status] || { label: r.value?.status, variant: 'neutral' });

const imob = computed(() => r.value?.form?.imobiliaria || null);
const ger = computed(() => r.value?.form?.gerente || null);
const steps = computed(() => r.value?.result?.steps || null);

const assocList = computed(() => {
    const assoc = steps.value?.associacoes || {};
    return (r.value?.enterprises || []).map(e => ({
        nome: e.nome,
        ok: assoc[e.id]?.ok === true,
        tried: e.id in assoc,
    }));
});

const stepIcon = (ok, tried = true) => !tried ? 'fas fa-minus text-ink-subtle'
    : ok ? 'fas fa-circle-check text-emerald-500'
        : 'fas fa-circle-xmark text-red-500';

// Link direto para a ficha da imobiliária no painel gestor do CV.
const cvUrl = computed(() => r.value?.result?.idimobiliaria_cv
    ? `https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias/${r.value.result.idimobiliaria_cv}/editar`
    : null);

const fmt = (v) => v || '-';

const fmtDay = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';

const WINDOW = {
    not_started: { label: 'Agendado', variant: 'info' },
    open:        { label: 'Ativo',     variant: 'success' },
    expired:     { label: 'Encerrado', variant: 'neutral' },
};
const windowBadge = computed(() => WINDOW[r.value?.window_state] || WINDOW.open);
const SUB_STATUS = { completed: 'Concluída', error: 'Pendente' };
</script>

<template>
    <Modal :open="!!r" :title="imob?.nome || r?.label || `Cadastro #${r?.id}`" size="md" position="right" scrollable
        @close="emit('close')">
        <div v-if="r" class="space-y-6">
            <div class="flex flex-wrap items-center gap-2">
                <Badge v-if="r.multi_use && r.status !== 'revoked'" :variant="windowBadge.variant">{{ windowBadge.label }}</Badge>
                <Badge v-else :variant="status.variant">{{ status.label }}</Badge>
                <Badge variant="neutral" outlined>
                    <i :class="r.multi_use ? 'fas fa-link' : (r.source === 'public' ? 'fas fa-link' : 'fas fa-desktop')" class="mr-1"></i>
                    {{ r.multi_use ? 'Link múltiplo' : (r.source === 'public' ? 'Via link' : 'Interno') }}
                </Badge>
                <a v-if="cvUrl" :href="cvUrl" target="_blank" rel="noopener"
                    v-tippy="`CV #${r.result.idimobiliaria_cv}`">
                    <Button class="text-xs py-[3px] px-[8px]" variant="outline"
                        icon="fas fa-arrow-up-right-from-square">Abrir no CV</Button>
                </a>
            </div>

            <p v-if="r.error"
                class="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
                {{ r.error }}
            </p>

            <!-- Convite com link ativo (uso único aguardando OU multi-uso não revogado) -->
            <div v-if="r.token && (r.status === 'invite' || (r.multi_use && r.status !== 'revoked'))" class="space-y-2">
                <div class="flex items-center justify-between">
                    <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Link público</h4>
                    <span v-if="r.multi_use && r.ends_at" class="text-xs text-ink-subtle">
                        <i class="fas fa-clock mr-1"></i>{{ fmtDay(r.starts_at) }} até {{ fmtDay(r.ends_at) }}
                    </span>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-line bg-surface-sunken p-2">
                    <code
                        class="flex-1 text-xs text-ink-muted break-all">https://lp.menin.com.br/imobiliaria/{{ r.token }}</code>
                    <Button variant="outline" size="sm" icon="fas fa-copy" @click="emit('copy', r)">Copiar</Button>
                </div>
            </div>

            <!-- Link múltiplo: quem já cadastrou por este link -->
            <div v-if="r.multi_use">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                    Cadastros por este link
                    <span class="text-ink-subtle font-normal normal-case">({{ (r.submissions || []).length }})</span>
                </h4>
                <ul v-if="(r.submissions || []).length" class="space-y-1.5">
                    <li v-for="(s, idx) in r.submissions" :key="idx"
                        class="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                        <i :class="s.status === 'error' ? 'fas fa-clock text-amber-500' : 'fas fa-circle-check text-emerald-500'"></i>
                        <div class="min-w-0 flex-1">
                            <p class="text-ink truncate">{{ s.nome || 'Imobiliária' }}</p>
                            <p class="text-xs text-ink-muted">{{ s.gerente || '-' }} · {{ fmtDateTime(s.at) }}</p>
                        </div>
                        <span class="text-xs text-ink-subtle">{{ SUB_STATUS[s.status] || s.status }}</span>
                    </li>
                </ul>
                <p v-else class="text-sm text-ink-subtle">Nenhum cadastro ainda por este link.</p>
            </div>

            <!-- Empreendimentos -->
            <div>
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Empreendimentos</h4>
                <ul class="space-y-1">
                    <li v-for="e in (r.enterprises || [])" :key="e.id" class="text-sm text-ink flex items-center gap-2">
                        <i class="fas fa-building text-ink-subtle"></i>{{ e.nome }}
                    </li>
                </ul>
            </div>

            <!-- Etapas no CV -->
            <div v-if="steps">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Integração com o CV</h4>
                <ul class="space-y-1.5 text-sm text-ink">
                    <li class="flex items-center gap-2">
                        <i :class="stepIcon(steps.imobiliaria?.ok, !!steps.imobiliaria)"></i>Cadastro da imobiliária
                    </li>
                    <li class="flex items-center gap-2">
                        <i :class="stepIcon(steps.usuario?.ok, !!steps.usuario)"></i>Cadastro do gerente
                    </li>
                    <li v-for="a in assocList" :key="a.nome" class="flex items-center gap-2">
                        <i :class="stepIcon(a.ok, a.tried)"></i>Associação: {{ a.nome }}
                    </li>
                </ul>
            </div>

            <!-- Dados preenchidos -->
            <div v-if="imob">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Imobiliária</h4>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div>
                        <dt class="text-ink-muted text-xs">Nome</dt>
                        <dd class="text-ink">{{ fmt(imob.nome) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Sigla</dt>
                        <dd class="text-ink">{{ fmt(imob.sigla) }}</dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-ink-muted text-xs">Razão social</dt>
                        <dd class="text-ink">{{ fmt(imob.razao_social) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">CNPJ</dt>
                        <dd class="text-ink">{{ fmt(imob.cnpj) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">CRECI</dt>
                        <dd class="text-ink">{{ fmt(imob.creci) }} <span v-if="imob.validade_creci"
                                class="text-ink-muted">(val. {{ imob.validade_creci }})</span></dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">E-mail</dt>
                        <dd class="text-ink break-all">{{ fmt(imob.email) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Telefone</dt>
                        <dd class="text-ink">{{ fmt(imob.telefone) }}</dd>
                    </div>
                    <div class="sm:col-span-2">
                        <dt class="text-ink-muted text-xs">Endereço</dt>
                        <dd class="text-ink">{{ [imob.logradouro, imob.numero, imob.complemento, imob.bairro,
                        imob.cidade, imob.estado].filter(Boolean).join(', ') || '-' }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Microempresa</dt>
                        <dd class="text-ink">{{ imob.micro_empresa === 'S' ? 'Sim' : 'Não' }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Escala de plantão</dt>
                        <dd class="text-ink">{{ imob.escala_plantao === 'N' ? 'Não' : 'Sim' }}</dd>
                    </div>
                </dl>
            </div>

            <div v-if="ger">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Gerente</h4>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div class="sm:col-span-2">
                        <dt class="text-ink-muted text-xs">Nome</dt>
                        <dd class="text-ink">{{ fmt(ger.nome) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">CPF</dt>
                        <dd class="text-ink">{{ fmt(ger.documento) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Nascimento</dt>
                        <dd class="text-ink">{{ fmt(ger.data_nasc) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">E-mail</dt>
                        <dd class="text-ink break-all">{{ fmt(ger.email) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">Celular</dt>
                        <dd class="text-ink">{{ fmt(ger.celular) }}</dd>
                    </div>
                    <div>
                        <dt class="text-ink-muted text-xs">CRECI</dt>
                        <dd class="text-ink">{{ fmt(ger.creci) }}</dd>
                    </div>
                </dl>
            </div>

            <p class="text-xs text-ink-subtle">
                Criado por {{ r.creator_name || '-' }}
                <template v-if="r.submitted_at"> · preenchido em {{ new Date(r.submitted_at).toLocaleString('pt-BR')
                    }}</template>
            </p>
        </div>

        <template #footer>
            <div class="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" @click="emit('close')">Fechar</Button>
                <Button v-if="r?.status === 'error'" variant="primary" icon="fas fa-rotate-right" :loading="retrying"
                    @click="emit('retry', r)">
                    Reprocessar
                </Button>
            </div>
        </template>
    </Modal>
</template>
