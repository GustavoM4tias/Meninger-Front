<script setup>
// /settings/sienge — a tela do Sienge.
//
// Eram duas telas soltas no menu de Administração ("Backup Sienge" e "Vendas
// travadas para o ERP") olhando a MESMA integração por dois lados: o espelho do
// banco e a fila do ERP. Quem investiga uma quase sempre precisa da outra - uma
// venda que não virou contrato e um espelho velho se parecem na tela de Custos.
//
// Mesmo padrão de hub do /meta e do /settings/whatsapp: SegmentedControl +
// deep-link ?tab= + rotas antigas vivas como redirect (preservam a query, então
// links de notificação e favoritos antigos continuam funcionando).
//
// Cada aba é um panel sem PageContainer/PageHeader próprios - o cabeçalho vive
// aqui. Lazy + KeepAlive: só monta a aba visitada e preserva filtro e rolagem
// ao alternar.

import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Favorite from '@/components/config/Favorite.vue';

const BackupPanel = defineAsyncComponent(() => import('./panels/BackupPanel.vue'));
const EnvioPanel  = defineAsyncComponent(() => import('./panels/EnvioPanel.vue'));
const ConfigPanel = defineAsyncComponent(() => import('./panels/ConfigPanel.vue'));

const route = useRoute();
const router = useRouter();

const TABS = [
    { value: 'backup', label: 'Backup',           icon: 'fas fa-database' },
    { value: 'envio',  label: 'Travadas no ERP',  icon: 'fas fa-triangle-exclamation' },
    { value: 'config', label: 'Configuração',     icon: 'fas fa-sliders' },
];
const VALID_TABS = TABS.map(t => t.value);

const tab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'backup');

// Aba ↔ URL nos dois sentidos: trocar aba reflete em ?tab= e navegação interna
// (redirect da rota antiga, link de notificação) troca a aba.
watch(tab, (v) => {
    if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } });
});
watch(() => route.query.tab, (v) => {
    if (v && VALID_TABS.includes(v) && v !== tab.value) tab.value = v;
});

const PANELS = { backup: BackupPanel, envio: EnvioPanel, config: ConfigPanel };
const currentPanel = computed(() => PANELS[tab.value] || BackupPanel);

const SUBTITLES = {
    backup: 'Cópia diária do banco do Sienge às 5h. O restore roda num banco de staging e a produção só é trocada por rename atômico depois da validação - se algo falhar, o dado antigo é preservado.',
    envio:  'Reservas que entraram em Envio Sienge e não viraram contrato no Sienge dentro do prazo da fila. O lote do CV roda de 5 em 5 minutos: passar do prazo não é demora, é erro.',
    config: 'Onde o Sienge mora e como a carga se comporta. Vale na hora, sem deploy - nada aqui depende mais de variável de ambiente.',
};
const subtitle = computed(() => SUBTITLES[tab.value] || '');

const AJUDA = {
    intro: 'Tudo do Sienge num lugar só. As duas primeiras abas são os dois jeitos de a integração falhar - o espelho do banco parar de atualizar, ou uma venda não chegar ao ERP - e a terceira é onde a régua das duas é configurada.',
    steps: [
        { title: 'Backup', text: 'Acompanha a carga diária que alimenta Custos/Títulos, Faturamento, Contas a Receber, Inadimplência, Stand de Vendas e os relatórios da Eme. O primeiro cartão diz de QUANDO é o dado que essas telas estão mostrando.' },
        { title: 'Travadas no ERP', text: 'A lista das vendas que ficaram na etapa Envio Sienge além do prazo. O motivo do erro aparece na reserva, no painel do CV - a API do CV não expõe esse texto, então a lista aponta a reserva e o diagnóstico é lá. Clique no número da reserva (ou na seta no fim da linha) para abrir direto no CV.' },
        { title: 'Configuração', text: 'Três blocos: a conexão com o Sienge (endereços, usuários e senhas), a regra da carga (horário, retentativa, vigia, aviso) e a régua do vigia do ERP (prazo, frequência e quem recebe).' },
        { title: 'Cada aba tem link próprio', text: 'A aba fica na URL (?tab=backup, ?tab=envio, ?tab=config), então dá para mandar o link já na aba certa. Os links antigos das duas telas separadas continuam funcionando e abrem a aba correspondente.' },
    ],
    tips: [
        'Espelho velho e venda travada costumam andar juntos: se o número de uma tela de Custos está estranho, confira as duas primeiras abas antes de procurar defeito no cálculo.',
        'Nada aqui exige deploy. Endereço, senha, horário e prazo mudam na aba Configuração e valem na próxima rodada.',
    ],
};
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader :subtitle="subtitle" icon-img="/icons/sienge.png">
        <template #title>
          <span>Sienge</span>
          <Favorite router="/settings/sienge" section="Sienge" />
        </template>

        <template #actions>
          <PageHelp storage-key="sienge" title="Como usar a tela Sienge"
            :intro="AJUDA.intro" :steps="AJUDA.steps" :tips="AJUDA.tips" />
        </template>
      </PageHeader>

      <!-- Abas (o SegmentedControl rola sozinho no celular) -->
      <div class="mb-4">
        <SegmentedControl v-model="tab" :options="TABS" size="sm" />
      </div>

      <KeepAlive>
        <component :is="currentPanel" />
      </KeepAlive>

    </PageContainer>
  </div>
</template>
