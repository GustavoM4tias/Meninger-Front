<template>
    <Modal :open="open" size="lg" :title="stand?.name || 'Stand'" scrollable
        :subtitle="stand?.model?.name ? `Modelo: ${stand.model.name}` : 'Sem modelo atribuído'"
        @close="$emit('close')">
        <div v-if="stand" class="flex flex-col gap-5">

            <!-- Resumo -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Surface variant="flat" padding="sm" bordered>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Gasto total</p>
                    <p class="font-mono tabular-nums font-bold text-ink">{{ fmtBRL(stand.spend_total) }}</p>
                </Surface>
                <Surface variant="flat" padding="sm" bordered>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Construção</p>
                    <p class="font-mono tabular-nums font-bold text-ink">
                        {{ stand.status === 'defined' ? fmtBRL(stand.construction_value) : '-' }}
                    </p>
                </Surface>
                <Surface variant="flat" padding="sm" bordered>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Manutenção</p>
                    <p class="font-mono tabular-nums font-bold text-ink">
                        {{ stand.status === 'defined' ? fmtBRL(stand.maintenance_value) : '-' }}
                    </p>
                </Surface>
                <Surface variant="flat" padding="sm" bordered>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Valor médio do modelo</p>
                    <p class="font-mono tabular-nums font-bold text-ink">
                        {{ (stand.model && fmtValueRange(stand.model)) || '-' }}
                    </p>
                    <p v-if="stand.model && fmtAreaRange(stand.model)" class="text-xs text-ink-muted font-mono tabular-nums">
                        {{ fmtAreaRange(stand.model) }}
                    </p>
                </Surface>
            </div>

            <!-- Status + definição -->
            <Surface variant="flat" padding="sm" bordered>
                <div class="flex flex-wrap items-center gap-3">
                    <Badge :variant="statusMeta.variant" size="sm">
                        <i :class="statusMeta.icon" class="mr-1 text-[10px]"></i>{{ statusMeta.label }}
                    </Badge>
                    <span v-if="stand.status === 'defined'" class="text-xs text-ink-muted">
                        Definido em {{ fmtDate(stand.defined_at) }} — o gasto posterior conta como manutenção.
                    </span>
                    <span v-else class="text-xs text-ink-muted">
                        Ao definir, o gasto atual é congelado como custo de construção.
                    </span>
                    <div class="ml-auto flex items-center gap-2">
                        <template v-if="stand.status !== 'defined'">
                            <Input v-model="overrideValue" type="number" placeholder="Valor manual (opcional)"
                                size="sm" class="w-44" />
                            <Button variant="primary" size="sm" icon="fas fa-lock" :loading="store.saving" @click="doDefine">
                                Definir stand
                            </Button>
                        </template>
                        <Button v-else variant="outline" size="sm" icon="fas fa-lock-open" :loading="store.saving"
                            @click="doUndefine">
                            Reabrir
                        </Button>
                    </div>
                </div>
                <div v-if="errorMsg" class="text-sm text-data-neg flex items-center gap-2 mt-2">
                    <i class="fas fa-circle-exclamation"></i>{{ errorMsg }}
                </div>
            </Surface>

            <!-- Itens do modelo -->
            <div v-if="stand.model?.items?.length">
                <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">Itens do modelo</p>
                <div class="flex flex-wrap gap-1.5">
                    <span v-for="item in stand.model.items" :key="item"
                        class="px-2.5 py-1 rounded-md bg-surface-sunken border border-line text-xs text-ink">{{ item }}</span>
                </div>
            </div>

            <!-- Centros de custo -->
            <div>
                <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">Centros de custo</p>
                <div class="flex flex-col gap-1.5">
                    <div v-for="cc in spendByCc" :key="cc.costCenterId"
                        class="flex items-center justify-between gap-2 text-sm">
                        <span class="text-ink truncate">{{ cc.name }}</span>
                        <span class="font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(cc.amount) }}</span>
                    </div>
                    <p v-if="!spendByCc.length && !loadingSpend" class="text-xs text-ink-subtle">
                        Nenhum pagamento encontrado nas contas de stand destes centros de custo.
                    </p>
                </div>
            </div>

            <!-- Detalhe do gasto -->
            <Skeleton v-if="loadingSpend" variant="row" :lines="3" />
            <template v-else-if="spendDetail">
                <div v-if="spendDetail.byConta.length">
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">Por conta (2.02.07)</p>
                    <div class="flex flex-col gap-1.5">
                        <div v-for="c in spendDetail.byConta" :key="c.code"
                            class="flex items-center justify-between gap-2 text-sm">
                            <span class="text-ink-muted truncate">
                                <span class="font-mono text-ink-subtle mr-1.5">{{ c.code }}</span>{{ c.name || '-' }}
                            </span>
                            <span class="font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(c.amount) }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="spendDetail.byMonth.length">
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2">Por mês</p>
                    <div class="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5">
                        <div v-for="m in [...spendDetail.byMonth].reverse()" :key="m.ym"
                            class="flex items-center justify-between gap-2 text-sm">
                            <span class="text-ink-muted">{{ fmtYm(m.ym) }}</span>
                            <span class="font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(m.amount) }}</span>
                        </div>
                    </div>
                </div>
            </template>

            <p v-if="stand.notes" class="text-sm text-ink-muted border-l-2 border-line pl-3">{{ stand.notes }}</p>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
                <Button variant="ghost" size="sm" @click="$emit('close')">Fechar</Button>
                <Button variant="secondary" size="sm" icon="fas fa-pen" @click="$emit('edit', stand)">Editar</Button>
            </div>
        </template>
    </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { useSalesStandStore, STATUS_META } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtBRL, fmtValueRange, fmtAreaRange } from './standFormat';
import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';

import Skeleton from '@/components/UI/Skeleton.vue';
const props = defineProps({
    open: { type: Boolean, default: false },
    stand: { type: Object, default: null },
});
const emit = defineEmits(['close', 'edit']);

const store = useSalesStandStore();
const spendDetail = ref(null);
const loadingSpend = ref(false);
const overrideValue = ref('');
const errorMsg = ref('');

const statusMeta = computed(() => STATUS_META[props.stand?.status] || STATUS_META.draft);
const spendByCc = computed(() => spendDetail.value?.byCostCenter || []);

watch(() => [props.open, props.stand?.id], async ([open]) => {
    if (!open || !props.stand?.id) return;
    errorMsg.value = '';
    overrideValue.value = '';
    spendDetail.value = null;
    loadingSpend.value = true;
    try {
        spendDetail.value = await store.fetchSpend(props.stand.id);
    } catch (e) {
        console.error('[StandDetailModal] fetchSpend: erro', e);
        errorMsg.value = e.message || 'Erro ao carregar o detalhe do gasto.';
    } finally {
        loadingSpend.value = false;
    }
});

async function doDefine() {
    errorMsg.value = '';
    try {
        const payload = overrideValue.value !== '' ? { construction_value: Number(overrideValue.value) } : {};
        await store.defineStand(props.stand.id, payload);
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao definir o stand.';
    }
}

async function doUndefine() {
    errorMsg.value = '';
    try {
        await store.undefineStand(props.stand.id);
        emit('close');
    } catch (e) {
        errorMsg.value = e.message || 'Erro ao reabrir o stand.';
    }
}

const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');
const fmtYm = (ym) => (ym ? dayjs(`${ym}-01`).format('MMM/YYYY') : '-');
</script>
