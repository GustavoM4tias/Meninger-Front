// Temas de layout do relatório.
// Cada tema define fonte, cor de acento, cantos e densidade. O ReportRenderer
// aplica as variáveis CSS no container; os blocos leem via var(--rp-*), então
// nenhum bloco precisa saber qual tema está ativo.
//
// As cores são pares [light, dark] em RGB "r g b" (mesmo formato dos tokens
// do design system), para o dark mode continuar funcionando.

export const REPORT_THEMES = {
  classic: {
    label: 'Clássico',
    description: 'Serifado editorial, azul institucional. O padrão da casa.',
    swatch: '#2563eb',
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
    label: 'Executivo',
    description: 'Grafite sóbrio, denso, cantos retos. Para diretoria.',
    swatch: '#334155',
    vars: {
      '--rp-font-display': "'Inter', system-ui, sans-serif",
      '--rp-font-body': "'Inter', system-ui, sans-serif",
      '--rp-accent': '51 65 85',
      '--rp-accent-dark': '148 163 184',
      '--rp-radius': '0.375rem',
      '--rp-gap': '1rem',
      '--rp-title-weight': '600',
    },
  },
  vibrant: {
    label: 'Vibrante',
    description: 'Laranja quente e cantos generosos. Para apresentações.',
    swatch: '#ea580c',
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
    label: 'Minimalista',
    description: 'Quase sem cor, tipografia no comando. Elegante e discreto.',
    swatch: '#0f172a',
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
