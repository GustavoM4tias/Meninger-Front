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
  const me      = ref(null);   // palpite do próprio usuário { participant_id, predictions:[{match_id,home,away}] }
  const live    = ref(null);
  const recap   = ref('');
  const recapSource = ref(null);

  // Qual edição está sendo exibida (null = padrão/ativa no backend). A página
  // passa o slug explícito (Japão na navbar, Copa no arquivo). As ações de admin
  // miram nesta edição.
  const currentSlug = ref(null);
  const qs = (slug) => (slug ? `?slug=${encodeURIComponent(slug)}` : '');

  const loading      = ref(false);
  const loadingRecap = ref(false);
  const error        = ref(null);

  const hasLive = computed(() =>
    matches.value.some(m => m.status === 'live' || m.status === 'halftime'));

  // Palpite do usuário para um jogo (ou null se ainda não gravou).
  function myPrediction(matchId) {
    return me.value?.predictions?.find(p => p.match_id === matchId) || null;
  }

  async function fetchOverview(slug = currentSlug.value) {
    currentSlug.value = slug || null;
    loading.value = true; error.value = null;
    try {
      const data = await requestWithAuth(`/bolao${qs(slug)}`);
      bolao.value   = data.bolao || null;
      matches.value = data.matches || [];
      ranking.value = data.ranking || [];
      reveal.value  = !!data.reveal;
      mode.value    = data.mode || 'official';
      me.value      = data.me || null;
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

  async function fetchRecap(slug = currentSlug.value) {
    loadingRecap.value = true;
    try {
      const data = await requestWithAuth(`/bolao/recap${qs(slug)}`);
      recap.value = data?.text || '';
      recapSource.value = data?.source || null;
    } catch {
      recap.value = '';
    } finally {
      loadingRecap.value = false;
    }
    return recap.value;
  }

  // Auto-palpite: a própria pessoa logada grava seu palpite (sem CPF).
  // predictions = [{ match_id, home, away }]. Definitivo após confirmar.
  async function submitSelf(predictions) {
    const r = await requestWithAuth(`/bolao/predictions/self${qs(currentSlug.value)}`, {
      method: 'POST', body: JSON.stringify({ predictions }),
    });
    await fetchOverview();
    return r;
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
    const r = await requestWithAuth(`/bolao/participants${qs(currentSlug.value)}`, {
      method: 'POST', body: JSON.stringify(payload),
    });
    await fetchOverview();
    return r;
  }

  // Apaga TODOS os palpites do bolão (mantém participantes e jogos).
  async function clearPredictions() {
    await requestWithAuth(`/bolao/predictions/clear${qs(currentSlug.value)}`, { method: 'POST' });
    await fetchOverview();
  }

  // Remove um participante (e seus palpites).
  async function removeParticipant(id) {
    await requestWithAuth(`/bolao/participants/${id}`, { method: 'DELETE' });
    await fetchOverview();
  }

  // Cria/garante a edição atual do bolão (idempotente). Mira no slug exibido.
  async function runSeed() {
    await requestWithAuth(`/bolao/seed${qs(currentSlug.value)}`, { method: 'POST' });
    await Promise.all([fetchOverview(), fetchRecap()]);
  }

  return {
    bolao, matches, ranking, reveal, mode, me, live, recap, recapSource,
    currentSlug, loading, loadingRecap, error, hasLive,
    myPrediction,
    fetchOverview, fetchLive, fetchRecap, submitSelf, postResult, postLiveScore,
    savePredictions, addParticipant, removeParticipant, clearPredictions, runSeed,
  };
});
