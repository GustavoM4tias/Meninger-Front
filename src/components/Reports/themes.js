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
//
// DALTONISMO (2026-08-23): as 18 paletas reprovavam na separação sob visão
// daltônica. O tema Clássico tinha rosa e verde a ΔE 1,1 sob deuteranopia -
// duas séries que, para 1 em cada 12 homens, eram literalmente a mesma cor. E
// vários amarelos ficavam abaixo de 3:1 contra o papel branco.
//
// O conserto foi feito mexendo o MÍNIMO, e nesta ordem:
//   1. trocar a ORDEM dos slots, porque o que se mede é o par vizinho e
//      reordenar não repinta nada;
//   2. mexer na LUMINÂNCIA da cor que sobrou quebrando, que é o eixo que
//      nenhum tipo de daltonismo perde;
//   3. só então mexer na matiz, em passos pequenos.
// O slot 0 nunca se move: é o acento do tema, a cor que a pessoa escolheu.
// Resultado: pior par de 0,3-9,5 para 13,1-19,5 (piso 8), visão normal >= 20
// (piso 15) e todo mundo acima de 3:1. A maioria das paletas manteve as cores
// originais - só mudaram de posição.
//
// Ao mexer aqui, revalide: o script está em _design/paletas-relatorio.mjs.

