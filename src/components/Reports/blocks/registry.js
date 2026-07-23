// Registro do catálogo de blocos de relatório.
// O spec de um relatório é: { version: 1, blocks: [{ id, type, props }] }.
// Seções são delimitadas por blocos 'section-header'; o outline é derivado disso.
import { defineAsyncComponent } from 'vue'

const lazy = (loader) => defineAsyncComponent(loader)

export const BLOCK_COMPONENTS = {
  'hero': lazy(() => import('./HeroBlock.vue')),
  'section-header': lazy(() => import('./SectionHeaderBlock.vue')),
  'narrative': lazy(() => import('./NarrativeBlock.vue')),
  'stat-row': lazy(() => import('./StatRowBlock.vue')),
  'big-number': lazy(() => import('./BigNumberBlock.vue')),
  'progress-goal': lazy(() => import('./ProgressGoalBlock.vue')),
  'comparison': lazy(() => import('./ComparisonBlock.vue')),
  'chart-bar': lazy(() => import('./ChartBlock.vue')),
  'chart-line': lazy(() => import('./ChartBlock.vue')),
  'chart-donut': lazy(() => import('./ChartBlock.vue')),
  'chart-funnel': lazy(() => import('./FunnelBlock.vue')),
  'gauge': lazy(() => import('./GaugeBlock.vue')),
  'ranking': lazy(() => import('./RankingBlock.vue')),
  'map': lazy(() => import('./MapBlock.vue')),
  'table': lazy(() => import('./TableBlock.vue')),
  'timeline': lazy(() => import('./TimelineBlock.vue')),
  'highlight-list': lazy(() => import('./HighlightListBlock.vue')),
  'insight-box': lazy(() => import('./InsightBlock.vue')),
  'image': lazy(() => import('./ImageBlock.vue')),
  'divider': lazy(() => import('./DividerBlock.vue')),
  'note': lazy(() => import('./NoteBlock.vue')),
  'footer': lazy(() => import('./FooterBlock.vue')),
  'custom-html': lazy(() => import('./CustomHtmlBlock.vue')),
}

// Rótulos exibidos no outline da Eme flutuante e no painel admin.
export const BLOCK_LABELS = {
  'hero': 'Capa',
  'section-header': 'Seção',
  'narrative': 'Texto',
  'stat-row': 'Indicadores',
  'big-number': 'Número destaque',
  'progress-goal': 'Meta',
  'comparison': 'Comparativo',
  'chart-bar': 'Gráfico de barras',
  'chart-line': 'Gráfico de linha',
  'chart-donut': 'Gráfico de composição',
  'chart-funnel': 'Funil',
  'gauge': 'Termômetro',
  'ranking': 'Ranking',
  'map': 'Mapa',
  'table': 'Tabela',
  'timeline': 'Linha do tempo',
  'highlight-list': 'Destaques',
  'insight-box': 'Insight',
  'image': 'Imagem',
  'divider': 'Divisor',
  'note': 'Nota',
  'footer': 'Rodapé',
  'custom-html': 'Bloco personalizado',
}

export function blockComponent(type) {
  return BLOCK_COMPONENTS[type] || null
}

// Deriva o outline (seções + blocos) do spec, para a Eme flutuante.
export function specOutline(spec) {
  const blocks = spec?.blocks || []
  const outline = []
  let current = null
  for (const b of blocks) {
    if (b.type === 'hero') continue
    if (b.type === 'section-header') {
      current = { id: b.id, title: b.props?.title || 'Seção', num: b.props?.num, children: [] }
      outline.push(current)
    } else {
      const item = {
        id: b.id,
        type: b.type,
        label: b.props?.title || b.props?.label || BLOCK_LABELS[b.type] || b.type,
      }
      if (current) current.children.push(item)
      else outline.push({ id: b.id, title: item.label, children: [], loose: true, type: b.type })
    }
  }
  return outline
}
