// src/pwa-boot.js
//
// Entry separado do app, carregado direto pelo index.html.
//
// Fica fora do main.js de propósito: é um bloco autocontido (service worker +
// revalidação do push) e assim ele não disputa espaço com o arquivo de boot do
// Vue, que é mexido com frequência. Como carrega em paralelo, o service worker
// também registra mais cedo do que registraria dentro do bundle principal.

import { registerServiceWorker } from '@/utils/Pwa/serviceWorker';
import { syncPushSubscription } from '@/utils/Pwa/push';
import { watchInstallPrompt } from '@/utils/Pwa/install';

// Tem que ser aqui, no boot: o Chrome dispara `beforeinstallprompt` uma vez só,
// antes de qualquer tela montar. Escutando depois, o evento já passou.
watchInstallPrompt();

registerServiceWorker()
    .then(() => syncPushSubscription())
    .catch(err => console.warn('[pwa] boot falhou:', err?.message || err));
