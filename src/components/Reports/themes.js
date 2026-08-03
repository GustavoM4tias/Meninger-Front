// Temas de layout do relatório.
// Cada tema define fonte, cor de acento, cantos, densidade e a PALETA DE DADOS.
// O ReportRenderer aplica as variáveis CSS no container; os blocos leem via
// var(--rp-*), então nenhum bloco precisa saber qual tema está ativo.
//
// As cores são pares [light, dark] em RGB "r g b" (mesmo formato dos tokens
// do design system), para o dark mode continuar funcionando.
//
// PALETA DE DADOS (`series`/`seriesDark`): cores das séries de gráfico, uma por
// tema. Antes o ChartBlock tinha a própria lista hardcoded — um acento por tema
// (dessincronizado deste arquivo) mais uma paleta de apoio arco-íris igual para
// todos. Resultado: gráfico multi-série saía sem relação com o tema, e temas de
// acento neutro (executivo/minimalista) renderizavam praticamente sem cor.
// Agora a paleta mora aqui, junto do acento, e é a única fonte da verdade.

export const REPORT_THEMES = {
  classic: {
    label: 'Clássico',
    description: 'Serifado editorial, azul institucional. O padrão da casa.',
    swatch: '#2563eb',
    series:     ['#2563eb', '#0891b2', '#7c3aed', '#ea580c', '#059669', '#db2777', '#64748b'],
    seriesDark: ['#60a5fa', '#22d3ee', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '37 99 235',
      '--rp-accent-dark': '59 130 246',
      '--rp-radius': '0.75rem',
      '--rp-gap': '1.25rem',
      '--rp-title-weight': '400',
    },
  },
  modern: {
    label: 'Moderno',
    description: 'Sem serifa, cantos suaves, roxo. Ar de produto digital.',
    swatch: '#7c3aed',
    series:     ['#7c3aed', '#2563eb', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#64748b'],
    seriesDark: ['#a78bfa', '#60a5fa', '#22d3ee', '#fb7185', '#fbbf24', '#34d399', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Inter', system-ui, sans-serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '124 58 237',
      '--rp-accent-dark': '167 139 250',
      '--rp-radius': '1rem',
      '--rp-gap': '1.25rem',
      '--rp-title-weight': '700',
    },
  },
  executive: {
    // Era grafite puro (#334155): sóbrio virou incolor, e todo relatório de
    // diretoria saía cinza. Agora é azul-marinho profundo — mantém a leitura
    // séria, mas o acento e a paleta de dados existem de verdade.
    label: 'Executivo',
    description: 'Azul-marinho profundo, denso, cantos retos. Para diretoria.',
    swatch: '#1e3a5f',
    series:     ['#1e3a5f', '#0e7490', '#b45309', '#4d7c0f', '#9f1239', '#6d28d9', '#64748b'],
    seriesDark: ['#93b4d8', '#67e8f9', '#fcd34d', '#bef264', '#fda4af', '#c4b5fd', '#cbd5e1'],
    vars: {
      '--rp-font-display': "'Inter', system-ui, sans-serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '30 58 95',
      '--rp-accent-dark': '147 180 216',
      '--rp-radius': '0.375rem',
      '--rp-gap': '1rem',
      '--rp-title-weight': '600',
    },
  },
  vibrant: {
    label: 'Vibrante',
    description: 'Laranja quente e cantos generosos. Para apresentações.',
    swatch: '#ea580c',
    series:     ['#ea580c', '#e11d48', '#7c3aed', '#0891b2', '#ca8a04', '#15803d', '#64748b'],
    seriesDark: ['#fb923c', '#fb7185', '#a78bfa', '#22d3ee', '#fde047', '#4ade80', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '234 88 12',
      '--rp-accent-dark': '251 146 60',
      '--rp-radius': '1.25rem',
      '--rp-gap': '1.5rem',
      '--rp-title-weight': '600',
    },
  },
  nature: {
    label: 'Natural',
    description: 'Verde equilibrado, respiro amplo. Leitura tranquila.',
    swatch: '#059669',
    series:     ['#059669', '#0891b2', '#65a30d', '#ca8a04', '#0f766e', '#7c3aed', '#64748b'],
    seriesDark: ['#34d399', '#22d3ee', '#a3e635', '#fde047', '#5eead4', '#c4b5fd', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '5 150 105',
      '--rp-accent-dark': '52 211 153',
      '--rp-radius': '0.875rem',
      '--rp-gap': '1.5rem',
      '--rp-title-weight': '400',
    },
  },
  minimal: {
    // Discrição é a proposta, então a paleta é uma rampa de grafite com UM
    // azul de destaque — séries seguem distinguíveis sem quebrar o tom.
    label: 'Minimalista',
    description: 'Quase sem cor, tipografia no comando. Elegante e discreto.',
    swatch: '#0f172a',
    series:     ['#0f172a', '#64748b', '#2563eb', '#94a3b8', '#334155', '#a1a1aa', '#475569'],
    seriesDark: ['#e2e8f0', '#94a3b8', '#60a5fa', '#64748b', '#cbd5e1', '#a1a1aa', '#475569'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '15 23 42',
      '--rp-accent-dark': '226 232 240',
      '--rp-radius': '0.25rem',
      '--rp-gap': '1.75rem',
      '--rp-title-weight': '400',
    },
  },
}

export const THEME_KEYS = Object.keys(REPORT_THEMES)

// Monta o style inline do container do relatório para o tema escolhido.
// `dark` troca o acento pela variante clara (contraste no fundo escuro).
export function themeVars(themeKey, dark = false) {
  const theme = REPORT_THEMES[themeKey] || REPORT_THEMES.classic
  const vars = { ...theme.vars }
  if (dark) vars['--rp-accent'] = vars['--rp-accent-dark']
  delete vars['--rp-accent-dark']
  return vars
}

/**
 * Paleta de séries do tema, já resolvida para o modo claro/escuro.
 * Fonte única das cores de gráfico — o ChartBlock consome daqui em vez de
 * manter a própria lista.
 */
export function themePalette(themeKey, dark = false) {
  const theme = REPORT_THEMES[themeKey] || REPORT_THEMES.classic
  const palette = dark ? theme.seriesDark : theme.series
  return palette?.length ? palette : REPORT_THEMES.classic.series
}
