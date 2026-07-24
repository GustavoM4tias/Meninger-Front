<script setup>
// Tabela densa de leads inbound. Estrutura horizontal compacta com 7 colunas:
//   Status | Canal | Lead (nome + contato) | Origem (campanha/form/page) |
//   Mídia / Vínculo | Datas (Meta/Office/CV) | Erro
//
// Click na linha abre o modal de detalhe. Direcionamento por coluna:
//   Status → filtra o inbox pelo status · Canal → filtra pelo canal ·
//   Campanha → abre o detalhe da campanha · Mídia → filtra pela mídia.

import LeadStatusBadge from './LeadStatusBadge.vue';
import LeadDatesCell from './LeadDatesCell.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    leads: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['open-detail', 'open-campaign', 'filter-status', 'filter-channel', 'filter-midia']);

const CHANNEL_META = {
    meta_lead_ads: { label: 'Meta', icon: 'fab fa-meta', cls: 'text-violet-500' },
    site_form:     { label: 'Site', icon: 'fas fa-globe',  cls: 'text-sky-500' },
};
const channelMeta = (c) => CHANNEL_META[c] || { label: c || '—', icon: 'fas fa-question', cls: 'text-ink-subtle' };

const CV_ORIGEM_LABEL = {
    FB: 'FB · Facebook', IG: 'IG · Instagram', SI: 'SI · Site',
    GO: 'GO · Google', MP: 'MP · Mídia Paga', OU: 'OU · Outros',
};
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando leads...
    </div>

    <!-- Vazio -->
    <EmptyState v-else-if="!leads.length"
      icon="fas fa-inbox" title="Nenhum lead encontrado"
      description="Ajuste os filtros ou aguarde o próximo lead chegar pelo webhook." />

    <!-- Tabela -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
            <th class="px-3 py-2.5 text-left w-[170px]">Status</th>
            <th class="px-3 py-2.5 text-left w-[80px]">Canal</th>
            <th class="px-3 py-2.5 text-left">Lead</th>
            <th class="px-3 py-2.5 text-left">Origem</th>
            <th class="px-3 py-2.5 text-left">Mídia / Vínculo</th>
            <th class="px-3 py-2.5 text-left w-[260px]">Datas</th>
            <th class="px-3 py-2.5 text-left w-[60px] text-right pr-4">
              <i class="fas fa-ellipsis"></i>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line/60">
          <tr v-for="lead in leads" :key="lead.id"
            @click="emit('open-detail', lead.id)"
            class="hover:bg-surface-hover/40 cursor-pointer transition-colors group">

            <!-- Status (clique = filtra o inbox por este status) -->
            <td class="px-3 py-2.5 align-top">
              <button @click.stop="emit('filter-status', lead.status)"
                class="hover:opacity-80 transition" :title="`Filtrar por este status`">
                <LeadStatusBadge :status="lead.status" size="sm" />
              </button>
              <Badge v-if="lead.is_reentry" variant="info" size="sm" class="ml-1" :dot="false" title="Re-entrada — pessoa já era lead no CV">
                <i class="fas fa-arrows-rotate text-[10px]"></i> reentry
              </Badge>
              <Badge v-if="lead.meta_is_organic === true || lead.meta_is_organic === 'true'"
                variant="info" size="sm" class="ml-1" :dot="false"
                title="Lead orgânico — veio do CTA da Página, sem campanha de Ads">
                <i class="fas fa-seedling text-[10px]"></i> orgânico
              </Badge>
            </td>

            <!-- Canal (clique = filtra o inbox por este canal) -->
            <td class="px-3 py-2.5 align-top">
              <button @click.stop="emit('filter-channel', lead.channel)"
                class="inline-flex items-center gap-1.5 text-xs hover:underline"
                :class="channelMeta(lead.channel).cls"
                :title="`Filtrar pelo canal ${channelMeta(lead.channel).label}`">
                <i :class="channelMeta(lead.channel).icon"></i>
                <span class="text-ink-muted">{{ channelMeta(lead.channel).label }}</span>
              </button>
            </td>

            <!-- Lead (nome + contato) -->
            <td class="px-3 py-2.5 align-top max-w-[240px]">
              <div v-if="lead.nome" class="text-sm font-medium text-ink truncate" :title="lead.nome">
                {{ lead.nome }}
              </div>
              <div v-else class="text-xs italic text-ink-subtle">(sem nome)</div>
              <div class="text-[11px] text-ink-muted truncate" :title="lead.email">
                <i v-if="lead.email" class="fas fa-envelope text-[9px] mr-1 text-ink-subtle"></i>{{ lead.email || '—' }}
              </div>
              <div class="text-[11px] text-ink-muted truncate" :title="lead.telefone">
                <i v-if="lead.telefone" class="fas fa-phone text-[9px] mr-1 text-ink-subtle"></i>{{ lead.telefone || '—' }}
              </div>
            </td>

            <!-- Origem (campanha + form + page) -->
            <td class="px-3 py-2.5 align-top max-w-[260px]">
              <!-- 1) Tem campanha Meta (clique = abre o detalhe da campanha) -->
              <template v-if="lead.meta_campaign_name">
                <button v-if="lead.meta_campaign_id"
                  @click.stop="emit('open-campaign', lead.meta_campaign_id)"
                  class="block text-xs text-ink truncate max-w-full text-left hover:text-accent hover:underline"
                  :title="`Abrir campanha ${lead.meta_campaign_name}`">
                  <i class="fas fa-bullhorn text-[10px] text-orange-500 mr-1"></i>{{ lead.meta_campaign_name }}
                </button>
                <div v-else class="text-xs text-ink truncate" :title="lead.meta_campaign_name">
                  <i class="fas fa-bullhorn text-[10px] text-orange-500 mr-1"></i>{{ lead.meta_campaign_name }}
                </div>
                <div v-if="lead.meta_form_name" class="text-[11px] text-ink-muted truncate" :title="lead.meta_form_name">
                  <i class="fas fa-square-poll-vertical text-[9px] text-ink-subtle mr-1"></i>{{ lead.meta_form_name }}
                </div>
                <div v-if="lead.meta_page_name" class="text-[10px] text-ink-subtle truncate" :title="lead.meta_page_name">
                  <i class="fas fa-flag text-[9px] mr-1"></i>{{ lead.meta_page_name }}
                </div>
              </template>

              <!-- 2) Meta sem campanha mas com form (orgânico, campanha antiga, lead de teste) -->
              <template v-else-if="lead.meta_form_name">
                <div class="text-[10px] text-ink-subtle italic mb-0.5">
                  <i class="fas fa-bullhorn text-[9px] mr-1"></i>sem campanha rastreada
                </div>
                <div class="text-xs text-ink-muted truncate" :title="lead.meta_form_name">
                  <i class="fas fa-square-poll-vertical text-[10px] text-ink-subtle mr-1"></i>{{ lead.meta_form_name }}
                </div>
                <div v-if="lead.meta_page_name" class="text-[10px] text-ink-subtle truncate" :title="lead.meta_page_name">
                  <i class="fas fa-flag text-[9px] mr-1"></i>{{ lead.meta_page_name }}
                </div>
              </template>

              <!-- 3) Form interno -->
              <template v-else-if="lead.lead_form_name">
                <div class="text-xs text-ink truncate">
                  <i class="fas fa-globe text-[10px] text-sky-500 mr-1"></i>{{ lead.lead_form_name }}
                </div>
                <div v-if="lead.lead_form_slug" class="text-[10px] text-ink-subtle font-mono truncate">
                  /{{ lead.lead_form_slug }}
                </div>
              </template>

              <span v-else class="text-xs text-ink-subtle italic">—</span>
            </td>

            <!-- Mídia / Vínculo (clique = filtra o inbox por esta mídia) -->
            <td class="px-3 py-2.5 align-top max-w-[200px]">
              <button v-if="lead.midia_slug" @click.stop="emit('filter-midia', lead.midia_slug)"
                class="block text-xs font-mono text-ink truncate max-w-full text-left hover:text-accent hover:underline"
                :title="`Filtrar pela mídia ${lead.midia_slug}`">
                {{ lead.midia_slug }}
              </button>
              <div v-else class="text-xs text-amber-600 dark:text-amber-400 italic">sem mídia</div>
              <div v-if="lead.cv_origem" class="text-[10px] text-ink-muted">
                {{ CV_ORIGEM_LABEL[lead.cv_origem] || lead.cv_origem }}
              </div>
              <div v-if="Array.isArray(lead.bound_empreendimentos) && lead.bound_empreendimentos.length"
                class="text-[10px] text-ink-subtle">
                <i class="fas fa-building text-[9px] mr-0.5"></i>{{ lead.bound_empreendimentos.length }} empr.
              </div>
            </td>

            <!-- Datas -->
            <td class="px-3 py-2.5 align-top">
              <LeadDatesCell
                :meta-at="lead.meta_created_at"
                :office-at="lead.created_at"
                :cv-at="lead.cv_delivered_at"
                compact />
            </td>

            <!-- Indicador de erro / atenção -->
            <td class="px-3 py-2.5 align-top text-right pr-4">
              <i v-if="lead.last_error" class="fas fa-triangle-exclamation text-red-500"
                :title="lead.last_error"></i>
              <i v-else-if="lead.status === 'held'" class="fas fa-hourglass-half text-amber-500"
                title="Aguardando vínculo"></i>
              <i v-else class="fas fa-chevron-right text-[10px] text-ink-subtle opacity-0 group-hover:opacity-100 transition"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
