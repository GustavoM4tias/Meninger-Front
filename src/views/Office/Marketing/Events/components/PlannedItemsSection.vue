<script setup>
// Itens previstos de um evento que nasceu no Plano de Eventos (Comercial).
//
// Leitura pura: o Marketing vê o que foi aprovado e o que ainda precisa ser
// cotado, sem sair da tela de Eventos. Nada de decisão aqui - decidir continua
// sendo no plano.
//
// Silencioso de propósito: evento cadastrado direto na agenda não veio de plano
// nenhum, a API devolve null e a seção simplesmente não aparece.

import { onMounted, ref } from 'vue';
import api from '@/utils/EventPlan/api.js';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    eventId: { type: [Number, String], required: true },
});

const data = ref(null);

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

onMounted(async () => {
    try {
        data.value = await api.byAgendaEvent(props.eventId);
    } catch {
        // Sem alçada ou sem plano: a seção some, não vira erro na tela.
        data.value = null;
    }
});
</script>

<template>
    <section v-if="data?.items?.length">
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
            Itens previstos
            <span class="ml-1 normal-case font-sans text-ink-muted">(do Plano de Eventos)</span>
        </p>

        <div class="space-y-1.5">
            <div
                v-for="(item, index) in data.items"
                :key="index"
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken p-2.5"
            >
                <div class="min-w-0">
                    <p class="text-sm font-medium text-ink">{{ item.name }}</p>
                    <p class="text-xs text-ink-muted">
                        {{ Number(item.quantity) }} un.
                        <span v-if="item.category"> · {{ item.category }}</span>
                        <span v-if="item.supplier"> · {{ item.supplier }}</span>
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <Badge v-if="item.needs_quote" variant="info" size="sm">A cotar</Badge>
                    <span class="text-sm font-medium text-ink">{{ money(item.value) }}</span>
                </div>
            </div>
        </div>

        <div class="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
            <span class="text-ink-muted">Total aprovado</span>
            <strong class="text-ink">{{ money(data.approved_total) }}</strong>
        </div>
    </section>
</template>
