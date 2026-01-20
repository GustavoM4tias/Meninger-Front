import { reactive, computed, onBeforeUnmount } from 'vue';

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export function useTrackItemGating() {
    // sessions[itemId] = { opened: bool, ms: number, active: bool, startedAt: number|null }
    const sessions = reactive({});

    function ensure(itemId) {
        const id = String(itemId);
        if (!sessions[id]) {
            sessions[id] = { opened: false, ms: 0, active: false, startedAt: null };
        }
        return sessions[id];
    }

    // chama quando usuário "abre" um item
    function start(item) {
        const id = String(item?.id ?? '');
        if (!id) return;

        const s = ensure(id);
        s.opened = true;
        if (s.active) return;

        s.active = true;
        s.startedAt = Date.now();
    }

    // chama quando usuário "fecha" o item (modal) ou você decide parar
    function stop(item) {
        const id = String(item?.id ?? '');
        if (!id) return;

        const s = ensure(id);
        if (!s.active) return;

        const now = Date.now();
        const delta = Math.max(0, now - (s.startedAt || now));
        s.ms += delta;

        s.active = false;
        s.startedAt = null;
    }

    function getAccumulatedMs(item) {
        const id = String(item?.id ?? '');
        if (!id) return 0;

        const s = ensure(id);
        if (!s.active) return s.ms;

        // inclui o tempo atual em aberto
        const now = Date.now();
        const delta = Math.max(0, now - (s.startedAt || now));
        return s.ms + delta;
    }

    function requiredMs(item) {
        const hasContent = String(item?.content || '').trim().length > 0;
        if (!hasContent) return 0;
        const minutes = safeNum(item?.estimatedMinutes);
        return Math.floor(minutes * 60_000 * 0.15);
    }

    function canComplete(item) {
        const id = String(item?.id ?? '');
        if (!id) return false;

        const s = ensure(id);
        if (!s.opened) return false;

        const need = requiredMs(item);

        // se não tem estimativa, libera após abrir (sem travar)
        if (need <= 0) return true;

        return getAccumulatedMs(item) >= need;
    }

    function remainingMs(item) {
        const need = requiredMs(item);
        if (need <= 0) return 0;
        return Math.max(0, need - getAccumulatedMs(item));
    }

    // segurança: se algo estiver "ativo" e a view desmontar, fecha
    onBeforeUnmount(() => {
        Object.keys(sessions).forEach((k) => {
            const s = sessions[k];
            if (s?.active) {
                const now = Date.now();
                const delta = Math.max(0, now - (s.startedAt || now));
                s.ms += delta;
                s.active = false;
                s.startedAt = null;
            }
        });
    });

    return {
        sessions,
        start,
        stop,
        canComplete,
        remainingMs,
        getAccumulatedMs,
    };
}
