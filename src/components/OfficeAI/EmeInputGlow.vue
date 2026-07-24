<script setup>
// Halo colorido preso ao input da Eme: blobs pequenos, com deriva lenta.
// Diferente da aura antiga (removida), o alcance fica na vizinhança imediata do
// input — blobs de ~110px com blur 26 e órbita curta, em vez de 270px com blur
// 48 e órbita 140. Camada de cor cobrindo área larga achata o contraste da tela
// (some o preto do fundo), principalmente no tema escuro.
// Movimento: deriva simples (vai e volta em X/Y). `delay` negativo dessincroniza
// os blobs para não pulsarem todos juntos.
const blobs = [
  { color: '#3b82f6', size: '200px', dx: '26px',  dy: '-14px', d: '13s', delay: '0s',  x: '8%',  y: '50%' },
  { color: '#8b5cf6', size: '170px', dx: '-22px', dy: '16px',  d: '17s', delay: '-3s', x: '28%', y: '50%' },
  { color: '#06b6d4', size: '160px', dx: '18px',  dy: '18px',  d: '11s', delay: '-6s', x: '48%', y: '50%' },
  { color: '#6366f1', size: '150px', dx: '-25px', dy: '-16px', d: '15s', delay: '-2s', x: '68%', y: '50%' },
  { color: '#ec4899', size: '140px', dx: '20px',  dy: '8px', d: '19s', delay: '-8s', x: '88%', y: '50%' },
];
</script>

<template>
  <div class="glow" aria-hidden="true">
    <span v-for="(b, i) in blobs" :key="i" class="blob"
      :style="{ '--color': b.color, '--s': b.size, '--dx': b.dx, '--dy': b.dy,
                '--d': b.d, '--delay': b.delay, '--x': b.x, '--y': b.y }"></span>
  </div>
</template>

<style scoped>
.glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
}

.blob {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  margin-left: calc(var(--s) / -2);
  margin-top: calc(var(--s) / -2);
  background-color: var(--color);
  border-radius: 50%;
  filter: blur(26px);
  animation: glow-drift var(--d) ease-in-out infinite;
  animation-delay: var(--delay);
  will-change: transform;
}

/* Escuro: fundo é quase preto, qualquer cor por cima levanta o preto */
:global(html.dark) .glow { opacity: 0.14; }

@keyframes glow-drift {
  0%   { transform: translate(0, 0); }
  50%  { transform: translate(var(--dx), var(--dy)); }
  100% { transform: translate(0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .blob { animation: none; }
}
</style>
