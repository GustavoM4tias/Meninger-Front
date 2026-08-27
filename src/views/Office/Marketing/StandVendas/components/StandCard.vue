<template>
    <Surface variant="raised" padding="none" interactive
        class="overflow-hidden flex flex-col cursor-pointer group"
        :title="`${stand.name} - ${stand.model?.name || 'sem modelo'} - ${fmtBRL(stand.spend_total)} no total`"
        @click="$emit('open', stand)">

        <!-- Capa: a foto do stand quando existe; senão a marca da casa. -->
        <div class="relative aspect-[16/9] bg-surface-sunken overflow-hidden">
            <img v-if="stand.cover_url" :src="stand.cover_url" :alt="`Foto do ${stand.name}`" loading="lazy"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div v-else class="w-full h-full grid place-items-center text-ink-subtle">
                <i class="fas fa-store text-2xl"></i>
            </div>
            <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <Badge v-if="stand.images_count > 1" variant="neutral" size="sm"
                    :title="`${stand.images_count} fotos deste stand`">
                    <i class="fas fa-images mr-1 text-micro"></i>{{ stand.images_count }}
                </Badge>
                <Badge :variant="statusMeta.variant" size="sm" :title="statusHint">
                    <i :class="statusMeta.icon" class="mr-1 text-micro"></i>{{ statusMeta.label }}
                </Badge>
            </div>
        </div>

        <div class="p-4 flex flex-col gap-3 flex-1">
            <div class="min-w-0">
                <p class="font-semibold text-ink truncate">{{ stand.name }}</p>
                <p class="text-micro text-ink-subtle truncate"
                    :title="(stand.cost_center_names || []).join(', ')">
                    {{ stand.model?.name || 'Sem modelo' }} · {{ (stand.cost_center_names || []).length }} centro(s) de custo
                </p>
            </div>

            <div>
                <div class="flex items-baseline justify-between gap-2">
                    <span class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Gasto total</span>
                    <span class="font-mono tabular-nums font-bold text-ink" :title="fmtBRL(stand.spend_total)">
                        {{ fmtBRL(stand.spend_total) }}
                    </span>
                </div>
                <!-- Como esse total se reparte: a leitura de um olho só. -->
                <div class="flex items-center gap-0.5 mt-1.5" :title="composicao">
                    <span v-for="f in fatias" :key="f.kind" class="h-1.5 first:rounded-l last:rounded-r"
                        :class="kindMeta(f.kind).dot" :style="{ width: f.width }"></span>
                    <span v-if="!fatias.length" class="h-1.5 w-full rounded bg-surface-sunken"></span>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center border-t border-line pt-3 mt-auto">
                <div :title="`Construção: ${fmtBRL(stand.construction_value)}`">
                    <p class="text-micro text-ink-subtle">Construção</p>
                    <p class="font-mono tabular-nums text-xs font-semibold text-series-1">{{ fmtBRLShort(stand.construction_value) }}</p>
                </div>
                <div :title="`Recorrência acumulada: ${fmtBRL(stand.maintenance_value)}`">
                    <p class="text-micro text-ink-subtle">Recorrência</p>
                    <p class="font-mono tabular-nums text-xs font-semibold text-series-2">{{ fmtBRLShort(stand.maintenance_value) }}</p>
                </div>
                <div :title="`Média da recorrência nos 3 meses fechados: ${fmtBRL(stand.recurring_monthly)}`">
                    <p class="text-micro text-ink-subtle">Por mês</p>
                    <p class="font-mono tabular-nums text-xs font-semibold text-ink">{{ fmtBRLShort(stand.recurring_monthly) }}</p>
                </div>
            </div>

            <p v-if="stand.unclassified_value > 0" class="text-micro text-data-warn flex items-center gap-1.5"
                :title="`${fmtBRL(stand.unclassified_value)} em lançamentos cuja conta não está em nenhuma categoria`">
                <i class="fas fa-circle-question"></i>
                {{ fmtBRLShort(stand.unclassified_value) }} sem classificação
            </p>
        </div>
    </Surface>
</template>

<script setup>
// Cartão do stand: a mesma linha da tabela, com a cara do stand junto. Serve
// para reconhecer o stand pela foto e ler o custo sem abrir.
import { computed } from 'vue';
import { fmtBRL, fmtBRLShort } from '../standFormat';
import { STATUS_META, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    stand: { type: Object, required: true },
});
defineEmits(['open']);

const statusMeta = computed(() => STATUS_META[props.stand.status] || STATUS_META.draft);
const statusHint = computed(() => (props.stand.status === 'defined'
    ? 'Custo de construção congelado'
    : 'Em apuração: construção ainda soma ao vivo'));

// A barra usa o valor AO VIVO da construção: num stand definido o congelado
// pode não fechar com o total, e aí a barra passaria de 100%.
const PARTES = [
    ['construcao', 'construction_live'],
    ['recorrencia', 'maintenance_value'],
    ['esporadica', 'sporadic_value'],
    ['sem_classificacao', 'unclassified_value'],
];

const fatias = computed(() => {
    const total = Number(props.stand.spend_total) || 0;
    if (!total) return [];
    return PARTES
        .map(([kind, campo]) => ({ kind, value: Number(props.stand[campo]) || 0 }))
        .filter((f) => f.value > 0)
        .map((f) => ({ ...f, width: `${Math.max(2, Math.round((f.value / total) * 100))}%` }));
});

const composicao = computed(() => (fatias.value.length
    ? fatias.value.map((f) => `${kindMeta(f.kind).label}: ${fmtBRL(f.value)}`).join(' · ')
    : 'Sem gasto apurado'));
</script>
