<template>

    <div class="relative w-full md:w-[420px]">
        <button type="button" @click="openPalette"
            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-16 text-sm text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left">
            Buscar (Artigos / trilhas / tópicos)...
            <span
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                {{ shortcutHint }}
            </span>
        </button>
    </div>

    <!-- Command Palette -->
    <div class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 md:pt-28 transition-opacity duration-150"
        :class="paletteOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'" aria-hidden="false">
        <!-- Backdrop -->
        <div class="absolute h-screen inset-0 bg-black/30" @click="closePalette" aria-hidden="true"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
            role="dialog" aria-modal="true" aria-label="Buscar">
            <!-- Search input -->
            <div class="p-3 border-b border-slate-200 dark:border-slate-800">
                <div class="relative">
                    <input ref="paletteInputEl" v-model="paletteQuery" type="text" placeholder="Digite para buscar..."
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 pr-24 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"
                        @keydown.esc.prevent="closePalette" @keydown.enter.prevent="submitPalette" />
                    <button
                        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        @click="closePalette" aria-label="Fechar">
                        Esc
                    </button>
                </div>
            </div>

            <!-- Results (placeholder) -->
            <div class="max-h-[55vh] overflow-y-auto p-2">
                <div v-if="!paletteQuery" class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                    Comece digitando para buscar.
                </div>

                <div v-else class="space-y-1">
                    <!-- Você troca isso por seus resultados reais -->
                    <button
                        class="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        @click="goSearchFromPalette">
                        Buscar por: <span class="font-semibold">{{ paletteQuery }}</span>
                    </button>
                </div>
            </div>

            <!-- Footer -->
            <div
                class="border-t border-slate-200 dark:border-slate-800 px-4 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Enter para buscar</span>
                <span>Esc para fechar</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';

const paletteOpen = ref(false);
const paletteQuery = ref('');
const paletteInputEl = ref(null);

const shortcutHint = computed(() => {
    // visual hint: mac mostra ⌘K, resto Ctrl K
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ + K' : 'Ctrl + K';
});

function openPalette() {
    paletteOpen.value = true;
    paletteQuery.value = '';
    lockScroll(true);
    nextTick(() => paletteInputEl.value?.focus());
}

function closePalette() {
    paletteOpen.value = false;
    lockScroll(false);
}

function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
}

function submitPalette() {
    // Enter dentro do modal
    goSearchFromPalette();
}

function goSearchFromPalette() {
    if (!paletteQuery.value?.trim()) return;
    router.push({ name: 'AcademyKB', query: { q: paletteQuery.value.trim() } });
    closePalette();
}

// Atalho global: Ctrl+K / Cmd+K (cobre Win/Linux/macOS)
function onKeydown(e) {
    const isK = (e.key || '').toLowerCase() === 'k';
    const withCtrlOrMeta = e.ctrlKey || e.metaKey;

    if (withCtrlOrMeta && isK) {
        e.preventDefault();
        if (paletteOpen.value) closePalette();
        else openPalette();
    }

    // Fecha com ESC mesmo fora do input (quando modal aberto)
    if (paletteOpen.value && e.key === 'Escape') {
        e.preventDefault();
        closePalette();
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeydown, { passive: false });
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
});

</script>