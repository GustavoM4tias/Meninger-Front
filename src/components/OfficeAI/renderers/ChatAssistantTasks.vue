<script setup>
// As tarefas do assistente, dentro do chat - e FUNCIONANDO.
//
// Antes a Eme escrevia a lista à mão: a pessoa lia "Sinop (concluída)" e não
// tinha o que clicar. Aqui a parte se risca no cartão, e o efeito é o mesmo da
// tela /assistente porque a chamada é a mesma - a store do assistente, não uma
// cópia.
//
// POR QUE RISCAR AQUI É OTIMISTA
//
// Mesmo motivo da tela: riscar item é gesto de arrumação, e meio segundo de
// espera faz o cartão parecer travado. A store desfaz sozinha se o servidor
// recusar.
//
// A ÚLTIMA PARTE NÃO FECHA A TAREFA. Ela oferece o botão. Uma tarefa que some
// do chat no instante do último clique tira de quem clicou a chance de conferir.

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAssistantStore } from '@/stores/Assistant/assistantStore';
import ChatAtalhos from './ChatAtalhos.vue';

const props = defineProps({ action: { type: Object, required: true } });

const router = useRouter();
const toast = useToast();
const assistente = useAssistantStore();

// Estado LOCAL do cartão: a store do assistente pode nem estar carregada aqui
// (o chat abre em qualquer tela), então o cartão guarda o que ele mesmo mostra.
const cartoes = ref((props.action.cartoes || []).map(c => ({ ...c, itens: [...(c.itens || [])] })));
const ocupado = ref(null);

async function riscar(cartao, item) {
    const antes = item.feito;
    item.feito = !antes;                       // otimista
    ocupado.value = `${cartao.id}:${item.id}`;
    try {
        await assistente.marcarSubtarefa(cartao.id, item.id, !antes);
    } catch (err) {
        item.feito = antes;                    // desfaz
        toast.error(err?.message || 'Não foi possível marcar.');
    } finally {
        ocupado.value = null;
    }
}

async function concluir(cartao) {
    ocupado.value = `t:${cartao.id}`;
    try {
        await assistente.concluir(cartao.id);
        cartao.estado = 'concluida';
        toast.success('Feito.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível concluir.');
    } finally {
        ocupado.value = null;
    }
}

/**
 * Desfaz a conclusão. O cartão fica na tela depois de concluída (só esmaece),
 * e é por isso que o desfazer cabe aqui: o alvo continua à vista, ao contrário
 * da lista da tela, onde a tarefa some.
 */
async function reabrir(cartao) {
    ocupado.value = `t:${cartao.id}`;
    try {
        await assistente.reabrir(cartao.id);
        cartao.estado = 'aberta';
        toast.success('Reaberta.');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível reabrir.');
    } finally {
        ocupado.value = null;
    }
}

const feitos = (c) => (c.itens || []).filter(i => i.feito).length;
const tudoFeito = (c) => (c.itens || []).length > 0 && feitos(c) === c.itens.length;
const pct = (c) => (c.itens?.length ? (feitos(c) / c.itens.length) * 100 : 0);

