<script setup>
// Colocar alguém junto - no assistente ou no Checklist, com a MESMA regra.
//
//   quem está ABAIXO no organograma  →  entra direto
//   TODO O RESTO                     →  vira pedido, e a pessoa aceita ou recusa
//
// "Todo o resto" são dois grupos que a tela separa porque o motivo é diferente:
// quem está no seu nível ou acima, e quem NÃO ESTÁ NO ORGANOGRAMA. O caminho é
// o mesmo - dizer só "precisa aceitar" faria a pessoa procurar no organograma
// alguém que não está lá.
//
// O servidor decide de qualquer jeito. A tela mostra a decisão ANTES do clique
// porque um botão escrito "Adicionar" que na verdade manda um pedido seria a
// mentira que a regra existe para evitar: cada linha vem com `direto` calculado
// e as duas listas ficam separadas, cada uma com o título que explica.
//
// POR QUE ELE VIVE EM components/Colab E NÃO NA TELA DO ASSISTENTE
//
// A regra vale nos dois módulos. Duas cópias divergiriam na primeira mudança, e
// uma regra de hierarquia que vale num lugar e não no outro é pior que nenhuma.
// O que muda entre eles é só o endereço de gravar - o `escopo` resolve isso.
//
// A LISTA DE PESSOAS VEM DE /assistente/equipe nos dois casos: ela responde
// sobre a HIERARQUIA de quem pergunta, não sobre o módulo.

import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import UserAvatar from '@/components/UI/UserAvatar.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    escopo: { type: String, default: 'assistente' },  // assistente | checklist
    id: { type: [Number, String], default: null },
    titulo: { type: String, default: '' },
    parceiros: { type: Array, default: () => [] },    // [{ id, nome }]
    /** Só o assistente permite tirar por aqui; no Checklist isso é do admin. */
    podeRemover: { type: Boolean, default: true },
});
const emit = defineEmits(['close', 'mudou']);

const toast = useToast();

// As duas listas de "pedir" são visualmente idênticas de propósito: o que muda
// é o MOTIVO de precisar pedir, não o que vai acontecer.
const LINHA_PEDIR = 'group flex items-center gap-2.5 p-2 rounded-xl border border-line bg-surface-sunken '
    + 'text-left hover:border-data-warn/40 hover:-translate-y-px '
    + 'transition-all duration-200 ease-out-expo disabled:opacity-50';
const SELO_PEDIR = 'text-micro font-medium text-data-warn opacity-0 group-hover:opacity-100 '
    + 'transition-opacity duration-120';

const gente = ref([]);
const busca = ref('');
const recado = ref('');
const carregando = ref(false);
const enviando = ref(null);

async function buscar(termo = '') {
    carregando.value = true;
    try { gente.value = await requestWithAuth(`/assistente/equipe?q=${encodeURIComponent(termo)}`); }
    catch { gente.value = []; }
    finally { carregando.value = false; }
}

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    busca.value = '';
    recado.value = '';
    buscar('');
});

let debounce = null;
watch(busca, (termo) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => buscar(termo), 250);
});

const jaEstao = computed(() => new Set((props.parceiros || []).map(p => Number(p.id))));
const livres = computed(() => gente.value.filter(p => !jaEstao.value.has(p.id)));

const diretos = computed(() => livres.value.filter(p => p.direto));
const pares = computed(() => livres.value.filter(p => !p.direto && p.relacao !== 'fora'));
const fora = computed(() => livres.value.filter(p => p.relacao === 'fora'));

// O Checklist é montado em /api/checklists (plural) - o singular devolve 404.
const rota = computed(() => props.escopo === 'checklist'
    ? `/checklists/tasks/${props.id}/parceiro`
    : `/assistente/tarefas/${props.id}/parceiros`);

async function somar(pessoa) {
    enviando.value = pessoa.id;
    try {
        const r = await requestWithAuth(rota.value, {
            method: 'POST',
            body: JSON.stringify({ userId: pessoa.id, mensagem: recado.value }),
        });
        emit('mudou', r);

        if (r.modo === 'direto') {
            toast.success(`${r.pessoa.nome} entrou na tarefa.`);
            emit('close');
        } else if (r.jaExistia) {
            toast.info(`O pedido para ${r.pessoa.nome} já estava lá, ainda sem resposta.`);
        } else {
            toast.success(`Pedido enviado para ${r.pessoa.nome}. Ela precisa aceitar.`);
            emit('close');
        }
    } catch (err) {
        toast.error(err?.message || 'Não foi possível.');
    } finally {
        enviando.value = null;
    }
}

async function tirar(pessoa) {
    try {
        await requestWithAuth(`/assistente/tarefas/${props.id}/parceiros/${pessoa.id}`, { method: 'DELETE' });
        emit('mudou', { modo: 'removido', pessoa });
        toast.success(`${pessoa.nome} saiu da tarefa.`);
    } catch (err) {
        toast.error(err?.message || 'Não foi possível.');
    }
}
</script>

