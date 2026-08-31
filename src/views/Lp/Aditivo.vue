<script setup>
// Assinatura pública do aditivo contratual: lp.menin.com.br/aditivo/<token>
//
// O link é fixo e vai para o cliente por WhatsApp/e-mail. A URL de assinatura
// do DocuSign vive poucos minutos, então ela é gerada na hora do clique - o
// cliente pode voltar neste mesmo link quantas vezes quiser.
//
// O CPF é conferido antes de liberar: sem isso, quem recebesse o link
// encaminhado assinaria no lugar do comprador.
//
// A mesma tela atende o retorno do DocuSign (/aditivo/<token>/pronto).

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

const retorno = ref(null); // { evento, assinado }

const cpfLimpo = computed(() => cpf.value.replace(/\D/g, ''));
const podeAbrir = computed(() => cpfLimpo.value.length === 11 && !abrindo.value);

function mascararCpf(e) {
    const d = String(e.target.value || '').replace(/\D/g, '').slice(0, 11);
    cpf.value = d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

async function pedir(caminho, opts = {}) {
    const r = await fetch(BASE + caminho, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Erro ${r.status}`);
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

onMounted(async () => {
    // Página pública é sempre clara, mesmo com tema escuro salvo no navegador.
    document.documentElement.classList.remove('dark');
    try {
        if (ehRetorno.value) {
            retorno.value = await pedir('/retorno', {
                method: 'POST',
                body: JSON.stringify({ event: String(route.query.event || '') }),
            });
        } else {
            doc.value = await pedir('');
        }
    } catch (err) {
        erroLink.value = err?.message || 'Link inválido.';
    } finally {
        carregando.value = false;
    }
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

                <!-- Link inválido -->
                <div v-else-if="erroLink" class="py-14 text-center">
                    <i class="fas fa-link-slash text-3xl text-slate-400"></i>
                    <h1 class="mt-4 text-lg font-semibold text-slate-800">Link não encontrado</h1>
                    <p class="mt-1 text-sm text-slate-500">
                        Confira se o endereço foi copiado por inteiro. Em caso de dúvida, fale com o seu corretor.
                    </p>
                </div>

                <!-- Retorno do DocuSign -->
                <div v-else-if="ehRetorno" class="py-12 text-center">
                    <template v-if="retorno?.assinado">
                        <i class="fas fa-circle-check text-4xl text-emerald-500"></i>
                        <h1 class="mt-4 text-lg font-semibold text-slate-800">Assinatura concluída</h1>
                        <p class="mt-1 text-sm text-slate-500">
                            Obrigado! Recebemos a sua assinatura. Uma via assinada será enviada para você.
                        </p>
                    </template>
                    <template v-else>
                        <i class="fas fa-circle-pause text-4xl text-amber-500"></i>
                        <h1 class="mt-4 text-lg font-semibold text-slate-800">Assinatura não concluída</h1>
                        <p class="mt-1 text-sm text-slate-500">
                            Você saiu antes de finalizar. O link continua valendo - é só abrir de novo quando quiser.
                        </p>
                        <RouterLink
                            :to="`/aditivo/${token}`"
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
                        <h1 class="text-xl font-bold text-slate-900">Aditivo do seu contrato</h1>
                        <p class="mt-1 text-sm text-slate-500">{{ doc?.documento }}</p>
                        <div class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                            <p class="font-semibold text-slate-800">{{ doc?.assinante }}</p>
                            <p class="mt-0.5 text-slate-500">
                                Unidade {{ doc?.unidade }}<template v-if="doc?.empreendimento"> · {{ doc.empreendimento }}</template>
                            </p>
                        </div>
                    </header>

                    <form class="mt-6" @submit.prevent="abrirAssinatura">
                        <label for="cpf" class="block text-sm font-semibold text-slate-700">
                            Confirme o seu CPF para abrir o documento
                        </label>
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

                    <p class="mt-4 text-xs text-slate-400">
                        A assinatura é feita no DocuSign. Nada muda no seu contrato além da redação da cláusula 13,
                        que passa a trazer a data-limite de entrega já prevista.
                    </p>
                </template>
            </div>

            <p class="mt-4 text-center text-xs text-slate-500">
                Menin Engenharia · dúvidas? Fale com o seu corretor.
            </p>
        </div>
    </div>
</template>
