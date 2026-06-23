import { ref, computed } from 'vue';

/**
 * Ordenação reutilizável para tabelas.
 *
 * @param {import('vue').Ref<Array>} rowsRef  ref/computed com as linhas
 * @param {Record<string, (row:any)=>any>} accessors  mapa coluna -> valor de ordenação
 * @param {{ defaultKey?: string, defaultDir?: 'asc'|'desc' }} [opts]
 *
 * Uso:
 *   const { handleSort, sortIcon, sorted } = useTableSort(rows, {
 *     name: r => r.name.toLowerCase(), total: r => Number(r.total||0),
 *   }, { defaultKey: 'total', defaultDir: 'desc' });
 *   // template: <th @click="handleSort('total')">Total <i :class="sortIcon('total')" /></th>
 *   //           <tr v-for="r in sorted" ...>
 */
export function useTableSort(rowsRef, accessors = {}, { defaultKey = null, defaultDir = 'asc' } = {}) {
    const sortKey = ref(defaultKey);
    const sortDir = ref(defaultDir);

    function handleSort(key) {
        if (!accessors[key]) return;
        if (sortKey.value === key) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey.value = key;
            // texto começa A→Z; números começam do maior (mais útil em relatórios)
            sortDir.value = 'asc';
        }
    }

    function sortIcon(key) {
        if (sortKey.value !== key) return 'fas fa-sort opacity-30';
        return sortDir.value === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }

    const sorted = computed(() => {
        const rows = rowsRef.value || [];
        const key = sortKey.value;
        const acc = accessors[key];
        if (!key || !acc) return rows;
        const dir = sortDir.value === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = acc(a);
            const vb = acc(b);
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
    });

    return { sortKey, sortDir, handleSort, sortIcon, sorted };
}
