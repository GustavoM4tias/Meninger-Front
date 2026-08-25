<script setup>
// Convites de parceria dentro do chat, com os dois botões que importam.
//
// A regra é a mesma da tela: quem convidou está PARADO esperando. Por isso
// aceitar e recusar ficam aqui, e não num "abra o Meu dia para responder" -
// mais um clique é mais um dia de silêncio.
//
// RECUSAR PEDE MOTIVO, mas não obriga: o campo aparece, e quem convidou recebe
// o que for escrito. Um "não" sem explicação faz a pessoa perguntar de novo.

import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useAssistantStore } from '@/stores/Assistant/assistantStore';
import ChatAtalhos from './ChatAtalhos.vue';

const props = defineProps({ action: { type: Object, required: true } });

const toast = useToast();
const assistente = useAssistantStore();

const lista = ref([...(props.action.convites || [])]);
const recusando = ref(null);
const motivo = ref('');
const ocupado = ref(null);

async function responder(c, aceitar) {
    ocupado.value = c.id;
    try {
        await assistente.responderConvite(c.id, aceitar, aceitar ? '' : motivo.value);
        lista.value = lista.value.filter(x => x.id !== c.id);
        toast.success(aceitar
            ? `Você entrou em "${c.tarefa}".`
            : `Recusado. Avisei ${c.de || 'quem convidou'}.`);
    } catch (err) {
        toast.error(err?.message || 'Não foi possível responder.');
    } finally {
        ocupado.value = null;
        recusando.value = null;
        motivo.value = '';
    }
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title && lista.length"
            class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ action.title }}
        </p>

        <article v-for="c in lista" :key="c.id"
            class="rounded-xl border border-accent/30 bg-gradient-to-br from-accent-soft to-surface-raised p-3">

            <div class="flex items-start gap-2.5">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-accent/25
                             bg-surface-raised text-accent">
                    <i class="fas fa-handshake text-xs"></i>
                </span>

                <div class="min-w-0 flex-1">
                    <p class="text-micro font-semibold uppercase tracking-wide text-accent">
                        {{ c.onde === 'Checklist' ? 'Checklist' : 'Tarefa' }}
                        <span v-if="c.quando" class="font-normal normal-case tracking-normal text-ink-subtle">
                            · {{ c.quando }}
                        </span>
                    </p>
                    <p class="mt-0.5 text-sm font-semibold text-ink">
                        {{ c.de || 'Alguém' }} quer você junto em "{{ c.tarefa }}"
                    </p>
                    <p v-if="c.recado" class="mt-1 text-xs text-ink-muted">"{{ c.recado }}"</p>
                </div>
            </div>

            <div class="mt-2.5 flex items-center gap-1.5">
                <button type="button" :disabled="ocupado === c.id" @click="responder(c, true)"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs
                           font-semibold text-white transition-all duration-200 ease-out-expo
                           hover:brightness-110 disabled:opacity-50">
                    <i class="fas fa-check text-[0.65rem]"></i> Aceitar
                </button>
                <button type="button" :disabled="ocupado === c.id"
                    @click="recusando = (recusando === c.id ? null : c.id); motivo = ''"
                    class="rounded-lg px-3 py-1.5 text-xs text-ink-subtle transition-colors duration-120
                           hover:text-ink disabled:opacity-50">
                    Recusar
                </button>
            </div>

            <Transition
                enter-active-class="transition duration-200 ease-out-expo"
                enter-from-class="opacity-0 -translate-y-1"
                leave-active-class="transition duration-120" leave-to-class="opacity-0">
                <div v-if="recusando === c.id" class="mt-2 flex items-center gap-2 border-t border-line pt-2">
                    <input v-model="motivo" type="text" placeholder="Por quê? (vai para quem convidou)"
                        @keydown.enter="responder(c, false)"
                        class="min-w-0 flex-1 rounded-lg border border-line bg-surface-sunken px-2.5 py-1.5
                               text-xs text-ink outline-none focus:border-accent/50" />
                    <button type="button" @click="responder(c, false)"
                        class="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-micro font-medium
                               text-ink-muted transition-colors duration-120 hover:text-data-neg">
                        Recusar
                    </button>
                </div>
            </Transition>
        </article>

        <p v-if="!lista.length" class="px-0.5 text-xs text-ink-subtle">
            Nenhum convite esperando você.
        </p>

        <ChatAtalhos :atalhos="action.atalhos || []" :sugestoes="action.sugestoes || []" />
    </div>
</template>
