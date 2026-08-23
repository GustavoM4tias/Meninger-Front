/**
 * pedirConfirmacao — a confirmação do Office como função, não como estado.
 * ─────────────────────────────────────────────────────────────────────────────
 * O `ConfirmDialog` é o formato certo da pergunta "tem certeza?", mas usá-lo
 * direto custa quatro peças em cada tela: um ref de aberto, um ref para guardar
 * O QUE está sendo confirmado, uma segunda função com o resto do corpo e uma
 * tag no template. Multiplicado por 45 pontos, isso é onde nascem os bugs de
 * escopo — a segunda função lê a variável que ficou na primeira.
 *
 * Aqui a confirmação volta a ser uma linha no meio do fluxo, como o
 * `confirm()` do navegador era, mas com o visual, o foco e a consequência do
 * Office:
 *
 *   if (!await pedirConfirmacao({
 *     title: 'Excluir a regra do Jardim Europa?',
 *     consequence: 'Os boletos ja emitidos continuam; os proximos passam a usar a regra geral.',
 *     confirmLabel: 'Excluir regra',
 *   })) return;
 *
 * Com `askNote: true` a promessa resolve com o texto do motivo (string) em vez
 * de `true`, e continua resolvendo `false` no cancelamento — por isso o teste
 * é sempre pela negativa, nunca `=== true`.
 *
 * O diálogo em si é renderizado UMA vez, pelo ConfirmHost no App.vue. Nenhuma
 * tela precisa montar nada.
 */
import { ref, readonly } from 'vue';

const aberto = ref(false);
const opcoes = ref({});
const carregando = ref(false);
let resolver = null;

export function pedirConfirmacao(opts = {}) {
    /* Se ja existe uma pergunta na tela, a anterior e recusada: duas
       confirmacoes empilhadas deixariam a primeira promessa pendurada para
       sempre. */
    if (resolver) { resolver(false); resolver = null; }
    opcoes.value = { tone: 'danger', confirmLabel: 'Confirmar', ...opts };
    carregando.value = false;
    aberto.value = true;
    return new Promise((res) => { resolver = res; });
}

/* Usado só pelo ConfirmHost. */
export function useConfirmHost() {
    function aceitar(motivo) {
        aberto.value = false;
        const r = resolver; resolver = null;
        if (r) r(opcoes.value.askNote ? (motivo ?? '') : true);
    }
    function recusar() {
        aberto.value = false;
        const r = resolver; resolver = null;
        if (r) r(false);
    }
    return { aberto, opcoes: readonly(opcoes), carregando, aceitar, recusar };
}
