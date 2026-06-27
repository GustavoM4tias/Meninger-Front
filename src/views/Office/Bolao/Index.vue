<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import { useBolaoStore } from '@/stores/Bolao/bolaoStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { fireConfetti } from '@/utils/confetti';

const store = useBolaoStore();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isAdmin = computed(() => auth.hasRole('admin'));
const hasBolao = computed(() => !!store.bolao);

// Edição exibida: a navbar abre o Japão; /bolao/copa-2026 abre o arquivo.
const slug = computed(() => route.meta?.bolaoSlug || 'japao-gestores');
const isArchive = computed(() => slug.value === 'copa-2026-gestores');

// Esta edição premia SÓ o placar exato (sem ponto por vencedor).
const isExactRule = computed(() => (store.bolao?.points_winner ?? 1) === 0);

const MAX_GOALS = 20;
const flagUrl = (c) => (c ? `/flags/${c}.png` : '');
const scoreCls = 'w-12 text-center bg-surface-raised border border-line rounded-lg py-1.5 text-sm font-semibold text-ink focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 outline-none transition';

function initials(name = '') {
  const parts = String(name).replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const fmtDate = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso));
const fmtTime = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const pageTitle = computed(() => store.bolao?.name || (isArchive.value ? 'Bolão da Copa' : 'Bolão Brasil x Japão'));
const headerSubtitle = computed(() => {
  const b = store.bolao;
  if (!b) return 'Grave seu palpite, placar ao vivo e ranking';
  const parts = [];
  if (isExactRule.value) parts.push('Cravou o placar exato leva o prêmio');
  else parts.push(`${b.points_exact} pts placar exato`, `${b.points_winner} pt no vencedor`);
  if (b.prize) parts.push(`prêmio ${b.prize}`);
  return parts.join(' · ');
});

// ── Estado de abertura/trava ───────────────────────────────────────────────────
const now = ref(Date.now());
let clock = null;
const deadlinePassed = computed(() => {
  const d = store.bolao?.deadline_at;
  return !!d && new Date(d).getTime() <= now.value;
});
const predictionsOpen = computed(() => store.bolao?.status === 'open' && !deadlinePassed.value);

