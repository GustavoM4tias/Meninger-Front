// src/utils/Pwa/install.js
//
// Instalação do Office como app.
//
// O Chrome/Edge dispara `beforeinstallprompt` uma única vez, logo no carregamento
// da página — antes de qualquer tela montar. Por isso o evento é capturado no
// boot (src/pwa-boot.js) e guardado aqui; a tela /instalar só consome.
//
// O Safari (Mac e iPhone) não tem esse evento nem API equivalente: lá o caminho
// é instrução visual mesmo, o usuário precisa usar o menu Compartilhar.

import { isStandalone } from './serviceWorker';
import { isPushSupported, pushPermission, subscribeCurrentDevice } from './push';

let deferredPrompt = null;
const listeners = new Set();

function emit() {
    for (const fn of listeners) {
        try { fn(!!deferredPrompt); } catch { /* listener quebrado não derruba os outros */ }
    }
}

/** Chamado uma vez no boot. */
export function watchInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();  // sem isso o Chrome mostra o banner dele por cima
        deferredPrompt = e;
        emit();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        emit();
    });
}

export function canPromptInstall() {
    return !!deferredPrompt;
}

/** Assina mudanças de disponibilidade. Devolve a função de cancelar. */
export function onInstallAvailability(fn) {
    listeners.add(fn);
    fn(!!deferredPrompt);
    return () => listeners.delete(fn);
}

export async function promptInstall() {
    if (!deferredPrompt) return { ok: false, reason: 'sem-prompt' };
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // O evento só pode ser usado uma vez.
    deferredPrompt = null;
    emit();
    return { ok: outcome === 'accepted', outcome };
}

/**
 * Identifica o aparelho para escolher a instrução certa.
 * Retorna { os, browser, label, installed, canPrompt }.
 */
export function detectPlatform() {
    const ua = navigator.userAgent || '';
    const s = ua.toLowerCase();

    const isIOS = /ipad|iphone|ipod/.test(s) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(s);
    const isMac = !isIOS && /macintosh|mac os x/.test(s);
    const isWindows = /windows/.test(s);

    // Ordem importa: Edge e Chrome também trazem "Safari" no UA.
    let browser = 'outro';
    if (/edg\//.test(s)) browser = 'edge';
    else if (/opr\/|opera/.test(s)) browser = 'opera';
    else if (/chrome|crios|chromium/.test(s)) browser = 'chrome';
    else if (/firefox|fxios/.test(s)) browser = 'firefox';
    else if (/safari/.test(s)) browser = 'safari';

    let os = 'outro';
    if (isIOS) os = 'ios';
    else if (isAndroid) os = 'android';
    else if (isMac) os = 'macos';
    else if (isWindows) os = 'windows';

    const labels = {
        ios: 'iPhone / iPad',
        android: 'Android',
        macos: 'Mac',
        windows: 'Windows',
        outro: 'este dispositivo',
    };

    return {
        os,
        browser,
        label: labels[os],
        installed: isStandalone(),
        canPrompt: canPromptInstall(),
    };
}

/**
 * Instalar e ligar as notificações num passo só.
 *
 * A ORDEM AQUI NÃO É ARBITRÁRIA. A permissão de notificação exige gesto do
 * usuário ainda "vivo"; se esperarmos o diálogo de instalação (que só resolve
 * quando a pessoa decide), o gesto já expirou e o navegador recusa o pedido
 * calado. Por isso: permissão primeiro, instalação depois, inscrição por
 * último — a inscrição não precisa de gesto.
 *
 * No iPhone não existe API de instalação (a Apple não expõe), então lá só
 * roda a parte de notificação, e mesmo assim só quando o app já foi adicionado
 * à Tela de Início.
 *
 * Retorna { instalado, pushOk, motivo, podeInstalar }.
 */
export async function instalarEAtivar() {
    const out = { instalado: isStandalone(), pushOk: false, motivo: null, podeInstalar: canPromptInstall() };

    // 1) Permissão (gesto fresco)
    let permissao = pushPermission();
    if (isPushSupported() && permissao === 'default') {
        try { permissao = await Notification.requestPermission(); }
        catch { permissao = pushPermission(); }
    }

    // 2) Instalação
    if (!out.instalado && canPromptInstall()) {
        const r = await promptInstall();
        out.instalado = r.ok;
    }

    // 3) Inscrição do aparelho
    if (permissao === 'granted') {
        const r = await subscribeCurrentDevice();
        out.pushOk = r.ok;
        out.motivo = r.reason || null;
    } else if (!isPushSupported()) {
        out.motivo = 'ios-precisa-instalar';
    } else {
        out.motivo = permissao === 'denied' ? 'permissao-negada' : 'permissao-adiada';
    }

    return out;
}
