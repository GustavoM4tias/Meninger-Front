import { computed } from 'vue';

export function useTrackSequence(items) {
    const list = computed(() => (Array.isArray(items.value) ? items.value : []));

    // próximo item obrigatório não concluído (por ordem)
    const nextRequiredIndex = computed(() => {
        const arr = list.value;
        return arr.findIndex((it) => !!it.required && !it.completed);
    });

    // índice máximo liberado (ordem estrita)
    // libera: todos concluídos + o "próximo obrigatório"
    const maxUnlockedIndex = computed(() => {
        const arr = list.value;
        const nextIdx = nextRequiredIndex.value;
        if (nextIdx === -1) return arr.length - 1; // tudo concluído
        return nextIdx;
    });

    function isUnlocked(it, index) {
        if (!it) return false;
        if (!!it.completed) return true; // revisitar sempre
        return Number(index) <= maxUnlockedIndex.value;
    }

    function isLocked(it, index) {
        return !isUnlocked(it, index);
    }

    function isCurrent(it, index) {
        const nextIdx = nextRequiredIndex.value;
        if (nextIdx === -1) return Number(index) === 0;
        return Number(index) === nextIdx;
    }

    function getNextTargetIndex() {
        const nextIdx = nextRequiredIndex.value;
        return nextIdx === -1 ? 0 : nextIdx;
    }

    return {
        nextRequiredIndex,
        maxUnlockedIndex,
        isUnlocked,
        isLocked,
        isCurrent,
        getNextTargetIndex,
    };
}
