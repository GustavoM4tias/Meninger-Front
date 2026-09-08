<script setup>
// Assinatura pública do aditivo contratual: lp.menin.com.br/<token>
//
// O link é fixo e vai para o cliente por WhatsApp/e-mail. A URL de assinatura
// do DocuSign vive poucos minutos, então ela é gerada na hora do clique - o
// cliente pode voltar neste mesmo link quantas vezes quiser.
//
// O CPF é conferido antes de liberar: sem isso, quem recebesse o link
// encaminhado assinaria no lugar do comprador.
//
// A mesma tela atende o retorno do DocuSign (/<token>/pronto).

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import API_URL from '@/config/apiUrl';

const route = useRoute();
const token = String(route.params.token || '');
const ehRetorno = computed(() => String(route.path).endsWith('/pronto'));

const BASE = `${API_URL}/aditivos/assinatura/${encodeURIComponent(token)}`;

const carregando = ref(true);
const erroLink = ref('');
const doc = ref(null);

const cpf = ref('');
const abrindo = ref(false);
const erro = ref('');

const retorno = ref(null);              // { evento, assinado }
const confirmacaoPendente = ref(false); // a nossa API não respondeu na volta
const erroCarregar = ref('');           // queda ao abrir (link pode estar certo)

// O DocuSign só devolve o cliente com `signing_complete` DEPOIS da cerimônia
// terminar: a assinatura já existe lá, mesmo que a nossa API não responda na
// volta. Por isso a tela de retorno nunca depende só da nossa confirmação.
const assinouPelaUrl = String(route.query.event || '') === 'signing_complete';
const assinado = computed(() => Boolean(retorno.value?.assinado) || assinouPelaUrl);

// O nome vem em caixa alta do CV e grita na tela; aqui ele aparece por
// extenso normal, com as partículas em minúscula.
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
function nomeBonito(nome) {
    return String(nome || '')
        .toLocaleLowerCase('pt-BR')
        .split(/\s+/)
        .map((p) => (MINUSCULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1)))
        .join(' ');
}

// Fallback para `assinante` caso a API ainda seja a versão anterior.
const assinantes = computed(() => (doc.value?.assinantes
    ?? (doc.value?.assinante ? [{ nome: doc.value.assinante, assinado: false }] : []))
    .map((a) => ({ ...a, nome: nomeBonito(a.nome) })));

const cpfLimpo = computed(() => cpf.value.replace(/\D/g, ''));
const podeAbrir = computed(() => cpfLimpo.value.length === 11 && !abrindo.value);

function mascararCpf(e) {
    const d = String(e.target.value || '').replace(/\D/g, '').slice(0, 11);
    cpf.value = d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

// O `status` vai junto do erro porque a tela trata 404 (link errado mesmo) de
// um jeito e queda de rede/servidor de outro - dizer "link não encontrado" para
// quem tem o link certo é o pior retorno possível.
async function pedir(caminho, opts = {}) {
    let r;
    try {
        r = await fetch(BASE + caminho, {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
        });
    } catch {
        throw Object.assign(new Error('Sem conexão com o servidor.'), { status: 0 });
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.error || `Erro ${r.status}`), { status: r.status });
    return body;
}

async function abrirAssinatura() {
    erro.value = '';
    abrindo.value = true;
    try {
        const { url } = await pedir('/abrir', { method: 'POST', body: JSON.stringify({ cpf: cpfLimpo.value }) });
        window.location.href = url;
    } catch (err) {
        erro.value = err?.message || 'Não foi possível abrir a assinatura.';
        abrindo.value = false;
    }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Na volta do DocuSign o cliente está quase sempre no 4G, saindo de outro app:
// uma falha isolada de rede não pode virar "link não encontrado" para quem
// acabou de assinar. Tenta de novo e, se ainda assim não der, a tela se apoia
// no evento que o próprio DocuSign colocou na URL.
async function confirmarRetorno() {
    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
        try {
            retorno.value = await pedir('/retorno', {
                method: 'POST',
                body: JSON.stringify({ event: String(route.query.event || '') }),
            });
            return;
        } catch {
            if (tentativa === 3) confirmacaoPendente.value = true;
            else await espera(800 * tentativa);
        }
    }
}

async function carregarDoc() {
    carregando.value = true;
    erroLink.value = '';
    erroCarregar.value = '';
    try {
        doc.value = await pedir('');
    } catch (err) {
        // Só 404 significa link errado; queda de rede ou servidor é outra história
        // e tem conserto - tentar de novo.
        if (err?.status === 404) erroLink.value = err.message;
        else erroCarregar.value = err?.message || 'Não foi possível carregar.';
    } finally {
        carregando.value = false;
    }
}

onMounted(async () => {
    // Página pública é sempre clara, mesmo com tema escuro salvo no navegador.
    document.documentElement.classList.remove('dark');
    if (ehRetorno.value) {
        await confirmarRetorno();
        carregando.value = false;
        return;
    }
    await carregarDoc();
});
</script>

