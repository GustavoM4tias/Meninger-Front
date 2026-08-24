// stores/Microsoft/teamsChatStore.js
//
// Conversas do Teams dentro do Office.
//
// Tudo com o token da própria pessoa: a lista é a dela e a mensagem sai no nome
// dela. O Office AVISAR pelo Teams (cobrança automática, sem ninguém logado) é
// outro assunto - permissão de aplicação e app do Teams registrado.
//
// A lista se atualiza sozinha enquanto a aba está aberta, e a conversa aberta
// num intervalo mais curto: chat que só atualiza quando você aperta F5 não é
// chat. Quem liga e desliga o relógio é a tela (ligarAtualizacao), para não
// ficar batendo no Graph com a aba fechada.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { noteGraphError } from '@/utils/Microsoft/noteGraphError';

const BASE = `${API_URL}/microsoft/teams`;
const RITMO_LISTA   = 60_000;
const RITMO_ABERTA  = 20_000;

export const useTeamsChatStore = defineStore('teamsChat', () => {
    const chats       = ref([]);
    const chatId      = ref(null);
    const mensagens   = ref([]);
    const pessoas     = ref([]);          // gente do Office com conta Microsoft
    const carregandoLista     = ref(false);
    const carregandoMensagens = ref(false);
    const enviando    = ref(false);
    const erro        = ref(null);
    // Presença por id do Azure. Saber que o fulano está em reunião AGORA muda
    // se você manda mensagem ou espera - e é o dado mais barato do Graph.
    const presencas   = ref({});

    const chatAtual = computed(() => chats.value.find(c => c.id === chatId.value) || null);
    const naoLidos  = computed(() => chats.value.filter(c => c.naoLido).length);

    /** Presença de quem aparece na lista de conversas de dois. */
    async function carregarPresencas() {
        const ids = chats.value
            .filter(c => c.tipo === "oneOnOne")
            .flatMap(c => (c.participantes || []).map(p => p.id))
            .filter(Boolean);
        if (!ids.length) return;
        try {
            presencas.value = await requestWithAuth(`${BASE}/presence?ids=${encodeURIComponent(ids.join(","))}`);
        } catch { /* sem permissão ou sem resposta: a lista funciona sem isso */ }
    }

    async function carregarChats({ silencioso = false } = {}) {
        if (!silencioso) carregandoLista.value = true;
        try {
            const data = await requestWithAuth(`${BASE}/chats`);
            chats.value = data.items || [];
            erro.value = null;
            carregarPresencas();
        } catch (err) {
            erro.value = err.message; noteGraphError(err);
        } finally {
            carregandoLista.value = false;
        }
    }

    async function carregarMensagens(id, { silencioso = false } = {}) {
        if (!id) return;
        if (!silencioso) { carregandoMensagens.value = true; mensagens.value = []; }
        try {
            const data = await requestWithAuth(`${BASE}/chats/${encodeURIComponent(id)}/messages`);
            mensagens.value = data.items || [];
        } catch (err) {
            erro.value = err.message; noteGraphError(err);
        } finally {
            carregandoMensagens.value = false;
        }
    }

    async function abrir(id) {
        chatId.value = id;
        await carregarMensagens(id);
        // Abrir no Office conta como ler, igual ao Teams. Falhar aqui não é
        // motivo para atrapalhar a leitura.
        try {
            await requestWithAuth(`${BASE}/chats/${encodeURIComponent(id)}/read`, { method: 'POST' });
            const c = chats.value.find(x => x.id === id);
            if (c) c.naoLido = false;
        } catch { /* silencioso de propósito */ }
    }

    async function enviar(texto) {
        const conteudo = String(texto || '').trim();
        if (!conteudo || !chatId.value || enviando.value) return;

        enviando.value = true;
        try {
            const msg = await requestWithAuth(`${BASE}/chats/${encodeURIComponent(chatId.value)}/messages`, {
                method: 'POST',
                body: JSON.stringify({ texto: conteudo }),
            });
            mensagens.value = [...mensagens.value, msg];

            // A prévia na lista muda na hora: esperar o próximo ciclo faz a
            // conversa parecer parada logo depois de você falar nela.
            const c = chats.value.find(x => x.id === chatId.value);
            if (c) {
                c.ultimaMensagem = { de: 'Você', texto: msg.previa, em: msg.em };
                c.atualizadoEm = msg.em;
            }
            return msg;
        } catch (err) {
            erro.value = err.message; noteGraphError(err);
            throw err;
        } finally {
            enviando.value = false;
        }
    }

    /** Abre (criando se preciso) a conversa de dois com alguém. */
    async function conversarCom(email) {
        const novo = await requestWithAuth(`${BASE}/chats`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        await carregarChats({ silencioso: true });
        await abrir(novo.id);
        return novo;
    }

    async function carregarPessoas() {
        if (pessoas.value.length) return;
        try {
            pessoas.value = await requestWithAuth(`${API_URL}/microsoft/planner/people`);
        } catch { /* a tela funciona sem a lista: dá para digitar o e-mail */ }
    }

    // ── Atualização automática ────────────────────────────────────────────────
    let relogioLista = null;
    let relogioAberta = null;

    function ligarAtualizacao() {
        desligarAtualizacao();
        relogioLista  = setInterval(() => carregarChats({ silencioso: true }), RITMO_LISTA);
        relogioAberta = setInterval(() => {
            if (chatId.value) carregarMensagens(chatId.value, { silencioso: true });
        }, RITMO_ABERTA);
    }

    function desligarAtualizacao() {
        clearInterval(relogioLista);  relogioLista = null;
        clearInterval(relogioAberta); relogioAberta = null;
    }

    return {
        chats, chatId, mensagens, pessoas, erro, presencas,
        carregandoLista, carregandoMensagens, enviando,
        chatAtual, naoLidos,
        carregarChats, carregarMensagens, abrir, enviar, conversarCom, carregarPessoas, carregarPresencas,
        ligarAtualizacao, desligarAtualizacao,
    };
});
