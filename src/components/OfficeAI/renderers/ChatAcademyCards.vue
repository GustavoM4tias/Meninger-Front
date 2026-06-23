<script setup>
// Renderer flexível para resultados do Academy na Eme: cards com categoria,
// badges, seções (pré-requisitos…), botão de redirecionamento e PLAYER de vídeo
// INLINE (YouTube embed, lazy — só carrega ao clicar). Cada card é um objeto
// livre — tools diferentes (processos, certificados, comunidade) mapeiam seus
// dados para a mesma estrutura, sem ficar "engessado".
//
// card = {
//   icon?, tone?, category?, title, subtitle?, badges?: string[],
//   sections?: [{ label, items: string[] }],
//   link?, linkLabel?, videoUrl?,
// }
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
    action: { type: Object, required: true },
});

const router = useRouter();

const TONES = {
    accent: 'text-accent bg-accent-soft border-accent/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    slate: 'text-ink-muted bg-surface-sunken border-line',
};
function toneClass(t) { return TONES[t] || TONES.accent; }

function open(link) {
    if (!link) return;
    // Rotas do Academy já estão montadas dentro do Office (/academy/...).
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank'); return; }
    router.push(link);
}

// ── Player de vídeo inline (YouTube) ────────────────────────────────────
const openVideos = ref(new Set()); // índices dos cards com vídeo aberto
function toggleVideo(i) {
    const s = new Set(openVideos.value);
    if (s.has(i)) s.delete(i); else s.add(i);
    openVideos.value = s;
}
function youtubeId(url) {
    const s = String(url || '');
    let m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = s.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return null;
}
function embedUrl(url) {
    const id = youtubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ action.title }}
        </p>

        <div v-for="(card, i) in (action.cards || [])" :key="i"
            class="rounded-xl border border-line bg-surface-raised p-3 shadow-soft transition hover:border-accent/40">
            <!-- header: ícone + categoria/título + ações -->
            <div class="flex items-start gap-2.5">
                <span v-if="card.icon"
                    class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs"
                    :class="toneClass(card.tone)">
                    <i :class="card.icon"></i>
                </span>
                <div class="min-w-0 flex-1">
                    <p v-if="card.category"
                        class="mb-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
                        {{ card.category }}
                    </p>
                    <p class="truncate text-sm font-semibold text-ink">{{ card.title }}</p>
                    <p v-if="card.subtitle" class="mt-0.5 line-clamp-2 text-xs text-ink-muted">{{ card.subtitle }}</p>
                </div>
                <div class="flex shrink-0 flex-col items-stretch gap-1">
                    <button v-if="card.link" type="button" @click="open(card.link)"
                        class="inline-flex items-center justify-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                               text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        {{ card.linkLabel || 'Abrir' }}
                    </button>
                    <button v-if="card.videoUrl && embedUrl(card.videoUrl)" type="button" @click="toggleVideo(i)"
                        class="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1
                               text-xs font-medium text-red-600 transition hover:bg-red-600 hover:text-white dark:text-red-400">
                        <i :class="openVideos.has(i) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-play'" class="text-[10px]"></i>
                        {{ openVideos.has(i) ? 'Fechar' : 'Vídeo' }}
                    </button>
                </div>
            </div>

            <!-- player de vídeo inline (lazy: iframe só monta ao abrir) -->
            <div v-if="card.videoUrl && openVideos.has(i) && embedUrl(card.videoUrl)"
                class="mt-2 overflow-hidden rounded-lg border border-line bg-black">
                <div class="relative w-full" style="padding-top: 56.25%">
                    <iframe :src="embedUrl(card.videoUrl)" class="absolute inset-0 h-full w-full"
                        title="Vídeo do procedimento" frameborder="0"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
                </div>
            </div>

            <!-- badges -->
            <div v-if="card.badges?.length" class="mt-2 flex flex-wrap gap-1">
                <span v-for="(b, bi) in card.badges" :key="bi"
                    class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    {{ b }}
                </span>
            </div>

            <!-- seções (pré-requisitos, etapas, etc.) -->
            <div v-for="(sec, si) in (card.sections || [])" :key="si" class="mt-2">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">{{ sec.label }}</p>
                <ul class="mt-0.5 space-y-0.5">
                    <li v-for="(it, ii) in sec.items" :key="ii"
                        class="flex items-start gap-1.5 text-xs text-ink-muted">
                        <i class="fa-solid fa-circle mt-1.5 text-[3px] text-ink-subtle"></i>
                        <span>{{ it }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
