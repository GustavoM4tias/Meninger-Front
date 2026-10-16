<script setup>
/**
 * Detalhe de uma unidade do espelho da ficha: preço de venda, desconto
 * construtora, fluxo da tabela do CV, área, posição e a reserva (quando há).
 */
import { computed } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import { brl, brl2, area, data, pct, situacaoDe, fluxoDaUnidade, linhaFluxo, COR_SERIE } from './fichaUtils';

const props = defineProps({
  unidade: { type: Object, default: null },
  horizontal: { type: Boolean, default: false },
  comissaoPct: { type: Number, default: null },
});
const emit = defineEmits(['close']);

const u = computed(() => props.unidade);
const sit = computed(() => situacaoDe(u.value));
const fluxo = computed(() => (u.value?.series?.length ? fluxoDaUnidade(u.value.series, u.value.valor_cheio) : null));
const posicao = computed(() => {
  const c = u.value; if (!c) return [];
  if (props.horizontal) return [['Quadra', c.torre_nome], ['Lote', c.final || '-']];
  return [['Torre', c.torre_nome], ['Andar', c.andar == null ? '-' : (c.andar === 0 ? 'Térreo' : `${c.andar}º`)], ['Final', c.final || '-']];
});
const variante = computed(() => ({ Disponível: 'success', Reservado: 'warning', Vendido: 'danger' }[sit.value.rotulo] || 'neutral'));
</script>

<template>
  <Modal :open="!!u" size="md" :title="u?.nome || ''" :subtitle="u?.etapa || ''" @close="emit('close')">
    <div v-if="u" class="space-y-5">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-metric font-bold tabular-nums text-ink">{{ u.valor != null ? brl2(u.valor) : 'Sem preço' }}</span>
        <span class="text-sm text-ink-muted">preço de venda</span>
        <Badge :variant="variante" class="ml-auto">{{ sit.rotulo }}</Badge>
      </div>

      <section v-if="u.adimplencia_premiada || u.valor_cheio">
        <h3 class="metric-label mb-1">Preço</h3>
        <dl class="divide-y divide-line-subtle text-sm">
          <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Tabela</dt><dd class="font-medium tabular-nums">{{ brl2(u.valor_cheio) }}</dd></div>
          <div v-if="u.adimplencia_premiada" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Desconto construtora</dt><dd class="font-medium tabular-nums">- {{ brl2(u.adimplencia_premiada) }}</dd></div>
          <div v-if="comissaoPct && u.valor" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Comissão {{ pct(comissaoPct, comissaoPct % 1 ? 1 : 0) }}</dt><dd class="font-medium tabular-nums">{{ brl(u.valor * comissaoPct / 100) }}</dd></div>
        </dl>
      </section>

      <section v-if="fluxo?.linhas.length">
        <h3 class="metric-label mb-1">Fluxo da tabela</h3>
        <dl class="divide-y divide-line-subtle text-sm">
          <div v-for="(l, i) in fluxo.linhas" :key="i" class="flex items-baseline justify-between gap-3 py-1.5">
            <dt class="text-ink-muted inline-flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-sm" :class="COR_SERIE[l.tipo]"></i>{{ l.rotulo }}</dt>
            <dd class="text-right tabular-nums">
              <span class="font-medium">{{ linhaFluxo(l) }}</span>
              <span class="block text-micro text-ink-subtle">{{ pct(l.pct, 1) }}<template v-if="l.primeiro_vencimento"> · a partir de {{ data(l.primeiro_vencimento) }}</template></span>
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 class="metric-label mb-1">Unidade</h3>
        <dl class="divide-y divide-line-subtle text-sm">
          <div v-for="[k, v] in posicao" :key="k" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">{{ k }}</dt><dd class="font-medium">{{ v }}</dd></div>
          <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Área privativa</dt><dd class="font-medium tabular-nums">{{ area(u.area) }}</dd></div>
          <div v-if="u.valor_m2" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Preço do m²</dt><dd class="font-medium tabular-nums">{{ brl(u.valor_m2) }}</dd></div>
          <div v-if="u.estoque_comercial && u.motivo_bloqueio" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Segurada por</dt><dd class="font-medium text-right">{{ u.motivo_bloqueio }}</dd></div>
        </dl>
      </section>

      <section v-if="u.reserva">
        <h3 class="metric-label mb-1">Reserva</h3>
        <dl class="divide-y divide-line-subtle text-sm">
          <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Etapa no CV</dt><dd class="font-medium">{{ u.reserva.situacao || '-' }}</dd></div>
          <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Reservada em</dt><dd class="font-medium tabular-nums">{{ data(u.reserva.data) }}</dd></div>
          <div v-if="u.reserva.imobiliaria" class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Imobiliária</dt><dd class="font-medium text-right">{{ u.reserva.imobiliaria }}</dd></div>
          <div class="flex justify-between gap-3 py-1.5"><dt class="text-ink-muted">Reserva</dt><dd class="font-medium tabular-nums">#{{ u.reserva.idreserva }}</dd></div>
        </dl>
      </section>
    </div>
  </Modal>
</template>
