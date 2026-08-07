<script setup>
// Sobre o Office > Visão Executiva.
// A versão em texto do documento de agosto/2026, lida direto de
// config/aboutOffice.js. Renderiza blocos tipados (parágrafo, destaque, números,
// tabela, lista e módulo) para que atualizar o conteúdo não exija mexer na tela.
// As tabelas viram cartões no celular, onde a diretoria acessa.

import { ref, onMounted, onBeforeUnmount } from 'vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import HighlightCards from '@/components/Sobre/HighlightCards.vue';
import SobreNav from '@/components/Sobre/SobreNav.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useAboutMetrics } from '@/composables/useAboutMetrics';
import { officeReport } from '@/config/aboutOffice';

const auth = useAuthStore();
const { highlights, updatedLabel, isLive, reportSections, load: loadMetrics } = useAboutMetrics();
const activeId = ref(officeReport[0].id);
const exporting = ref(false);
let observer = null;

function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// O PDF é desenhado nativamente (utils/Sobre/executiveReportPdf.js), não é
// captura de tela: sai com texto selecionável e sem corte de linha.
async function exportPdf() {
    exporting.value = true;
    try {
        const { exportExecutiveReportToPdf } = await import('@/utils/Sobre/executiveReportPdf');
        await exportExecutiveReportToPdf({
            sections: reportSections.value,
            highlights: highlights.value,
            user: auth.user,
            updatedLabel: updatedLabel.value,
        });
    } finally {
        exporting.value = false;
    }
}

