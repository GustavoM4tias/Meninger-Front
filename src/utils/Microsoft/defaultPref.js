// utils/Microsoft/defaultPref.js
//
// Preferência de "abrir sempre neste local" das telas Microsoft, guardada no
// localStorage por usuário (mesmo padrão dos favoritos do SharePoint). É uma
// escolha pessoal de navegação — não vale a pena ir ao banco por isso.

function userId() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}')?.id ?? 'anon';
    } catch {
        return 'anon';
    }
}

/** Lê a preferência salva (objeto) ou null. */
export function readDefaultPref(scope) {
    try {
        const raw = localStorage.getItem(`ms_default_${scope}_${userId()}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Grava a preferência; passe null para limpar. */
export function writeDefaultPref(scope, value) {
    const key = `ms_default_${scope}_${userId()}`;
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
}
