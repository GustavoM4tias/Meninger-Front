<script setup>
// ESTOQUE COMERCIAL BLOQUEADO — a decisão de quais motivos de bloqueio do CV
// ainda são estoque a vender.
//
// Por que esta tela existe: o CV bloqueia unidade por motivos muito diferentes.
// "Estratégia Comercial" é a diretoria segurando estoque de propósito, e aquilo
// continua sendo unidade a vender; "Bloqueada - Administrada pelo SIENGE" é
// trava do ERP e está fora do jogo. O Office contava as duas como a mesma coisa,
// e o comercial compensava digitando um número na Projeção que envelhecia sozinho
// (o Ingá dizia 50 quando os bloqueios reais já eram 120).
//
// O que muda aqui vale na hora para o espelho, a ficha comercial, a projeção e
// a viabilidade: é uma regra só, num lugar só.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({
    // Só quem pode configurar o espelho muda a regra; o resto lê.
    podeEditar: { type: Boolean, default: false },
});

const toast = useToast();
const carregando = ref(true);
const salvando = ref('');
const lendo = ref(false);
const dados = ref(null);

const regras = computed(() => dados.value?.regras || []);
const contam = computed(() => regras.value.filter(r => r.conta_estoque));
const leitura = computed(() => dados.value?.leitura || null);
const porEmp = computed(() => dados.value?.por_empreendimento || []);

const fmtData = (d) => (d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'nunca');

async function carregar() {
    carregando.value = true;
    try {
        dados.value = await requestWithAuth('/cv/estoque-bloqueado');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível ler o estoque bloqueado.');
    } finally {
        carregando.value = false;
    }
}

async function alternar(regra) {
    if (!props.podeEditar) return;
    salvando.value = regra.motivo;
    try {
        const r = await requestWithAuth('/cv/estoque-bloqueado/regra', {
            method: 'PUT',
            body: JSON.stringify({ motivo: regra.motivo, conta_estoque: !regra.conta_estoque }),
        });
        dados.value = { ...dados.value, regras: r.regras };
        await carregar();
        toast.success(!regra.conta_estoque
            ? `"${regra.motivo}" passa a contar como estoque em todas as telas.`
            : `"${regra.motivo}" deixa de contar como estoque em todas as telas.`);
    } catch (err) {
        toast.error(err?.message || 'Não foi possível salvar a regra.');
    } finally {
        salvando.value = '';
    }
}

async function lerAgora() {
    lendo.value = true;
    try {
        const r = await requestWithAuth('/cv/estoque-bloqueado/sync', { method: 'POST' });
        await carregar();
        toast.success(`Leitura concluída: ${r.unidades} unidade(s) bloqueada(s) em ${r.empreendimentos} empreendimento(s).`);
    } catch (err) {
        toast.error(err?.message || 'A leitura do painel do CV falhou.');
    } finally {
        lendo.value = false;
    }
}

onMounted(carregar);
</script>

<template>
    <Panel title="Estoque bloqueado" icon="fas fa-hand-holding-dollar"
        subtitle="Quais motivos de bloqueio do CV continuam sendo estoque a vender">
        <template #actions>
            <Button v-if="podeEditar" size="sm" variant="secondary" icon="fas fa-rotate"
                :loading="lendo" @click="lerAgora">Ler o CV agora</Button>
        </template>

        <div v-if="carregando" class="space-y-2">
            <Skeleton v-for="i in 3" :key="i" class="h-10 w-full" />
        </div>

        <div v-else class="space-y-4">
            <!-- Resumo -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="rounded-xl border border-line bg-surface-raised p-3">
                    <p class="text-micro uppercase tracking-wider text-ink-subtle">Unidades como estoque</p>
                    <p class="text-xl font-black text-data-pos tabular-nums">{{ dados?.total ?? 0 }}</p>
                </div>
                <div class="rounded-xl border border-line bg-surface-raised p-3">
                    <p class="text-micro uppercase tracking-wider text-ink-subtle">Empreendimentos</p>
                    <p class="text-xl font-black text-ink tabular-nums">{{ porEmp.length }}</p>
                </div>
                <div class="rounded-xl border border-line bg-surface-raised p-3">
                    <p class="text-micro uppercase tracking-wider text-ink-subtle">Última leitura do CV</p>
                    <p class="text-sm font-semibold text-ink">{{ fmtData(leitura?.ultimo) }}</p>
                </div>
            </div>

            <p v-if="!leitura?.lido" class="text-xs text-data-warn">
                O Office ainda não leu os motivos no painel do CV. Até ler, toda unidade bloqueada
                conta como bloqueada, e a Projeção usa o número digitado à mão.
            </p>

            <!-- Regra por motivo -->
            <div class="space-y-1.5">
                <p class="text-xs font-bold text-ink uppercase tracking-wider">Motivos lidos do CV</p>
                <div v-for="r in regras" :key="r.motivo"
                    class="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised px-3 py-2">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-ink truncate">{{ r.motivo }}</p>
                        <p class="text-micro text-ink-subtle">
                            {{ r.unidades }} unidade(s) hoje<span v-if="r.descricao"> · {{ r.descricao }}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <Badge :variant="r.conta_estoque ? 'success' : 'neutral'" size="sm">
                            {{ r.conta_estoque ? 'É estoque' : 'Não é estoque' }}
                        </Badge>
                        <Button v-if="podeEditar" size="sm" variant="ghost"
                            :loading="salvando === r.motivo"
                            @click="alternar(r)">
                            {{ r.conta_estoque ? 'Deixar de contar' : 'Contar como estoque' }}
                        </Button>
                    </div>
                </div>
            </div>

            <!-- Quem tem estoque segurado -->
            <div v-if="porEmp.length" class="space-y-1">
                <p class="text-xs font-bold text-ink uppercase tracking-wider">Por empreendimento</p>
                <div class="flex flex-wrap gap-1.5">
                    <span v-for="e in porEmp" :key="e.idempreendimento"
                        class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-micro">
                        <span class="text-ink-muted">{{ e.nome }}</span>
                        <b class="text-data-pos tabular-nums">{{ e.estoque_bloqueado }}</b>
                    </span>
                </div>
            </div>
        </div>
    </Panel>
</template>
