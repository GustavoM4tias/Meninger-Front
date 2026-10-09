<template>
    <article
        class="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-soft
               transition-[transform,box-shadow,border-color] duration-200 ease-out-expo
               hover:-translate-y-0.5 hover:shadow-overlay hover:border-line-strong focus-within:border-accent/50">

        <!-- Foto: o stand se reconhece por ela antes de qualquer número. -->
        <div class="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
            <img v-if="stand.cover_url" :src="stand.cover_url" :alt="`Fachada do ${stand.name}`" loading="lazy"
                class="h-full w-full object-cover transition-transform duration-420 ease-out-expo group-hover:scale-[1.04]" />
            <div v-else class="grid h-full w-full place-items-center text-ink-subtle">
                <i class="fas fa-store text-3xl"></i>
            </div>

            <div class="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                <span class="selo" :class="statusMeta.variant === 'success' ? 'text-data-pos' : 'text-ink-muted'">
                    <i :class="statusMeta.icon"></i>{{ statusMeta.label }}
                </span>
                <span v-if="stand.pending_count > 0" class="selo text-data-warn"
                    :title="`${stand.pending_count} pendência(s) no relatório: classificação, departamento ou conta mensal`">
                    <i class="fas fa-triangle-exclamation"></i>{{ stand.pending_count }} pendência{{ stand.pending_count > 1 ? 's' : '' }}
                </span>
                <span v-else class="selo text-data-pos"><i class="fas fa-circle-check"></i>Em dia</span>
            </div>
            <span v-if="stand.images_count > 1" class="selo absolute bottom-3 right-3 text-ink-muted">
                <i class="fas fa-images"></i>{{ stand.images_count }}
            </span>
        </div>

        <div class="flex flex-1 flex-col gap-4 p-5">
            <div class="min-w-0">
                <p class="metric-label">{{ cidade }}</p>
                <h3 class="mt-0.5 text-lg font-semibold leading-snug text-ink text-balance">{{ titulo }}</h3>
                <p class="mt-1 text-xs text-ink-muted">
                    {{ stand.model?.name || 'Sem modelo' }}
                    <template v-if="dias !== null"> · no ar há {{ dias }} dias</template>
                </p>
            </div>

            <!-- O número do stand e o ritmo do gasto -->
            <div class="flex items-end justify-between gap-3">
                <div class="min-w-0">
                    <p class="metric-label">Gasto total</p>
                    <p class="metric text-metric whitespace-nowrap">{{ fmtBRLShort(stand.spend_total) }}</p>
                </div>
                <div class="w-28 shrink-0 text-accent" :title="'Gasto por mês de pagamento'">
                    <Sparkline :values="stand.month_series || []" mode="bars" :bars="12" height="h-10" />
                </div>
            </div>

            <!-- Como o total se reparte -->
            <div class="flex flex-col gap-1.5">
                <div class="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
                    <span v-for="f in fatias" :key="f.kind" class="h-full crescer" :class="kindMeta(f.kind).dot"
                        :style="{ width: f.width }" :title="`${kindMeta(f.kind).label}: ${fmtBRL(f.value)}`"></span>
                </div>
                <div class="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span v-for="f in fatias" :key="f.kind" class="inline-flex items-center gap-1 text-micro text-ink-subtle">
                        <span class="h-1.5 w-1.5 rounded-full" :class="kindMeta(f.kind).dot"></span>{{ kindMeta(f.kind).label }} {{ f.pctLabel }}
                    </span>
                </div>
            </div>

            <dl class="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div class="min-w-0">
                    <dt class="metric-label">Construção</dt>
                    <dd class="font-mono text-sm font-semibold tabular-nums text-ink">{{ fmtBRLShort(stand.construction_value) }}</dd>
                    <dd v-if="faixa" class="text-micro" :class="faixa.cls">{{ faixa.txt }}</dd>
                </div>
                <div class="min-w-0">
                    <dt class="metric-label">Para manter</dt>
                    <dd class="font-mono text-sm font-semibold tabular-nums text-ink">{{ fmtBRLShort(stand.recurring_monthly) }}<span class="font-sans font-normal text-ink-subtle">/mês</span></dd>
                    <dd class="text-micro text-ink-subtle">aluguel, contas e consumo</dd>
                </div>
            </dl>

            <button type="button"
                class="-mx-1 flex items-center justify-between rounded-lg px-1 py-1 text-sm font-semibold text-accent focus-ring after:absolute after:inset-0 after:content-['']"
                :aria-label="`Abrir o relatório do ${stand.name}`" @click="$emit('open', stand)">
                Abrir relatório
                <i class="fas fa-arrow-right text-xs transition-transform duration-200 ease-out-expo group-hover:translate-x-1"></i>
            </button>
        </div>
    </article>
