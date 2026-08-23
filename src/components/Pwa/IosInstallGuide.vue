<script setup>
/**
 * Guia visual de instalação no iPhone e iPad.
 *
 * A Apple não expõe API de instalação: não existe botão que instale o app no
 * iOS, o único caminho é o menu Compartilhar do Safari. Como o número de toques
 * não pode ser reduzido, o que resta é eliminar a dúvida de ONDE tocar — que é
 * exatamente onde as pessoas travam.
 *
 * Por isso os passos usam o glifo real de cada botão do iOS em vez de descrever
 * com palavras, e há uma seta apontando para a barra de baixo do Safari, que é
 * onde o botão Compartilhar mora no iPhone.
 *
 * O nome do atalho já chega preenchido como "Menin Office" (meta
 * apple-mobile-web-app-title no index.html), então o passo de nomear virou só
 * confirmar.
 */
defineProps({
    // No iPad o Compartilhar fica na barra DE CIMA, não na de baixo.
    tablet: { type: Boolean, default: false },
});

const passos = [
    {
        icone: 'fas fa-arrow-up-from-bracket',
        titulo: 'Toque em Compartilhar',
        texto: 'É este ícone, o quadrado com a seta para cima.',
    },
    {
        icone: 'fas fa-square-plus',
        titulo: 'Escolha "Adicionar à Tela de Início"',
        texto: 'Role a lista de opções, fica um pouco abaixo.',
    },
    {
        icone: 'fas fa-check',
        titulo: 'Toque em "Adicionar"',
        texto: 'O nome já vem preenchido como Menin Office.',
    },
];
</script>

<template>
    <div>
        <ol class="space-y-3">
            <li v-for="(p, i) in passos" :key="i"
                class="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                <!-- Glifo real do botão do iOS: reconhecer a forma é mais rápido
                     que ler a descrição dela. -->
                <div class="shrink-0 w-11 h-11 rounded-xl bg-accent-soft grid place-items-center">
                    <i :class="[p.icone, 'text-accent text-lg']"></i>
                </div>
                <div class="min-w-0 flex-1 pt-0.5">
                    <div class="flex items-center gap-2">
                        <span
                            class="shrink-0 w-5 h-5 rounded-full bg-ink text-surface grid place-items-center text-micro font-bold">
                            {{ i + 1 }}
                        </span>
                        <p class="text-sm font-medium text-ink">{{ p.titulo }}</p>
                    </div>
                    <p class="text-xs text-ink-muted mt-1">{{ p.texto }}</p>
                </div>
            </li>
        </ol>

        <!-- Onde fica o botão. É a parte que resolve o travamento de verdade:
             dizer "toque em Compartilhar" não adianta para quem não sabe onde ele está. -->
        <div class="mt-4 rounded-xl border border-dashed border-line-strong bg-surface-sunken p-4 text-center">
            <p class="text-xs text-ink-muted">
                O botão Compartilhar fica na barra
                <strong class="text-ink">{{ tablet ? 'de cima' : 'de baixo' }}</strong> do Safari
            </p>

            <div class="mt-3 flex flex-col items-center" :class="tablet ? 'flex-col-reverse' : ''">
                <!-- Ícone diferente em vez de rotate: a animação usa transform e
                     sobrescreveria a rotação, deixando a seta apontando errado. -->
                <i class="text-accent text-xl guia-seta"
                    :class="tablet ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>

                <!-- Miniatura da barra do Safari, com o Compartilhar em destaque. -->
                <div class="mt-2 w-full max-w-[240px] rounded-lg border border-line bg-surface-raised
                            px-3 py-2 flex items-center justify-between text-ink-subtle">
                    <i class="fas fa-chevron-left text-xs"></i>
                    <i class="fas fa-chevron-right text-xs"></i>
                    <span class="w-8 h-8 rounded-lg bg-accent-soft grid place-items-center">
                        <i class="fas fa-arrow-up-from-bracket text-accent text-sm"></i>
                    </span>
                    <i class="fas fa-book-bookmark text-xs"></i>
                    <i class="fas fa-clone text-xs"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Movimento curto e preso ao próprio ícone: chama atenção sem virar véu
   piscando sobre a tela. */
.guia-seta {
    animation: guia-desce 1.4s ease-in-out infinite;
}

@keyframes guia-desce {
    0%, 100% { transform: translateY(0); opacity: .55; }
    50%      { transform: translateY(5px); opacity: 1; }
}

/* No iPad a barra fica em cima, então o movimento inverte junto com o ícone. */
.rotate-180.guia-seta,
.fa-chevron-up.guia-seta {
    animation-name: guia-sobe;
}

@keyframes guia-sobe {
    0%, 100% { transform: translateY(0); opacity: .55; }
    50%      { transform: translateY(-5px); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
    .guia-seta { animation: none; opacity: 1; }
}
</style>
