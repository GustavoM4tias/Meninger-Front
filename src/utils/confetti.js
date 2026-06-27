// utils/confetti.js
// Confete leve e autocontido (sem dependência externa). Desenha num <canvas>
// fixo por cima da tela, solta partículas com gravidade e remove sozinho ao fim.
// Respeita "prefers-reduced-motion" (não dispara). Uso: fireConfetti().

const COLORS = ['#22c55e', '#facc15', '#3b82f6', '#f97316', '#ec4899', '#14b8a6', '#ffffff'];

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

/**
 * Dispara uma rajada de confete.
 * @param {object} opts
 * @param {number} [opts.particleCount=140] quantidade de partículas
 * @param {number} [opts.duration=2600] duração total (ms)
 * @param {number} [opts.spread=70] abertura do leque (graus)
 * @param {number} [opts.originY=0.32] altura de origem (0=topo, 1=base)
 */
export function fireConfetti(opts = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;

  const {
    particleCount = 140,
    duration = 2600,
    spread = 70,
    originY = 0.32,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  const rad = (deg) => (deg * Math.PI) / 180;

  // Dois focos (esquerda/direita) pra cobrir a largura, mirando pra cima.
  const origins = [
    { x: W() * 0.25, angle: -65 },
    { x: W() * 0.75, angle: -115 },
  ];

  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const o = origins[i % origins.length];
    const angle = rad(o.angle + (Math.random() - 0.5) * spread);
    const speed = 7 + Math.random() * 9;
    particles.push({
      x: o.x + (Math.random() - 0.5) * 40,
      y: H() * originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      tilt: Math.random(),
    });
  }

  const gravity = 0.22;
  const drag = 0.992;
  const start = performance.now();
  let raf = 0;

  function frame(now) {
    const elapsed = now - start;
    const lifeLeft = Math.max(0, 1 - elapsed / duration);
    ctx.clearRect(0, 0, W(), H());

    for (const p of particles) {
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      ctx.save();
      ctx.globalAlpha = lifeLeft;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      const w = p.size, h = p.size * 0.6;
      ctx.fillRect(-w / 2, -h / 2, w, h * (0.5 + Math.abs(Math.sin(p.tilt + elapsed / 200))));
      ctx.restore();
    }

    if (elapsed < duration) {
      raf = requestAnimationFrame(frame);
    } else {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  }
  raf = requestAnimationFrame(frame);
}

export default fireConfetti;
