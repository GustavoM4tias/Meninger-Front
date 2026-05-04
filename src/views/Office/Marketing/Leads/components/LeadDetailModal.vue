<script setup>
import { computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  lead: { type: Object, required: true },
  visivel: { type: Boolean, required: true },
});
defineEmits(['fechar']);

const empreendimentos = computed(() => {
  const arr = Array.isArray(props.lead?.empreendimento) ? props.lead.empreendimento : [];
  return arr.filter(Boolean);
});

const responsaveis = computed(() => [
  { label: 'Imobiliária', icon: 'fas fa-building',     value: props.lead?.imobiliaria?.nome },
  { label: 'Corretor',    icon: 'fas fa-user-tie',     value: props.lead?.corretor?.nome },
  { label: 'Gestor',      icon: 'fas fa-user-shield',  value: props.lead?.gestor?.nome },
]);

const tagLabel = (tag) => {
  if (typeof tag === 'string') return tag;
  return tag?.nome ?? tag?.name ?? tag?.label ?? String(tag);
};

const tags = computed(() => {
  const t = props.lead?.tags;
  return Array.isArray(t) ? t.filter(Boolean) : [];
});

const cancelInfo = computed(() => {
  const m = props.lead?.motivo_cancelamento;
  if (m) return { motivo: m, submotivo: props.lead?.submotivo_cancelamento || null };
  return null;
});

const lastInteracao = computed(() => {
  const i = props.lead?.interacao;
  if (!i) return null;
  if (Array.isArray(i)) return i.length ? i[i.length - 1] : null;
  return i;
});

const anotacao = computed(() => lastInteracao.value?.anotacao || null);

const locationText = computed(() => {
  const parts = [props.lead?.cidade, props.lead?.estado, props.lead?.cep].filter(Boolean);
  return parts.join(', ') || null;
});

// Cor do banner muda conforme o status (mantém o "tech feel")
const bannerGradient = computed(() => {
  const s = props.lead?.situacao_nome || '';
  if (['Vendido', 'Venda Realizada'].includes(s))   return 'from-emerald-700 via-emerald-600 to-teal-600';
  if (['Cancelado', 'Descartado'].includes(s))      return 'from-slate-700 via-slate-600 to-slate-700';
  if (['Em Negociação', 'Reservado', 'Com Reserva'].includes(s)) return 'from-amber-700 via-orange-600 to-amber-600';
  if (['Em Análise de Crédito'].includes(s))        return 'from-purple-700 via-violet-600 to-purple-600';
  return 'from-blue-700 via-blue-600 to-indigo-600';
});

const statusVariant = computed(() => {
  const map = {
    'Novo Lead': 'info', 'Novo': 'info',
    'Em Atendimento': 'warning', 'Em atendimento': 'warning',
    'Lead Qualificado': 'success',
    'Reservado': 'success', 'Com Reserva': 'success',
    'Vendido': 'success', 'Venda Realizada': 'success',
    'Cancelado': 'danger', 'Descartado': 'neutral',
    'Em Negociação': 'warning',
    'Em Análise de Crédito': 'accent',
    '1ª Tentativa de Contato': 'info',
    'Atendimento Externo': 'accent',
    'Aguardando Atendimento Corretor': 'warning',
  };
  return map[props.lead?.situacao_nome] || 'accent';
});

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const quickLinks = computed(() => [
  { url: `https://menin.cvcrm.com.br/gestor/comercial/leads/${props.lead.idlead}/administrar?lido=true`,
    label: 'CV CRM', img: '/CVLogo.png' },
  ...(props.lead?.link_rdstation
    ? [{ url: props.lead.link_rdstation, label: 'RD Station', img: '/RDLogo.png' }] : []),
  ...(props.lead?.link_interacoes
    ? [{ url: props.lead.link_interacoes, label: 'Interações', icon: 'fas fa-comments' }] : []),
  ...(props.lead?.link_simulacoes
    ? [{ url: props.lead.link_simulacoes, label: 'Simulações', icon: 'fas fa-calculator' }] : []),
  ...(props.lead?.link_reservas
    ? [{ url: props.lead.link_reservas, label: 'Reservas', icon: 'fas fa-bookmark' }] : []),
]);
</script>