const statusChip = computed(() => {
  const b = store.bolao;
  if (!b) return null;
  if (b.status === 'finished') return { text: 'Encerrado', cls: 'bg-surface-sunken text-ink-muted' };
  if (predictionsOpen.value) return { text: 'Palpites abertos', cls: 'bg-accent-soft text-accent' };
  return { text: 'Palpites travados', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
});

// ── Auto-palpite (a própria pessoa grava) ──────────────────────────────────────
const myScore = reactive({}); // { [matchId]: { home, away } }
function scoreOf(mid) { if (!myScore[mid]) myScore[mid] = { home: 0, away: 0 }; return myScore[mid]; }
function bump(mid, side, delta) {
  const s = scoreOf(mid);
  s[side] = Math.max(0, Math.min(MAX_GOALS, (Number(s[side]) || 0) + delta));
}
const hasMyPrediction = (mid) => !!store.myPrediction(mid);
const myPredFor = (mid) => store.myPrediction(mid);

const openMatches = computed(() =>
  store.matches.filter(m => m.status !== 'finished' && new Date(m.kickoff_at).getTime() > now.value));
const pendingMatches = computed(() => openMatches.value.filter(m => !hasMyPrediction(m.id)));
const myPicks = computed(() => store.matches.filter(m => hasMyPrediction(m.id)));
const canPredict = computed(() => !isArchive.value && predictionsOpen.value && pendingMatches.value.length > 0);

const showConfirm = ref(false);
const submitting = ref(false);
const submitError = ref('');
const justSaved = ref(false);

function openConfirm() { submitError.value = ''; showConfirm.value = true; }
async function confirmSubmit() {
  submitting.value = true; submitError.value = '';
  try {
    const predictions = pendingMatches.value.map(m => ({
      match_id: m.id,
      home: Number(scoreOf(m.id).home) || 0,
      away: Number(scoreOf(m.id).away) || 0,
    }));
    await store.submitSelf(predictions);
    showConfirm.value = false;
    justSaved.value = true;
    fireConfetti({ particleCount: 170, originY: 0.4 });
  } catch (e) {
    submitError.value = e?.message || 'Não foi possível gravar seu palpite.';
    // Se travou/já tinha palpite, atualiza a tela e fecha o modal.
    if (e?.payload?.closed || e?.payload?.alreadyPlayed) {
      showConfirm.value = false;
      await store.fetchOverview();
    }
  } finally {
    submitting.value = false;
  }
}

// ── Resultado / vencedores (edição de placar exato) ────────────────────────────
const gameFinished = computed(() => store.matches.length > 0 && store.matches.every(m => m.status === 'finished'));
const exactWinners = computed(() => {
  if (!store.reveal) return [];
  return store.ranking.filter(r => r.perMatch.some(c => c.status === 'exact'));
});

function matchScore(m) {
  if (m.status === 'finished') return `${m.home_score} x ${m.away_score}`;
  if (m.status === 'live' || m.status === 'halftime') return `${m.live_home ?? 0} x ${m.live_away ?? 0}`;
  return null;
}
const isLive = (m) => m.status === 'live' || m.status === 'halftime';

// Dots do ranking. Na edição de placar exato, só "cravou" tem cor de acerto.
function dotClassFor(cell) {
  if (isExactRule.value) {
    if (cell.status === 'exact') return 'bg-emerald-500';
    if (cell.status === 'pending') return 'bg-line-strong';
    return 'bg-red-400/70';
  }
  return ({ exact: 'bg-emerald-500', winner: 'bg-blue-500', miss: 'bg-red-400', pending: 'bg-line-strong' }[cell.status] || 'bg-line-strong');
}
function dotTitle(cell, m) {
  if (!m) return '';
  const label = `${m.home_code}×${m.away_code}`;
  const res = isExactRule.value
    ? { exact: `cravou! (+${store.bolao?.points_exact ?? 3})`, winner: 'não cravou', miss: 'não cravou', pending: 'aguardando' }[cell.status]
    : { exact: `cravou (+${store.bolao?.points_exact ?? 3})`, winner: `acertou o vencedor (+${store.bolao?.points_winner ?? 1})`, miss: 'errou', pending: 'aguardando' }[cell.status];
  if (isAdmin.value && cell.has_prediction && cell.pred_home != null) return `${label}: palpite ${cell.pred_home}-${cell.pred_away} · ${res}`;
  return `${label}: ${res}`;
}

function medalStyle(pos, total) {
  if (total <= 0) return 'bg-surface-sunken text-ink-muted';
  if (pos === 1) return 'bg-amber-400/20 text-amber-600 dark:text-amber-300';
  if (pos === 2) return 'bg-slate-400/20 text-slate-600 dark:text-slate-300';
  if (pos === 3) return 'bg-orange-400/20 text-orange-600 dark:text-orange-300';
  return 'bg-surface-sunken text-ink-muted';
}

// ── Olhinho: ver o palpite de um participante ──────────────────────────────────
const viewPid = ref(null);
const viewRow = computed(() => viewPid.value == null ? null : store.ranking.find(r => r.participant.id === viewPid.value) || null);
const viewSubtitle = computed(() => {
  const r = viewRow.value;
  if (!r) return '';
  const parts = [];
  if (r.participant.subtitle) parts.push(r.participant.subtitle);
  if (r.total > 0) parts.push(`${r.total} pts`);
  return parts.join(' · ');
});
function openView(row) { viewPid.value = row.participant.id; }
function predScore(cell) {
  if (!cell || !cell.has_prediction || cell.pred_home == null) return '—';
  return `${cell.pred_home} : ${cell.pred_away}`;
}
function cellLabel(status) {
  const pe = store.bolao?.points_exact ?? 3;
  const pw = store.bolao?.points_winner ?? 1;
  if (status === 'exact')  return { t: `cravou +${pe}`,  cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  if (status === 'winner') return isExactRule.value
    ? { t: 'não cravou', cls: 'bg-surface-sunken text-ink-muted' }
    : { t: `acertou +${pw}`, cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
  if (status === 'miss')   return { t: isExactRule.value ? 'não cravou' : 'errou', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' };
  return { t: 'aguardando', cls: 'bg-surface-sunken text-ink-muted' };
}

// ── Polling enquanto há jogo ao vivo (pausa com painel admin aberto) ───────────
let timer = null;
function setupPolling() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden && store.hasLive && !showAdminPanel.value) {
      store.fetchOverview();
      store.fetchLive();
    }
  }, 20000);
}
function refreshAll(s = slug.value) {
  return Promise.all([store.fetchOverview(s), store.fetchLive(), store.fetchRecap(s)]);
}

