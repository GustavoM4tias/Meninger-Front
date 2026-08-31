<script setup>
// Painel do CV CRM: o lugar único de configuração da integração com o CV.
//
// Antes disto a credencial vivia dentro da tela de Imobiliárias, o que
// escondia uma configuração que vale para o módulo inteiro (imobiliárias,
// correspondentes, empreendimentos) atrás de uma tela específica. Aqui ela
// fica no mesmo nível do que configura: quem administra o CV vem a este
// painel, e as telas de cadastro só apontam para cá quando algo quebra.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import CvCredentialCard from '@/components/Cv/CvCredentialCard.vue';
import CvJobsCard from '@/components/Cv/CvJobsCard.vue';

const store = useRealEstateStore();
const toast = useToast();

const cfg = computed(() => store.cvPanel);
const espelho = computed(() => store.cvPanel?.espelho || null);

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'nunca';

async function sincronizar() {
    try {
        await store.syncImobiliarias();
        await store.fetchCvPanel();
        toast.success('Sincronização concluída.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao sincronizar.');
    }
}

onMounted(() => {
    store.fetchCvPanel().catch(err => toast.error(err?.message || 'Não foi possível carregar o painel.'));
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="CV CRM"
            subtitle="Credencial, sincronização e estado da integração com o CV"
            icon-img="/CVLogo.png"
        >
            <template #actions>
                <PageHelp
                    storage-key="cv-central"
                    title="Como usar o painel do CV CRM"
                    intro="Este painel concentra a integração com o CV: a credencial que o Office usa para ler o CV e o estado das sincronizações."
                    :steps="[
                        { title: 'Credencial', text: 'É o login de um usuário do CV usado para ler dados que a chave de integração não alcança, como quais empreendimentos cada imobiliária atende. Use um usuário dedicado, não o login de uma pessoa.' },
                        { title: 'Quando o CV trocar a senha', text: 'O CV força troca de senha de tempos em tempos. Quando isso acontecer, quem estiver na lista de avisados recebe notificação e este painel mostra a falha - basta digitar a nova senha e salvar.' },
                        { title: 'Sincronização', text: 'O botão do cabeçalho força a leitura das imobiliárias na hora, depois de mexer em algo direto no CV. Os demais dados seguem o horário da lista abaixo.' },
                        { title: 'Sincronizações automáticas', text: 'Cada linha é um dado que o Office puxa do CV sozinho. O interruptor liga e desliga; o campo de horário usa formato cron e a tela traduz embaixo o que você digitou. Salvar reagenda na hora, sem reiniciar o sistema.' },
                        { title: 'Entrada em tempo real', text: 'Os webhooks - o CV avisando o Office na hora em que algo muda - ficam na tela Integrações, ao lado no menu, junto do histórico da integração.' },
                    ]"
                    :tips="[
                        'Salvar já testa o login e diz na hora se funcionou.',
                        'Deixando a lista de avisados vazia, o aviso vai para todos os administradores.',
                        'Os cadastros em si (imobiliárias, correspondentes, empreendimentos) ficam nos itens ao lado, no menu CV CRM.',
                    ]"
                />
                <Button variant="secondary" icon="fas fa-rotate" :loading="store.syncing"
                    v-tippy="'Puxa o cadastro de imobiliárias e os vínculos com empreendimento na hora'"
                    @click="sincronizar">
                    Sincronizar imobiliárias
                </Button>
            </template>
        </PageHeader>

        <Skeleton v-if="store.cvPanelLoading && !cfg" variant="row" :lines="4" />

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CvCredentialCard />

            <Panel title="Espelho do CV" icon="fas fa-database"
                subtitle="O que o Office já leu do CV e quando">
                <div v-if="espelho" class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="rounded-xl border border-line bg-surface-sunken p-3">
                            <p class="text-xs text-ink-muted">Imobiliárias</p>
                            <p class="text-lg font-semibold text-ink">{{ espelho.imobiliarias }}</p>
                            <p class="text-micro text-ink-subtle">{{ espelho.ativas }} ativas</p>
                        </div>
                        <div class="rounded-xl border border-line bg-surface-sunken p-3">
                            <p class="text-xs text-ink-muted">Vínculos com empreendimento</p>
                            <p class="text-lg font-semibold text-ink">{{ espelho.vinculos }}</p>
                            <p class="text-micro text-ink-subtle">{{ espelho.com_vinculo }} imobiliárias atendidas</p>
                        </div>
                    </div>

                    <dl class="text-xs space-y-1.5">
                        <div class="flex items-center justify-between gap-3">
                            <dt class="text-ink-muted">Cadastro sincronizado em</dt>
                            <dd class="text-ink">{{ fmt(espelho.last_sync) }}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                            <dt class="text-ink-muted">Vínculos sincronizados em</dt>
                            <dd class="text-ink">{{ fmt(espelho.last_sync_vinculos) }}</dd>
                        </div>
                    </dl>

                    <p class="text-xs text-ink-muted">
                        <i class="fas fa-clock mr-1 text-ink-subtle"></i>
                        Tudo isso atualiza sozinho de hora em hora. Os vínculos dependem da credencial ao lado -
                        <template v-if="cfg?.saudavel">
                            <Badge variant="success" size="sm">funcionando</Badge>
                        </template>
                        <template v-else>
                            <Badge variant="danger" size="sm">com falha</Badge>, então eles pararam no horário acima.
                        </template>
                    </p>
                </div>
            </Panel>

            <div class="lg:col-span-2">
                <CvJobsCard />
            </div>

        </div>
    </PageContainer>
</template>
