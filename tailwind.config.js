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
      fontSize: {
        // PISO DE LEGIBILIDADE: 11px. A diretoria lê o Office no celular, então
        // nada abaixo disso. Use `text-micro` no lugar de text-[10px]/[9px]/[8px].
        micro: ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.005em' }],  // 11px
        // Escala de MÉTRICA: o número é o elemento mais forte da tela, então tem
        // escala própria (tracking negativo + entrelinha curta). Sempre com
        // `tabular-nums` para a coluna não dançar quando o valor muda.
        'metric-sm': ['1.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],   // 20px
        metric: ['1.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],       // 28px
        'metric-lg': ['2.25rem', { lineHeight: '1', letterSpacing: '-0.035em' }],    // 36px
        'metric-xl': ['3rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],     // 48px
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
        // ── Cores de DADO (nunca de interface) ────────────────────────────
        // Série categórica de 8 slots, ordem FIXA: a cor segue a entidade, não
        // a posição no filtro. Validada nos dois temas (banda de luminância,
        // croma, separação para daltonismo e contraste contra a superfície).
        // Nunca cicle: a 9ª série vira "Outros" ou vai para gráficos separados.
        // `series-N`      = MARCA (traço, ponto, ícone): forte, para ser vista pequena
        // `series-N-soft` = ÁREA  (barra, faixa, fatia larga): um tom mais leve
        series: {
          1: 'rgb(var(--series-1) / <alpha-value>)',
          2: 'rgb(var(--series-2) / <alpha-value>)',
          3: 'rgb(var(--series-3) / <alpha-value>)',
          4: 'rgb(var(--series-4) / <alpha-value>)',
          5: 'rgb(var(--series-5) / <alpha-value>)',
          6: 'rgb(var(--series-6) / <alpha-value>)',
          7: 'rgb(var(--series-7) / <alpha-value>)',
          8: 'rgb(var(--series-8) / <alpha-value>)',
          '1-soft': 'rgb(var(--series-1-soft) / <alpha-value>)',
          '2-soft': 'rgb(var(--series-2-soft) / <alpha-value>)',
          '3-soft': 'rgb(var(--series-3-soft) / <alpha-value>)',
          '4-soft': 'rgb(var(--series-4-soft) / <alpha-value>)',
          '5-soft': 'rgb(var(--series-5-soft) / <alpha-value>)',
          '6-soft': 'rgb(var(--series-6-soft) / <alpha-value>)',
          '7-soft': 'rgb(var(--series-7-soft) / <alpha-value>)',
          '8-soft': 'rgb(var(--series-8-soft) / <alpha-value>)',
        },
        // Estado do dado. RESERVADAS: nunca use como "série 4".
        // Sempre acompanhadas de ícone ou rótulo, nunca cor sozinha.
        data: {
          pos: 'rgb(var(--data-pos) / <alpha-value>)',
          'pos-soft': 'rgb(var(--data-pos-soft) / <alpha-value>)',
          neg: 'rgb(var(--data-neg) / <alpha-value>)',
          'neg-soft': 'rgb(var(--data-neg-soft) / <alpha-value>)',
          warn: 'rgb(var(--data-warn) / <alpha-value>)',
          'warn-soft': 'rgb(var(--data-warn-soft) / <alpha-value>)',
          neutral: 'rgb(var(--data-neutral) / <alpha-value>)',
        },
        // Fundo do modal. Sempre escuro nos dois temas (ver --scrim).
        scrim: 'rgb(var(--scrim) / <alpha-value>)',
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
        // Sombra/brilho azul para hover de cards e itens
        'glow-blue':    '0 10px 30px -6px rgb(59 130 246 / 0.45), 0 0 0 1px rgb(59 130 246 / 0.12)',
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
        // Halo pulsante de luz (logo/avatar "vivo") — bem visível
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(59 130 246 / 0.55), 0 0 22px 3px rgb(59 130 246 / 0.30)' },
          '50%':      { boxShadow: '0 0 0 12px rgb(59 130 246 / 0.00), 0 0 46px 12px rgb(59 130 246 / 0.60)' },
        },
        // Anel pulsante em pontinho de "ativo"
        'dot-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(16 185 129 / 0.60)' },
          '50%':      { boxShadow: '0 0 0 5px rgb(16 185 129 / 0.00)' },
        },
        // Selo/badge "pousando" depois que o número chega. Overshoot curto:
        // dá vida sem parecer brinquedo.
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.82)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Traço se desenhando (sparkline em linha). Depende de o elemento
        // definir --len com o comprimento do path.
        'draw': {
          '0%': { strokeDashoffset: 'var(--len, 200)' },
          '100%': { strokeDashoffset: '0' },
        },
        // Barra crescendo da base (sparkline em barras, entrada de gráfico).
        'grow': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        // Sombra verde pulsante no selo "Eme · Assistente" (suave)
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(16 185 129 / 0.28), 0 0 8px 0 rgb(16 185 129 / 0.10)' },
          '50%':      { boxShadow: '0 0 0 3px rgb(16 185 129 / 0.00), 0 0 14px 2px rgb(16 185 129 / 0.26)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.4s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.6s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 1.8s ease-in-out infinite',
        'glow-green': 'glow-green 2s ease-in-out infinite',
        // chegada de dado: o selo de variação "pousa" depois do número subir
        'pop-in': 'pop-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        // sparkline em linha se desenhando da esquerda para a direita
        'draw': 'draw 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // barra do sparkline crescendo da base
        'grow': 'grow 460ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        // Curva ÚNICA do sistema. Todo movimento usa esta, exceto o "pouso"
        // com leve overshoot dos selos (pop-in).
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        // Três durações, e só. 120 = resposta de controle (hover, foco),
        // 200 = mudança de estado, 420 = entrada de conteúdo.
        120: '120ms',
        200: '200ms',
        420: '420ms',
      },
    },
  },
  plugins: [
    require("flowbite/plugin")
  ]
}