// ── Admin: criar bolão (seed) ─────────────────────────────────────────────────
const seeding = ref(false);
async function criarBolao() {
  seeding.value = true;
  try { await store.runSeed(); } finally { seeding.value = false; }
}

// ── Admin: editor de palpites ─────────────────────────────────────────────────
const showAdminPanel = ref(false);
const editModel = reactive({}); // { [participantId]: { [matchId]: { home, away } } }
const savingPid = ref(null);
const removingPid = ref(null);

function buildEditModel() {
  for (const row of store.ranking) {
    const pid = row.participant.id;
    if (!editModel[pid]) editModel[pid] = {};
    row.perMatch.forEach((cell, i) => {
      const m = store.matches[i];
      if (m) editModel[pid][m.id] = { home: cell.pred_home ?? 0, away: cell.pred_away ?? 0 };
    });
  }
}
function toggleAdminPanel() {
  if (!showAdminPanel.value) buildEditModel();
  showAdminPanel.value = !showAdminPanel.value;
}
async function saveParticipant(pid) {
  savingPid.value = pid;
  try {
    const items = [];
    for (const m of store.matches) {
      const c = editModel[pid]?.[m.id];
      if (c && c.home != null && c.away != null) {
        items.push({ participant_id: pid, match_id: m.id, home: Number(c.home), away: Number(c.away) });
      }
    }
    if (items.length) await store.savePredictions(items);
    buildEditModel();
  } finally {
    savingPid.value = null;
  }
}
async function removeParticipant(pid) {
  removingPid.value = pid;
  try { await store.removeParticipant(pid); buildEditModel(); }
  finally { removingPid.value = null; }
}

// ── Admin: adicionar participante (modal com usuários do sistema) ──────────────
const showUserPicker = ref(false);
const userSearch = ref('');
const usersLoaded = ref(false);
const addingId = ref(null);
const existingUserIds = computed(() => new Set(store.ranking.map(r => r.participant.user_id).filter(Boolean)));
const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase();
  return (auth.activeUsers || [])
    .filter(u => !existingUserIds.value.has(u.id))
    .filter(u => !q || (u.username || '').toLowerCase().includes(q) || (u.position || '').toLowerCase().includes(q) || (u.city || '').toLowerCase().includes(q))
    .slice(0, 50);
});
async function ensureUsers() {
  if (usersLoaded.value) return;
  try { await auth.getAllUsers(); usersLoaded.value = true; } catch { /* ignora */ }
}
function openUserPicker() { userSearch.value = ''; ensureUsers(); showUserPicker.value = true; }
async function addUser(u) {
  addingId.value = u.id;
  try { await store.addParticipant({ user_id: u.id }); buildEditModel(); }
  finally { addingId.value = null; }
}

// ── Admin: limpar todos os palpites (confirmação em 2 cliques) ─────────────────
const clearConfirm = ref(false);
const clearing = ref(false);
async function clearAll() {
  if (!clearConfirm.value) { clearConfirm.value = true; return; }
  clearing.value = true;
  try { await store.clearPredictions(); buildEditModel(); }
  finally { clearing.value = false; clearConfirm.value = false; }
}

// ── Ciclo de vida ──────────────────────────────────────────────────────────────
async function loadEdition(s) {
  justSaved.value = false;
  showAdminPanel.value = false;
  await refreshAll(s);
  // Confete ao abrir a edição ativa (não no arquivo). Respeita reduced-motion.
  if (s !== 'copa-2026-gestores') setTimeout(() => fireConfetti(), 300);
}

