<script setup>
// CV CRM > Estoque bloqueado.
//
// O CV bloqueia unidade por motivos muito diferentes: "Estratégia Comercial" é
// a diretoria segurando estoque de propósito (continua sendo unidade a vender)
// e "Administrada pelo SIENGE" é trava do ERP (fora do jogo). Esta tela decide
// quais motivos contam como estoque, e a decisão vale na hora para o espelho,
// a ficha comercial, a projeção e a viabilidade (services/cv/unitStockService).
//
// Era um cartão dentro de CV CRM > Configurações, que ficou para as
// credenciais. Aqui ficam juntos a regra, a leitura do CV e a frequência dela.

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import CvBlockedStockCard from '@/components/Cv/CvBlockedStockCard.vue';
import CvJobsCard from '@/components/Cv/CvJobsCard.vue';
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Estoque bloqueado"
            subtitle="Unidades bloqueadas no CV que continuam sendo estoque a vender"
            icon="fas fa-hand-holding-dollar"
        >
            <template #actions>
                <PageHelp
                    storage-key="cv-estoque-bloqueado"
                    title="Como usar o Estoque bloqueado"
                    intro="O CV bloqueia unidades por motivos diferentes. Aqui você decide quais motivos ainda contam como estoque a vender."
                    :steps="[
                        { title: 'Leitura do CV', text: 'O Office lê no CV o motivo do bloqueio de cada unidade. Ligue a leitura automática no cartão Frequência, ou clique em Ler o CV agora depois de bloquear ou liberar unidades no CV.' },
                        { title: 'Regra por motivo', text: 'Para cada motivo, escolha se conta como estoque. Estratégia Comercial costuma contar; trava do ERP (Sienge) e Negociação de Terreno, não.' },
                        { title: 'Onde vale', text: 'A decisão vale na hora para o espelho de vendas, a ficha comercial, a projeção e a viabilidade.' },
                        { title: 'Por empreendimento', text: 'O quadro de baixo mostra quantas unidades bloqueadas contam como estoque em cada empreendimento.' },
                    ]"
                    :tips="[
                        'Motivo novo criado no CV aparece aqui como Não é estoque, esperando alguém decidir.',
                        'Unidade marcada à mão como estoque continua valendo, mesmo que o motivo dela não conte.',
                    ]"
                />
            </template>
        </PageHeader>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2">
                <CvBlockedStockCard :pode-editar="true" />
            </div>
            <CvJobsCard :somente="['motivos_bloqueio']" titulo="Frequência"
                subtitulo="De quanto em quanto tempo o Office lê no CV o motivo de cada bloqueio" />
        </div>
    </PageContainer>
</template>
