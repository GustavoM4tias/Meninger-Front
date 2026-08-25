// utils/Microsoft/apiOutlookAi.js
//
// A IA da caixa. Vale a mesma regra do apiOutlook: nenhuma chamada daqui manda
// o endereço da caixa. Quem resolve isso é o backend, a partir de quem está
// autenticado. Parâmetro de caixa aqui seria bug de segurança, não conveniência.

import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const B = (body) => ({ method: 'POST', body: JSON.stringify(body ?? {}) });
const P = (body) => ({ method: 'PATCH', body: JSON.stringify(body ?? {}) });
const U = (body) => ({ method: 'PUT', body: JSON.stringify(body ?? {}) });
const D = () => ({ method: 'DELETE' });

const R = '/microsoft/outlook/ai';

// ── Leitura ───────────────────────────────────────────────────────────────────
/** O painel do CACHE. Instantâneo: não fala com o Graph nem com o Gemini. */
export const getTriagem = () => requestWithAuth(`${R}/triagem`);

/** A parte cara: lê o que chegou e classifica. Chamada DEPOIS de a tela pintar. */
export const atualizarTriagem = (force) =>
    requestWithAuth(`${R}/triagem/atualizar${force ? '?force=1' : ''}`, B());
export const getLeitura   = (id)    => requestWithAuth(`${R}/leitura/${id}`);
export const getTrilho    = ()      => requestWithAuth(`${R}/trilho`);
export const getFila      = ()      => requestWithAuth(`${R}/fila`);
export const getHistorico = ()      => requestWithAuth(`${R}/historico`);
export const getRelatorio = ()      => requestWithAuth(`${R}/relatorio`);
export const getSettings  = ()      => requestWithAuth(`${R}/settings`);
export const getRegras    = ()      => requestWithAuth(`${R}/regras`);

// ── Triagem ───────────────────────────────────────────────────────────────────
/** Tira da lista "precisa de você" sem tocar na caixa de e-mail. */
export const adiar = (id) => requestWithAuth(`${R}/leitura/${id}/adiar`, B());

/** Tira da lista DIZENDO por quê. Não toca na caixa: é arrumação da lista. */
export const resolver = (id, motivo, nota) =>
    requestWithAuth(`${R}/leitura/${id}/resolver`, B({ motivo, nota }));

// ── Aprendizado ───────────────────────────────────────────────────────────────
// O que a pessoa achou do que a IA escreveu. Entra no prompt das próximas.
export const getFeedback = () => requestWithAuth(`${R}/feedback`);
export const comentar = (data) => requestWithAuth(`${R}/feedback`, B(data));
export const aposentarFeedback = (id, aplicado) =>
    requestWithAuth(`${R}/feedback/${id}`, P({ aplicado }));

// ── Configuração e regras ─────────────────────────────────────────────────────
export const salvarSettings = (data)      => requestWithAuth(`${R}/settings`, U(data));
export const criarRegra     = (texto)     => requestWithAuth(`${R}/regras`, B({ texto }));
export const atualizarRegra = (id, data)  => requestWithAuth(`${R}/regras/${id}`, P(data));
export const excluirRegra   = (id)        => requestWithAuth(`${R}/regras/${id}`, D());

// ── Contexto ──────────────────────────────────────────────────────────────────
export const analisarContexto  = () => requestWithAuth(`${R}/contexto/analisar`, B());
export const aceitarContexto   = () => requestWithAuth(`${R}/contexto/aceitar`, B());
export const descartarContexto = () => requestWithAuth(`${R}/contexto/descartar`, B());

// ── Fila de aprovação ─────────────────────────────────────────────────────────
/** Escreve a resposta para uma mensagem e devolve o item da fila. Não envia. */
export const redigir       = (id, data) => requestWithAuth(`${R}/redigir/${id}`, B(data));
export const editarFila    = (id, data) => requestWithAuth(`${R}/fila/${id}`, P(data));
/** Aprovar É enviar. Não tem desfazer depois disto. */
export const aprovarFila   = (id) => requestWithAuth(`${R}/fila/${id}/aprovar`, B());
export const descartarFila = (id) => requestWithAuth(`${R}/fila/${id}/descartar`, B());

// ── Interruptores da empresa (admin) ─────────────────────────────────────────
// Valem para TODAS as caixas: ligar/desligar a IA, deixar ela agir sozinha e o
// teto de mensagens por passada (que é o teto de custo de IA).
export const getConfigEmpresa    = ()     => requestWithAuth(`${R}/config-empresa`);
export const salvarConfigEmpresa = (data) => requestWithAuth(`${R}/config-empresa`, U(data));

// ── Histórico ─────────────────────────────────────────────────────────────────
export const desfazer = (id) => requestWithAuth(`${R}/historico/${id}/desfazer`, B());