onMounted(() => {
    loadMetrics();
    // Marca no índice a seção que está sendo lida.
    observer = new IntersectionObserver(
        entries => {
            const visible = entries.filter(e => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (visible) activeId.value = visible.target.id;
        },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    officeReport.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
    });
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader
        title="Visão Executiva"
        subtitle="O que o Menin Office já faz pela empresa, com os números medidos no próprio sistema."
        eyebrow="Sobre o Office"
        icon="fas fa-file-lines">
        <template #actions>
          <Button variant="secondary" icon="fas fa-file-pdf"
                  :loading="exporting" @click="exportPdf">
            Exportar PDF
          </Button>
          <PageHelp
            storage-key="sobre-relatorio"
            title="Como usar a Visão Executiva"
            intro="É o documento de apresentação do Office em formato de leitura: começa pelo resumo, passa pelos ganhos já medidos e termina no que vem a seguir."
            :steps="[
              { title: 'Navegar', text: 'Use o índice para pular direto para uma seção. No computador ele acompanha a rolagem e destaca onde você está.' },
              { title: 'Ler os números', text: 'Os blocos em destaque trazem economia já realizada e potencial mapeado; as tabelas detalham a origem de cada número.' },
              { title: 'Ver o desenho', text: 'O botão Mapa do sistema mostra o mesmo conteúdo em forma de mapa mental, bom para ter a visão geral antes de ler.' },
            ]"
            :tips="['Os valores são do acumulado até 4 de agosto de 2026 e saem das telas do próprio Office, não de estimativa.']" />
        </template>
      </PageHeader>

      <SobreNav />

      <!-- Números de topo: ao vivo quando o backend responde -->
      <HighlightCards :items="highlights" :updated-label="updatedLabel" :is-live="isLive" class="mb-6" />

      <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">

        <!-- Índice -->
        <aside class="lg:sticky lg:top-4 lg:self-start">
          <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Neste documento</p>
          <nav class="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar -mx-1 px-1">
            <button v-for="(section, i) in reportSections" :key="section.id" type="button"
                    @click="goTo(section.id)"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 min-h-[40px] text-left text-sm
                           whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink
                           border transition-all duration-150 ease-out-expo"
                    :class="activeId === section.id
                      ? 'bg-accent-soft text-accent border-accent/30 font-medium'
                      : 'bg-surface-raised text-ink-muted border-line hover:text-ink hover:border-line-strong'">
              <span class="font-mono text-[10px] opacity-70">{{ i + 1 }}</span>
              <span class="truncate lg:whitespace-normal">{{ section.title }}</span>
            </button>
          </nav>
        </aside>

        <!-- Conteúdo -->
        <div class="min-w-0 space-y-10">
          <section v-for="(section, si) in reportSections" :key="section.id" :id="section.id"
                   class="scroll-mt-20">
            <header class="flex items-center gap-3 mb-4 pb-2 border-b border-line">
              <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent
                           border border-accent/20 shrink-0">
                <i :class="section.icon"></i>
              </span>
              <h2 class="text-base sm:text-xl font-semibold text-ink tracking-tight">
                <span class="font-mono text-sm text-ink-subtle mr-1.5">{{ si + 1 }}.</span>
                {{ section.title }}
              </h2>
            </header>

            <div class="space-y-4">
              <template v-for="(block, bi) in section.blocks" :key="bi">

                <!-- Parágrafo -->
                <p v-if="block.type === 'p'" class="text-sm text-ink-muted leading-relaxed">
                  {{ block.text }}
                </p>

                <!-- Destaque -->
                <blockquote v-else-if="block.type === 'quote'"
                            class="border-l-[3px] border-accent bg-accent-soft/40 rounded-r-lg pl-4 pr-3 py-3">
                  <p class="text-sm sm:text-base text-ink font-medium leading-relaxed">{{ block.text }}</p>
                </blockquote>

                <!-- Números -->
                <div v-else-if="block.type === 'kpis'">
                  <p v-if="block.caption" class="text-xs text-ink-subtle mb-2">{{ block.caption }}</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div v-for="item in block.items" :key="item.l"
                         class="rounded-xl border border-line bg-surface-raised surface-gradient shadow-soft p-4">
                      <p class="text-xl font-semibold text-accent tracking-tight tabular-nums">{{ item.v }}</p>
                      <p class="text-xs font-medium text-ink mt-1">{{ item.l }}</p>
                      <p class="text-[11px] text-ink-subtle leading-snug mt-1">{{ item.s }}</p>
                    </div>
                  </div>
                </div>

                <!-- Tabela: vira cartão no celular -->
                <div v-else-if="block.type === 'table'">
                  <p v-if="block.caption" class="text-xs text-ink-subtle mb-2">{{ block.caption }}</p>

                  <div class="hidden sm:block overflow-x-auto rounded-xl border border-line">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="bg-surface-sunken">
                          <th v-for="h in block.head" :key="h"
                              class="text-left font-mono text-[10px] uppercase tracking-wider text-ink-subtle
                                     px-3 py-2 border-b border-line">
                            {{ h }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, ri) in block.rows" :key="ri"
                            class="border-b border-line last:border-0 align-top">
                          <td v-for="(cell, ci) in row" :key="ci"
                              class="px-3 py-2.5 leading-relaxed"
                              :class="ci === 0 ? 'font-medium text-ink whitespace-nowrap' : 'text-ink-muted'">
                            {{ cell }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="sm:hidden space-y-2">
                    <div v-for="(row, ri) in block.rows" :key="ri"
                         class="rounded-xl border border-line bg-surface-raised shadow-soft p-3">
                      <p class="text-sm font-semibold text-ink">{{ row[0] }}</p>
                      <div v-for="(cell, ci) in row.slice(1)" :key="ci" class="mt-2">
                        <p v-if="cell" class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                          {{ block.head[ci + 1] }}
                        </p>
                        <p v-if="cell" class="text-xs text-ink-muted leading-relaxed">{{ cell }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Lista -->
                <div v-else-if="block.type === 'list'">
                  <p v-if="block.caption" class="text-sm font-semibold text-ink mb-2">{{ block.caption }}</p>
                  <ul class="space-y-2">
                    <li v-for="(item, ii) in block.items" :key="ii" class="flex gap-2.5">
                      <i class="fas fa-circle text-[5px] text-accent mt-2 shrink-0"></i>
                      <span class="text-sm text-ink-muted leading-relaxed">{{ item }}</span>
                    </li>
                  </ul>
                </div>

                <!-- Módulo -->
                <article v-else-if="block.type === 'module'"
                         class="rounded-xl border border-line bg-surface-raised surface-gradient shadow-soft
                                border-l-[3px] border-l-accent p-4">
                  <h3 class="text-sm sm:text-base font-semibold text-ink mb-2">{{ block.name }}</h3>
                  <dl class="space-y-2">
                    <div v-for="field in [
                           { k: 'O que é', v: block.what },
                           { k: 'Resultado', v: block.result },
                           { k: 'Novidade', v: block.extra },
                           { k: 'Por que existe', v: block.why },
                         ].filter(f => f.v)" :key="field.k">
                      <dt class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">{{ field.k }}</dt>
                      <dd class="text-sm text-ink-muted leading-relaxed">{{ field.v }}</dd>
                    </div>
                  </dl>
                </article>

              </template>
            </div>
          </section>

          <p class="text-[11px] text-ink-subtle border-t border-line pt-4">
            Menin Office, Visão Executiva de agosto de 2026. Valores no acumulado até 4 de agosto de 2026,
            medidos nas telas do próprio sistema.
          </p>
        </div>
      </div>
    </PageContainer>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
