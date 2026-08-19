// src/utils/Pwa/push.js
//
// Push nativo no celular e no desktop, via Web Push (VAPID). Funciona no
// Chrome, Edge, Firefox e no Safari do Mac.
//
// ⚠️ iPhone/iPad: a Apple só libera push quando o site foi adicionado à Tela de
// Início. Aberto no Safari comum, `Notification` nem existe — por isso o
// isPushSupported() checa isStandalone() no iOS.
//
// O consentimento é a própria permissão do navegador; não há opt-in separado.
// Sem permissão o backend simplesmente não tem inscrição pra esse aparelho.

import API_URL from '@/config/apiUrl';
import { getRegistration, isStandalone } from './serviceWorker';

const LS_KEY = 'push_endpoint';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
    };
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** O aparelho consegue receber push agora? */
export function isPushSupported() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return false;
    }
    // No iOS só existe push dentro do app instalado.
    if (isIOS() && !isStandalone()) return false;
    return true;
}

export function pushPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function fetchVapidKey() {
    const res = await fetch(`${API_URL}/push/vapid-key`, { headers: authHeaders() });
    if (!res.ok) throw new Error('não foi possível obter a chave VAPID');
    const { publicKey } = await res.json();
    if (!publicKey) throw new Error('backend sem VAPID_PUBLIC_KEY configurada');
    return publicKey;
}

/**
 * Pede permissão (precisa vir de um clique do usuário) e registra o aparelho.
 * Retorna { ok, reason }.
 */
export async function enablePush() {
    if (!isPushSupported()) {
        return { ok: false, reason: isIOS() ? 'ios-precisa-instalar' : 'nao-suportado' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'permissao-negada' };

    const reg = getRegistration() || await navigator.serviceWorker.ready;
    if (!reg) return { ok: false, reason: 'sem-service-worker' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        const publicKey = await fetchVapidKey();
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }

    const res = await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            subscription: sub.toJSON(),
            userAgent: navigator.userAgent,
            standalone: isStandalone(),
        }),
    });
    if (!res.ok) return { ok: false, reason: 'falha-ao-salvar' };

    localStorage.setItem(LS_KEY, sub.endpoint);
    return { ok: true };
}

/** Remove a inscrição deste aparelho (aqui e no backend). */
export async function disablePush() {
    const reg = getRegistration() || await navigator.serviceWorker.ready.catch(() => null);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    const endpoint = sub?.endpoint || localStorage.getItem(LS_KEY);

    if (endpoint) {
        await fetch(`${API_URL}/push/unsubscribe`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ endpoint }),
        }).catch(() => { });
    }
    if (sub) await sub.unsubscribe().catch(() => { });
    localStorage.removeItem(LS_KEY);
    return { ok: true };
}

/**
 * Chamado no boot, depois do login. Só re-registra quem JÁ deu permissão —
 * nunca abre o pop-up sozinho. Serve pra cobrir troca de aparelho, endpoint
 * rotacionado pelo navegador e inscrição apagada no backend.
 */
export async function syncPushSubscription() {
    try {
        if (!isPushSupported() || pushPermission() !== 'granted') return;
        if (!localStorage.getItem('token')) return;

        const reg = getRegistration() || await navigator.serviceWorker.ready;
        if (!reg) return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            const publicKey = await fetchVapidKey();
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
        }

        await fetch(`${API_URL}/push/subscribe`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                subscription: sub.toJSON(),
                userAgent: navigator.userAgent,
                standalone: isStandalone(),
            }),
        });
        localStorage.setItem(LS_KEY, sub.endpoint);
    } catch (err) {
        console.warn('[push] sync falhou:', err?.message || err);
    }
}
