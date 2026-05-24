<template>
    <section
        class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <!-- Faixa de nível -->
        <div class="relative bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div
                        class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                        <span class="text-2xl font-extrabold text-white">{{ stats.level }}</span>
                    </div>
                    <div>
                        <div class="text-xs font-semibold uppercase tracking-wider text-white/60">Nível</div>
                        <div class="text-lg font-bold text-white">{{ levelTitle }}</div>
                        <div class="text-xs text-white/70">{{ stats.totalXp }} XP acumulado</div>
                    </div>
                </div>

                <!-- Streak -->
                <div class="text-right">
                    <div class="flex items-center gap-1.5 justify-end">
                        <i class="fa-solid fa-fire" :class="stats.currentStreak > 0 ? 'text-orange-400' : 'text-white/30'"></i>
                        <span class="text-2xl font-extrabold text-white">{{ stats.currentStreak }}</span>
                    </div>
                    <div class="text-xs text-white/60">
                        {{ stats.currentStreak === 1 ? 'dia seguido' : 'dias seguidos' }}
                    </div>
                </div>
            </div>

            <!-- Barra de progresso de XP -->
            <div class="mt-4">
                <div class="flex items-center justify-between text-xs text-white/70 mb-1">
                    <span>Progresso do nível</span>
                    <span>faltam {{ stats.xpToNextLevel }} XP</span>
                </div>
                <div class="h-2.5 w-full rounded-full bg-white/15 overflow-hidden">
                    <div class="h-2.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-700"
                        :style="{ width: `${levelProgressPct}%` }" />
                </div>
            </div>
        </div>

        <!-- Badges -->
        <div class="px-6 py-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
                    Conquistas
                    <span class="text-slate-400 dark:text-slate-500">({{ badges.length }})</span>
                </h3>
                <span v-if="stats.longestStreak > 0" class="text-xs text-slate-400 dark:text-slate-500">
                    Recorde de streak: {{ stats.longestStreak }} dias
                </span>
            </div>

            <div v-if="badges.length" class="flex flex-wrap gap-2">
                <div v-for="b in badges" :key="b.slug" :title="b.description || b.title"
                    class="group flex items-center gap-2 rounded-xl border px-3 py-2 transition-all hover:scale-105"
                    :class="rarityClass(b.rarity)">
                    <span class="text-lg">{{ b.icon || '🏅' }}</span>
                    <div class="leading-tight">
                        <div class="text-xs font-bold">{{ b.title }}</div>
                        <div class="text-[10px] opacity-70">{{ rarityLabel(b.rarity) }}</div>
                    </div>
                </div>
            </div>

            <div v-else class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-6 text-center">
                <p class="text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma conquista ainda. Conclua trilhas e participe da comunidade para desbloquear badges.
                </p>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    stats: {
        type: Object,
        default: () => ({ level: 1, totalXp: 0, xpInCurrentLevel: 0, xpToNextLevel: 0, currentStreak: 0, longestStreak: 0 }),
    },
    badges: { type: Array, default: () => [] },
});

// Títulos de nível — só cosmético, escalável.
const LEVEL_TITLES = [
    'Iniciante', 'Aprendiz', 'Estudante', 'Praticante', 'Competente',
    'Proficiente', 'Avançado', 'Especialista', 'Mestre', 'Lenda',
];

const levelTitle = computed(() => {
    const idx = Math.min(LEVEL_TITLES.length - 1, Math.max(0, props.stats.level - 1));
    return LEVEL_TITLES[idx];
});

const levelProgressPct = computed(() => {
    const inLevel = Number(props.stats.xpInCurrentLevel || 0);
    const toNext = Number(props.stats.xpToNextLevel || 0);
    const total = inLevel + toNext;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((inLevel / total) * 100)));
});

function rarityClass(rarity) {
    const r = String(rarity || 'COMMON').toUpperCase();
    return {
        COMMON: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300',
        RARE: 'border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300',
        EPIC: 'border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
        LEGENDARY: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    }[r] || 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300';
}

function rarityLabel(rarity) {
    return {
        COMMON: 'Comum', RARE: 'Raro', EPIC: 'Épico', LEGENDARY: 'Lendário',
    }[String(rarity || 'COMMON').toUpperCase()] || 'Comum';
}
</script>
