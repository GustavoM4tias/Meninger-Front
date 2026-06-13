// src/stores/Bolao/bolaoStore.js
// Estado do Bolão da Copa. Consome /api/bolao* (overview, live, recap) e as
// ações de admin (resultado final e placar manual). Espelha o padrão de store
// composition do projeto (ex.: inadimplenciaStore).
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useBolaoStore = defineStore('bolao', () => {
  const bolao   = ref(null);
  const matches = ref([]);
  const ranking = ref([]);
  const reveal  = ref(false);
  const mode    = ref('official');
  const live    = ref(null);
  const recap   = ref('');
  const recapSource = ref(null);

  const loading      = ref(false);
  const loadingRecap = ref(false);
  const error        = ref(null);

  const hasLive = computed(() =>
    matches.value.some(m => m.status === 'live' || m.status === 'halftime'));

  async function fetchOverview() {
    loading.value = true; error.value = null;
    try {
      const data = await requestWithAuth('/bolao');
      bolao.value   = data.bolao || null;
      matches.value = data.matches || [];
      ranking.value = data.ranking || [];
      reveal.value  = !!data.reveal;
      mode.value    = data.mode || 'official';
    } catch (e) {
      error.value = e.message || 'Falha ao carregar o bolão.';
    } finally {
      loading.value = false;
    }
  }

  async function fetchLive() {
    try {
      const data = await requestWithAuth('/bolao/live');
      live.value = data?.live || null;
    } catch {
      live.value = null; // silencioso — o badge só some
    }
    return live.value;
  }

  async function fetchRecap() {
    loadingRecap.value = true;
    try {
      const data = await requestWithAuth('/bolao/recap');
      recap.value = data?.text || '';
      recapSource.value = data?.source || null;
    } catch {
      recap.value = '';
    } finally {
      loadingRecap.value = false;
    }
    return recap.value;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async function postResult(matchId, home, away) {
    await requestWithAuth(`/bolao/matches/${matchId}/result`, {
      method: 'POST', body: JSON.stringify({ home, away }),
    });
    await fetchOverview();
  }

  async function postLiveScore(matchId, payload) {
    await requestWithAuth(`/bolao/matches/${matchId}/live`, {
      method: 'POST', body: JSON.stringify(payload),
    });
    await Promise.all([fetchOverview(), fetchLive()]);
  }

  // Admin preenche/edita palpites por participante (bulk).
  async function savePredictions(items) {
    await requestWithAuth('/bolao/predictions', {
      method: 'POST', body: JSON.stringify({ items }),
    });
    await fetchOverview();
  }

  async function addParticipant(payload) {
    const r = await requestWithAuth('/bolao/participants', {
      method: 'POST', body: JSON.stringify(payload),
    });
    await fetchOverview();
    return r;
  }

  // Cria o bolão da Copa + importa os palpites do grupo (idempotente).
  async function runSeed() {
    await requestWithAuth('/bolao/seed', { method: 'POST' });
    await Promise.all([fetchOverview(), fetchRecap()]);
  }

  return {
    bolao, matches, ranking, reveal, mode, live, recap, recapSource,
    loading, loadingRecap, error, hasLive,
    fetchOverview, fetchLive, fetchRecap, postResult, postLiveScore,
    savePredictions, addParticipant, runSeed,
  };
});
