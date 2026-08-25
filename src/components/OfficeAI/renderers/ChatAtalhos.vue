<script setup>
// Os botões que aparecem embaixo de um cartão da Eme: para onde ir, e o que
// pedir em seguida.
//
// AS ROTAS VÊM DO BACKEND, nunca do modelo. Link inventado por IA leva a 404, e
// um atalho que não abre nada é pior que atalho nenhum - por isso o que chega
// aqui foi escrito na tool, onde a rota existe de verdade.
//
// As sugestões não navegam: elas escrevem no campo de mensagem e mandam. É a
// diferença entre "te levo lá" e "peça isto a seguir".

import { useRouter } from 'vue-router';
import { useOfficeAIStore } from '@/stores/officeAIStore';

defineProps({
    atalhos: { type: Array, default: () => [] },   // [{ label, icon, link }]
    sugestoes: { type: Array, default: () => [] }, // ['Adiar para amanhã', ...]
});

const router = useRouter();
const aiStore = useOfficeAIStore();

function ir(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank', 'noopener'); return; }
    router.push(link);
}

function pedir(texto) {
    aiStore.sendMessage(texto);
}
</script>

<template>
    <div v-if="atalhos.length || sugestoes.length" class="mt-2.5 space-y-2">

        <!-- Levar para a tela -->
        <div v-if="atalhos.length" class="flex flex-wrap gap-1.5">
            <button v-for="a in atalhos" :key="a.label" type="button" @click="ir(a.link)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised
                       px-2.5 py-1.5 text-micro font-medium text-ink-muted transition-all duration-120
                       ease-out-expo hover:border-accent/40 hover:text-accent hover:-translate-y-px">
                <i v-if="a.icon" :class="a.icon" class="text-[0.65rem]"></i>
                {{ a.label }}
            </button>
        </div>

        <!-- Pedir a próxima coisa -->
        <div v-if="sugestoes.length" class="flex flex-wrap items-center gap-1.5">
            <span class="text-micro text-ink-subtle">Talvez você queira:</span>
            <button v-for="sg in sugestoes" :key="sg" type="button" @click="pedir(sg)"
                class="rounded-full border border-dashed border-line px-2.5 py-1 text-micro
                       text-ink-subtle transition-all duration-120 hover:border-accent/40
                       hover:text-accent">
                {{ sg }}
            </button>
        </div>
    </div>
</template>
