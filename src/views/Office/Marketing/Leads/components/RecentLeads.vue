<script setup>
// "Leads recentes" — últimos leads captados no período, com situação e tempo.
import { computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const props = defineProps({
  leads: { type: Array, default: () => [] },
  limit: { type: Number, default: 6 },
});
const emit = defineEmits(['verTodos', 'abrirLead']);

const AVATAR = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6', '#ef4444'];

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mesma família de cores do funil, para a situação ler igual na tela toda.
function statusColor(situacao) {
  const n = norm(situacao);
  if (['descartad', 'perdid', 'sem interesse'].some(k => n.includes(k))) return '#ef4444';
  if (['reserva', 'proposta', 'venda', 'contrato'].some(k => n.includes(k))) return '#10b981';
  if (n.includes('qualificad')) return '#f59e0b';
  if (['atendimento', 'externo'].some(k => n.includes(k))) return '#8b5cf6';
  if (['tentativa', 'contato'].some(k => n.includes(k))) return '#06b6d4';
  return '#3b82f6';   // novo / aguardando / demais
}

function initials(nome) {
  const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Cor estável por nome (hash simples) para o avatar não "piscar" entre renders.
function avatarColor(nome) {
  const s = String(nome || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

const recentes = computed(() =>
  [...(props.leads || [])]
    .filter(l => l?.data_cad && dayjs(l.data_cad).isValid())
    .sort((a, b) => dayjs(b.data_cad).valueOf() - dayjs(a.data_cad).valueOf())
    .slice(0, props.limit)
    .map(l => ({
      raw: l,
      nome: l.nome || 'Sem nome',
      empreendimento: l.empreendimento?.[0]?.nome || 'Sem empreendimento',
      origem: l.origem || '—',
      situacao: l.situacao_nome || 'Sem situação',
      cor: statusColor(l.situacao_nome),
      quando: dayjs(l.data_cad).fromNow(),
    }))
);
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4">
    <div class="flex items-center justify-between gap-3 mb-1">
      <h2 class="text-micro font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
        <i class="fas fa-user-clock text-accent"></i>Leads recentes
      </h2>
      <button v-if="recentes.length" type="button" @click="emit('verTodos')"
        class="text-xs font-medium text-accent hover:underline shrink-0">
        Ver todos
      </button>
    </div>

    <ul v-if="recentes.length" class="divide-y divide-line">
      <li v-for="(l, i) in recentes" :key="i">
        <button type="button" @click="emit('abrirLead', l.raw)"
          class="w-full flex items-center gap-3 py-2.5 text-left group rounded-lg
                 hover:bg-accent-soft/30 transition-colors px-1 -mx-1">
          <!-- Avatar -->
          <span class="h-9 w-9 shrink-0 rounded-full grid place-items-center text-micro font-bold text-white"
            :style="{ backgroundColor: avatarColor(l.nome) }">
            {{ initials(l.nome) }}
          </span>

          <!-- Nome + contexto -->
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
              {{ l.nome }}
            </span>
            <span class="block text-xs text-ink-muted truncate">
              {{ l.empreendimento }} · {{ l.origem }}
            </span>
          </span>

          <!-- Situação + tempo -->
          <span class="shrink-0 text-right">
            <span class="flex items-center justify-end gap-1.5 text-xs font-medium"
              :style="{ color: l.cor }">
              <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: l.cor }"></span>
              <span class="truncate max-w-[7.5rem]">{{ l.situacao }}</span>
            </span>
            <span class="block text-micro text-ink-subtle mt-0.5">{{ l.quando }}</span>
          </span>
        </button>
      </li>
    </ul>

    <div v-else class="h-32 grid place-items-center text-sm text-ink-subtle">
      Sem leads no período
    </div>
  </section>
</template>