function abrir(link) {
    if (!link) return;
    router.push(link);
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ action.title }}
            <span v-if="action.subtitle" class="ml-1.5 normal-case font-normal text-data-warn">
                {{ action.subtitle }}
            </span>
        </p>

        <article v-for="c in cartoes" :key="c.id"
            class="rounded-xl border bg-surface-raised p-3 shadow-soft transition-all duration-200
                   ease-out-expo hover:border-accent/40"
            :class="[
                c.estado === 'concluida' ? 'opacity-50' : '',
                c.atrasada ? 'border-data-warn/40' : 'border-line',
            ]">

            <!-- Cabeçalho -->
            <div class="flex items-start gap-2.5">
                <button type="button"
                    @click="c.estado === 'concluida' ? reabrir(c) : concluir(c)"
                    :disabled="ocupado === `t:${c.id}`"
                    :title="c.estado === 'concluida' ? 'Clique para reabrir' : 'Marcar como feita'"
                    class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border
                           transition-all duration-200 ease-out-expo"
                    :class="c.estado === 'concluida'
                        ? 'border-data-pos bg-data-pos text-white hover:brightness-110'
                        : 'border-line-strong text-transparent hover:border-accent hover:scale-110'">
                    <i class="fas fa-check text-[0.6rem]"></i>
                </button>

                <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-2 flex-wrap">
                        <p class="text-sm font-semibold text-ink"
                           :class="c.estado === 'concluida' ? 'line-through' : ''">{{ c.titulo }}</p>
                        <span v-if="c.prazoTexto"
                            class="shrink-0 rounded-md px-1.5 py-0.5 text-micro font-semibold tabular-nums"
                            :class="c.atrasada ? 'bg-data-warn-soft text-data-warn' : 'bg-surface-sunken text-ink-muted'">
                            {{ c.atrasada ? 'passou · ' : '' }}{{ c.prazoTexto }}
                        </span>
                    </div>
                    <p v-if="c.detalhe" class="mt-0.5 text-xs text-ink-muted line-clamp-2">{{ c.detalhe }}</p>
                </div>
            </div>

            <!-- Partes -->
            <div v-if="c.itens?.length" class="mt-2 pl-7">
                <div class="mb-1.5 flex items-center gap-2">
                    <div class="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div class="h-full rounded-full transition-all duration-420 ease-out-expo"
                            :class="tudoFeito(c) ? 'bg-data-pos' : 'bg-accent'"
                            :style="{ width: `${pct(c)}%` }"></div>
                    </div>
                    <span class="shrink-0 text-micro tabular-nums"
                        :class="tudoFeito(c) ? 'font-semibold text-data-pos' : 'text-ink-subtle'">
                        {{ feitos(c) }} de {{ c.itens.length }}
                    </span>
                </div>

                <ul class="flex flex-col">
                    <li v-for="item in c.itens" :key="item.id"
                        class="flex items-center gap-2 rounded-lg px-1 py-1 -mx-1
                               transition-colors duration-120 hover:bg-surface-sunken">
                        <button type="button" @click="riscar(c, item)"
                            :disabled="ocupado === `${c.id}:${item.id}`"
                            :title="item.feito ? 'Desmarcar' : 'Marcar como feita'"
                            class="grid h-4 w-4 shrink-0 place-items-center rounded border
                                   transition-all duration-200 ease-out-expo"
                            :class="item.feito
                                ? 'border-data-pos bg-data-pos text-white'
                                : 'border-line-strong text-transparent hover:border-accent hover:scale-110'">
                            <i class="fas fa-check text-[0.5rem]"></i>
                        </button>
                        <span class="min-w-0 flex-1 truncate text-xs transition-all duration-200"
                            :class="item.feito ? 'text-ink-subtle line-through' : 'text-ink'">
                            {{ item.titulo }}
                        </span>
                    </li>
                </ul>

                <button v-if="tudoFeito(c) && c.estado !== 'concluida'" type="button" @click="concluir(c)"
                    class="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-data-pos-soft px-2.5 py-1
                           text-micro font-semibold text-data-pos transition-all duration-200
                           ease-out-expo hover:brightness-105 animate-pop-in">
                    <i class="fas fa-check text-[0.6rem]"></i> todas as partes feitas - fechar?
                </button>
            </div>

            <!-- Selos e abrir -->
            <div class="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
                <span v-if="c.parceiros?.length"
                    class="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-micro text-ink-muted">
                    <i class="fas fa-user-group text-[0.6rem]"></i>
                    {{ c.parceiros.length === 1 ? c.parceiros[0].nome.split(' ')[0] : `${c.parceiros.length} pessoas` }}
                </span>
                <span v-if="c.acompanhar"
                    class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-micro text-accent">
                    <i class="fas fa-rotate text-[0.6rem]"></i> acompanhando
                </span>
                <span v-if="c.avisos?.length"
                    class="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-micro text-ink-subtle"
                    :title="c.avisos.join(' · ')">
                    <i class="fas fa-bell text-[0.6rem]"></i> {{ c.avisos.length }}
                </span>

                <button v-if="c.estado === 'concluida'" type="button" @click="reabrir(c)"
                    class="text-micro text-ink-subtle transition-colors duration-120 hover:text-accent">
                    <i class="fas fa-rotate-left text-[0.6rem] mr-1"></i>desfazer
                </button>

                <button type="button" @click="abrir(c.link)"
                    class="ml-auto text-micro text-accent transition-colors duration-120 hover:underline">
                    abrir <i class="fas fa-arrow-right text-[0.6rem]"></i>
                </button>
            </div>
        </article>

        <!-- Cortar em silêncio faria a pessoa achar que são só essas. -->
        <p v-if="action.cortadas" class="px-0.5 text-micro text-ink-subtle">
            e mais {{ action.cortadas }} — o resto está em Meu dia.
        </p>

        <ChatAtalhos :atalhos="action.atalhos || []" :sugestoes="action.sugestoes || []" />
    </div>
</template>
