<script setup>
// Consolidado do mês: a visão que o Marketing usa.
//
// Duas leituras lado a lado: a AGENDA de todos os empreendimentos juntos (o que
// acontece e quando) e a LISTA DE COMPRAS agrupada por categoria. A segunda é o
// ganho concreto: em vez de negociar 3.000 panfletos de um empreendimento e
// 2.000 de outro, vê os 5.000 e negocia uma vez.

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useEventPlanStore } from '@/stores/Comercial/EventPlan/eventPlanStore';

import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Collapsible from '@/components/UI/Collapsible.vue';

const store = useEventPlanStore();
const router = useRouter();

function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const month = ref(currentMonthValue());

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const data = computed(() => store.consolidated);
const totals = computed(() => data.value?.totals || {});

function dayLabel(date) {
    const [, m, d] = String(date || '').split('-');
    return d ? `${d}/${m}` : '';
}

// Agrupa a agenda por dia para virar um calendário legível no celular.
const agendaByDay = computed(() => {
    const map = new Map();
    for (const item of (data.value?.agenda || [])) {
        const key = item.event_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
});

async function load() {
    await store.loadConsolidated(month.value);
}

watch(month, load);
onMounted(load);
</script>

<template>
    <div>
        <div class="mb-4 max-w-xs">
            <Input v-model="month" type="month" label="Mês" />
        </div>

        <div v-if="store.loading" class="flex justify-center py-16"><Spinner /></div>

        <EmptyState
            v-else-if="!data || !data.plans?.length"
            icon="far fa-calendar"
            title="Nenhum plano neste mês"
            description="Quando os gestores abrirem os planos do mês, o consolidado aparece aqui."
        />

        <template v-else>
            <!-- Números do mês -->
            <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Surface variant="flat">
                    <p class="text-xs text-ink-subtle">Proposto</p>
                    <p class="text-lg font-semibold text-ink">{{ money(totals.proposed) }}</p>
                </Surface>
                <Surface variant="flat">
                    <p class="text-xs text-ink-subtle">Aprovado</p>
                    <p class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{{ money(totals.approved) }}</p>
                </Surface>
                <Surface variant="flat">
                    <p class="text-xs text-ink-subtle">Eventos</p>
                    <p class="text-lg font-semibold text-ink">
                        {{ totals.events_approved }} <span class="text-sm text-ink-subtle">de {{ totals.events }}</span>
                    </p>
                </Surface>
                <Surface variant="flat">
                    <p class="text-xs text-ink-subtle">A cotar</p>
                    <p class="text-lg font-semibold text-ink">{{ totals.pending_quotes }}</p>
                </Surface>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <!-- Agenda unificada -->
                <Surface>
                    <h3 class="mb-3 font-semibold text-ink">
                        <i class="fas fa-calendar-days mr-2 text-ink-subtle"></i>Agenda do mês
                    </h3>
                    <p v-if="!agendaByDay.length" class="text-sm text-ink-subtle">Nenhum evento proposto.</p>
                    <div v-else class="space-y-3">
                        <div v-for="day in agendaByDay" :key="day.date">
                            <p class="mb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                                {{ dayLabel(day.date) }}
                            </p>
                            <div
                                v-for="item in day.items"
                                :key="item.planned_event_id"
                                class="mb-1 flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2 transition hover:border-accent"
                                @click="router.push(`/comercial/plano-eventos/${item.plan_id}`)"
                            >
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-medium text-ink">{{ item.title }}</p>
                                    <p class="text-xs text-ink-muted">{{ item.enterprise_name }}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Badge v-if="item.event_id" variant="success" size="sm">Na agenda</Badge>
                                    <Badge v-else-if="!item.approved" variant="neutral" size="sm">Em análise</Badge>
                                    <span class="text-sm font-medium text-ink">{{ money(item.approved_total || item.proposed_total) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Surface>

                <!-- Lista de compras -->
                <Surface>
                    <h3 class="mb-1 font-semibold text-ink">
                        <i class="fas fa-cart-shopping mr-2 text-ink-subtle"></i>Lista de compras
                    </h3>
                    <p class="mb-3 text-sm text-ink-muted">
                        Só o que está de pé, somado entre os empreendimentos. Serve para negociar volume.
                    </p>

                    <p v-if="!data.shopping?.length" class="text-sm text-ink-subtle">
                        Nada aprovado ainda neste mês.
                    </p>

                    <div v-else class="space-y-2">
                        <Collapsible
                            v-for="group in data.shopping"
                            :key="group.category"
                            :title="group.category"
                            :hint="`${group.items.length} item(ns) · ${money(group.total)}`"
                        >
                            <ul class="space-y-1.5">
                                <li
                                    v-for="(item, index) in group.items"
                                    :key="`${group.category}-${index}`"
                                    class="flex flex-wrap items-center justify-between gap-2 text-sm"
                                >
                                    <div class="min-w-0">
                                        <span class="text-ink">{{ item.name }}</span>
                                        <Badge v-if="item.needs_quote" variant="info" size="sm" class="ml-1">Cotar</Badge>
                                        <p class="text-xs text-ink-subtle">
                                            {{ item.enterprise_name }} · {{ item.event_title }} ·
                                            {{ dayLabel(item.event_date) }}
                                            <span v-if="item.supplier"> · {{ item.supplier }}</span>
                                        </p>
                                    </div>
                                    <span class="whitespace-nowrap text-ink-muted">
                                        {{ Number(item.quantity) }}un · {{ money(item.value) }}
                                    </span>
                                </li>
                            </ul>
                        </Collapsible>
                    </div>
                </Surface>
            </div>
        </template>
    </div>
</template>
