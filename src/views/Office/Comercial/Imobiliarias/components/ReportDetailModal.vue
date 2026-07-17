<script setup>
// Detalhe de uma imobiliária do relatório (backup do CV): identificação,
// contato com atalhos (WhatsApp/e-mail), gerente (abre o cartão da pessoa),
// e empreendimentos vinculados como cards com foto que levam à tela de
// Empreendimentos do Office (?open=<id>).

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import { whatsappUrl, mailtoUrl } from '@/utils/contactLinks';

const props = defineProps({
    imobiliaria: { type: Object, default: null },
});
const emit = defineEmits(['close', 'gerente']);

const router = useRouter();
const i = computed(() => props.imobiliaria);

const cvUrl = computed(() => i.value
    ? `https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias/${i.value.idimobiliaria}/editar`
    : null);

const ORIGEM = {
    link:   { label: 'Cadastrada via link', variant: 'info',    icon: 'fas fa-link' },
    office: { label: 'Cadastrada no Office', variant: 'accent', icon: 'fas fa-desktop' },
    cv:     { label: 'Cadastro CV',          variant: 'neutral', icon: 'fas fa-database' },
};
const origem = computed(() => ORIGEM[i.value?.origem] || ORIGEM.cv);

const initials = computed(() => {
    const sigla = String(i.value?.sigla || '').trim();
    if (sigla) return sigla.slice(0, 2).toUpperCase();
    const words = String(i.value?.nome || '').trim().split(/\s+/);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
});

const telefone = computed(() => i.value?.telefone || i.value?.celular || null);

