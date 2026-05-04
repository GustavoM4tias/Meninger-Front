// Tokens de classes reutilizáveis (Tailwind) — centralizam o padrão visual.

export const sizeMap = {
  sm: { padX: 'px-2.5', padY: 'py-1.5', text: 'text-xs', height: 'h-8', gap: 'gap-1.5', radius: 'rounded-md' },
  md: { padX: 'px-3.5', padY: 'py-2',   text: 'text-sm', height: 'h-9', gap: 'gap-2',   radius: 'rounded-lg' },
  lg: { padX: 'px-4',   padY: 'py-2.5', text: 'text-sm', height: 'h-11',gap: 'gap-2',   radius: 'rounded-lg' },
};

export const buttonVariants = {
  primary: [
    'bg-accent text-white border border-accent',
    'hover:bg-accent-hover hover:border-accent-hover',
    'active:scale-[0.98]',
    'shadow-soft hover:shadow-elevated',
  ].join(' '),
  secondary: [
    'bg-surface-raised text-ink border border-line',
    'hover:bg-surface-sunken hover:border-line-strong',
    'active:scale-[0.98]',
  ].join(' '),
  ghost: [
    'bg-transparent text-ink-muted border border-transparent',
    'hover:bg-surface-sunken hover:text-ink',
    'active:scale-[0.98]',
  ].join(' '),
  outline: [
    'bg-transparent text-ink border border-line',
    'hover:bg-surface-sunken hover:border-line-strong',
    'active:scale-[0.98]',
  ].join(' '),
  danger: [
    'bg-red-600 text-white border border-red-600',
    'hover:bg-red-700 hover:border-red-700',
    'active:scale-[0.98]',
    'shadow-soft hover:shadow-elevated',
  ].join(' '),
  subtle: [
    'bg-accent-soft text-accent border border-transparent',
    'hover:bg-accent/15',
    'active:scale-[0.98]',
  ].join(' '),
};

export const fieldBase = [
  'w-full bg-surface-raised text-ink',
  'border border-line',
  'placeholder:text-ink-subtle',
  'shadow-inner-soft',
  'transition-all duration-150 ease-out-expo outline-none',
  'focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-sunken',
].join(' ');

export const labelBase =
  'block text-xs font-medium text-ink-muted mb-1.5';
