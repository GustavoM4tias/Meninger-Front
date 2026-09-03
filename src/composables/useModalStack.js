/**
 * useModalStack — quantos modais estão abertos AGORA, de forma reativa.
 * ─────────────────────────────────────────────────────────────────────────────
 * O `Modal` já contava isso para travar a rolagem do fundo, mas o contador
 * morava em `document.body.dataset` — dado de DOM, que ninguém consegue
 * observar sem MutationObserver. Quem precisava saber "tem modal aberto?" para
 * SAIR DA FRENTE não tinha como perguntar.
 *
 * O caso que fez isto existir: o player flutuante da Eme mora em z 50, e o
 * modal `screen` em z 20 (ele fica abaixo da nav de propósito — ver
 * DESIGN-LANGUAGE, "Camadas"). Resultado: a bolinha da Eme, ancorada no canto
 * de baixo à direita, ficava POR CIMA do modal de listagem, exatamente onde o
 * botão de fechar estava. A pessoa clicava na Eme achando que clicava em
 * Fechar.
 *
 * Regra: quem flutua sobre a página sai da frente quando um modal abre. Para
 * usar a Eme junto com um modal existe o encaixe lateral, e aí é o modal que
 * recua (`--eme-ocupa-w`), não a Eme que sobe.
 *
 *   const modais = useModalStack();
 *   modais.algumAberto.value   // boolean
 *
 * O contador é do módulo, não da instância: todo mundo lê o mesmo número.
 */
import { ref, computed, readonly } from 'vue';

const abertos = ref(0);

export function useModalStack() {
    return {
        abertos: readonly(abertos),
        algumAberto: computed(() => abertos.value > 0),
        /* Chamados SÓ pelo `Modal`. Tela nenhuma incrementa isto na mão: o
           contador tem que espelhar os modais que existem, e não a intenção de
           quem escreveu a tela. */
        entrar() { abertos.value += 1; },
        sair() { abertos.value = Math.max(0, abertos.value - 1); },
    };
}

export default useModalStack;