</template>

<script setup>
// Cartão do stand na tela inicial: a foto para reconhecer, o gasto total com o
// ritmo mês a mês, como ele se reparte, e as duas perguntas da diretoria
// (quanto custou montar e quanto custa manter). O cartão inteiro abre o
// relatório; o botão é o alvo acessível e a área clicável cobre o cartão.
import { computed } from 'vue';
import { fmtBRL, fmtBRLShort } from '../standFormat';
import { STATUS_META, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import Sparkline from '@/components/UI/Sparkline.vue';

const props = defineProps({
    stand: { type: Object, required: true },
});
defineEmits(['open']);

const statusMeta = computed(() => STATUS_META[props.stand.status] || STATUS_META.draft);

// "Ibitinga/SP - Residencial Três Marias" → cidade em cima, empreendimento em destaque.
const partes = computed(() => {
    const nome = String(props.stand.name || '');
    const i = nome.indexOf(' - ');
    return i > 0 ? [nome.slice(0, i), nome.slice(i + 3)] : ['Stand de vendas', nome];
});
const cidade = computed(() => partes.value[0]);
const titulo = computed(() => partes.value[1]);

const dias = computed(() => {
    if (!props.stand.opened_at) return null;
    const ini = new Date(`${String(props.stand.opened_at).slice(0, 10)}T00:00:00`);
    const d = Math.round((Date.now() - ini.getTime()) / 86400000);
    return d >= 0 ? d : null;
});

// A barra usa o valor AO VIVO da construção: num stand definido o congelado
// pode não fechar com o total, e aí a barra passaria de 100%.
const PARTES = [
    ['construcao', 'construction_live'],
    ['esporadica', 'sporadic_value'],
    ['recorrencia', 'maintenance_value'],
    ['sem_classificacao', 'unclassified_value'],
];
const fatias = computed(() => {
    const total = Number(props.stand.spend_total) || 0;
    if (!total) return [];
    return PARTES
        .map(([kind, campo]) => ({ kind, value: Number(props.stand[campo]) || 0 }))
        .filter((f) => f.value > 0)
        .map((f) => {
            const pct = (f.value / total) * 100;
            return { ...f, pctLabel: pct < 1 ? 'menos de 1%' : `${Math.round(pct)}%`, width: `${Math.max(2, pct)}%` };
        });
});

// Construção contra a faixa do modelo.
const faixa = computed(() => {
    const m = props.stand.model;
    const min = Number(m?.avg_value_min) || 0;
    const max = Number(m?.avg_value_max) || 0;
    const v = Number(props.stand.construction_value) || 0;
    if (!m || (!min && !max) || !v) return null;
    if (max && v > max) return { txt: `acima da faixa do ${m.name}`, cls: 'text-data-warn' };
    if (v < min) return { txt: `abaixo da faixa do ${m.name}`, cls: 'text-ink-subtle' };
    return { txt: `dentro da faixa do ${m.name}`, cls: 'text-data-pos' };
});
</script>

<style scoped>
.selo {
    @apply inline-flex items-center gap-1.5 rounded-full bg-surface-raised/90 px-2.5 py-1 text-micro font-medium shadow-soft backdrop-blur-sm;
}
.crescer { transform-origin: left center; animation: crescer 460ms cubic-bezier(0.16, 1, 0.3, 1) both 120ms; }
@keyframes crescer { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
    .crescer { animation: none; }
}
</style>
