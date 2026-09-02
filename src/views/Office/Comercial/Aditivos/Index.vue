<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Quem já assinou a retificação da cláusula 13, quem abriu o link e quem ainda não tocou"
        icon="fas fa-file-signature">
        <template #title>Aditivos</template>
        <template #actions>
          <PageHelp
            storage-key="aditivos-assinaturas"
            intro="Cada unidade tem um documento no DocuSign e um link fixo por assinante. O mesmo link atende o titular e o cônjuge: quem abre digita o próprio CPF e o sistema descobre quem é. Esta tela mostra em que pé está cada um e entrega o link para reenviar."
            :steps="[
              { title: 'Leia o placar', text: 'Os cartões contam PESSOAS, não unidades. Clique num cartão para recortar a lista - por exemplo, ver só quem abriu o link e não assinou.' },
              { title: 'Cobre quem parou', text: 'Sem interação é quem nunca abriu o link: provavelmente ainda não recebeu. Abriu, não assinou é quem viu o documento e desistiu no meio - esse é o que vale uma ligação.' },
              { title: 'Reenvie o link', text: 'O botão Copiar link entrega o endereço do assinante. O link nunca expira: pode reenviar por WhatsApp quantas vezes precisar.' },
              { title: 'Atualize pelo DocuSign', text: 'A lista mostra o que estava gravado na última leitura. O botão Atualizar vai ao DocuSign conferir envelope por envelope - leva alguns segundos e é a informação mais fresca que existe.' },
            ]"
            :tips="[
              'A unidade só fica concluída quando TODOS os assinantes dela assinam. Nas 8 unidades com cônjuge, uma assinatura sozinha não fecha o documento.',
              'O DocuSign não envia e-mail nenhum neste fluxo: quem avisa o cliente é o time, mandando o link.',
              'Ana Carolina Scotton tem duas unidades e portanto dois documentos - mandar só um link deixa metade sem assinar.',
            ]" />

          <Button
            v-if="can('operate')"
            variant="secondary"
            :loading="store.atualizando"
            icon="fas fa-rotate"
            @click="store.atualizar()">
            {{ store.atualizando ? 'Consultando...' : 'Atualizar pelo DocuSign' }}
          </Button>
        </template>
      </PageHeader>

      <!-- Erro -->
      <Surface v-if="store.erro" class="mb-5 border-l-2 border-l-data-neg">
        <p class="text-sm text-data-neg">{{ store.erro }}</p>
      </Surface>

      <!-- Placar -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Assinaram"
          :raw="resumo.assinaram" :format="inteiro"
          :hint="`de ${resumo.assinantes} assinantes`"
          icon="fas fa-circle-check" tone="pos"
          selectable :active="filtro === 'assinado'"
          :loading="store.carregando"
          @select="alternarFiltro('assinado')" />
        <StatCard
          label="Abriram, não assinaram"
          :raw="resumo.abriram" :format="inteiro"
          hint="viram o link e pararam"
          icon="fas fa-hourglass-half" tone="warn"
          selectable :active="filtro === 'abriu'"
          :loading="store.carregando"
          @select="alternarFiltro('abriu')" />
        <StatCard
          label="Sem interação"
          :raw="resumo.parados" :format="inteiro"
          hint="nunca abriram o link"
          icon="fas fa-circle-minus" tone="neutral"
          selectable :active="filtro === 'parado'"
          :loading="store.carregando"
          @select="alternarFiltro('parado')" />
        <StatCard
          label="Unidades concluídas"
          :raw="resumo.unidades_concluidas" :format="inteiro"
          :hint="`de ${resumo.unidades} unidades`"
          icon="fas fa-file-circle-check" tone="accent"
          selectable :active="filtro === 'concluida'"
          :loading="store.carregando"
          @select="alternarFiltro('concluida')" />
      </div>

      <!-- Progresso -->
      <div class="mb-6">
        <div class="h-2 rounded-full bg-surface-sunken overflow-hidden">
          <div class="h-full bg-data-pos transition-[width] duration-500"
            :style="{ width: `${store.progresso}%` }"></div>
        </div>
        <p class="mt-1.5 text-xs text-ink-muted">
          {{ store.progresso }}% das assinaturas colhidas
          <span v-if="store.ultimaAtualizacao"> · lido do DocuSign às {{ hora(store.ultimaAtualizacao) }}</span>
        </p>
      </div>

      <!-- Falhas da última leitura -->
      <Surface v-if="store.falhasUltimaLeitura.length" class="mb-5 border-l-2 border-l-data-warn">
        <p class="text-sm text-ink">
          {{ store.falhasUltimaLeitura.length }} envelope(s) não puderam ser lidos no DocuSign:
          <span class="text-ink-muted">{{ store.falhasUltimaLeitura.map(f => f.unidade).join(', ') }}</span>.
          O que aparece deles abaixo é a última leitura que deu certo.
        </p>
      </Surface>

      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <SegmentedControl v-model="filtro" :options="opcoesFiltro" size="md" />
        <Select
          v-if="store.empreendimentos.length > 1"
          v-model="store.empreendimento"
          :options="opcoesEmpreendimento"
          class="min-w-[200px]"
          @change="store.fetchPainel()" />
      </div>

      <!-- Carregando -->
      <div v-if="store.carregando" class="grid gap-3 md:grid-cols-2">
        <Skeleton v-for="n in 6" :key="n" variant="card" />
      </div>

      <EmptyState
        v-else-if="!lista.length"
        icon="fas fa-file-signature"
        title="Nada neste recorte"
        :description="filtro === 'todas'
          ? 'Nenhum aditivo foi enviado para assinatura ainda.'
          : 'Nenhuma unidade se encaixa no filtro escolhido. Volte para Todas para ver a lista inteira.'" />

      <!-- Lista: cartões, que é o que funciona no celular e continua legível no desktop -->
      <div v-else class="grid gap-3 md:grid-cols-2">
        <Surface v-for="u in lista" :key="u.id" padding="md">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-sm font-medium text-ink">{{ u.unidade }}</p>
              <p class="text-xs text-ink-muted">{{ u.empreendimento }}</p>
            </div>
            <Badge :variant="u.concluida ? 'success' : 'neutral'">
              {{ u.concluida ? 'Concluída' : `${assinadosDe(u)}/${u.signers.length}` }}
            </Badge>
          </div>

          <div class="mt-3 space-y-2">
            <div v-for="s in u.signers" :key="s.link"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-sunken px-3 py-2">
              <div class="min-w-0">
                <p class="truncate text-sm text-ink">
                  {{ s.nome }}
                  <span v-if="s.papel === 'associado'" class="ml-1 text-[11px] uppercase tracking-wide text-ink-subtle">
                    cônjuge
                  </span>
                </p>
                <p class="text-xs" :class="TOM[s.estado].cor">
                  {{ TOM[s.estado].rotulo }}
                  <template v-if="s.estado === 'assinado' && s.assinado_em"> em {{ dataHora(s.assinado_em) }}</template>
                  <template v-else-if="s.estado === 'abriu' && s.cliques">
                    · {{ s.cliques }} {{ s.cliques === 1 ? 'acesso' : 'acessos' }}
                  </template>
                </p>
              </div>
              <button
                v-if="s.estado !== 'assinado'"
                type="button"
                class="min-h-10 shrink-0 rounded-lg border border-line px-3 text-sm text-accent hover:border-accent"
                @click="copiar(s.link)">
                <i class="fas fa-link mr-1.5"></i>{{ copiado === s.link ? 'Copiado' : 'Copiar link' }}
              </button>
            </div>
          </div>
        </Surface>
      </div>

    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAditivosStore } from '@/stores/Comercial/Aditivos/aditivosStore';
