// src/utils/Auth/installAuthInterceptor.js
//
// Interceptor global de sessão. Envolve o window.fetch UMA vez, cobrindo todos
// os pontos que fazem fetch (diretos ou via wrappers) sem alterar cada arquivo.
//
// Comportamento em 401 da NOSSA API (com token salvo, fora de endpoints de auth):
//   • code TOKEN_EXPIRED  → tenta refresh (single-flight) e REFAZ a requisição
//                            original de forma transparente. O 401 do middleware
//                            ocorre ANTES do controller, então refazer é seguro
//                            (a ação nunca chegou a executar).
//   • TOKEN_INVALID / USER_INACTIVE / refresh falhou → desloga e vai pro login.
//
// A resposta original é devolvida intacta quando não há o que fazer.

import API_URL from '@/config/apiUrl';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

// Endpoints onde 401 é normal/esperado — não dispara refresh nem logout.
const AUTH_EXEMPT = /\/auth\/(login|face\/identify|forgot-password|refresh|logout)|\/microsoft\/auth\/exchange/;

let refreshPromise = null;
let loggingOut = false;

function isOurApi(url) {
  return url.startsWith(API_URL) || url.startsWith('/api/');
}

async function refreshAccessToken(originalFetch) {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await originalFetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const data = json?.data || json;
    if (!data?.token) return null;
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
    try { useAuthStore().token = data.token; } catch { /* noop */ }
    return data.token;
  } catch {
    return null;
  }
}

function retryWithToken(originalFetch, input, init, token) {
  const baseHeaders = (init && init.headers)
    || (typeof input !== 'string' && input ? input.headers : undefined);
  const headers = new Headers(baseHeaders || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (typeof input === 'string') {
    return originalFetch(input, { ...(init || {}), headers });
  }
  return originalFetch(new Request(input, { headers }));
}

function triggerLogout() {
  if (loggingOut) return;
  loggingOut = true;
  try { useAuthStore().logout(); } catch { /* noop */ }
  setTimeout(() => { loggingOut = false; }, 3000);
}

export function installAuthInterceptor() {
  if (typeof window === 'undefined' || window.__authInterceptorInstalled) return;
  window.__authInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);

    try {
      if (response.status !== 401 || !localStorage.getItem('token')) return response;

      const url = typeof input === 'string' ? input : (input?.url || '');
      if (!isOurApi(url) || AUTH_EXEMPT.test(url)) return response;

      // Lê o motivo do 401 sem consumir a resposta original (usa um clone).
      let code = '';
      try { code = (await response.clone().json())?.code || ''; } catch { /* noop */ }

      if (code === 'TOKEN_EXPIRED') {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(originalFetch).finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          return await retryWithToken(originalFetch, input, init, newToken);
        }
      }

      triggerLogout();
    } catch {
      // O interceptor nunca pode quebrar a resposta original.
    }

    return response;
  };
}