export const REPORT_THEMES = {
  classic: {
    label: 'Clássico',
    description: 'Serifado editorial, azul institucional. O padrão da casa.',
    swatch: '#2563eb',
    series:     ['#2563eb', '#ea580c', '#069697', '#005e25', '#7c3aed', '#db2777', '#64748b'],
    seriesDark: ['#60a5fa', '#4af1fe', '#a78bfa', '#fb923c', '#60f4b8', '#f472b6', '#94a3b8'],
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
    series:     ['#7c3aed', '#009eb8', '#cf0742', '#1d469d', '#ef640c', '#006141', '#64748b'],
    seriesDark: ['#a78bfa', '#fb7185', '#40e4ff', '#e9af07', '#0b95b4', '#34d399', '#94a3b8'],
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
    series:     ['#1e3a5f', '#0184a5', '#7e3400', '#568d00', '#9f1239', '#6d28d9', '#64748b'],
    seriesDark: ['#93b4d8', '#caa300', '#0df6f1', '#ff8799', '#b9ec5e', '#c4b5fd', '#cbd5e1'],
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
    series:     ['#ea580c', '#9c002a', '#7c3aed', '#0891b2', '#733e00', '#2c8f4b', '#64748b'],
    seriesDark: ['#fb923c', '#a78bfa', '#d85168', '#22d3ee', '#a48d00', '#4ade80', '#94a3b8'],
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
    series:     ['#059669', '#005479', '#c18300', '#0f766e', '#7c3aed', '#736200', '#64748b'],
    seriesDark: ['#34d399', '#a48d00', '#00a0b6', '#a3e635', '#0ea79a', '#c4b5fd', '#94a3b8'],
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
  ocean: {
    label: 'Oceano',
    description: 'Turquesa e azul profundo. Fresco, alto contraste.',
    swatch: '#0d9488',
    series:     ['#0d9488', '#7c3600', '#005a8d', '#4d7c0f', '#7c3aed', '#e11d48', '#64748b'],
    seriesDark: ['#2dd4bf', '#a78bfa', '#fe8d9a', '#a3e635', '#0097ae', '#b8a001', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Inter', system-ui, sans-serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '13 148 136',
      '--rp-accent-dark': '45 212 191',
      '--rp-radius': '0.875rem',
      '--rp-gap': '1.25rem',
      '--rp-title-weight': '700',
    },
  },
  sunset: {
    label: 'Pôr do sol',
    description: 'Coral, magenta e âmbar. Quente e expressivo.',
    swatch: '#f43f5e',
    series:     ['#e11d48', '#c026d3', '#8c1f00', '#0d9488', '#4f46e5', '#916100', '#64748b'],
    seriesDark: ['#fb7185', '#ffcd95', '#e879f9', '#eccf2f', '#2dd4bf', '#818cf8', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '225 29 72',
      '--rp-accent-dark': '251 113 133',
      '--rp-radius': '1.25rem',
      '--rp-gap': '1.5rem',
      '--rp-title-weight': '600',
    },
  },
  berry: {
    label: 'Framboesa',
    description: 'Magenta e violeta saturados. Para destacar resultado.',
    swatch: '#c026d3',
    series:     ['#c026d3', '#e11d48', '#593c9c', '#437200', '#0891b2', '#d6791c', '#64748b'],
    seriesDark: ['#e879f9', '#6ea202', '#936dd8', '#22d3ee', '#fb7185', '#fbbf24', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Inter', system-ui, sans-serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '192 38 211',
      '--rp-accent-dark': '232 121 249',
      '--rp-radius': '1rem',
      '--rp-gap': '1.25rem',
      '--rp-title-weight': '700',
    },
  },
  citrus: {
    label: 'Cítrico',
    description: 'Lima e tangerina. Energia sem perder legibilidade.',
    swatch: '#65a30d',
    series:     ['#65a30d', '#00718c', '#c18300', '#c026d3', '#bd4200', '#0d9488', '#64748b'],
    seriesDark: ['#a3e635', '#40e4ff', '#fb923c', '#e879f9', '#eccf2f', '#2dd4bf', '#94a3b8'],
    vars: {
      '--rp-font-display': "'Fraunces', Georgia, serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '101 163 13',
      '--rp-accent-dark': '163 230 53',
      '--rp-radius': '0.875rem',
      '--rp-gap': '1.5rem',
      '--rp-title-weight': '600',
    },
  },
  // NEUTRO DE PROPÓSITO: é o único tema sem cor, e é isso que ele vende. Ele
  // reprova no piso de croma do validador porque é cinza, não por engano - e
  // já passa na separação sob daltonismo (ΔE 16,8), justamente por ser uma
  // escala de luminância. Não pinte este tema.
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

// ── Cores SEMÂNTICAS de gráfico ──────────────────────────────────────────────
// Independentes do tema, de propósito: "bom/atenção/ruim" tem que significar a
// mesma coisa em qualquer relatório. Servem para o caso em que a cor carrega
// intenção, não identidade — ex.: pago antes do vencimento (verde) x depois
// (vermelho). A paleta do tema continua valendo quando a cor só distingue
// séries entre si.
const CHART_TONES = {
  success: ['#059669', '#34d399'],
  warning: ['#d97706', '#fbbf24'],
  danger:  ['#dc2626', '#f87171'],
  info:    ['#0284c7', '#38bdf8'],
  neutral: ['#64748b', '#94a3b8'],
}

export const CHART_TONE_KEYS = Object.keys(CHART_TONES)

/**
 * Resolve a cor de uma série. `tone` semântico vence; 'accent' e ausência
 * caem na paleta do tema (pela posição da série).
 */
export function seriesColor({ tone, index = 0, themeKey = 'classic', dark = false }) {
  const pair = CHART_TONES[tone]
  if (pair) return dark ? pair[1] : pair[0]
  const palette = themePalette(themeKey, dark)
  return palette[index % palette.length]
}

/**
 * A MESMA cor, na versão de ÁREA — para o que PREENCHE (barra, fatia), em
 * oposição ao que MARCA (linha, ponto, quadradinho da legenda).
 *
 * Não precisa de paleta nova: cada tema já traz dois passos da mesma matiz, e
 * eles se invertem entre os temas. No claro, a área é o passo mais CLARO (o que
 * o tema chama de `seriesDark`); no escuro, é o mais FUNDO (`series`). Cor cheia
 * cobrindo um bloco pesa no branco e brilha no preto — nos dois casos, o passo
 * vizinho assenta.
 */
export function seriesFill({ tone, index = 0, themeKey = 'classic', dark = false }) {
  const pair = CHART_TONES[tone]
  if (pair) return dark ? pair[0] : pair[1]
  const palette = themePalette(themeKey, !dark)   // <- de propósito invertido
  return palette[index % palette.length]
}
