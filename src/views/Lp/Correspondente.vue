<script setup>
// Auto-cadastro de equipe correspondente: lp.menin.com.br/correspondente/<token>
//
// Quem preenche é a própria correspondente, não alguém do Office. Por isso a
// página aceita COLAR a lista (do WhatsApp, e-mail ou planilha) e mostra o que
// entendeu antes de enviar - o mesmo parser da tela interna. Tema claro fixo,
// como a página pública de imobiliária.

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import API_URL from '@/config/apiUrl';

const route = useRoute();
const token = String(route.params.token || '');

const carregando = ref(true);
const erroLink = ref('');
const convite = ref(null);

const texto = ref('');
const pessoas = ref([]);
const analisando = ref(false);
const enviando = ref(false);
const resultado = ref(null);
const erro = ref('');
const website = ref(''); // honeypot

const base = `${API_URL}/correspondents/public/invite/${encodeURIComponent(token)}`;

const selecionadas = computed(() => pessoas.value.filter(p => p.incluir));
const podeEnviar = computed(() =>
    selecionadas.value.length > 0
    && selecionadas.value.every(p => p.nome?.trim() && p.email?.trim() && p.cpf_valido));

async function pedir(caminho, opts) {
    const r = await fetch(base + caminho, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.ok === false) throw new Error(body.error || `Erro ${r.status}`);
    return body;
}

onMounted(async () => {
    // A página pública é sempre clara, mesmo com o tema escuro salvo.
    document.documentElement.classList.remove('dark');
    try {
        const data = await pedir('');
        convite.value = data.convite;
    } catch (err) {
        erroLink.value = err.message || 'Link inválido.';
    } finally {
        carregando.value = false;
    }
});

async function analisar() {
    erro.value = '';
    if (!texto.value.trim()) { erro.value = 'Cole os dados da equipe.'; return; }
    analisando.value = true;
    try {
        const data = await pedir('/preview', { method: 'POST', body: JSON.stringify({ texto: texto.value }) });
        if (!data.pessoas?.length) {
            erro.value = 'Não encontrei ninguém no texto. Cada pessoa precisa ter nome, e-mail e CPF.';
            return;
        }
        pessoas.value = data.pessoas.map(p => ({ ...p, gerente: true, incluir: p.cpf_valido }));
    } catch (err) {
        erro.value = err.message;
    } finally {
        analisando.value = false;
    }
}

function adicionar() {
    pessoas.value.push({ nome: '', email: '', documento: '', data_nasc: null, cpf_valido: false, gerente: true, incluir: true, avisos: [] });
}

// Revalida o CPF conforme o preenchedor corrige na tela.
function conferirCpf(p) {
    const d = String(p.documento || '').replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) { p.cpf_valido = false; return; }
    const digito = (len) => {
        let soma = 0;
        for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
        const r = (soma * 10) % 11;
        return r === 10 ? 0 : r;
    };
    p.cpf_valido = digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

async function enviar() {
    erro.value = '';
    enviando.value = true;
    try {
        const data = await pedir('/submit', {
            method: 'POST',
            body: JSON.stringify({
                website: website.value,
                pessoas: selecionadas.value.map(p => ({
                    nome: p.nome.trim(),
                    email: p.email.trim(),
                    documento: String(p.documento).replace(/\D/g, ''),
                    data_nasc: p.data_nasc || null,
                    gerente: p.gerente !== false,
                })),
            }),
        });
        resultado.value = data.resultado || [];
    } catch (err) {
        erro.value = err.message;
    } finally {
        enviando.value = false;
    }
}

function recomecar() {
    texto.value = '';
    pessoas.value = [];
    resultado.value = null;
    erro.value = '';
}
</script>

