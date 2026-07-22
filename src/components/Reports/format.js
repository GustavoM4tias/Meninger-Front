// Helpers de formatação compartilhados pelos blocos de relatório.
// Valores podem chegar prontos (string) ou crus (number) + format.

const nf = new Intl.NumberFormat('pt-BR')
const cf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const cfCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
})

export function formatValue(value, format = 'text') {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' && format === 'text') return value
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\./g, '').replace(',', '.'))
  if (Number.isNaN(n)) return String(value)
  switch (format) {
    case 'number': return nf.format(n)
    case 'currency': return cf.format(n)
    case 'currency-compact': return cfCompact.format(n)
    case 'percent': return `${nf.format(Math.round(n * 10) / 10)}%`
    case 'date': {
      const d = new Date(typeof value === 'string' ? value : n)
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('pt-BR')
    }
    default: return String(value)
  }
}

// Tons semânticos usados em stats, badges e destaques dos blocos.
export const TONES = {
  neutral: { text: 'text-ink-muted', bg: 'bg-surface-sunken', dot: 'bg-ink-subtle' },
  accent: { text: 'text-accent', bg: 'bg-accent-soft', dot: 'bg-accent' },
  success: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  warning: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  danger: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
  info: { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', dot: 'bg-sky-500' },
}

export function tone(name) {
  return TONES[name] || TONES.neutral
}