<template>
  <Modal :open="visivel" size="lg" hide-close @close="$emit('fechar')">
    <!-- Sem header padrão — vamos usar banner customizado -->
    <template #header>
      <div class="hidden"></div>
    </template>

    <div class="-m-4 sm:-m-5">

      <!-- ─── Banner gradient ─── -->
      <div class="relative bg-gradient-to-br text-white px-5 sm:px-6 pt-5 pb-16 overflow-hidden"
        :class="bannerGradient">
        <!-- Decoração: pontinhos + glow sutil -->
        <div class="pointer-events-none absolute inset-0 opacity-30"
          style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 18px 18px;"></div>
        <div class="pointer-events-none absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium
                           bg-white/20 backdrop-blur border border-white/20 text-white">
                <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
                {{ lead.situacao_nome || 'Sem situação' }}
              </span>
              <span class="text-[11px] text-white/70 font-mono">#{{ lead.idlead }}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ lead.nome || '—' }}
            </h2>
            <p class="text-xs text-white/70 mt-1 font-mono">
              Cadastrado em {{ formatDate(lead.data_cad) }}
            </p>
          </div>

          <button @click="$emit('fechar')" aria-label="Fechar"
            class="h-9 w-9 grid place-items-center rounded-lg
                   bg-white/15 hover:bg-white/25 backdrop-blur
                   text-white transition-colors shrink-0">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <!-- Quick links (chips no banner) -->
        <div v-if="quickLinks.length" class="relative mt-4 flex flex-wrap gap-1.5">
          <a v-for="link in quickLinks" :key="link.label"
            :href="link.url" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                   bg-white/15 hover:bg-white/30 backdrop-blur border border-white/20
                   text-white text-xs font-medium transition-all hover:-translate-y-0.5">
            <img v-if="link.img" :src="link.img" :alt="link.label" class="h-3.5" />
            <i v-else-if="link.icon" :class="link.icon" class="text-[10px]"></i>
            {{ link.label }}
          </a>
        </div>
      </div>

      <!-- ─── Card de contato sobreposto ─── -->
      <div class="px-4 sm:px-5 -mt-10 mb-4 relative z-10">
        <div class="rounded-xl bg-surface-raised border border-line shadow-elevated p-3 sm:p-4 surface-gradient">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">
                <i class="far fa-envelope text-accent text-[9px] mr-1"></i>E-mail
              </p>
              <a v-if="lead.email" :href="`mailto:${lead.email}`"
                class="text-sm text-accent hover:underline truncate block break-all">
                {{ lead.email }}
              </a>
              <span v-else class="text-sm text-ink-subtle">—</span>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">
                <i class="fab fa-whatsapp text-emerald-500 text-[9px] mr-1"></i>Telefone
              </p>
              <a v-if="lead.telefone"
                :href="`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`" target="_blank"
                class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline truncate block">
                {{ lead.telefone }}
              </a>
              <span v-else class="text-sm text-ink-subtle">—</span>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">
                <i class="fas fa-location-dot text-red-400 text-[9px] mr-1"></i>Localização
              </p>
              <p class="text-sm text-ink truncate">{{ locationText || '—' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Sections ─── -->
      <div class="px-4 sm:px-5 pb-5 space-y-5">

        <!-- Empreendimentos -->
        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-city text-xs text-accent"></i>
            <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimentos</h4>
          </div>
          <div v-if="empreendimentos.length" class="flex flex-wrap gap-1.5">
            <Badge v-for="(e, i) in empreendimentos" :key="i" variant="accent">{{ e.nome || e }}</Badge>
          </div>
          <p v-else class="text-sm text-ink-subtle">—</p>
        </section>

        <!-- Responsáveis -->
        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-users text-xs text-accent"></i>
            <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Responsáveis</h4>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div v-for="r in responsaveis" :key="r.label"
              class="flex items-center gap-2 p-2.5 rounded-lg bg-surface-sunken border border-line min-w-0">
              <i :class="`${r.icon} text-ink-subtle text-xs shrink-0`"></i>
              <div class="min-w-0">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono leading-none">{{ r.label }}</p>
                <p class="text-sm font-medium text-ink truncate mt-0.5">{{ r.value || '—' }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Captação -->
        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-bullhorn text-xs text-accent"></i>
            <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Captação</h4>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-0.5">Mídia</p>
              <p class="text-sm text-ink">{{ lead.midia_principal || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-0.5">Origem</p>
              <p class="text-sm text-ink">{{ lead.origem || '—' }}</p>
            </div>
          </div>
        </section>

        <!-- Cancelamento -->
        <section v-if="cancelInfo"
          class="rounded-xl border border-red-500/20 bg-red-500/10 overflow-hidden">
          <div class="flex items-center gap-2 px-3 py-2 border-b border-red-500/20">
            <i class="fas fa-ban text-red-500 text-xs"></i>
            <p class="text-[10px] font-mono uppercase tracking-wider text-red-700 dark:text-red-300">
              Motivo de cancelamento / descarte
            </p>
          </div>
          <div class="px-3 py-2.5 space-y-1">
            <p class="text-sm font-semibold text-ink">{{ cancelInfo.motivo }}</p>
            <p v-if="cancelInfo.submotivo" class="text-xs text-ink-muted">{{ cancelInfo.submotivo }}</p>
          </div>
        </section>

        <!-- Tags -->
        <section v-if="tags.length">
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-tags text-xs text-accent"></i>
            <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Tags</h4>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="(tag, i) in tags" :key="i" variant="warning" size="sm">{{ tagLabel(tag) }}</Badge>
          </div>
        </section>

        <!-- Última interação -->
        <section v-if="lastInteracao">
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-comment-dots text-xs text-accent"></i>
            <h4 class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Última interação</h4>
          </div>
          <div class="rounded-xl border border-line overflow-hidden">
            <div class="px-3 py-2 bg-surface-sunken flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <i class="far fa-clock text-[10px]"></i>
              <span class="font-mono">{{ formatDate(lastInteracao.data_cad) }}</span>
              <Badge v-if="lastInteracao.tipo" variant="info" size="sm">{{ lastInteracao.tipo }}</Badge>
              <span v-if="lastInteracao.usuario" class="ml-auto inline-flex items-center gap-1">
                <i class="fas fa-user text-[10px]"></i>{{ lastInteracao.usuario }}
              </span>
            </div>
            <div class="px-3 py-2.5 space-y-2">
              <div v-if="lastInteracao.descricao">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Descrição</p>
                <p class="text-sm text-ink leading-relaxed whitespace-pre-line">{{ lastInteracao.descricao }}</p>
              </div>
              <div v-if="anotacao">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Anotação</p>
                <p class="text-sm text-ink leading-relaxed italic">{{ anotacao }}</p>
              </div>
              <p v-if="!lastInteracao.descricao && !anotacao" class="text-sm text-ink-subtle italic">
                Sem conteúdo registrado.
              </p>
            </div>
          </div>
          <a v-if="lead.link_interacoes" :href="lead.link_interacoes" target="_blank"
            class="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
            <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
            Ver histórico completo no CRM
          </a>
        </section>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="$emit('fechar')">Fechar</Button>
    </template>
  </Modal>
</template>
