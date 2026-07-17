<script setup>
// Aba "Cadastros e convites" da tela unificada: acompanhamento dos cadastros
// feitos pelo Office (internos e via link público), com cópia de link,
// revogação, detalhe por etapa e reprocessamento.

import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import DetailModal from './DetailModal.vue';

const LP_HOST = 'https://lp.menin.com.br';

const store = useRealEstateStore();
const toast = useToast();

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

const rows = computed(() => store.registrations);

// Detalhe por ID contra a store: reprocessar/revogar atualizam o modal aberto.
const detailId = ref(null);
const detail = computed(() => rows.value.find(x => x.id === detailId.value) || null);

const publicUrl = (r) => `${LP_HOST}/imobiliaria/${r.token}`;

async function copyLink(r) {
    try {
        await navigator.clipboard.writeText(publicUrl(r));
        toast.success('Link copiado!');
    } catch {
        toast.error('Não foi possível copiar. Copie manualmente na tela de detalhes.');
    }
}

async function revoke(r) {
    if (!confirm('Revogar este link? Quem o recebeu não conseguirá mais preencher.')) return;
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

const displayName = (r) => r.form?.imobiliaria?.nome || r.label || `Cadastro #${r.id}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const originIcon = (r) => r.multi_use ? 'fas fa-link' : (r.source === 'public' ? 'fas fa-link' : 'fas fa-desktop');
const originLabel = (r) => r.multi_use ? 'Link múltiplo' : (r.source === 'public' ? 'Via link' : 'Interno');
// Resumo dos empreendimentos, ou contagem de cadastros num link múltiplo.
const summaryText = (r) => r.multi_use
    ? `${r.submissions_count || 0} cadastro(s) · ${(r.enterprises || []).length} empreend.`
    : ((r.enterprises || []).map(e => e.nome).join(', ') || '-');
</script>

<template>
    <div>
        <div v-if="store.loading && !rows.length" class="flex justify-center py-16">
            <Spinner />
        </div>

        <EmptyState
            v-else-if="!rows.length"
            icon="fas fa-file-signature"
            title="Nenhum cadastro ainda"
            description="Cadastre uma imobiliária ou gere um link para o responsável preencher."
        />

        <template v-else>
            <!-- Mobile: cards -->
            <div class="md:hidden space-y-2.5">
                <div
                    v-for="r in rows" :key="r.id"
                    class="rounded-xl border border-line bg-surface-raised p-4 space-y-2"
                    @click="detailId = r.id"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-medium text-ink truncate">{{ displayName(r) }}</p>
                            <p class="text-xs text-ink-muted">
                                <i :class="originIcon(r)" class="mr-1"></i>
                                {{ originLabel(r) }} · {{ fmtDate(r.createdAt) }}
                            </p>
                        </div>
                        <Badge :variant="statusOf(r).variant" size="sm">{{ statusOf(r).label }}</Badge>
                    </div>
                    <p class="text-xs text-ink-muted truncate">
                        <i class="fas fa-building mr-1"></i>{{ summaryText(r) }}
                    </p>
                    <div v-if="isLiveMulti(r) || r.status === 'invite' || r.status === 'error'" class="flex gap-2 pt-1" @click.stop>
                        <Button v-if="isLiveMulti(r) || r.status === 'invite'" variant="outline" size="sm" icon="fas fa-copy" @click="copyLink(r)">Copiar link</Button>
                        <Button v-if="isLiveMulti(r) || r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(r)">Revogar</Button>
                        <Button v-if="r.status === 'error'" variant="outline" size="sm" icon="fas fa-rotate-right" :loading="retrying === r.id" @click="retry(r)">Reprocessar</Button>
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
                            v-for="r in rows" :key="r.id"
                            class="h-[56px] border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60 cursor-pointer"
                            @click="detailId = r.id"
                        >
                            <td class="px-4 font-medium text-ink truncate max-w-[240px]">{{ displayName(r) }}</td>
                            <td class="px-4 text-ink-muted whitespace-nowrap">
                                <i :class="originIcon(r)" class="mr-1.5 text-ink-subtle"></i>{{ originLabel(r) }}
                            </td>
                            <td class="px-4 text-ink-muted max-w-[280px] truncate">{{ summaryText(r) }}</td>
                            <td class="px-4"><Badge :variant="statusOf(r).variant" size="sm">{{ statusOf(r).label }}</Badge></td>
                            <td class="px-4 text-ink-muted truncate max-w-[140px]">{{ r.creator_name || '-' }}</td>
                            <td class="px-4 text-ink-muted whitespace-nowrap">{{ fmtDate(r.createdAt) }}</td>
                            <td class="px-4" @click.stop>
                                <div class="flex justify-end gap-1.5">
                                    <Button v-if="isLiveMulti(r) || r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-copy" @click="copyLink(r)" v-tippy="'Copiar link'" />
                                    <Button v-if="isLiveMulti(r) || r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(r)" v-tippy="'Revogar link'" />
                                    <Button v-if="r.status === 'error'" variant="ghost" size="sm" icon="fas fa-rotate-right" :loading="retrying === r.id" @click="retry(r)" v-tippy="'Reprocessar'" />
                                    <Button variant="ghost" size="sm" icon="fas fa-eye" @click="detailId = r.id" v-tippy="'Detalhes'" />
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
