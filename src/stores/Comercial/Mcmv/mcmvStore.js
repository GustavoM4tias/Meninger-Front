import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useMcmvStore = defineStore('mcmv', () => {
    const carregamento = useCarregamentoStore();

    const results  = ref([]);
    const info     = ref({ total: null, co_periodo: null, updated_at: null, faixa3: 350000, faixa4: 500000 });
    const error    = ref(null);

    // ─── Busca por município ──────────────────────────────────────────────────

    async function fetchSearch({ q = '', uf = '' } = {}) {
        error.value = null;
        const hasQ  = q.trim().length >= 2;
        const hasUF = uf.trim().length > 0;
        if (!hasQ && !hasUF) {
            results.value = [];
            return;
        }
        try {
            carregamento.iniciarCarregamento();
            const params = new URLSearchParams();
            if (hasQ)  params.set('q', q.trim());
            if (hasUF) params.set('uf', uf.trim());
            const data = await requestWithAuth(`${API_URL}/mcmv/search?${params}`);
            results.value = data.results ?? [];
            info.value.faixa3 = data.faixa3;
            info.value.faixa4 = data.faixa4;
        } catch (e) {
            error.value = e.message;
            results.value = [];
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    // ─── Info da tabela (totais, vigência) ────────────────────────────────────

    async function fetchInfo() {
        try {
            const data = await requestWithAuth(`${API_URL}/mcmv/info`);
            info.value = data;
        } catch (e) {
            console.warn('[mcmv] fetchInfo:', e.message);
        }
    }

    // ─── Importar planilha xlsx (admin) ───────────────────────────────────────

    async function importXlsx(file) {
        const form = new FormData();
        form.append('file', file);
        const data = await requestWithAuth(`${API_URL}/mcmv/import`, {
            method: 'POST',
            body: form,
        });
        await fetchInfo();
        return data;
    }

    function clearResults() {
        results.value = [];
        error.value = null;
    }

    return {
        results, info, error,
        fetchSearch, fetchInfo, importXlsx, clearResults,
    };
});