onMounted(async () => {
  clock = setInterval(() => { now.value = Date.now(); }, 1000);
  await loadEdition(slug.value);
  setupPolling();
});
watch(slug, (s) => loadEdition(s));
onUnmounted(() => { if (timer) clearInterval(timer); if (clock) clearInterval(clock); });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader :title="pageTitle" :subtitle="headerSubtitle" icon="fas fa-futbol">
        <template #actions>
          <div class="flex items-center gap-2">
            <span v-if="statusChip" class="text-[11px] font-medium px-2.5 py-1 rounded-full" :class="statusChip.cls">{{ statusChip.text }}</span>
            <Button v-if="isAdmin && hasBolao" :variant="showAdminPanel ? 'ghost' : 'secondary'"
              :icon="showAdminPanel ? 'fas fa-list-ol' : 'fas fa-pen'" size="sm" @click="toggleAdminPanel">
              {{ showAdminPanel ? 'Ver ranking' : 'Cadastrar palpites' }}
            </Button>
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="store.loading" @click="refreshAll()">Atualizar</Button>
          </div>
        </template>
      </PageHeader>

      <!-- Faixa de arquivo / volta -->
      <div v-if="isArchive" class="mb-4 flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-4 py-2.5">
        <span class="text-xs text-ink-muted"><i class="fas fa-box-archive mr-1.5"></i> Arquivo da 1ª chave (Copa 2026). Apenas leitura.</span>
        <button type="button" class="text-xs font-medium text-accent hover:underline" @click="router.push('/bolao')">Ir para o bolão atual →</button>
      </div>

      <!-- Carregando inicial -->
      <Surface v-if="store.loading && !hasBolao" variant="raised" padding="lg" class="text-center text-sm text-ink-muted">
        Carregando o bolão…
      </Surface>

      <!-- Estado vazio -->
      <Surface v-else-if="!hasBolao" variant="raised" padding="lg" class="text-center">
        <div class="py-8">
          <div class="h-14 w-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center mb-4">
            <i class="fas fa-futbol text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-ink">Bolão ainda não configurado</h3>
          <p class="text-sm text-ink-muted mt-1">
            {{ isAdmin ? 'Crie esta edição do bolão (gera o jogo). Os participantes gravam o próprio palpite.' : 'Em breve o administrador vai configurar o bolão.' }}
          </p>
          <div v-if="isAdmin" class="mt-4">
            <Button variant="primary" icon="fas fa-wand-magic-sparkles" :loading="seeding" @click="criarBolao">Criar bolão</Button>
          </div>
        </div>
      </Surface>

      <!-- Conteúdo -->
      <template v-else>
        <!-- Banner do prêmio (edição de placar exato) -->
        <div v-if="isExactRule && !isArchive" class="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/15 to-amber-300/5 px-4 py-3">
          <div class="h-10 w-10 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-300 grid place-items-center shrink-0">
            <i class="fas fa-trophy text-lg"></i>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-ink">{{ store.bolao?.prize || 'Prêmio' }} para quem cravar o placar exato</div>
            <div class="text-xs text-ink-muted">Acertou o resultado mas não o placar não vale. É cravar ou nada.</div>
          </div>
        </div>

        <!-- Programação: hero (1 jogo) ou grade (vários) -->
        <div v-if="store.matches.length === 1" class="mb-4">
          <Surface v-for="m in store.matches" :key="m.id" variant="raised" padding="lg" class="overflow-hidden">
            <div class="flex items-center justify-center mb-4">
              <span v-if="isLive(m)" class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {{ m.status === 'halftime' ? 'INTERVALO' : 'AO VIVO' }}{{ m.live_minute != null && m.status === 'live' ? ` · ${m.live_minute}'` : '' }}
              </span>
              <span v-else-if="m.status === 'finished'" class="text-[11px] font-medium text-ink-subtle uppercase tracking-wide">Encerrado</span>
              <span v-else class="text-[11px] text-ink-muted capitalize">{{ fmtDate(m.kickoff_at) }} · {{ fmtTime(m.kickoff_at) }}</span>
            </div>

            <div class="flex items-center justify-center gap-5 sm:gap-10">
              <div class="flex flex-col items-center gap-2 w-24 sm:w-32">
                <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-14 w-20 rounded-lg object-cover ring-1 ring-line shadow-sm" :alt="m.home_team" />
                <span class="text-sm font-semibold text-center text-ink">{{ m.home_team }}</span>
              </div>

              <div class="flex flex-col items-center px-1 shrink-0">
                <div v-if="matchScore(m)" class="text-4xl sm:text-5xl font-extrabold tabular-nums text-ink">{{ matchScore(m) }}</div>
                <div v-else class="text-2xl font-bold text-ink-subtle">×</div>
              </div>

              <div class="flex flex-col items-center gap-2 w-24 sm:w-32">
                <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-14 w-20 rounded-lg object-cover ring-1 ring-line shadow-sm" :alt="m.away_team" />
                <span class="text-sm font-semibold text-center text-ink">{{ m.away_team }}</span>
              </div>
            </div>
          </Surface>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Surface v-for="m in store.matches" :key="m.id" variant="raised" padding="md">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[11px] font-medium text-ink-subtle">Jogo {{ m.match_order }}</span>
              <span v-if="isLive(m)" class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {{ m.status === 'halftime' ? 'INTERVALO' : 'AO VIVO' }}
              </span>
              <span v-else-if="m.status === 'finished'" class="text-[11px] font-medium text-ink-subtle">Encerrado</span>
              <span v-else class="text-[11px] text-ink-muted capitalize">{{ fmtDate(m.kickoff_at) }} · {{ fmtTime(m.kickoff_at) }}</span>
            </div>

            <div class="flex items-center justify-between gap-2">
              <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-9 w-12 rounded object-cover ring-1 ring-line" :alt="m.home_team" />
                <span class="text-xs font-medium text-center text-ink truncate w-full">{{ m.home_team }}</span>
              </div>
              <div class="flex flex-col items-center px-1 shrink-0">
                <div v-if="matchScore(m)" class="text-2xl font-bold tabular-nums text-ink">{{ matchScore(m) }}</div>
                <div v-else class="text-sm text-ink-subtle">vs</div>
                <div v-if="m.status === 'live'" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{{ m.live_minute != null ? m.live_minute + "'" : '' }}</div>
              </div>
              <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-9 w-12 rounded object-cover ring-1 ring-line" :alt="m.away_team" />
                <span class="text-xs font-medium text-center text-ink truncate w-full">{{ m.away_team }}</span>
              </div>
            </div>
          </Surface>
        </div>

        <!-- ── SEU PALPITE (auto-palpite, só na edição ativa) ── -->
        <Surface v-if="!isArchive && !showAdminPanel" variant="raised" padding="md" class="mb-4">
          <!-- Pode palpitar -->
          <template v-if="canPredict">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-pen-to-square text-accent"></i>
              <h3 class="text-sm font-semibold text-ink">Seu palpite</h3>
              <span class="text-[11px] text-ink-subtle">— grava com a sua conta</span>
            </div>

            <div v-for="m in pendingMatches" :key="m.id" class="rounded-xl border border-line bg-surface p-4">
              <div class="flex items-center justify-center gap-4 sm:gap-8">
                <div class="flex flex-col items-center gap-2 w-20">
                  <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-9 w-12 rounded object-cover ring-1 ring-line" :alt="m.home_team" />
                  <span class="text-xs font-medium text-ink text-center">{{ m.home_team }}</span>
                </div>

                <div class="flex items-center gap-2">
                  <div class="flex flex-col items-center gap-1.5">
                    <button type="button" class="h-8 w-8 grid place-items-center rounded-lg bg-surface-sunken text-ink-muted hover:bg-accent-soft hover:text-accent transition" @click="bump(m.id,'home',1)"><i class="fas fa-chevron-up text-xs"></i></button>
                    <span class="text-3xl font-extrabold tabular-nums text-ink w-10 text-center">{{ scoreOf(m.id).home }}</span>
                    <button type="button" class="h-8 w-8 grid place-items-center rounded-lg bg-surface-sunken text-ink-muted hover:bg-accent-soft hover:text-accent transition" @click="bump(m.id,'home',-1)"><i class="fas fa-chevron-down text-xs"></i></button>
                  </div>
                  <span class="text-xl font-bold text-ink-subtle px-1">:</span>
                  <div class="flex flex-col items-center gap-1.5">
                    <button type="button" class="h-8 w-8 grid place-items-center rounded-lg bg-surface-sunken text-ink-muted hover:bg-accent-soft hover:text-accent transition" @click="bump(m.id,'away',1)"><i class="fas fa-chevron-up text-xs"></i></button>
                    <span class="text-3xl font-extrabold tabular-nums text-ink w-10 text-center">{{ scoreOf(m.id).away }}</span>
                    <button type="button" class="h-8 w-8 grid place-items-center rounded-lg bg-surface-sunken text-ink-muted hover:bg-accent-soft hover:text-accent transition" @click="bump(m.id,'away',-1)"><i class="fas fa-chevron-down text-xs"></i></button>
                  </div>
                </div>

                <div class="flex flex-col items-center gap-2 w-20">
                  <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-9 w-12 rounded object-cover ring-1 ring-line" :alt="m.away_team" />
                  <span class="text-xs font-medium text-ink text-center">{{ m.away_team }}</span>
                </div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-center">
              <Button variant="primary" icon="fas fa-check" @click="openConfirm">Confirmar meu palpite</Button>
            </div>
            <p class="mt-2 text-center text-[11px] text-ink-subtle">Depois de confirmar não dá pra editar.</p>
          </template>

          <!-- Já gravou -->
          <template v-else-if="myPicks.length">
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-circle-check text-emerald-500"></i>
              <h3 class="text-sm font-semibold text-ink">Palpite gravado</h3>
              <span v-if="justSaved" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">acabou de salvar 🎉</span>
            </div>
            <div v-for="m in myPicks" :key="m.id" class="flex items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <span class="text-xs font-medium text-ink">{{ m.home_team }}</span>
              <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-4 w-6 rounded object-cover ring-1 ring-line" :alt="m.home_team" />
              <b class="text-2xl font-extrabold tabular-nums text-ink px-2">{{ myPredFor(m.id).home }} : {{ myPredFor(m.id).away }}</b>
              <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-4 w-6 rounded object-cover ring-1 ring-line" :alt="m.away_team" />
              <span class="text-xs font-medium text-ink">{{ m.away_team }}</span>
            </div>
            <p class="mt-2 text-center text-[11px] text-ink-subtle">
              {{ predictionsOpen ? 'Boa sorte! O placar e o ranking atualizam ao vivo durante o jogo.' : 'Palpites encerrados. Acompanhe o jogo ao vivo.' }}
            </p>
          </template>

          <!-- Encerrou e não palpitou -->
          <template v-else-if="!predictionsOpen">
            <div class="py-4 text-center">
              <i class="fas fa-clock text-ink-subtle text-xl"></i>
              <p class="text-sm text-ink-muted mt-2">Os palpites estão encerrados — você não palpitou desta vez.</p>
            </div>
          </template>
        </Surface>

        <!-- Resultado: quem cravou (após o jogo) -->
        <div v-if="isExactRule && !isArchive && gameFinished" class="mb-4 rounded-2xl border px-4 py-3"
          :class="exactWinners.length ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-line bg-surface-sunken'">
          <div v-if="exactWinners.length" class="text-sm text-ink">
            <i class="fas fa-bullseye text-emerald-500 mr-1.5"></i>
            <b>{{ exactWinners.length }}</b> {{ exactWinners.length === 1 ? 'pessoa cravou' : 'pessoas cravaram' }} o placar e {{ exactWinners.length === 1 ? 'leva' : 'levam' }} {{ store.bolao?.prize }}:
            <span class="font-medium">{{ exactWinners.map(w => w.participant.display_name).join(', ') }}</span>
          </div>
          <div v-else class="text-sm text-ink-muted">
            <i class="fas fa-face-meh mr-1.5"></i> Ninguém cravou o placar desta vez. Fica pra próxima!
          </div>
        </div>

        <!-- Resenha do Eme -->
        <Surface variant="raised" padding="md" class="mb-4">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <i class="fas fa-robot"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-ink">Resenha do Eme</div>
              <p class="text-sm text-ink-muted mt-0.5">
                {{ store.recap || (store.loadingRecap ? 'Pensando na resenha…' : 'Sem resenha no momento.') }}
              </p>
            </div>
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="store.loadingRecap" @click="store.fetchRecap()" />
          </div>
        </Surface>

        <!-- ── EDITOR ADMIN ── -->
        <Surface v-if="isAdmin && showAdminPanel" variant="raised" padding="md">
          <div class="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 class="text-sm font-semibold text-ink">Cadastrar palpites</h3>
              <p class="text-xs text-ink-muted mt-0.5">Os participantes gravam sozinhos; aqui é só ajuste manual se precisar.</p>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="clearConfirm" type="button" class="text-[11px] text-ink-subtle hover:text-ink" @click="clearConfirm = false">cancelar</button>
              <Button :variant="clearConfirm ? 'danger' : 'ghost'" icon="fas fa-eraser" size="sm" :loading="clearing" @click="clearAll">
                {{ clearConfirm ? 'Confirmar limpeza?' : 'Limpar palpites' }}
              </Button>
              <Button variant="secondary" icon="fas fa-user-plus" size="sm" @click="openUserPicker">Adicionar participante</Button>
            </div>
          </div>

          <div v-if="!store.ranking.length" class="rounded-xl border border-dashed border-line py-10 text-center">
            <i class="fas fa-users text-ink-subtle text-xl"></i>
            <p class="text-sm text-ink-muted mt-2">Nenhum participante ainda.</p>
          </div>

          <div v-else class="space-y-2.5">
            <div v-for="row in store.ranking" :key="row.participant.id"
              class="rounded-xl border border-line bg-surface p-3 sm:p-4">
              <div class="flex items-center justify-between gap-3 mb-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="h-9 w-9 rounded-full bg-surface-sunken text-ink-muted grid place-items-center text-xs font-semibold shrink-0">{{ row.participant.avatar_initials }}</span>
                  <div class="min-w-0">
                    <div class="text-sm font-medium text-ink truncate">{{ row.participant.display_name }}</div>
                    <div class="text-[11px] text-ink-subtle truncate">{{ row.participant.subtitle }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <Button variant="primary" size="sm" :loading="savingPid === row.participant.id" @click="saveParticipant(row.participant.id)">Salvar</Button>
                  <button type="button" title="Remover participante"
                    class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                    :disabled="removingPid === row.participant.id" @click="removeParticipant(row.participant.id)">
                    <i class="fas fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div v-for="m in store.matches" :key="m.id" class="rounded-lg border border-line bg-surface-raised px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1.5 mb-2 text-[11px] text-ink-muted">
                    <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-3 w-4 rounded-[2px] object-cover" :alt="m.home_team" />
                    <span class="font-medium text-ink">{{ m.home_code }}</span>
                    <span class="text-ink-subtle">×</span>
                    <span class="font-medium text-ink">{{ m.away_code }}</span>
                    <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-3 w-4 rounded-[2px] object-cover" :alt="m.away_team" />
                  </div>
                  <div v-if="editModel[row.participant.id] && editModel[row.participant.id][m.id]" class="flex items-center justify-center gap-2">
                    <input v-model.number="editModel[row.participant.id][m.id].home" type="number" min="0" :class="scoreCls" />
                    <span class="text-ink-subtle font-semibold">:</span>
                    <input v-model.number="editModel[row.participant.id][m.id].away" type="number" min="0" :class="scoreCls" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <!-- ── RANKING ── -->
        <Surface v-else variant="raised" padding="md">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="text-sm font-semibold text-ink">Ranking</h3>
            <div class="flex items-center gap-3 text-[11px] text-ink-muted">
              <template v-if="isExactRule">
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> cravou (leva o prêmio)</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-red-400/70"></span> não cravou</span>
              </template>
              <template v-else>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> cravou (+{{ store.bolao?.points_exact ?? 3 }})</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span> vencedor (+{{ store.bolao?.points_winner ?? 1 }})</span>
                <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-red-400"></span> errou</span>
              </template>
            </div>
          </div>

          <div v-if="!store.reveal && predictionsOpen" class="mb-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-surface-sunken text-ink-muted">
            <i class="fas fa-lock"></i> Os palpites de todo mundo aparecem quando os palpites travarem (no apito). Quem já palpitou aparece na lista.
          </div>

          <div class="divide-y divide-line-subtle">
            <div v-for="row in store.ranking" :key="row.participant.id"
              class="flex items-center gap-3 py-2.5"
              :class="row.position === 1 && row.total > 0 ? 'px-2 -mx-2 rounded-lg bg-emerald-500/5' : ''">
              <span class="h-7 w-7 rounded-full grid place-items-center text-xs font-bold shrink-0" :class="medalStyle(row.position, row.total)">
                <i v-if="row.position === 1 && row.total > 0" class="fas fa-crown text-[11px]"></i>
                <template v-else>{{ row.position }}</template>
              </span>

              <span class="h-9 w-9 rounded-full bg-surface-sunken text-ink-muted grid place-items-center text-xs font-semibold shrink-0">{{ row.participant.avatar_initials }}</span>

              <div class="flex-1 min-w-0">
                <div class="font-medium text-ink truncate">{{ row.participant.display_name }}</div>
                <div class="text-[11px] text-ink-subtle truncate">{{ row.participant.subtitle }}</div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span v-for="(cell, ci) in row.perMatch" :key="ci" class="h-2.5 w-2.5 rounded-full" :class="dotClassFor(cell)" :title="dotTitle(cell, store.matches[ci])"></span>
              </div>

              <div v-if="!isExactRule || gameFinished" class="text-right w-14 shrink-0">
                <span class="text-lg font-bold tabular-nums text-ink">{{ row.total }}</span>
                <span class="text-[11px] text-ink-subtle"> pts</span>
              </div>

              <button type="button" title="Ver palpite" :aria-label="`Ver palpite de ${row.participant.display_name}`"
                class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle hover:bg-accent-soft hover:text-accent transition-colors shrink-0"
                @click="openView(row)">
                <i class="fas fa-eye text-xs"></i>
              </button>
            </div>

            <div v-if="!store.ranking.length" class="py-10 text-center text-sm text-ink-muted">
              Ninguém palpitou ainda{{ isArchive ? '.' : ' — seja o primeiro!' }}
            </div>
          </div>
        </Surface>
      </template>

    </PageContainer>

    <!-- Modal: confirmar meu palpite -->
    <Modal :open="showConfirm" size="sm" title="Confirmar palpite" subtitle="Depois de confirmar não dá pra editar" @close="showConfirm = false">
      <div class="space-y-2">
        <div v-for="m in pendingMatches" :key="m.id" class="flex items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <span class="text-sm font-medium text-ink">{{ m.home_team }}</span>
          <b class="text-2xl font-extrabold tabular-nums text-ink px-2">{{ scoreOf(m.id).home }} : {{ scoreOf(m.id).away }}</b>
          <span class="text-sm font-medium text-ink">{{ m.away_team }}</span>
        </div>
        <p v-if="submitError" class="text-xs text-red-500 text-center">{{ submitError }}</p>
      </div>
      <template #footer>
        <Button variant="secondary" :disabled="submitting" @click="showConfirm = false">Voltar</Button>
        <Button variant="primary" icon="fas fa-check" :loading="submitting" @click="confirmSubmit">Confirmar</Button>
      </template>
    </Modal>

    <!-- Modal: adicionar participante (usuários do sistema) -->
    <Modal :open="showUserPicker" size="md" title="Adicionar participante" subtitle="Escolha um usuário do sistema" @close="showUserPicker = false">
      <Input v-model="userSearch" icon-left="fas fa-magnifying-glass" placeholder="Buscar por nome, cargo ou cidade…" />
      <div class="mt-3 -mx-1 max-h-[52vh] overflow-y-auto">
        <button v-for="u in filteredUsers" :key="u.id" type="button" :disabled="addingId === u.id"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-sunken text-left transition-colors disabled:opacity-50"
          @click="addUser(u)">
          <span class="h-9 w-9 rounded-full bg-surface-sunken text-ink-muted grid place-items-center text-xs font-semibold shrink-0">{{ initials(u.username) }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-ink truncate">{{ u.username }}</div>
            <div class="text-[11px] text-ink-subtle truncate">{{ u.position || u.city || '—' }}</div>
          </div>
          <i :class="addingId === u.id ? 'fas fa-circle-notch fa-spin' : 'fas fa-plus'" class="text-accent text-sm shrink-0"></i>
        </button>

        <div v-if="!filteredUsers.length" class="py-10 text-center text-sm text-ink-muted">
          {{ usersLoaded ? 'Nenhum usuário encontrado.' : 'Carregando usuários…' }}
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" @click="showUserPicker = false">Concluir</Button>
      </template>
    </Modal>

    <!-- Modal: ver palpite de um participante (olhinho) -->
    <Modal :open="viewPid != null" size="md"
      :title="viewRow ? `Palpite de ${viewRow.participant.display_name}` : 'Palpite'"
      :subtitle="viewSubtitle" @close="viewPid = null">
      <div v-if="viewRow" class="space-y-2">
        <div v-for="(m, i) in store.matches" :key="m.id"
          class="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
          <div class="flex items-center gap-2 text-sm min-w-0">
            <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-3.5 w-5 rounded-[2px] object-cover shrink-0" :alt="m.home_team" />
            <span class="font-medium text-ink">{{ m.home_code }}</span>
            <b class="px-2 tabular-nums text-ink">{{ predScore(viewRow.perMatch[i]) }}</b>
            <span class="font-medium text-ink">{{ m.away_code }}</span>
            <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-3.5 w-5 rounded-[2px] object-cover shrink-0" :alt="m.away_team" />
          </div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" :class="cellLabel(viewRow.perMatch[i]?.status).cls">
            {{ cellLabel(viewRow.perMatch[i]?.status).t }}
          </span>
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" @click="viewPid = null">Fechar</Button>
      </template>
    </Modal>
  </div>
</template>