const fmtCnpj = (c) => {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length !== 14) return c || '-';
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const fmtDate = (d) => {
    if (!d) return '-';
    const parsed = new Date(String(d).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('pt-BR');
};

const fmt = (v) => v || '-';

function goToBuilding(e) {
    if (!e?.id) return;
    // Nova guia: o usuário continua no relatório com o modal aberto.
    const { href } = router.resolve({ path: '/comercial/buildings', query: { open: e.id } });
    window.open(href, '_blank', 'noopener');
}
</script>

<template>
    <Modal :open="!!i" size="md" position="right" scrollable @close="emit('close')">
        <template #header>
            <div class="flex items-center gap-3 min-w-0">
                <div class="h-11 w-11 shrink-0 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-semibold">
                    {{ initials }}
                </div>
                <div class="min-w-0">
                    <p class="font-semibold text-ink truncate">{{ i?.nome }}</p>
                    <p class="text-xs text-ink-muted truncate">{{ i?.razao_social || '-' }}</p>
                </div>
            </div>
        </template>

        <div v-if="i" class="space-y-6">
            <div class="flex flex-wrap items-center gap-2">
                <Badge :variant="i.ativo === 'S' ? 'success' : 'neutral'">{{ i.ativo === 'S' ? 'Ativa' : 'Inativa' }}</Badge>
                <Badge :variant="origem.variant" outlined><i :class="origem.icon" class="mr-1"></i>{{ origem.label }}</Badge>
                <Badge v-if="i.micro_empresa === 'S'" variant="info" outlined>Microempresa</Badge>
                <a v-if="cvUrl" :href="cvUrl" target="_blank" rel="noopener" v-tippy="`CV #${i.idimobiliaria}`">
                    <Button class="text-xs py-[4px] px-[8px]" variant="outline" icon="fas fa-arrow-up-right-from-square">Abrir no CV</Button>
                </a>
            </div>

            <!-- Identificação -->
            <div class="rounded-xl border border-line bg-surface-sunken/50 p-4">
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <dt class="text-xs text-ink-muted"><i class="fas fa-id-card mr-1"></i>CNPJ</dt>
                        <dd class="text-ink font-medium">{{ fmtCnpj(i.cnpj) }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-ink-muted"><i class="fas fa-certificate mr-1"></i>CRECI</dt>
                        <dd class="text-ink font-medium">
                            {{ fmt(i.creci) }}
                            <span v-if="i.validade_creci" class="text-ink-muted font-normal">(val. {{ fmtDate(i.validade_creci) }})</span>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-xs text-ink-muted"><i class="fas fa-tag mr-1"></i>Sigla</dt>
                        <dd class="text-ink font-medium">{{ fmt(i.sigla) }}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-ink-muted"><i class="fas fa-calendar mr-1"></i>Cadastro no CV</dt>
                        <dd class="text-ink font-medium">{{ fmtDate(i.data_cad) }}</dd>
                    </div>
                </dl>
            </div>

            <!-- Contato (atalhos) -->
            <div>
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Contato</h4>
                <div class="space-y-2">
                    <a v-if="i.email" :href="mailtoUrl(i.email)"
                        class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm hover:border-accent/60 hover:bg-accent-soft/40 transition-colors group">
                        <i class="fas fa-envelope text-ink-subtle w-4 text-center group-hover:text-accent"></i>
                        <span class="text-ink truncate flex-1">{{ i.email }}</span>
                        <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
                    </a>
                    <a v-if="telefone" :href="whatsappUrl(telefone)" target="_blank" rel="noopener"
                        class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group">
                        <i class="fab fa-whatsapp text-ink-subtle w-4 text-center text-base group-hover:text-emerald-500"></i>
                        <span class="text-ink flex-1">{{ telefone }}</span>
                        <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
                    </a>
                    <div class="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
                        <i class="fas fa-location-dot text-ink-subtle w-4 text-center"></i>
                        <span class="text-ink truncate flex-1">
                            {{ (i.cidades || []).join(', ') || '-' }}<template v-if="i.estado"> - {{ i.estado }}</template>
                        </span>
                        <Badge v-if="i.cidade_origem === 'empreendimentos'" variant="info" size="sm" outlined>via empreendimentos</Badge>
                    </div>
                    <p v-if="!i.email && !telefone" class="text-sm text-ink-subtle">Sem contato cadastrado no CV.</p>
                </div>
            </div>

            <!-- Gerente (abre o cartão da pessoa) -->
            <div v-if="i.gerente_nome || i.gerente_email || i.gerente_celular">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Gerente</h4>
                <button type="button"
                    class="w-full flex items-center gap-3 rounded-xl border border-line px-3 py-3 text-left hover:border-accent/60 hover:bg-accent-soft/40 transition-colors"
                    @click="emit('gerente', i)">
                    <div class="h-9 w-9 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-semibold">
                        {{ (i.gerente_nome || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink truncate">{{ i.gerente_nome || 'Gerente' }}</p>
                        <p class="text-xs text-ink-muted truncate">{{ i.gerente_email || i.gerente_celular || 'ver dados' }}</p>
                    </div>
                    <i class="fas fa-chevron-right text-ink-subtle text-xs"></i>
                </button>
            </div>

            <!-- Empreendimentos: cards com foto → tela de Empreendimentos -->
            <div>
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                    Empreendimentos vinculados
                    <span class="text-ink-subtle font-normal normal-case">({{ (i.empreendimentos || []).length }})</span>
                </h4>
                <div v-if="(i.empreendimentos || []).length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <component
                        v-for="e in i.empreendimentos" :key="e.nome"
                        :is="e.id ? 'button' : 'div'"
                        type="button"
                        class="rounded-xl border border-line overflow-hidden text-left bg-surface-raised transition-all"
                        :class="e.id ? 'hover:border-accent/60 hover:shadow-soft cursor-pointer' : 'opacity-80'"
                        @click="goToBuilding(e)"
                    >
                        <div class="h-20 w-full bg-surface-sunken">
                            <img v-if="e.foto" :src="e.foto" :alt="e.nome" class="h-full w-full object-cover" loading="lazy" />
                            <div v-else class="h-full w-full flex items-center justify-center">
                                <i class="fas fa-building text-ink-subtle text-xl"></i>
                            </div>
                        </div>
                        <div class="p-2.5">
                            <p class="text-sm font-medium text-ink truncate">{{ e.nome }}</p>
                            <p class="text-xs text-ink-muted truncate">
                                <template v-if="e.cidade"><i class="fas fa-location-dot mr-1"></i>{{ e.cidade }}</template>
                                <template v-if="e.situacao"> · {{ e.situacao }}</template>
                                <template v-if="!e.cidade && !e.situacao">-</template>
                            </p>
                        </div>
                    </component>
                </div>
                <p v-else class="text-sm text-ink-subtle">Nenhum vínculo encontrado (cadastros do Office e reservas).</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <Button variant="ghost" @click="emit('close')">Fechar</Button>
            </div>
        </template>
    </Modal>
</template>