<template>
    <div class="min-h-screen bg-slate-50 text-slate-900 py-8 px-4">
        <div class="mx-auto w-full max-w-3xl">
            <div v-if="carregando" class="text-center py-24 text-slate-500">Carregando...</div>

            <div v-else-if="erroLink" class="rounded-2xl bg-white border border-slate-200 p-8 text-center shadow-sm">
                <i class="fas fa-link-slash text-3xl text-slate-400 mb-3"></i>
                <h1 class="text-lg font-semibold mb-1">Link indisponível</h1>
                <p class="text-slate-600">{{ erroLink }}</p>
                <p class="text-sm text-slate-500 mt-3">Peça um link novo ao seu contato na Menin.</p>
            </div>

            <template v-else>
                <header class="mb-6">
                    <h1 class="text-2xl font-semibold">Cadastro da equipe</h1>
                    <p class="text-slate-600 mt-1">
                        <strong>{{ convite.empresa }}</strong>
                        <template v-if="convite.cidade"> · {{ convite.cidade }}<template v-if="convite.estado">/{{ convite.estado }}</template></template>
                    </p>
                    <p class="text-sm text-slate-500 mt-1">
                        Cadastre aqui as pessoas que vão acessar o sistema. O acesso é criado automaticamente.
                    </p>
                </header>

                <!-- Resultado -->
                <div v-if="resultado" class="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                    <h2 class="font-semibold mb-1">Pronto!</h2>
                    <p class="text-sm text-slate-600 mb-4">
                        {{ resultado.filter(r => r.status === 'completed').length }} de {{ resultado.length }} cadastrada(s) com sucesso.
                    </p>
                    <ul class="space-y-1.5 mb-4">
                        <li v-for="(r, i) in resultado" :key="i" class="flex items-center gap-2 text-sm">
                            <i class="fas" :class="r.status === 'completed' ? 'fa-circle-check text-emerald-500'
                                : (r.ja_existia ? 'fa-circle-info text-amber-500' : 'fa-circle-xmark text-rose-500')"></i>
                            <span class="flex-1 truncate">{{ r.nome }}</span>
                            <span class="text-slate-500 text-xs">
                                {{ r.status === 'completed' ? 'cadastrada' : (r.ja_existia ? 'já existia' : 'não foi possível') }}
                            </span>
                        </li>
                    </ul>
                    <button type="button" class="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium" @click="recomecar">
                        Cadastrar mais pessoas
                    </button>
                </div>

                <!-- Colagem -->
                <div v-else class="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-sm">
                    <template v-if="!pessoas.length">
                        <label class="block text-sm font-medium mb-1.5">Cole a lista da equipe</label>
                        <textarea v-model="texto" rows="10"
                            class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                            placeholder="Uma pessoa por bloco, com nome, e-mail, data de nascimento e CPF. Exemplo:&#10;&#10;Maria Souza da Silva&#10;maria@empresa.com&#10;20/05/2003&#10;554.579.848-00"></textarea>
                        <p class="text-xs text-slate-500 mt-2">
                            Pode colar direto da conversa do WhatsApp. Vamos mostrar o que entendemos antes de cadastrar.
                        </p>

                        <div class="flex flex-wrap gap-2 mt-4">
                            <button type="button" :disabled="analisando"
                                class="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                                @click="analisar">
                                {{ analisando ? 'Analisando...' : 'Conferir dados' }}
                            </button>
                            <button type="button" class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium" @click="adicionar">
                                Preencher manualmente
                            </button>
                        </div>
                    </template>

                    <!-- Revisão -->
                    <template v-else>
                        <div class="flex items-center justify-between mb-3">
                            <p class="text-sm font-medium">Confira antes de enviar</p>
                            <span class="text-xs text-slate-500">{{ selecionadas.length }} de {{ pessoas.length }}</span>
                        </div>

                        <div class="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                            <div v-for="(p, i) in pessoas" :key="i"
                                class="rounded-xl border p-3" :class="p.incluir ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'">
                                <div class="flex items-start gap-3">
                                    <input type="checkbox" v-model="p.incluir" class="mt-2 h-4 w-4" />
                                    <div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input v-model="p.nome" placeholder="Nome completo"
                                            class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
                                        <input v-model="p.email" placeholder="E-mail" type="email"
                                            class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
                                        <input v-model="p.documento" placeholder="CPF" @input="conferirCpf(p)"
                                            class="rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-900"
                                            :class="p.documento && !p.cpf_valido ? 'border-rose-400' : 'border-slate-300'" />
                                        <input v-model="p.data_nasc" type="date"
                                            class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900" />
                                    </div>
                                </div>
                                <p v-if="p.documento && !p.cpf_valido" class="text-xs text-rose-600 mt-1.5 pl-7">CPF inválido</p>
                            </div>
                        </div>

                        <!-- honeypot: invisível para gente -->
                        <input v-model="website" type="text" tabindex="-1" autocomplete="off"
                            class="absolute opacity-0 pointer-events-none h-0 w-0" aria-hidden="true" />

                        <div class="flex flex-wrap gap-2 mt-4">
                            <button type="button" class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium" @click="adicionar">
                                + Adicionar pessoa
                            </button>
                            <button type="button" :disabled="!podeEnviar || enviando"
                                class="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                                @click="enviar">
                                {{ enviando ? 'Enviando...' : `Cadastrar ${selecionadas.length}` }}
                            </button>
                        </div>
                        <p v-if="!podeEnviar && selecionadas.length" class="text-xs text-rose-600 mt-2">
                            Preencha nome, e-mail e um CPF válido em todas as pessoas marcadas.
                        </p>
                    </template>

                    <p v-if="erro" class="text-sm text-rose-600 mt-3">{{ erro }}</p>
                </div>
            </template>
        </div>
    </div>
</template>
