// stores/Microsoft/outlookAiStore.js
//
// Estado da IA da caixa: triagem, automações, fila de aprovação e relatório.
//
// Fica separado do outlookStore de propósito. Aquele é a caixa (pastas, lista,
// leitura) e precisa ser rápido; este chama o modelo e pode demorar. Juntos, uma
// triagem lenta seguraria a lista de e-mails, que é a parte que a pessoa
// realmente espera abrir na hora.
//
// Duas decisões que valem a leitura:
//
// 1. A triagem é OTIMISTA no adiar: some da lista na hora, e volta se o servidor
//    recusar. É gesto de arrumação, tem que responder junto com o clique.
//
// 2. A fila NUNCA é otimista no aprovar. Aprovar é enviar e-mail: a linha só sai
//    da tela depois que o servidor confirma que saiu. Sumir antes seria dizer
//    "enviado" sem ter enviado.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/utils/Microsoft/apiOutlookAi';

export const useOutlookAiStore = defineStore('outlookAi', () => {

    // ── Dados ─────────────────────────────────────────────────────────────────
    const painel     = ref(null);   // triagem: métricas, prioritários, tratados, extraídos
    const settings   = ref(null);
    const regras     = ref([]);
    const fila       = ref([]);
    const trilho     = ref({ fila: [], compromissos: [], semResposta: [] });
    const historico  = ref([]);
    const relatorio  = ref(null);
    const leituras   = ref({});     // messageId → leitura da IA (cache local da aba Caixa)

    // ── Estado ────────────────────────────────────────────────────────────────
    const carregandoPainel    = ref(false);
    // A IA está lendo o que chegou AGORA, com a tela já montada. É diferente de
    // `carregandoPainel`, que é a tela ainda sem conteúdo.
    const lendo               = ref(false);
    const carregandoTrilho    = ref(false);
    const carregandoRegras    = ref(false);
    const carregandoRelatorio = ref(false);
    const analisando          = ref(false);
    // O id de QUEM está sendo redigido, não um booleano. Com um flag só, clicar
    // em um item deixava todos os botões da lista girando ao mesmo tempo.
    const redigindoId         = ref(null);
    const salvando            = ref(false);
    const erro                = ref(null);

    // ── Derivados ─────────────────────────────────────────────────────────────
    const temIA = computed(() => painel.value?.temIA ?? true);

    /** Sem chave de IA a triagem vira heurística - e a tela precisa dizer isso. */
    const porHeuristica = computed(() => painel.value?.fonte === 'heuristica');

    const pendentes = computed(() => trilho.value?.fila?.length || 0);

    const precisamDeVoce = computed(() => painel.value?.prioritarios?.length || 0);

    /** Quantas regras estão realmente agindo sozinhas. */
    const regrasAutomaticas = computed(() =>
        regras.value.filter(r => r.ativo && r.modo === 'automatico').length
    );

    const automacaoLigadaNaEmpresa = computed(() => settings.value?.automacaoLigadaNaEmpresa === true);

    // ── Triagem ───────────────────────────────────────────────────────────────

    /**
     * O painel, do cache do servidor. É o que a tela chama ao abrir, e ele
     * responde em milissegundos porque não sai do banco.
     */
    async function carregarPainel() {
        carregandoPainel.value = true;
        erro.value = null;
        try {
            painel.value = await api.getTriagem();
        } catch (err) {
            erro.value = err.message;
            painel.value = null;
        } finally {
            carregandoPainel.value = false;
        }
    }

    /**
     * A leitura do que chegou. Roda POR FORA da abertura: a tela já está
     * pintada quando isto começa, e o resultado entra quando ficar pronto.
     *
     * Nunca derruba o que está na tela em caso de erro - painel velho é melhor
     * que painel nenhum.
     */
    async function atualizarPainel({ force = false } = {}) {
        if (lendo.value) return;
        lendo.value = true;
        try {
            const novo = await api.atualizarTriagem(force);
            painel.value = novo;
            return novo?.passada || null;
        } catch (err) {
            erro.value = err.message;
            return null;
        } finally {
            lendo.value = false;
        }
    }

    /**
     * Tira da lista com motivo. Otimista: some na hora e volta se o servidor
     * recusar - é gesto de arrumação, tem que responder junto com o clique.
     */
    async function resolver(messageId, motivo, nota = '') {
        const antes = painel.value?.prioritarios || [];
        if (painel.value) {
            painel.value = { ...painel.value, prioritarios: antes.filter(p => p.messageId !== messageId) };
        }
        try { return await api.resolver(messageId, motivo, nota); }
        catch (err) {
            if (painel.value) painel.value = { ...painel.value, prioritarios: antes };
            throw err;
        }
    }

    // ── Aprendizado ───────────────────────────────────────────────────────────
    const feedback = ref([]);

    async function carregarFeedback() {
        try { feedback.value = await api.getFeedback(); } catch { feedback.value = []; }
    }

    async function comentar(data) {
        await api.comentar(data);
        carregarFeedback();
    }

    async function aposentarFeedback(id, aplicado) {
        feedback.value = await api.aposentarFeedback(id, aplicado);
    }

    async function adiar(messageId) {
        const antes = painel.value?.prioritarios || [];
        if (painel.value) {
            painel.value = { ...painel.value, prioritarios: antes.filter(p => p.messageId !== messageId) };
        }
        try { await api.adiar(messageId); }
        catch (err) {
            if (painel.value) painel.value = { ...painel.value, prioritarios: antes };
            throw err;
        }
    }

    /** A leitura da IA de uma mensagem, para o painel de leitura. */
    async function leituraDe(messageId) {
        if (!messageId) return null;
        if (leituras.value[messageId] !== undefined) return leituras.value[messageId];
        try {
            const l = await api.getLeitura(messageId);
            leituras.value = { ...leituras.value, [messageId]: l };
            return l;
        } catch {
            // Mensagem que a IA ainda não leu não é erro: é uma mensagem sem
            // leitura, e o painel simplesmente não aparece.
            leituras.value = { ...leituras.value, [messageId]: null };
            return null;
        }
    }

    // ── Trilho lateral ────────────────────────────────────────────────────────

    async function carregarTrilho() {
        // O hub e o próprio trilho pedem a mesma coisa ao montar. Sem este
        // freio, toda abertura da tela faz duas voltas ao Graph pela mesma lista.
        if (carregandoTrilho.value) return;
        carregandoTrilho.value = true;
        try {
            trilho.value = await api.getTrilho();
            fila.value = trilho.value.fila || [];
        } catch { /* o trilho é apoio: falhar nele não pode quebrar a tela */ }
        finally { carregandoTrilho.value = false; }
    }

    // ── Fila ──────────────────────────────────────────────────────────────────

    async function redigir(messageId, { instrucao = '', base = '' } = {}) {
        redigindoId.value = messageId;
        try {
            const item = await api.redigir(messageId, { instrucao, base });
            await carregarTrilho();
            return item;
        } finally { redigindoId.value = null; }
    }

    /** Está redigindo ESTE item? É o que a lista pergunta por linha. */
    const redigindoEste = (messageId) => redigindoId.value === messageId;

    /** Editar leva junto o comentário: a correção e o porquê chegam juntos. */
    async function editarFila(id, { corpo, comentario = '', nota = null } = {}) {
        fila.value = await api.editarFila(id, { corpo, comentario, nota });
        trilho.value = { ...trilho.value, fila: fila.value };
    }

    /** Não é otimista: a linha só sai depois que o e-mail saiu de verdade. */
    async function aprovar(id) {
        fila.value = await api.aprovarFila(id);
        trilho.value = { ...trilho.value, fila: fila.value };
        carregarPainel();
    }

    async function descartarDaFila(id) {
        fila.value = await api.descartarFila(id);
        trilho.value = { ...trilho.value, fila: fila.value };
    }

    // ── Configuração ──────────────────────────────────────────────────────────

    async function carregarSettings() {
        try { settings.value = await api.getSettings(); }
        catch (err) { erro.value = err.message; }
    }

    async function salvarSettings(patch) {
        salvando.value = true;
        try {
            const salvo = await api.salvarSettings(patch);
            // O servidor devolve a config efetiva já normalizada (limite novo,
            // matriz completa). Confiar nela evita a tela e a API divergirem.
            settings.value = { ...salvo, automacaoLigadaNaEmpresa: settings.value?.automacaoLigadaNaEmpresa };
            return settings.value;
        } finally { salvando.value = false; }
    }

    // ── Regras ────────────────────────────────────────────────────────────────

    async function carregarRegras() {
        carregandoRegras.value = true;
        try { regras.value = await api.getRegras(); }
        catch (err) { erro.value = err.message; }
        finally { carregandoRegras.value = false; }
    }

    async function alternarRegra(id, campos) {
        regras.value = await api.atualizarRegra(id, campos);
    }

    async function criarRegra(texto) {
        regras.value = await api.criarRegra(texto);
    }

    async function excluirRegra(id) {
        regras.value = await api.excluirRegra(id);
    }

    // ── Contexto ──────────────────────────────────────────────────────────────

    async function analisarContexto() {
        analisando.value = true;
        try { settings.value = { ...(await api.analisarContexto()), automacaoLigadaNaEmpresa: settings.value?.automacaoLigadaNaEmpresa }; }
        finally { analisando.value = false; }
    }

    async function aceitarContexto() {
        settings.value = { ...(await api.aceitarContexto()), automacaoLigadaNaEmpresa: settings.value?.automacaoLigadaNaEmpresa };
    }

    async function descartarContexto() {
        settings.value = { ...(await api.descartarContexto()), automacaoLigadaNaEmpresa: settings.value?.automacaoLigadaNaEmpresa };
    }

    // ── Interruptores da empresa (admin) ──────────────────────────────────────

    const configEmpresa = ref(null);

    async function carregarConfigEmpresa() {
        // Silencioso: quem não é admin recebe 403 aqui, e isso não é um erro da
        // tela - é a rota se comportando como deve.
        try { configEmpresa.value = await api.getConfigEmpresa(); }
        catch { configEmpresa.value = null; }
    }

    async function salvarConfigEmpresa(patch) {
        salvando.value = true;
        try {
            configEmpresa.value = await api.salvarConfigEmpresa(patch);
            // A faixa de aviso da aba depende disto: sem recarregar, ela
            // continuaria dizendo que a automação está desligada.
            if (settings.value) {
                settings.value = {
                    ...settings.value,
                    automacaoLigadaNaEmpresa: configEmpresa.value.outlook_ai_auto_enabled === true,
                };
            }
            return configEmpresa.value;
        } finally { salvando.value = false; }
    }

    // ── Histórico ─────────────────────────────────────────────────────────────

    async function carregarHistorico() {
        try { historico.value = await api.getHistorico(); }
        catch (err) { erro.value = err.message; }
    }

    async function desfazer(id) {
        historico.value = await api.desfazer(id);
        carregarPainel();
    }

    // ── Relatório ─────────────────────────────────────────────────────────────

    async function carregarRelatorio() {
        carregandoRelatorio.value = true;
        try { relatorio.value = await api.getRelatorio(); }
        catch (err) { erro.value = err.message; relatorio.value = null; }
        finally { carregandoRelatorio.value = false; }
    }

    return {
        painel, settings, regras, fila, trilho, historico, relatorio, leituras, configEmpresa,
        carregandoPainel, lendo, carregandoTrilho, carregandoRegras, carregandoRelatorio,
        analisando, redigindoId, redigindoEste, salvando, erro, feedback,
        temIA, porHeuristica, pendentes, precisamDeVoce, regrasAutomaticas, automacaoLigadaNaEmpresa,

        carregarPainel, atualizarPainel, adiar, resolver, leituraDe,
        carregarFeedback, comentar, aposentarFeedback,
        carregarTrilho,
        redigir, editarFila, aprovar, descartarDaFila,
        carregarSettings, salvarSettings,
        carregarRegras, alternarRegra, criarRegra, excluirRegra,
        analisarContexto, aceitarContexto, descartarContexto,
        carregarHistorico, desfazer,
        carregarRelatorio,
        carregarConfigEmpresa, salvarConfigEmpresa,
    };
});
