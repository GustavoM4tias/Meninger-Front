<script setup>
// Sobre o Office > Mapa do Sistema.
// Retrato visual do que o Office faz, para quem precisa entender o sistema sem
// percorrer tela por tela. Duas visões do MESMO conteúdo (config/aboutOffice.js):
// o mapa em canvas, que mostra a dimensão de uma vez, e a lista recolhível, que
// é a visão confortável no celular - por isso ela é o padrão em tela pequena.

import { ref, computed, onMounted } from 'vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MindMap from '@/components/Sobre/MindMap.vue';
import MindMapOutline from '@/components/Sobre/MindMapOutline.vue';
import HighlightCards from '@/components/Sobre/HighlightCards.vue';
import SobreNav from '@/components/Sobre/SobreNav.vue';
import { useAboutMetrics } from '@/composables/useAboutMetrics';
import { officeMap } from '@/config/aboutOffice';

const { highlights, updatedLabel, isLive, load: loadMetrics } = useAboutMetrics();

// Tudo nasce recolhido: a leitura começa pelos 5 ramos de topo, e quem lê decide
// o que abrir. Evita a parede de texto na primeira impressão.
const INITIAL_OPEN = [];

const mode = ref('mapa');
const mapRef = ref(null);

const viewOptions = [
    { value: 'mapa', label: 'Mapa', icon: 'fas fa-diagram-project' },
    { value: 'lista', label: 'Lista', icon: 'fas fa-list-ul' },
];

// ─── Estado da lista ──────────────────────────────────────────────────────────
// Mesma convenção de id do canvas ("r/0/2"), para os dois modos falarem a mesma
// língua caso um dia precisem sincronizar.
const openIds = ref(new Set());

function walkIds(nodes, path, onlyBranches = true) {
    const out = [];
    nodes.forEach((node, i) => {
        const id = `${path}/${i}`;
        if (!onlyBranches || node.c?.length) out.push(id);
        if (node.c?.length) out.push(...walkIds(node.c, id, onlyBranches));
    });
    return out;
}

function toggleOutline(id) {
    const next = new Set(openIds.value);
    next.has(id) ? next.delete(id) : next.add(id);
    openIds.value = next;
}

function expandAll() {
    if (mode.value === 'mapa') mapRef.value?.expandAll();
    else openIds.value = new Set(walkIds(officeMap.c, 'r'));
}

function collapseAll() {
    if (mode.value === 'mapa') mapRef.value?.collapseAll();
    else openIds.value = new Set();
}

const legend = computed(() => officeMap.c.map(b => ({ t: b.t, acc: b.acc })));

const totalItems = computed(() => {
    const count = (nodes) => nodes.reduce((total, n) => total + 1 + count(n.c || []), 0);
    return count(officeMap.c);
});

onMounted(() => {
    loadMetrics();
    // O canvas é ótimo no desktop e desconfortável no celular: abre já na lista.
    if (window.innerWidth < 1024) mode.value = 'lista';
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader
        title="Mapa do Sistema"
        subtitle="O Menin Office inteiro em uma tela: módulos, integrações, ganhos e o que vem a seguir."
        eyebrow="Sobre o Office"
        icon="fas fa-diagram-project">
        <template #actions>
          <PageHelp
            storage-key="sobre-mapa"
            title="Como usar o Mapa do Sistema"
            intro="Este mapa mostra o que o Office faz hoje, agrupado por módulo, integração, ganho já medido e o que ainda vem pela frente."
            :steps="[
              { title: 'Abrir um ramo', text: 'Toque em qualquer cartão com número ao lado. O número diz quantos itens existem dentro dele.' },
              { title: 'Trocar a visão', text: 'Use Mapa para ver o desenho completo e Lista para navegar em coluna, mais confortável no celular.' },
              { title: 'Navegar no mapa', text: 'Arraste para mover, use a pinça ou os botões de zoom no canto, e o botão de centralizar para reenquadrar.' },
              { title: 'Ver tudo de uma vez', text: 'Abrir tudo expande todos os ramos; Recolher volta ao começo.' },
            ]"
            :tips="[
              'O selo \'só no Office\' marca as informações que não existem prontas no Sienge nem no CV: elas nascem aqui.',
              'Para o texto completo, com números e explicação de cada frente, abra a Visão executiva.',
            ]" />
        </template>
      </PageHeader>

      <SobreNav />

      <!-- Números de topo: ao vivo quando o backend responde -->
      <HighlightCards :items="highlights" :updated-label="updatedLabel" :is-live="isLive" class="mb-5" />

      <!-- Legenda: diz o que cada cor representa antes de abrir qualquer ramo -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
        <span v-for="branch in legend" :key="branch.t" class="inline-flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm shrink-0" :style="{ background: branch.acc }"></span>
          <span class="text-[11px] text-ink-muted">{{ branch.t }}</span>
        </span>
      </div>

      <!-- Controles -->
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <SegmentedControl v-model="mode" :options="viewOptions" size="sm" />
        <div class="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" icon="fas fa-angles-down" @click="expandAll">
            <span class="hidden sm:inline">Abrir tudo</span>
          </Button>
          <Button variant="ghost" size="sm" icon="fas fa-angles-up" @click="collapseAll">
            <span class="hidden sm:inline">Recolher</span>
          </Button>
          <span class="hidden md:inline text-[11px] font-mono text-ink-subtle">
            {{ totalItems }} itens
          </span>
        </div>
      </div>

      <!-- Mapa -->
      <div v-show="mode === 'mapa'" class="h-[62vh] min-h-[380px]">
        <MindMap ref="mapRef" :tree="officeMap" :initial-open="INITIAL_OPEN" />
      </div>

      <!-- Lista -->
      <div v-if="mode === 'lista'" class="max-w-3xl">
        <div class="rounded-xl border border-line bg-surface-raised surface-gradient shadow-soft p-4 mb-3">
          <p class="text-base font-semibold text-ink">{{ officeMap.t }}</p>
          <p class="text-xs text-ink-muted leading-relaxed mt-1">{{ officeMap.s }}</p>
        </div>
        <MindMapOutline
          :nodes="officeMap.c"
          :open-ids="openIds"
          path="r"
          @toggle="toggleOutline" />
      </div>

      <p class="text-[11px] text-ink-subtle mt-4">
        Conteúdo da Visão Executiva do Menin Office, agosto de 2026. Números medidos nas telas do próprio sistema.
      </p>
    </PageContainer>
  </div>
</template>