<template>
    <!-- color-scheme fixo: sem ele o navegador em tema escuro pinta o input
         (fundo, cursor e autofill) por conta própria, dentro do card branco. -->
    <div class="min-h-screen bg-slate-900 flex p-4 sm:p-6 justify-center" style="color-scheme: light">
        <div class="w-full max-w-md my-auto">
            <div class="flex justify-center mb-5">
                <img src="https://office.menin.com.br/Mlogotext.png" alt="Menin" class="h-9" />
            </div>

            <div class="rounded-2xl bg-white shadow-xl p-5 sm:p-8">
                <!-- Carregando -->
                <div v-if="carregando" class="py-16 text-center text-slate-500">
                    <i class="fas fa-circle-notch fa-spin text-2xl"></i>
                    <p class="mt-3 text-sm">Carregando...</p>
                </div>

                <!-- Link inválido: só quando a API disse 404 mesmo -->
                <div v-else-if="erroLink" class="py-14 text-center">
                    <i class="fas fa-link-slash text-3xl text-slate-400"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Link não encontrado</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Confira se o endereço foi copiado por inteiro. Em caso de dúvida, fale com o seu corretor.
                    </p>
                </div>

                <!-- Queda de rede/servidor: o link pode estar certo, então a tela
                     oferece nova tentativa em vez de acusar o link. -->
                <div v-else-if="erroCarregar" class="py-14 text-center">
                    <i class="fas fa-triangle-exclamation text-3xl text-amber-500"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Não foi possível carregar</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        A conexão falhou por um instante. O seu link continua valendo.
                    </p>
                    <button
                        type="button"
                        class="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                        @click="carregarDoc"
                    >
                        <i class="fas fa-rotate"></i>Tentar de novo
                    </button>
                </div>

                <!-- Retorno do DocuSign -->
                <div v-else-if="ehRetorno" class="py-12 text-center">
                    <template v-if="assinado">
                        <i class="fas fa-circle-check text-4xl text-emerald-500"></i>
                        <h1 class="mt-4 text-lg font-semibold text-slate-800">Assinatura concluída</h1>
                        <p class="mt-1 text-sm text-slate-500">
                            Obrigado! Recebemos a sua assinatura. Uma via assinada será enviada para você.
                        </p>
                        <p v-if="confirmacaoPendente" class="mt-3 text-xs text-slate-400">
                            A sua assinatura foi registrada no DocuSign. A confirmação aqui não carregou por
                            causa da conexão, mas você não precisa fazer mais nada.
                        </p>
                    </template>
                    <template v-else>
                        <i class="fas fa-circle-pause text-4xl text-amber-500"></i>
                        <h1 class="mt-4 text-lg font-semibold text-slate-800">Assinatura não concluída</h1>
                        <p class="mt-1 text-sm text-slate-500">
                            Você saiu antes de finalizar. O link continua valendo - é só abrir de novo quando quiser.
                        </p>
                        <RouterLink
                            :to="`/${token}`"
                            class="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            <i class="fas fa-pen-nib"></i>Voltar para assinar
                        </RouterLink>
                    </template>
                </div>

                <!-- Já assinado -->
                <div v-else-if="doc?.assinado" class="py-14 text-center">
                    <i class="fas fa-circle-check text-4xl text-emerald-500"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Aditivo já assinado</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Recebemos a sua assinatura da unidade {{ doc.unidade }}. Não é preciso fazer mais nada.
                    </p>
                </div>

                <!-- Cancelado -->
                <div v-else-if="doc?.cancelado" class="py-14 text-center">
                    <i class="fas fa-file-circle-xmark text-3xl text-slate-400"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Documento indisponível</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Este aditivo foi cancelado. Fale com o seu corretor para receber a versão atualizada.
                    </p>
                </div>

                <!-- Bloqueado por tentativas -->
                <div v-else-if="doc?.bloqueado" class="py-14 text-center">
                    <i class="fas fa-lock text-3xl text-slate-400"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Acesso bloqueado</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Foram feitas muitas tentativas com CPF incorreto. Fale com o seu corretor para liberar.
                    </p>
                </div>

                <!-- Confirmação de CPF -->
                <template v-else>
                    <header>
                        <h1 class="text-xl font-bold text-slate-900">{{ doc?.titulo }}</h1>
                        <p class="mt-1 text-sm text-slate-500">{{ doc?.documento }}</p>
                        <div class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                            <!-- O mesmo link atende todos os assinantes do documento:
                                 quem abre se identifica pelo próprio CPF. -->
                            <p v-for="a in assinantes" :key="a.nome" class="flex items-start gap-2 font-semibold text-slate-800">
                                <i
                                    class="mt-1 text-xs"
                                    :class="a.assinado ? 'fas fa-circle-check text-emerald-500' : 'far fa-circle text-slate-300'"
                                ></i>
                                <span>
                                    {{ a.nome }}
                                    <span v-if="a.assinado" class="font-normal text-emerald-600">- já assinou</span>
                                </span>
                            </p>
                            <p class="mt-1.5 text-slate-500">
                                Unidade {{ doc?.unidade }}<template v-if="doc?.empreendimento"> · {{ doc.empreendimento }}</template>
                            </p>
                        </div>
                    </header>

                    <form class="mt-6" @submit.prevent="abrirAssinatura">
                        <label for="cpf" class="block text-sm font-semibold text-slate-700">
                            Confirme o seu CPF para abrir o documento
                        </label>
                        <p v-if="assinantes.length > 1" class="mt-1 text-xs text-slate-500">
                            Este mesmo link serve para os dois: cada um digita o próprio CPF.
                        </p>
                        <input
                            id="cpf"
                            :value="cpf"
                            inputmode="numeric"
                            autocomplete="off"
                            placeholder="000.000.000-00"
                            class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                            @input="mascararCpf"
                        />

                        <p v-if="erro" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ erro }}</p>

                        <button
                            type="submit"
                            :disabled="!podeAbrir"
                            class="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3.5 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                            <i :class="abrindo ? 'fas fa-circle-notch fa-spin' : 'fas fa-pen-nib'"></i>
                            {{ abrindo ? 'Abrindo...' : 'Abrir para assinar' }}
                        </button>
                    </form>

                    <p class="mt-4 text-xs text-slate-500">{{ doc?.observacao }}</p>
                </template>
            </div>

            <p class="mt-4 text-center text-xs text-slate-500">
                Menin Engenharia · dúvidas? Fale com o seu corretor.
            </p>
        </div>
    </div>
</template>