import { useCan } from '@/composables/useCan';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import StatCard from '@/components/UI/StatCard.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const store = useAditivosStore();
// view/operate seguem a alçada da tela (lib/screenCapabilities.js no back).
const can = useCan('/comercial/aditivos');

const TOM = {
  assinado: { rotulo: 'Assinou', cor: 'text-data-pos' },
  abriu: { rotulo: 'Abriu o link, não assinou', cor: 'text-data-warn' },
  parado: { rotulo: 'Sem interação', cor: 'text-ink-subtle' },
  recusado: { rotulo: 'Recusou', cor: 'text-data-neg' },
};

const filtro = ref('todas');
const opcoesFiltro = [
  { value: 'todas', label: 'Todas' },
  { value: 'parado', label: 'Sem interação' },
  { value: 'abriu', label: 'Abriram' },
  { value: 'assinado', label: 'Assinaram' },
  { value: 'concluida', label: 'Concluídas' },
];

const resumo = computed(() => store.resumo ?? {
  unidades: 0, unidades_concluidas: 0, assinantes: 0, assinaram: 0, abriram: 0, parados: 0, recusaram: 0,
});

const opcoesEmpreendimento = computed(() => [
  { value: '', label: 'Todos os empreendimentos' },
  ...store.empreendimentos.map((e) => ({ value: e, label: e })),
]);

// O filtro pergunta das PESSOAS, menos "concluida", que é da unidade.
const lista = computed(() => {
  if (filtro.value === 'todas') return store.unidades;
  if (filtro.value === 'concluida') return store.unidades.filter((u) => u.concluida);
  return store.unidades.filter((u) => u.signers.some((s) => s.estado === filtro.value));
});

function alternarFiltro(valor) {
  filtro.value = filtro.value === valor ? 'todas' : valor;
}

const assinadosDe = (u) => u.signers.filter((s) => s.estado === 'assinado').length;

const inteiro = (n) => String(Math.round(n));
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR',
  { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Confirmação no próprio botão: é retorno suficiente para uma cópia e evita
// depender de um toast global que esta tela não tem.
const copiado = ref('');
async function copiar(link) {
  try {
    await navigator.clipboard.writeText(link);
    copiado.value = link;
    setTimeout(() => { if (copiado.value === link) copiado.value = ''; }, 2000);
  } catch {
    window.prompt('Copie o link:', link);
  }
}

onMounted(() => store.fetchPainel());
</script>
