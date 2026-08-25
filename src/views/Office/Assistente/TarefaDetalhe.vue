<script setup>
// As partes de uma tarefa, e quem faz junto.
//
// Fica DENTRO do cartão da pendência, e não num modal, porque riscar "Sinop" é
// gesto de um clique: mandar a pessoa abrir um modal para isso transformaria
// meio segundo em quatro.
//
// A ÚLTIMA PARTE NÃO FECHA A TAREFA SOZINHA. Ela oferece o botão e espera. Uma
// tarefa que some da tela no instante em que a pessoa risca o último item tira
// dela a chance de conferir o todo - e desfazer isso é mais caro que clicar.

import { ref, computed, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
import { useAssistantStore } from '@/stores/Assistant/assistantStore';

import UserAvatar from '@/components/UI/UserAvatar.vue';

const props = defineProps({
    tarefa: { type: Object, required: true },
});
const emit = defineEmits(['concluir', 'pessoas', 'editar']);

const a = useAssistantStore();
const toast = useToast();

const itens = computed(() => props.tarefa.itens || []);
const feitos = computed(() => itens.value.filter(i => i.feito).length);
const tudoFeito = computed(() => itens.value.length > 0 && feitos.value === itens.value.length);
const pct = computed(() => (itens.value.length ? (feitos.value / itens.value.length) * 100 : 0));

// ── Somar uma parte ──────────────────────────────────────────────────────────
const somando = ref(false);
const novaParte = ref('');
const campo = ref(null);

async function abrirCampo() {
    somando.value = true;
    await nextTick();
    campo.value?.focus();
}

async function somar() {
    const txt = novaParte.value.trim();
    if (!txt) { somando.value = false; return; }
    try {
        // Vírgula e ponto-e-vírgula viram várias partes: "Marília, Sinop" é uma
        // frase só na cabeça de quem digita.
        await a.addSubtarefas(props.tarefa.id, txt);
        novaParte.value = '';
        await nextTick();
        campo.value?.focus();
    } catch (err) {
        toast.error(err?.message || 'Não foi possível somar.');
    }
}

async function marcar(item) {
    try { await a.marcarSubtarefa(props.tarefa.id, item.id, !item.feito); }
    catch (err) { toast.error(err?.message || 'Não foi possível.'); }
}

async function remover(item) {
    try { await a.removerSubtarefa(props.tarefa.id, item.id); }
    catch (err) { toast.error(err?.message || 'Não foi possível.'); }
}
</script>

<template>
    <div class="mt-2.5 pl-6.5">
        <!-- Barra de progresso: o número que diz se falta alguma coisa -->
        <div v-if="itens.length" class="flex items-center gap-2 mb-1.5">
            <div class="flex-1 h-1 rounded-full bg-surface-raised overflow-hidden">
                <div class="h-full rounded-full transition-all duration-420 ease-out-expo"
                    :class="tudoFeito ? 'bg-data-pos' : 'bg-accent'"
                    :style="{ width: `${pct}%` }"></div>
            </div>
            <span class="text-micro tabular-nums shrink-0"
                :class="tudoFeito ? 'text-data-pos font-semibold' : 'text-ink-subtle'">
                {{ feitos }} de {{ itens.length }}
            </span>
        </div>

        <!-- As partes -->
        <TransitionGroup tag="ul" class="flex flex-col"
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120 ease-out-expo absolute"
            leave-to-class="opacity-0 translate-x-2">
            <li v-for="item in itens" :key="item.id"
                class="group/i flex items-center gap-2 py-1 rounded-lg -mx-1 px-1
                       hover:bg-surface-raised transition-colors duration-120">
                <button type="button" @click.stop="marcar(item)"
                    :title="item.feito ? 'Desmarcar' : 'Marcar como feita'"
                    class="w-4 h-4 shrink-0 grid place-items-center rounded border
                           transition-all duration-200 ease-out-expo"
                    :class="item.feito
                        ? 'bg-data-pos border-data-pos text-white scale-100'
                        : 'border-line-strong text-transparent hover:border-accent hover:scale-110'">
                    <i class="fas fa-check text-[0.55rem]"></i>
                </button>

                <span class="flex-1 min-w-0 text-xs truncate transition-all duration-200"
                    :class="item.feito ? 'text-ink-subtle line-through' : 'text-ink'">
                    {{ item.titulo }}
                </span>

                <button type="button" @click.stop="remover(item)" title="Tirar esta parte"
                    class="w-4 h-4 shrink-0 grid place-items-center rounded text-ink-subtle
                           opacity-0 group-hover/i:opacity-100 focus:opacity-100
                           hover:text-data-neg transition-all duration-120">
                    <i class="fas fa-xmark text-[0.6rem]"></i>
                </button>
            </li>
        </TransitionGroup>

        <!-- Somar uma parte -->
        <div class="flex items-center gap-2 mt-0.5">
            <input v-if="somando" ref="campo" v-model="novaParte" type="text"
                placeholder="uma parte por linha, ou separadas por vírgula"
                @keydown.enter.stop.prevent="somar"
                @keydown.esc.stop="somando = false; novaParte = ''"
                @blur="somar"
                class="flex-1 min-w-0 px-2 py-1 rounded-lg border border-accent/40 bg-surface-raised
                       text-ink text-xs outline-none" />

            <button v-else type="button" @click.stop="abrirCampo"
                class="inline-flex items-center gap-1 text-micro font-medium text-ink-subtle
                       hover:text-accent transition-colors duration-120">
                <i class="fas fa-plus text-[0.6rem]"></i>
                {{ itens.length ? 'somar parte' : 'dividir em partes' }}
            </button>
        </div>

        <!-- Quem faz junto, acompanhamento e avisos -->
        <div class="flex items-center gap-2 flex-wrap mt-2">
            <button type="button" @click.stop="emit('pessoas', tarefa)"
                class="group/p inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full
                       border border-line hover:border-accent/40 transition-all duration-200 ease-out-expo">
                <template v-if="tarefa.parceiros?.length">
                    <span class="flex items-center">
                        <UserAvatar v-for="(p, i) in tarefa.parceiros.slice(0, 3)" :key="p.id"
                            :name="p.nome" :size="18" :class="i > 0 ? '-ml-1.5' : ''" />
                    </span>
                    <span class="text-micro text-ink-muted group-hover/p:text-accent transition-colors duration-120">
                        {{ tarefa.parceiros.length === 1 ? tarefa.parceiros[0].nome.split(' ')[0] : `${tarefa.parceiros.length} pessoas` }}
                    </span>
                </template>
                <template v-else>
                    <span class="w-[18px] h-[18px] grid place-items-center rounded-full border border-dashed
                                 border-line-strong text-ink-subtle group-hover/p:border-accent
                                 group-hover/p:text-accent transition-colors duration-120">
                        <i class="fas fa-plus text-[0.5rem]"></i>
                    </span>
                    <span class="text-micro text-ink-subtle group-hover/p:text-accent transition-colors duration-120">
                        fazer junto
                    </span>
                </template>
            </button>

            <span v-if="tarefa.acompanhar"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro
                       bg-accent-soft text-accent"
                :title="`Eu volto a lembrar a cada ${tarefa.acompanharCada} dia(s) enquanto estiver aberta.`">
                <i class="fas fa-rotate text-[0.6rem]"></i>
                acompanhando
            </span>

            <span v-if="tarefa.avisos?.length"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro
                       border border-line text-ink-subtle"
                :title="`${tarefa.avisos.length} aviso(s) antes do prazo`">
                <i class="fas fa-bell text-[0.6rem]"></i>
                {{ tarefa.avisos.length }}
            </span>

            <button type="button" @click.stop="emit('editar', tarefa)"
                class="text-micro text-ink-subtle hover:text-accent transition-colors duration-120">
                <i class="fas fa-pen text-[0.6rem] mr-1"></i>ajustar
            </button>

            <!-- Tudo riscado: a tela oferece, a pessoa decide -->
            <button v-if="tudoFeito" type="button" @click.stop="emit('concluir', tarefa)"
                class="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-micro font-semibold
                       bg-data-pos-soft text-data-pos hover:brightness-105
                       transition-all duration-200 ease-out-expo animate-pop-in">
                <i class="fas fa-check text-[0.6rem]"></i>
                todas as partes feitas - fechar?
            </button>
        </div>
    </div>
</template>
