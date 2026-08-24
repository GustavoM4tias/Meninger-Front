// stores/Platform/platformUpdatesStore.js
//
// Mural de atualizações da plataforma: decide O QUE desta pessoa ainda é novo.
//
// O catálogo é estático e vem do código (`config/changelog.js`, o mesmo da tela
// /docs). O servidor guarda só uma coisa: até qual versão ela já leu. A conta de
// "o que falta ver" é feita aqui.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { releases } from '@/config/changelog';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

/**
 * Compara 'v3.13.0' com 'v3.9.0' NUMERICAMENTE, campo a campo. Como texto,
 * 'v3.9.0' seria maior que 'v3.13.0' e a novidade nunca apareceria.
 */
export function compararVersoes(a, b) {
    const partes = (v) => String(v || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const pa = partes(a);
    const pb = partes(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

// Teto de versões mostradas de uma vez. Quem passou férias fora não precisa ler
// quatro publicações num modal; lê a mais recente e o resto está em /docs.
const MAX_NO_MURAL = 3;

export const usePlatformUpdatesStore = defineStore('platformUpdates', () => {
    const lastSeenRelease = ref(null);
    const carregado = ref(false);
    const salvando = ref(false);

    // Só release PUBLICADA entra: entrada com `date: null` é roadmap.
    const publicadas = computed(() => (
        [...releases]
            .filter(r => r?.date instanceof Date && !Number.isNaN(r.date.getTime()))
            .sort((a, b) => compararVersoes(b.version, a.version))
    ));

    const maisRecente = computed(() => publicadas.value[0] || null);

    // Sem marca nenhuma (usuário criado entre um boot e outro, antes do carimbo
    // do patch), mostra SÓ a mais recente. Nunca as 60 do histórico.
    const novidades = computed(() => {
        if (!carregado.value) return [];
        if (!lastSeenRelease.value) return maisRecente.value ? [maisRecente.value] : [];
        return publicadas.value
            .filter(r => compararVersoes(r.version, lastSeenRelease.value) > 0)
            .slice(0, MAX_NO_MURAL);
    });

    const temNovidade = computed(() => novidades.value.length > 0);
    // Quantas ficaram de fora do teto — o modal diz isso em vez de escondê-las.
    const alemDoTeto = computed(() => {
        if (!carregado.value || !lastSeenRelease.value) return 0;
        const total = publicadas.value.filter(r => compararVersoes(r.version, lastSeenRelease.value) > 0).length;
        return Math.max(0, total - novidades.value.length);
    });

    async function fetchState() {
        try {
            const resp = await fetch(`${API_URL}/platform/updates/state`, { headers: authHeaders() });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            lastSeenRelease.value = data?.lastSeenRelease || null;
        } catch (err) {
            console.error('[platformUpdates] fetchState', err);
            // Sem resposta do servidor o mural fica QUIETO. Um erro de rede não
            // pode virar modal de novidade na cara de quem já leu.
            lastSeenRelease.value = maisRecente.value?.version || null;
        } finally {
            carregado.value = true;
        }
    }

    /** Marca tudo até a versão mais recente como lido. */
    async function marcarVisto() {
        const alvo = maisRecente.value?.version;
        if (!alvo) return;
        const anterior = lastSeenRelease.value;
        lastSeenRelease.value = alvo;   // otimista: o modal fecha na hora
        salvando.value = true;
        try {
            const resp = await fetch(`${API_URL}/platform/updates/seen`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ version: alvo }),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        } catch (err) {
            console.error('[platformUpdates] marcarVisto', err);
            lastSeenRelease.value = anterior;   // não salvou: volta a dever leitura
        } finally {
            salvando.value = false;
        }
    }

    return {
        lastSeenRelease, carregado, salvando,
        publicadas, maisRecente, novidades, temNovidade, alemDoTeto,
        fetchState, marcarVisto,
    };
});
