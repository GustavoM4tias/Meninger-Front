// stores/Assistant/assistantStore.js
//
// O assistente pessoal: o dia, as tarefas e as preferências de aviso.
//
// Duas decisões que valem a leitura:
//
// 1. CONCLUIR É OTIMISTA. A tarefa some da lista na hora e volta se o servidor
//    recusar. Marcar como feita é gesto de arrumação, e esperar meio segundo
//    por ele faz a lista parecer travada.
//
// 2. O DIA NÃO É RECARREGADO INTEIRO A CADA AÇÃO. Ele custa chamadas ao Graph
//    (agenda + caixa). Concluir uma tarefa mexe só na lista de tarefas; o dia
//    inteiro só volta quando a pessoa pede ou quando a tela reabre.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const R = '/assistente';
const B = (body) => ({ method: 'POST', body: JSON.stringify(body ?? {}) });
const P = (body) => ({ method: 'PATCH', body: JSON.stringify(body ?? {}) });
const U = (body) => ({ method: 'PUT', body: JSON.stringify(body ?? {}) });
const D = () => ({ method: 'DELETE' });

export const useAssistantStore = defineStore('assistant', () => {

    const dia = ref(null);
    const tarefas = ref([]);
    const settings = ref(null);
    const convites = ref([]);
    const equipe = ref([]);

    const carregando = ref(false);
    const salvando = ref(false);
    const erro = ref(null);

    const numeros = computed(() => dia.value?.numeros || {});
    const pendencias = computed(() => dia.value?.pendencias || []);
    const agenda = computed(() => dia.value?.agenda || []);
    const urgentes = computed(() => pendencias.value.filter(p => p.urgencia === 1));
    const atrasadas = computed(() => tarefas.value.filter(t => t.atrasada));

    /** Tarefas que dependem de outra pessoa responder. */
    const acompanhando = computed(() => tarefas.value.filter(t => t.acompanhar));

    /** O que está acontecendo AGORA, se houver. */
    const acontecendoAgora = computed(() => agenda.value.find(e => e.agora) || null);
    const proximo = computed(() => agenda.value.find(e => !e.jaPassou && !e.agora) || null);

    async function carregarDia() {
        carregando.value = true;
        erro.value = null;
        try {
            dia.value = await requestWithAuth(`${R}/dia`);
            tarefas.value = dia.value?.tarefas || [];
        } catch (err) {
            erro.value = err.message;
            dia.value = null;
        } finally {
            carregando.value = false;
        }
    }

    async function carregarTarefas(estado = 'aberta') {
        tarefas.value = await requestWithAuth(`${R}/tarefas?estado=${estado}`);

        // A MESMA tarefa também está dentro da lista do dia, e é de lá que o
        // cartão lê partes e parceiros. Sem este espelho, adicionar alguém
        // atualizava a lista de tarefas e deixava o cartão mostrando o estado
        // antigo - duas verdades na mesma tela.
        if (dia.value?.pendencias) {
            const porId = new Map(tarefas.value.map(t => [t.id, t]));
            dia.value = {
                ...dia.value,
                pendencias: dia.value.pendencias.map(p =>
                    (p.tipo === 'tarefa' && porId.has(Number(p.refId)))
                        ? { ...p, tarefa: porId.get(Number(p.refId)) }
                        : p),
            };
        }
    }

    async function criar(dados) {
        const nova = await requestWithAuth(`${R}/tarefas`, B(dados));
        tarefas.value = [nova, ...tarefas.value];
        // A pendência correspondente entra na lista do dia sem uma volta ao
        // servidor: o dia custa chamadas ao Graph e nada nele mudou.
        if (dia.value) {
            dia.value = {
                ...dia.value,
                pendencias: [{
                    tipo: 'tarefa', id: `tarefa:${nova.id}`, refId: String(nova.id),
                    titulo: nova.titulo, detalhe: nova.detalhe, prazo: nova.prazo,
                    urgencia: nova.prioridade, acao: 'Concluir', tarefa: nova,
                }, ...dia.value.pendencias],
            };
        }
        return nova;
    }

    async function concluir(id) {
        const antesT = [...tarefas.value];
        const antesP = dia.value?.pendencias || [];

        tarefas.value = tarefas.value.filter(t => t.id !== id);
        if (dia.value) {
            dia.value = { ...dia.value, pendencias: antesP.filter(p => p.id !== `tarefa:${id}`) };
        }

        try {
            const r = await requestWithAuth(`${R}/tarefas/${id}/concluir`, B());
            // Rotina: a próxima ocorrência entra na lista na hora, senão parece
            // que a tarefa simplesmente sumiu.
            if (r?.proxima) tarefas.value = [r.proxima, ...tarefas.value];
            return r;
        } catch (err) {
            tarefas.value = antesT;
            if (dia.value) dia.value = { ...dia.value, pendencias: antesP };
            throw err;
        }
    }

    /**
     * Desfaz a conclusão.
     *
     * Concluir é um clique só, sem "tem certeza?" - e essa escolha só se
     * sustenta porque existe volta. Sem desfazer, o clique errado obrigava a
     * recriar a tarefa à mão e perder prazo, partes, parceiros e avisos.
     */
    async function reabrir(id) {
        const t = await requestWithAuth(`${R}/tarefas/${id}/reabrir`, B());
        const jaEsta = tarefas.value.some(x => x.id === id);
        tarefas.value = jaEsta
            ? tarefas.value.map(x => (x.id === id ? t : x))
            : [t, ...tarefas.value];

        // A pendência também volta para a lista do dia, senão a tarefa reabre
        // num lugar e continua sumida no outro.
        if (dia.value && !dia.value.pendencias.some(p => p.id === `tarefa:${id}`)) {
            dia.value = {
                ...dia.value,
                pendencias: [{
                    tipo: 'tarefa', id: `tarefa:${t.id}`, refId: String(t.id),
                    titulo: t.titulo, detalhe: t.detalhe, prazo: t.prazo,
                    urgencia: t.prioridade, acao: 'Concluir', tarefa: t,
                }, ...dia.value.pendencias],
            };
        }
        return t;
    }

    async function descartar(id, motivo = '') {
        const antes = [...tarefas.value];
        tarefas.value = tarefas.value.filter(t => t.id !== id);
        if (dia.value) {
            dia.value = { ...dia.value, pendencias: dia.value.pendencias.filter(p => p.id !== `tarefa:${id}`) };
        }
        try { await requestWithAuth(`${R}/tarefas/${id}/descartar`, B({ motivo })); }
        catch (err) { tarefas.value = antes; throw err; }
    }

    async function atualizar(id, patch) {
        const t = await requestWithAuth(`${R}/tarefas/${id}`, P(patch));
        tarefas.value = tarefas.value.map(x => (x.id === id ? t : x));
        return t;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Subtarefas
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Marcar uma parte é OTIMISTA pelo mesmo motivo que concluir: riscar item de
    // lista é gesto de arrumação, e meio segundo de espera faz a lista parecer
    // travada. Só que aqui a resposta do servidor manda - ela devolve a lista
    // inteira, e é ela que fica.

    function _mexerNaTarefa(id, fn) {
        tarefas.value = tarefas.value.map(t => (t.id === id ? fn(t) : t));
        // A mesma tarefa aparece na lista do dia; sem isto, a tela mostraria
        // "2 de 3" de um lado e "1 de 3" do outro.
        if (dia.value?.pendencias) {
            dia.value = {
                ...dia.value,
                pendencias: dia.value.pendencias.map(p =>
                    (p.tipo === 'tarefa' && Number(p.refId) === id && p.tarefa)
                        ? { ...p, tarefa: fn(p.tarefa) }
                        : p),
            };
        }
    }

    function _comItens(id, itens) {
        const feitos = itens.filter(i => i.feito).length;
        _mexerNaTarefa(id, t => ({
            ...t, itens,
            progresso: itens.length ? { feitos, total: itens.length } : null,
        }));
    }

    async function addSubtarefas(id, titulos) {
        _comItens(id, await requestWithAuth(`${R}/tarefas/${id}/itens`, B({ titulos })));
    }

    async function marcarSubtarefa(id, itemId, feito) {
        const antes = tarefas.value.find(t => t.id === id)?.itens || [];
        _comItens(id, antes.map(i => (i.id === itemId ? { ...i, feito } : i)));
        try {
            _comItens(id, await requestWithAuth(`${R}/tarefas/${id}/itens/${itemId}`, P({ feito })));
        } catch (err) {
            _comItens(id, antes);
            throw err;
        }
    }

    async function removerSubtarefa(id, itemId) {
        _comItens(id, await requestWithAuth(`${R}/tarefas/${id}/itens/${itemId}`, D()));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Parceria
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * A tela precisa saber, ANTES do clique, se a pessoa entra ou é convidada.
     * Por isso `equipe` traz `direto` calculado no servidor: escrever "Adicionar"
     * num botão que na verdade manda um pedido é a mentira que a regra existe
     * para evitar.
     */
    async function carregarEquipe(termo = '') {
        equipe.value = await requestWithAuth(`${R}/equipe?q=${encodeURIComponent(termo)}`);
        return equipe.value;
    }

    async function convidarParceiro(id, userId, mensagem = '') {
        const r = await requestWithAuth(`${R}/tarefas/${id}/parceiros`, B({ userId, mensagem }));
        if (r.modo === 'direto') {
            _mexerNaTarefa(id, t => ({
                ...t,
                parceiros: [...(t.parceiros || []), { id: r.pessoa.id, nome: r.pessoa.nome, via: 'direto' }],
            }));
        }
        return r;
    }

    async function removerParceiro(id, userId) {
        const lista = await requestWithAuth(`${R}/tarefas/${id}/parceiros/${userId}`, D());
        _mexerNaTarefa(id, t => ({ ...t, parceiros: lista }));
    }

    async function carregarConvites() {
        try { convites.value = await requestWithAuth(`${R}/convites`); }
        catch { convites.value = []; }
    }

    /** Aceitar traz a tarefa para a lista; recusar só tira o convite da frente. */
    async function responderConvite(id, aceitar, motivo = '') {
        await requestWithAuth(`${R}/convites/${id}/responder`, B({ aceitar, motivo }));
        convites.value = convites.value.filter(c => c.id !== id);
        if (aceitar) await carregarTarefas();
    }

    async function carregarSettings() {
        try { settings.value = await requestWithAuth(`${R}/settings`); }
        catch { settings.value = null; }
    }

    async function salvarSettings(patch) {
        salvando.value = true;
        try { settings.value = await requestWithAuth(`${R}/settings`, U(patch)); return settings.value; }
        finally { salvando.value = false; }
    }

    /** Puxa agora o que o vigia traria: e-mail vira tarefa, resolvido fecha. */
    async function sincronizar() {
        const r = await requestWithAuth(`${R}/sincronizar`, B());
        await carregarDia();
        return r;
    }

    return {
        dia, tarefas, settings, convites, equipe, carregando, salvando, erro,
        numeros, pendencias, agenda, urgentes, atrasadas, acompanhando, acontecendoAgora, proximo,
        carregarDia, carregarTarefas, criar, concluir, reabrir, descartar, atualizar,
        addSubtarefas, marcarSubtarefa, removerSubtarefa,
        carregarEquipe, convidarParceiro, removerParceiro,
        carregarConvites, responderConvite,
        carregarSettings, salvarSettings, sincronizar,
    };
});
