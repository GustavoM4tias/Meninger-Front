<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import { useBolaoStore } from '@/stores/Bolao/bolaoStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const store = useBolaoStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth.hasRole('admin'));
const hasBolao = computed(() => !!store.bolao);

const flagUrl = (c) => (c ? `/flags/${c}.png` : '');

const fmtDate = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso));
const fmtTime = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const headerSubtitle = computed(() => {
  const b = store.bolao;
  if (!b) return 'Palpites, placar ao vivo e ranking';
  const parts = [`${b.points_exact} pts placar exato`, `${b.points_winner} pt no vencedor`];
  if (b.prize) parts.push(`prêmio ${b.prize}`);
  return parts.join(' · ');
});

const statusChip = computed(() => {
  const b = store.bolao;
  if (!b) return null;
  if (b.status === 'open') return { text: 'Palpites abertos', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
  if (b.status === 'finished') return { text: 'Encerrado', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
  return { text: 'Palpites travados', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
});

const leadersCount = computed(() => store.ranking.filter(r => r.position === 1 && r.total > 0).length);

function matchScore(m) {
  if (m.status === 'finished') return `${m.home_score} x ${m.away_score}`;
  if (m.status === 'live' || m.status === 'halftime') return `${m.live_home ?? 0} x ${m.live_away ?? 0}`;
  return null;
}

// ── Leaderboard: indicadores por jogo (sem revelar o número do palpite) ────────
const dotClass = (status) => ({
  exact: 'bg-green-500',
  winner: 'bg-blue-500',
  miss: 'bg-red-400',
  pending: 'bg-gray-300 dark:bg-gray-600',
}[status] || 'bg-gray-300 dark:bg-gray-600');

function dotTitle(cell, m) {
  if (!m) return '';
  const label = `${m.home_code}×${m.away_code}`;
  const res = { exact: 'cravou (+' + (store.bolao?.points_exact ?? 3) + ')', winner: 'acertou o vencedor (+' + (store.bolao?.points_winner ?? 1) + ')', miss: 'errou', pending: 'aguardando' }[cell.status] || '';
  if (isAdmin.value && cell.has_prediction) return `${label}: palpite ${cell.pred_home}-${cell.pred_away} · ${res}`;
  return `${label}: ${res}`;
}

function medalStyle(pos, total) {
  if (total <= 0) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  if (pos === 1) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (pos === 2) return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  if (pos === 3) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
}

// ── Polling enquanto há jogo ao vivo (pausa com o painel admin aberto) ─────────
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
function refreshAll() {
  return Promise.all([store.fetchOverview(), store.fetchLive(), store.fetchRecap()]);
}

// ── Admin: criar bolão (seed) ─────────────────────────────────────────────────
const seeding = ref(false);
async function criarBolao() {
  seeding.value = true;
  try { await store.runSeed(); } finally { seeding.value = false; }
}

// ── Admin: cadastrar palpites 1 por 1 ─────────────────────────────────────────
const showAdminPanel = ref(false);
const editModel = reactive({}); // { [participantId]: { [matchId]: { home, away } } }
const savingPid = ref(null);
const newParticipantName = ref('');
const addingParticipant = ref(false);

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
async function addParticipante() {
  const name = newParticipantName.value.trim();
  if (!name) return;
  addingParticipant.value = true;
  try {
    await store.addParticipant({ name });
    newParticipantName.value = '';
    buildEditModel();
  } finally {
    addingParticipant.value = false;
  }
}

onMounted(async () => {
  await Promise.all([store.fetchOverview(), store.fetchLive(), store.fetchRecap()]);
  setupPolling();
});
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader title="Bolão da Copa" :subtitle="headerSubtitle" icon="fas fa-futbol">
        <template #actions>
          <div class="flex items-center gap-2">
            <span v-if="statusChip" class="text-[11px] font-medium px-2 py-1 rounded" :class="statusChip.cls">{{ statusChip.text }}</span>
            <Button v-if="isAdmin && hasBolao" :variant="showAdminPanel ? 'primary' : 'secondary'" icon="fas fa-pen" size="sm" @click="toggleAdminPanel">
              {{ showAdminPanel ? 'Fechar cadastro' : 'Cadastrar palpites' }}
            </Button>
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="store.loading" @click="refreshAll">Atualizar</Button>
          </div>
        </template>
      </PageHeader>

      <!-- Carregando inicial -->
      <Surface v-if="store.loading && !hasBolao" variant="raised" padding="lg" class="text-center text-sm text-gray-500">
        Carregando o bolão…
      </Surface>

      <!-- Estado vazio -->
      <Surface v-else-if="!hasBolao" variant="raised" padding="lg" class="text-center">
        <div class="py-8">
          <div class="h-14 w-14 mx-auto rounded-2xl bg-green-500/10 text-green-600 grid place-items-center mb-4">
            <i class="fas fa-futbol text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">Bolão ainda não configurado</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ isAdmin ? 'Crie o bolão da Copa e importe os palpites do grupo.' : 'Em breve o administrador vai configurar o bolão.' }}
          </p>
          <div v-if="isAdmin" class="mt-4">
            <Button variant="primary" icon="fas fa-wand-magic-sparkles" :loading="seeding" @click="criarBolao">Criar bolão da Copa</Button>
          </div>
        </div>
      </Surface>

      <!-- Conteúdo -->
      <template v-else>
        <!-- Resenha do Eme -->
        <Surface variant="raised" padding="md" class="mb-4">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 grid place-items-center shrink-0">
              <i class="fas fa-robot"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-gray-800 dark:text-gray-100">Resenha do Eme</div>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {{ store.recap || (store.loadingRecap ? 'Pensando na resenha…' : 'Sem resenha no momento.') }}
              </p>
            </div>
            <Button variant="ghost" icon="fas fa-rotate" size="sm" :loading="store.loadingRecap" @click="store.fetchRecap" />
          </div>
        </Surface>

        <!-- Programação (cards com bandeira) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Surface v-for="m in store.matches" :key="m.id" variant="raised" padding="md">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[11px] font-medium text-gray-400">Jogo {{ m.match_order }}</span>
              <span v-if="m.status === 'live' || m.status === 'halftime'" class="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                {{ m.status === 'halftime' ? 'INTERVALO' : 'AO VIVO' }}
              </span>
              <span v-else-if="m.status === 'finished'" class="text-[11px] font-medium text-gray-400">Encerrado</span>
              <span v-else class="text-[11px] text-gray-500 capitalize">{{ fmtDate(m.kickoff_at) }} · {{ fmtTime(m.kickoff_at) }}</span>
            </div>

            <div class="flex items-center justify-between gap-2">
              <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <img v-if="flagUrl(m.home_country)" :src="flagUrl(m.home_country)" class="h-9 w-12 rounded object-cover shadow-sm" :alt="m.home_team" />
                <span class="text-xs font-medium text-center text-gray-700 dark:text-gray-200 truncate w-full">{{ m.home_team }}</span>
              </div>

              <div class="flex flex-col items-center px-1 shrink-0">
                <div v-if="matchScore(m)" class="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{{ matchScore(m) }}</div>
                <div v-else class="text-sm text-gray-400">vs</div>
                <div v-if="m.status === 'live'" class="text-[11px] font-semibold text-green-600 dark:text-green-400 tabular-nums">{{ m.live_minute != null ? m.live_minute + "'" : '' }}</div>
                <div v-else-if="m.status === 'halftime'" class="text-[11px] font-semibold text-green-600 dark:text-green-400">intervalo</div>
              </div>

              <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <img v-if="flagUrl(m.away_country)" :src="flagUrl(m.away_country)" class="h-9 w-12 rounded object-cover shadow-sm" :alt="m.away_team" />
                <span class="text-xs font-medium text-center text-gray-700 dark:text-gray-200 truncate w-full">{{ m.away_team }}</span>
              </div>
            </div>
          </Surface>
        </div>

        <!-- Avisos -->
        <div v-if="leadersCount > 1" class="mb-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <i class="fas fa-triangle-exclamation"></i> {{ leadersCount }} empatados na liderança — desempate por cravadas, depois menor erro de placar, depois ordem de envio.
        </div>

        <!-- Ranking -->
        <Surface variant="raised" padding="md">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Ranking</h3>
            <div class="flex items-center gap-3 text-[11px] text-gray-500">
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-green-500"></span> cravou (+{{ store.bolao?.points_exact ?? 3 }})</span>
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span> vencedor (+{{ store.bolao?.points_winner ?? 1 }})</span>
              <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-red-400"></span> errou</span>
            </div>
          </div>

          <div class="divide-y divide-gray-50 dark:divide-gray-800/60">
            <div v-for="row in store.ranking" :key="row.participant.id"
              class="flex items-center gap-3 py-2.5"
              :class="row.position === 1 && row.total > 0 ? 'px-2 -mx-2 rounded-lg bg-green-50/50 dark:bg-green-900/10' : ''">
              <span class="h-7 w-7 rounded-full grid place-items-center text-xs font-bold shrink-0" :class="medalStyle(row.position, row.total)">
                <i v-if="row.position === 1 && row.total > 0" class="fas fa-crown text-[11px]"></i>
                <template v-else>{{ row.position }}</template>
              </span>

              <span class="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 grid place-items-center text-xs font-semibold shrink-0">{{ row.participant.avatar_initials }}</span>

              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-800 dark:text-gray-100 truncate">{{ row.participant.display_name }}</div>
                <div class="text-[11px] text-gray-400 truncate">{{ row.participant.subtitle }}</div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span v-for="(cell, ci) in row.perMatch" :key="ci"
                  class="h-2.5 w-2.5 rounded-full" :class="dotClass(cell.status)"
                  :title="dotTitle(cell, store.matches[ci])"></span>
              </div>

              <div class="text-right w-14 shrink-0">
                <span class="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{{ row.total }}</span>
                <span class="text-[11px] text-gray-400"> pts</span>
              </div>
            </div>

            <div v-if="!store.ranking.length" class="py-10 text-center text-sm text-gray-400">
              Nenhum participante ainda.
            </div>
          </div>
        </Surface>

        <!-- Painel admin: cadastrar palpites 1 por 1 -->
        <Surface v-if="isAdmin && showAdminPanel" variant="raised" padding="md" class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Cadastrar palpites — um por participante</h3>
            <span class="text-[11px] text-gray-400">placar na orientação do jogo (casa × fora)</span>
          </div>

          <div class="space-y-2">
            <div v-for="row in store.ranking" :key="row.participant.id"
              class="flex items-center gap-3 flex-wrap py-2 border-b border-gray-50 dark:border-gray-800/60">
              <div class="w-40 min-w-[10rem]">
                <div class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{{ row.participant.display_name }}</div>
                <div class="text-[11px] text-gray-400 truncate">{{ row.participant.subtitle }}</div>
              </div>

              <div v-for="m in store.matches" :key="m.id" class="flex items-center gap-1.5">
                <span class="text-[10px] text-gray-400 w-14 text-right">{{ m.home_code }}×{{ m.away_code }}</span>
                <template v-if="editModel[row.participant.id] && editModel[row.participant.id][m.id]">
                  <input v-model.number="editModel[row.participant.id][m.id].home" type="number" min="0"
                    class="w-10 text-center rounded border border-gray-200 dark:border-gray-700 bg-transparent py-1 text-sm" />
                  <span class="text-gray-400 text-xs">x</span>
                  <input v-model.number="editModel[row.participant.id][m.id].away" type="number" min="0"
                    class="w-10 text-center rounded border border-gray-200 dark:border-gray-700 bg-transparent py-1 text-sm" />
                </template>
              </div>

              <Button variant="primary" size="sm" :loading="savingPid === row.participant.id" @click="saveParticipant(row.participant.id)">Salvar</Button>
            </div>
          </div>

          <!-- Adicionar participante por nome (sem dropdown) -->
          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <input v-model="newParticipantName" type="text" placeholder="Nome do participante"
              class="flex-1 max-w-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm"
              @keyup.enter="addParticipante" />
            <Button variant="secondary" icon="fas fa-user-plus" size="sm" :loading="addingParticipant" @click="addParticipante">Adicionar participante</Button>
          </div>
        </Surface>
      </template>

    </PageContainer>
  </div>
</template>
