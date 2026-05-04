module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js",
    "./node_modules/flowbite-vue/**/*.{js,vue,ts}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // semantic surfaces (theme via CSS vars)
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
          overlay: 'rgb(var(--surface-overlay) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ink-subtle) / <alpha-value>)',
          inverted: 'rgb(var(--ink-inverted) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
          subtle: 'rgb(var(--line-subtle) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          ring: 'rgb(var(--accent-ring) / <alpha-value>)',
        },
      },
      borderRadius: {
        // padronização: chips/badges (md), inputs/buttons (lg), cards (xl), modais (2xl)
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        // Sombras com leve tint azul (mais "vivas" que preto puro)
        'soft':         '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.04)',
        'elevated':     '0 4px 14px -3px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        'overlay':      '0 16px 40px -10px rgb(15 23 42 / 0.22), 0 6px 14px -4px rgb(15 23 42 / 0.10)',
        'glow-accent':  '0 0 0 4px rgb(59 130 246 / 0.15)',
        'inner-soft':   'inset 0 1px 2px 0 rgb(0 0 0 / 0.04)',
        // Inset highlight no topo (efeito "borda de luz" sutil)
        'highlight':    'inset 0 1px 0 0 rgb(255 255 255 / 0.08)',
        'highlight-strong': 'inset 0 1px 0 0 rgb(255 255 255 / 0.14)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.4s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require("flowbite/plugin")
  ]
}