<template>
    <Modal :open="open" size="md" title="Fazer junto com" @close="emit('close')">
        <p v-if="titulo" class="text-xs text-ink-muted -mt-1 mb-3 truncate">{{ titulo }}</p>

        <!-- Quem já está -->
        <div v-if="parceiros.length" class="mb-3">
            <p class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-1.5">Já estão</p>
            <div class="flex flex-wrap gap-1.5">
                <span v-for="p in parceiros" :key="p.id"
                    class="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full
                           border border-line bg-surface-sunken text-xs text-ink">
                    <UserAvatar :name="p.nome" :size="20" :ring="false" />
                    {{ p.nome }}
                    <button v-if="podeRemover" type="button" @click="tirar(p)" title="Tirar da tarefa"
                        class="w-4 h-4 grid place-items-center rounded-full text-ink-subtle
                               hover:text-data-neg transition-colors duration-120">
                        <i class="fas fa-xmark text-[0.6rem]"></i>
                    </button>
                </span>
            </div>
        </div>

        <Input v-model="busca" placeholder="Buscar por nome ou e-mail"
            icon-left="fas fa-magnifying-glass" autofocus />

        <Input v-model="recado" class="mt-2" label="Recado no pedido (opcional)"
            placeholder="ex.: preciso da sua parte até quinta" />

        <div class="mt-3 max-h-[22rem] overflow-y-auto pr-1 flex flex-col gap-3">
            <Skeleton v-if="carregando && !gente.length" class="h-32 rounded-xl" />

            <EmptyState v-else-if="!livres.length" icon="fas fa-user-slash" size="sm"
                title="Ninguém encontrado" description="Tente outro nome ou o e-mail da pessoa." />

            <!-- Entram direto -->
            <section v-if="diretos.length">
                <p class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-1.5">
                    Entram na hora
                    <span class="font-normal normal-case tracking-normal">· sua equipe no organograma</span>
                </p>
                <div class="flex flex-col gap-1">
                    <button v-for="p in diretos" :key="p.id" type="button" :disabled="enviando === p.id"
                        @click="somar(p)"
                        class="group flex items-center gap-2.5 p-2 rounded-xl border border-line bg-surface-sunken
                               text-left hover:border-accent/40 hover:-translate-y-px
                               transition-all duration-200 ease-out-expo disabled:opacity-50">
                        <UserAvatar :name="p.nome" :size="28" :ring="false" />
                        <span class="flex-1 min-w-0">
                            <span class="block text-sm text-ink truncate">{{ p.nome }}</span>
                            <span class="block text-micro text-ink-subtle truncate">{{ p.cargo || p.email }}</span>
                        </span>
                        <span class="text-micro font-medium text-accent opacity-0 group-hover:opacity-100
                                     transition-opacity duration-120">
                            <i class="fas fa-plus mr-1"></i>Adicionar
                        </span>
                    </button>
                </div>
            </section>

            <!-- Precisam aceitar: mesmo nível ou acima -->
            <section v-if="pares.length">
                <p class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-1.5">
                    Precisam aceitar
                    <span class="font-normal normal-case tracking-normal">· mesmo nível ou acima de você</span>
                </p>
                <div class="flex flex-col gap-1">
                    <button v-for="p in pares" :key="p.id" type="button" :disabled="enviando === p.id"
                        @click="somar(p)" :class="LINHA_PEDIR">
                        <UserAvatar :name="p.nome" :size="28" :ring="false" />
                        <span class="flex-1 min-w-0">
                            <span class="block text-sm text-ink truncate">{{ p.nome }}</span>
                            <span class="block text-micro text-ink-subtle truncate">{{ p.cargo || p.email }}</span>
                        </span>
                        <span :class="SELO_PEDIR"><i class="fas fa-paper-plane mr-1"></i>Pedir</span>
                    </button>
                </div>
            </section>

            <!-- Precisam aceitar: sem lugar no organograma -->
            <section v-if="fora.length">
                <p class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-1.5">
                    Precisam aceitar
                    <span class="font-normal normal-case tracking-normal">· fora do organograma</span>
                </p>
                <div class="flex flex-col gap-1">
                    <button v-for="p in fora" :key="p.id" type="button" :disabled="enviando === p.id"
                        @click="somar(p)" :class="LINHA_PEDIR">
                        <UserAvatar :name="p.nome" :size="28" :ring="false" />
                        <span class="flex-1 min-w-0">
                            <span class="block text-sm text-ink truncate">{{ p.nome }}</span>
                            <span class="block text-micro text-ink-subtle truncate">{{ p.cargo || p.email }}</span>
                        </span>
                        <span :class="SELO_PEDIR"><i class="fas fa-paper-plane mr-1"></i>Pedir</span>
                    </button>
                </div>
                <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
                    Sem posição na hierarquia não dá para afirmar que estão abaixo de você, então o
                    caminho é o mesmo: pedir.
                </p>
            </section>

            <p v-if="pares.length || fora.length" class="text-micro text-ink-subtle leading-relaxed">
                O pedido aparece para a pessoa <strong class="font-semibold">até ela aceitar ou recusar</strong> -
                ignorar não tira da frente dela. Ele só some sozinho se a tarefa for concluída, se o prazo
                passar, ou se você desistir.
            </p>
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Fechar</Button>
        </template>
    </Modal>
</template>
