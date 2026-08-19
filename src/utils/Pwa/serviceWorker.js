// src/utils/Pwa/serviceWorker.js
//
// Registro do service worker (/sw.js). Sem ele o Chrome não oferece "Instalar"
// e o push não existe em nenhum navegador.
//
// A navegação é network-first dentro do SW, então uma versão nova entra no
// próximo carregamento sem o usuário precisar fazer nada.

let registration = null;

export function getRegistration() {
    return registration;
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    // Em dev o SW só atrapalha (HMR); ele só entra no build.
    if (import.meta.env.DEV) return null;

    try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Procura versão nova quando o usuário volta pro app.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') registration?.update?.().catch(() => { });
        });

        return registration;
    } catch (err) {
        console.warn('[pwa] falha ao registrar o service worker:', err?.message || err);
        return null;
    }
}

/** Já está rodando como app instalado (Dock do Mac, Tela de Início do iPhone)? */
export function isStandalone() {
    return (
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        window.navigator.standalone === true
    );
}
