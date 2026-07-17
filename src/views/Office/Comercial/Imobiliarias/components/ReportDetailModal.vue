<script setup>
// Detalhe de uma imobiliária do relatório (backup do CV): identificação,
// contato, gerente, cidades e empreendimentos vinculados, com link direto
// para a ficha no painel gestor do CV.

import { computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    imobiliaria: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const i = computed(() => props.imobiliaria);

const cvUrl = computed(() => i.value
    ? `https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias/${i.value.idimobiliaria}/editar`
    : null);

const initials = computed(() => {
    const sigla = String(i.value?.sigla || '').trim();
    if (sigla) return sigla.slice(0, 2).toUpperCase();
    const words = String(i.value?.nome || '').trim().split(/\s+/);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
});

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
                <Badge v-if="i.ativo_painel === 'S'" variant="accent" outlined>Painel ativo</Badge>
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

            <!-- Contato -->
            <div>
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Contato</h4>
                <ul class="space-y-1.5 text-sm text-ink">
                    <li class="flex items-center gap-2 min-w-0">
                        <i class="fas fa-envelope text-ink-subtle w-4 text-center"></i>
                        <span class="truncate">{{ fmt(i.email) }}</span>
                    </li>
                    <li class="flex items-center gap-2">
                        <i class="fas fa-phone text-ink-subtle w-4 text-center"></i>
                        <span>{{ i.telefone || i.celular || '-' }}</span>
                        <span v-if="i.telefone && i.celular && i.telefone !== i.celular" class="text-ink-muted">· {{ i.celular }}</span>
                    </li>
                    <li class="flex items-center gap-2 min-w-0">
                        <i class="fas fa-location-dot text-ink-subtle w-4 text-center"></i>
                        <span class="truncate">{{ (i.cidades || []).join(', ') || '-' }}<template v-if="i.estado"> - {{ i.estado }}</template></span>
                        <Badge v-if="i.cidade_origem === 'empreendimentos'" variant="info" size="sm" outlined>via empreendimentos</Badge>
                    </li>
                </ul>
            </div>

            <!-- Gerente -->
            <div v-if="i.gerente_nome || i.gerente_email || i.gerente_celular">
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Gerente</h4>
                <ul class="space-y-1.5 text-sm text-ink">
                    <li v-if="i.gerente_nome" class="flex items-center gap-2 min-w-0">
                        <i class="fas fa-user-tie text-ink-subtle w-4 text-center"></i>
                        <span class="truncate">{{ i.gerente_nome }}</span>
                    </li>
                    <li v-if="i.gerente_email" class="flex items-center gap-2 min-w-0">
                        <i class="fas fa-envelope text-ink-subtle w-4 text-center"></i>
                        <span class="truncate">{{ i.gerente_email }}</span>
                    </li>
                    <li v-if="i.gerente_celular" class="flex items-center gap-2">
                        <i class="fas fa-mobile-screen text-ink-subtle w-4 text-center"></i>
                        <span>{{ i.gerente_celular }}</span>
                    </li>
                </ul>
            </div>

            <!-- Empreendimentos -->
            <div>
                <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                    Empreendimentos vinculados
                    <span class="text-ink-subtle font-normal normal-case">({{ (i.empreendimentos || []).length }})</span>
                </h4>
                <div v-if="(i.empreendimentos || []).length" class="flex flex-wrap gap-1.5">
                    <span v-for="e in i.empreendimentos" :key="e.nome"
                        class="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken border border-line-subtle px-2.5 py-1 text-xs text-ink">
                        <i class="fas fa-building text-ink-subtle"></i>{{ e.nome }}
                        <span v-if="e.cidade" class="text-ink-subtle">· {{ e.cidade }}</span>
                    </span>
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
