<template>
    <div class="space-y-2">
        <div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-black">
            <!-- YouTube / Vimeo embed -->
            <div v-if="isEmbed" class="aspect-video">
                <iframe :src="embedSrc" class="h-full w-full" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen></iframe>
            </div>

            <!-- Vídeo nativo (mp4 etc) — tem tracking real de % assistido -->
            <video v-else-if="src" ref="videoEl" class="aspect-video w-full" controls
                @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" @ended="onEnded">
                <source :src="src" />
                Seu navegador não suporta vídeo.
            </video>

            <div v-else class="aspect-video flex items-center justify-center text-sm text-slate-400">
                Vídeo sem URL cadastrada.
            </div>
        </div>

        <!-- Barra de progresso de visualização (só nativo) -->
        <div v-if="!isEmbed && src" class="flex items-center gap-3">
            <div class="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div class="h-1.5 rounded-full bg-slate-900 dark:bg-slate-100 transition-all"
                    :style="{ width: `${watchedPercent}%` }" />
            </div>
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {{ watchedPercent }}% assistido
            </span>
            <span v-if="watchedPercent >= AUTO_THRESHOLD"
                class="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                concluído
            </span>
        </div>

        <p v-if="isEmbed" class="text-xs text-slate-400 dark:text-slate-500">
            Vídeos do YouTube/Vimeo são marcados como concluídos quando você abre. Vídeos nativos rastreiam o progresso real.
        </p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
    src: { type: String, default: '' },         // URL do vídeo
    trackSlug: { type: String, required: true },
    itemId: { type: [Number, String], required: true },
    initialPercent: { type: Number, default: 0 },
});

const emit = defineEmits(['progress', 'completed']);

const AUTO_THRESHOLD = 85;

const videoEl = ref(null);
const watchedPercent = ref(Math.round(Number(props.initialPercent) || 0));
const durationSec = ref(0);

// Embed detection
const isEmbed = computed(() => {
    const u = String(props.src || '').toLowerCase();
    return u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com');
});

const embedSrc = computed(() => {
    const url = String(props.src || '');
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
            return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
        }
        if (u.hostname.includes('youtu.be')) {
            return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
        }
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop();
            return `https://player.vimeo.com/video/${id}`;
        }
    } catch { /* ignore */ }
    return url;
});

// Throttle: envia ao backend no máx 1x a cada 10s
let lastSent = 0;
const SEND_INTERVAL_MS = 10000;

function sendProgress(currentSec, force = false) {
    const now = Date.now();
    if (!force && now - lastSent < SEND_INTERVAL_MS) return;
    lastSent = now;
    emit('progress', {
        itemId: props.itemId,
        currentSec: Math.floor(currentSec),
        durationSec: Math.floor(durationSec.value),
    });
}

function onLoaded() {
    if (videoEl.value) durationSec.value = videoEl.value.duration || 0;
}

function onTimeUpdate() {
    const el = videoEl.value;
    if (!el || !el.duration) return;
    const pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    // monotônico no cliente (consistência visual com o backend)
    if (pct > watchedPercent.value) watchedPercent.value = pct;
    sendProgress(el.currentTime);
    if (watchedPercent.value >= AUTO_THRESHOLD) emit('completed');
}

function onEnded() {
    const el = videoEl.value;
    if (el) {
        watchedPercent.value = 100;
        sendProgress(el.duration, true);
        emit('completed');
    }
}

// Embed: marca como aberto/concluído imediatamente (não há tracking real)
onMounted(() => {
    if (isEmbed.value) {
        emit('progress', { itemId: props.itemId, currentSec: 100, durationSec: 100 });
        emit('completed');
    }
});

// Garante envio final ao sair
onBeforeUnmount(() => {
    const el = videoEl.value;
    if (el && el.currentTime > 0) sendProgress(el.currentTime, true);
});
</script>
