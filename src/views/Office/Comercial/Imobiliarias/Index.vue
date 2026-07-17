<script setup>
// Tela de cadastro de imobiliárias no CV: o usuário Office cadastra direto
// (formulário completo) ou gera um link público lp.menin.com.br/imobiliaria/<token>
// para o responsável da imobiliária preencher. A lista mostra convites e
// cadastros com status, cópia de link, detalhes e reprocessamento.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import InviteModal from './components/InviteModal.vue';
import CreateModal from './components/CreateModal.vue';
import DetailModal from './components/DetailModal.vue';

const LP_HOST = 'https://lp.menin.com.br';

const store = useRealEstateStore();
const toast = useToast();

const inviteOpen = ref(false);
const createOpen = ref(false);

// O detalhe referencia o registro PELO ID e resolve contra a lista da store:
// qualquer refetch (reprocessar, revogar) atualiza o modal em tempo real —
// guardar o objeto direto congelaria um snapshot antigo.
const detailId = ref(null);
const detail = computed(() => rows.value.find(x => x.id === detailId.value) || null);

const STATUS = {
    invite:     { label: 'Aguardando preenchimento', variant: 'info' },
    processing: { label: 'Processando',              variant: 'warning' },
    completed:  { label: 'Concluída',                variant: 'success' },
    error:      { label: 'Erro',                     variant: 'danger' },
    revoked:    { label: 'Revogado',                 variant: 'neutral' },
};
const statusOf = (r) => STATUS[r.status] || { label: r.status, variant: 'neutral' };

const rows = computed(() => store.registrations);

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

onMounted(() => {
    store.fetchRegistrations();
    store.fetchEnterprises();
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Imobiliárias"
            subtitle="Cadastre imobiliárias no CV direto por aqui ou envie um link para o responsável preencher"
            icon="fas fa-house-flag"
        >
            <template #actions>
                <PageHelp
                    storage-key="comercial-imobiliarias"
                    title="Como cadastrar uma imobiliária"
                    intro="Existem dois caminhos: você mesmo preencher o cadastro, ou gerar um link público e enviar para o responsável da imobiliária preencher."
                    :steps="[
                        { title: 'Escolha os empreendimentos', text: 'Nos dois caminhos você define a quais empreendimentos a imobiliária ficará associada. Só aparecem os empreendimentos que você tem acesso.' },
                        { title: 'Cadastro direto', text: 'Clique em Nova imobiliária, envie o cartão CNPJ (PDF) para preencher os dados automaticamente, complete o que faltar e confirme.' },
                        { title: 'Ou gere um link', text: 'Clique em Gerar link, identifique para quem é, selecione os empreendimentos e envie o link pelo WhatsApp. A pessoa preenche o formulário e o cadastro acontece sozinho.' },
                        { title: 'Acompanhe na lista', text: 'Cada cadastro mostra o status. Se der erro na integração com o CV, abra o detalhe e clique em Reprocessar.' },
                    ]"
                    :tips="[
                        'O cartão CNPJ preenche razão social, CNPJ, endereço e porte automaticamente - confira e ajuste se precisar.',
                        'A validade do CRECI em branco assume 31/12 do ano que vem.',
                        'Links ainda não preenchidos podem ser revogados a qualquer momento.',
                    ]"
                />
                <Button variant="secondary" icon="fas fa-link" @click="inviteOpen = true">Gerar link</Button>
                <Button variant="primary" icon="fas fa-plus" @click="createOpen = true">Nova imobiliária</Button>
            </template>
        </PageHeader>

        <div v-if="store.loading && !rows.length" class="flex justify-center py-16">
            <Spinner />
        </div>

        <EmptyState
            v-else-if="!rows.length"
            icon="fas fa-house-flag"
            title="Nenhum cadastro ainda"
            description="Cadastre uma imobiliária ou gere um link para o responsável preencher."
        />

        <template v-else>
            <!-- Mobile: cards -->
            <div class="md:hidden space-y-3">
                <div
                    v-for="r in rows" :key="r.id"
                    class="rounded-xl border border-line bg-surface-raised p-4 space-y-2"
                    @click="detailId = r.id"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-medium text-ink truncate">{{ displayName(r) }}</p>
                            <p class="text-xs text-ink-muted">
                                {{ r.source === 'public' ? 'Via link' : 'Cadastro interno' }} · {{ fmtDate(r.createdAt) }}
                            </p>
                        </div>
                        <Badge :variant="statusOf(r).variant" size="sm">{{ statusOf(r).label }}</Badge>
                    </div>
                    <p class="text-xs text-ink-muted truncate">
                        <i class="fas fa-building mr-1"></i>
                        {{ (r.enterprises || []).map(e => e.nome).join(', ') || '-' }}
                    </p>
                    <div v-if="r.status === 'invite' || r.status === 'error'" class="flex gap-2 pt-1" @click.stop>
                        <Button v-if="r.status === 'invite'" variant="outline" size="sm" icon="fas fa-copy" @click="copyLink(r)">Copiar link</Button>
                        <Button v-if="r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(r)">Revogar</Button>
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
                            class="border-b border-line-subtle last:border-0 hover:bg-surface-sunken/60 cursor-pointer"
                            @click="detailId = r.id"
                        >
                            <td class="px-4 py-3 font-medium text-ink">{{ displayName(r) }}</td>
                            <td class="px-4 py-3 text-ink-muted">{{ r.source === 'public' ? 'Via link' : 'Interno' }}</td>
                            <td class="px-4 py-3 text-ink-muted max-w-[280px] truncate">
                                {{ (r.enterprises || []).map(e => e.nome).join(', ') || '-' }}
                            </td>
                            <td class="px-4 py-3"><Badge :variant="statusOf(r).variant" size="sm">{{ statusOf(r).label }}</Badge></td>
                            <td class="px-4 py-3 text-ink-muted">{{ r.creator_name || '-' }}</td>
                            <td class="px-4 py-3 text-ink-muted whitespace-nowrap">{{ fmtDate(r.createdAt) }}</td>
                            <td class="px-4 py-3" @click.stop>
                                <div class="flex justify-end gap-1.5">
                                    <Button v-if="r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-copy" @click="copyLink(r)" title="Copiar link" />
                                    <Button v-if="r.status === 'invite'" variant="ghost" size="sm" icon="fas fa-ban" @click="revoke(r)" title="Revogar link" />
                                    <Button v-if="r.status === 'error'" variant="ghost" size="sm" icon="fas fa-rotate-right" :loading="retrying === r.id" @click="retry(r)" title="Reprocessar" />
                                    <Button variant="ghost" size="sm" icon="fas fa-eye" @click="detailId = r.id" title="Detalhes" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <InviteModal :open="inviteOpen" @close="inviteOpen = false" />
        <CreateModal :open="createOpen" @close="createOpen = false" />
        <DetailModal :registration="detail" :retrying="retrying === detail?.id" @close="detailId = null" @retry="retry" @copy="copyLink" />
    </PageContainer>
</template>
