<script setup>
/**
 * Skeleton — carregamento que não joga o layout fora.
 * ─────────────────────────────────────────────────────────────────────────────
 * O padrão do Office era Spinner centralizado no lugar do conteúdo: some tudo,
 * volta tudo, a página pula. O esqueleto ocupa a MESMA forma que o conteúdo vai
 * ocupar, então a tela não se mexe quando o dado chega.
 *
 * Spinner continua valendo para ação pontual DENTRO de um botão. Para carregar
 * a tela, use isto.
 *
 *   <Skeleton variant="stat" />
 *   <Skeleton variant="text" :lines="3" />
 *   <Skeleton variant="table" :lines="6" />
 *   <Skeleton variant="chart" height="h-64" />
 */
defineProps({
  /* text | title | stat | card | row | table | chart | circle */
  variant: { type: String, default: 'text' },
  lines: { type: Number, default: 3 },
  height: { type: String, default: '' },
});
</script>

<template>
  <!-- aria-hidden + role=status no pai: o leitor de tela anuncia "carregando",
       não lê 12 retângulos vazios -->
  <div role="status" aria-label="Carregando" class="animate-pulse-soft">

    <!-- linhas de texto: a última mais curta, como texto real -->
    <div v-if="variant === 'text'" class="space-y-2">
      <div v-for="i in lines" :key="i" class="h-3 rounded bg-surface-sunken"
        :class="i === lines ? 'w-3/5' : 'w-full'"></div>
    </div>

    <div v-else-if="variant === 'title'" class="space-y-2">
      <div class="h-5 w-2/5 rounded bg-surface-sunken"></div>
      <div class="h-3 w-3/5 rounded bg-surface-sunken"></div>
    </div>

    <!-- forma exata do StatCard, para a linha de KPI não pular -->
    <div v-else-if="variant === 'stat'"
      class="flex flex-col gap-2 p-3.5 rounded-xl border border-line bg-surface-raised">
      <div class="h-8 w-8 rounded-lg bg-surface-sunken"></div>
      <div class="h-7 w-4/5 rounded bg-surface-sunken mt-1"></div>
      <div class="h-3 w-3/5 rounded bg-surface-sunken"></div>
    </div>

    <div v-else-if="variant === 'card'" class="p-4 rounded-xl border border-line bg-surface-raised space-y-3"
      :class="height">
      <div class="h-4 w-2/5 rounded bg-surface-sunken"></div>
      <div class="h-3 w-full rounded bg-surface-sunken"></div>
      <div class="h-3 w-4/5 rounded bg-surface-sunken"></div>
    </div>

    <!-- linha de lista: avatar + duas linhas -->
    <div v-else-if="variant === 'row'" class="space-y-2.5">
      <div v-for="i in lines" :key="i" class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-surface-sunken shrink-0"></div>
        <div class="flex-1 space-y-1.5">
          <div class="h-3 rounded bg-surface-sunken" :style="{ width: `${55 + ((i * 13) % 35)}%` }"></div>
          <div class="h-2.5 w-1/4 rounded bg-surface-sunken"></div>
        </div>
      </div>
    </div>

    <!-- tabela: cabeçalho + linhas com larguras irregulares (parece dado real) -->
    <div v-else-if="variant === 'table'" class="rounded-xl border border-line overflow-hidden">
      <div class="h-10 bg-surface-sunken border-b border-line"></div>
      <div v-for="i in lines" :key="i"
        class="flex items-center gap-4 px-4 h-12 border-b border-line-subtle last:border-b-0">
        <div class="h-3 rounded bg-surface-sunken" :style="{ width: `${20 + ((i * 7) % 18)}%` }"></div>
        <div class="h-3 rounded bg-surface-sunken" :style="{ width: `${14 + ((i * 11) % 14)}%` }"></div>
        <div class="h-3 rounded bg-surface-sunken ml-auto" style="width:12%"></div>
      </div>
    </div>

    <!-- gráfico: barras de alturas variadas sobre a linha de base -->
    <div v-else-if="variant === 'chart'" class="flex items-end gap-2 px-2 pb-6 border-b border-line"
      :class="height || 'h-56'">
      <div v-for="i in 12" :key="i" class="flex-1 rounded-t bg-surface-sunken"
        :style="{ height: `${28 + ((i * 37) % 62)}%` }"></div>
    </div>

    <div v-else-if="variant === 'circle'" class="rounded-full bg-surface-sunken" :class="height || 'h-10 w-10'"></div>

    <div v-else class="h-3 w-full rounded bg-surface-sunken" :class="height"></div>
  </div>
</template>
