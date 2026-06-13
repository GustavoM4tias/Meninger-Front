<script setup>
// Mini-placar flutuante ao vivo. Aparece sozinho quando há jogo do bolão rolando:
// bandeiras, placar e tempo decorrido. É ARRASTÁVEL (clica e segura pra mover, a
// posição fica salva) e tem um BOTÃO no canto que abre /bolao. Montado no App.vue.
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBolaoStore } from '@/stores/Bolao/bolaoStore';

const store = useBolaoStore();
const router = useRouter();

const live = computed(() => store.live);
const visible = computed(() => !!live.value && ['live', 'halftime'].includes(live.value.status));

const minuteLabel = computed(() => {
  const l = live.value;
  if (!l) return '';
  if (l.status === 'halftime' || l.period === 'HT') return 'INTERVALO';
  if (l.period === 'FT') return 'FIM';
  return l.minute != null ? `${l.minute}'` : (l.period || '');
});

const flagUrl = (c) => (c ? `/flags/${c}.png` : '');

function goTo() { router.push('/bolao'); }

// ── Posição (persistida) + arraste ────────────────────────────────────────────
const POS_KEY = 'bolao:badge:pos';
const W = 240, H = 100;            // dimensões aproximadas p/ clamp
const DEFAULT_POS = { right: 12, top: 80 };
const pos = ref({ ...DEFAULT_POS });
const isDragging = ref(false);

function clampPos(p) {
  const pad = 8;
  return {
    right: Math.max(pad, Math.min(p.right, window.innerWidth - W - pad)),
    top: Math.max(pad, Math.min(p.top, window.innerHeight - H - pad)),
  };
}
function loadPos() {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p?.right === 'number' && typeof p?.top === 'number') pos.value = clampPos(p);
  } catch { /* ignore */ }
}
function savePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

const cardStyle = computed(() => ({ right: `${pos.value.right}px`, top: `${pos.value.top}px` }));

let startX = 0, startY = 0, startPos = null, downForDrag = false;
function onPointerDown(e) {
  downForDrag = true;
  isDragging.value = false;
  startX = e.clientX; startY = e.clientY; startPos = { ...pos.value };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}
function onPointerMove(e) {
  if (!downForDrag) return;
  const dx = e.clientX - startX, dy = e.clientY - startY;
  if (!isDragging.value && Math.hypot(dx, dy) > 4) isDragging.value = true;
  if (isDragging.value) {
    // right cresce para a esquerda (oposto do X); top acompanha o Y.
    pos.value = clampPos({ right: startPos.right - dx, top: startPos.top + dy });
  }
}
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  if (isDragging.value) savePos(pos.value);
  downForDrag = false;
  setTimeout(() => { isDragging.value = false; }, 0);
}
function onResize() { pos.value = clampPos(pos.value); }

let timer = null;
const onVis = () => { if (!document.hidden) store.fetchLive(); };
onMounted(() => {
  loadPos();
  store.fetchLive();
  timer = setInterval(() => { if (!document.hidden) store.fetchLive(); }, 30000);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="bolao-pop">
      <div
        v-if="visible"
        :style="cardStyle"
        aria-label="Placar ao vivo do bolão"
        @pointerdown="onPointerDown"
        :class="[
          'fixed z-50 w-60 select-none touch-none overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-xl',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        ]">
        <!-- Header (faixa AO VIVO + minuto) -->
        <div class="flex items-center justify-between px-3 py-1.5 pr-9 bg-green-600/10 border-b border-gray-100 dark:border-gray-800">
          <span class="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            AO VIVO
          </span>
          <span class="text-[11px] font-bold tabular-nums text-green-700 dark:text-green-300">{{ minuteLabel }}</span>
        </div>

        <!-- Botão no canto: abre o bolão (não inicia arraste) -->
        <button
          type="button"
          @pointerdown.stop
          @click.stop="goTo"
          title="Abrir o Bolão da Copa"
          aria-label="Abrir o Bolão da Copa"
          class="absolute top-1.5 right-2 h-6 w-6 grid place-items-center rounded-md text-green-700 dark:text-green-300
                 hover:bg-green-600/15 transition-colors cursor-pointer">
          <i class="fas fa-up-right-from-square text-[11px]"></i>
        </button>

        <!-- Times -->
        <div class="px-3 py-2 space-y-1.5">
          <div class="flex items-center gap-2">
            <img v-if="flagUrl(live.home_country)" :src="flagUrl(live.home_country)" class="h-4 w-6 rounded-sm object-cover shrink-0 pointer-events-none" :alt="live.home_team" />
            <span class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ live.home_team }}</span>
            <span class="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{{ live.home }}</span>
          </div>
          <div class="flex items-center gap-2">
            <img v-if="flagUrl(live.away_country)" :src="flagUrl(live.away_country)" class="h-4 w-6 rounded-sm object-cover shrink-0 pointer-events-none" :alt="live.away_team" />
            <span class="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ live.away_team }}</span>
            <span class="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{{ live.away }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bolao-pop-enter-active, .bolao-pop-leave-active { transition: opacity .25s ease, transform .25s cubic-bezier(.34, 1.56, .64, 1); }
.bolao-pop-enter-from, .bolao-pop-leave-to { transform: scale(.92); opacity: 0; }
</style>
