<template>
    <button type="button" :disabled="busy"
        class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
        :class="following
            ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-rose-200 hover:text-rose-600 dark:hover:text-rose-400'
            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'"
        @click="onToggle" @mouseenter="hovering = true" @mouseleave="hovering = false">
        <i class="fa-solid" :class="following ? 'fa-check' : 'fa-plus'"></i>
        <span>{{ following ? (hovering ? 'Deixar de seguir' : 'Seguindo') : 'Seguir' }}</span>
    </button>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAcademyFollowStore } from '@/stores/Academy/academyFollowStore';

const props = defineProps({
    targetType: { type: String, required: true }, // USER | TRACK | TOPIC | CATEGORY
    targetRef: { type: [String, Number], required: true },
});

const followStore = useAcademyFollowStore();
const busy = ref(false);
const hovering = ref(false);

const following = ref(false);

function sync() {
    following.value = followStore.isFollowing(props.targetType, String(props.targetRef));
}

async function onToggle() {
    if (busy.value) return;
    busy.value = true;
    try {
        await followStore.toggle(props.targetType, String(props.targetRef));
        sync();
    } finally {
        busy.value = false;
    }
}

onMounted(async () => {
    // hidrata o mapa local (se ainda não foi carregado)
    if (!followStore.myFollows.length) {
        await followStore.fetchMyFollows();
    }
    sync();
});
</script>
