// utils/Microsoft/noteGraphError.js
//
// Ponte entre um erro de qualquer módulo Microsoft e o estado da conexão.
//
// O backend renova o token sozinho a cada chamada, então o único erro de sessão
// que chega aqui é o irrecuperável: o refresh_token morreu (senha trocada,
// acesso condicional, muito tempo sem uso). Nesse caso o backend zera os tokens
// e o status passa a responder needsReconnect — mas alguém precisa perguntar.
//
// Antes ninguém perguntava: microsoftStore.refreshToken() existia sem nenhum
// chamador e a tela ficava presa num toast vermelho, sem caminho de volta.
//
// Uso (não bloqueia o fluxo, não muda o erro que a tela já mostrava):
//   catch (err) { error.value = err.message; noteGraphError(err); }

import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

export function noteGraphError(err) {
    const message = err?.message || String(err || '');
    try {
        // Sem await de propósito: é reação de fundo, o erro na tela não espera.
        useMicrosoftStore().handleAuthError(message);
    } catch {
        // Store fora de contexto (teste, boot) — não é motivo para derrubar a tela.
    }
    return message;
}
