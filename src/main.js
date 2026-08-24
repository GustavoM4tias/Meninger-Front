// src/main.js
import './assets/main.css'
import 'vue-toastification/dist/index.css';
import '@splidejs/splide/dist/css/splide.min.css'

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import 'flowbite';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

app.use(Toast, {
  position: "top-right",
  // Entrada e saida deslizando pela direita, na curva unica do sistema.
  // As classes vivem em assets/main.css (a lib so aplica enter/leave/move).
  transition: {
    enter: "menin-toast-in",
    leave: "menin-toast-out",
    move: "menin-toast-move",
  },
  // Aviso do sino e aviso de tela dividem a fila; quatro na tela ja e demais.
  maxToasts: 4,
  newestOnTop: true,
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: true,
  hideProgressBar: true,
  closeButton: "button",
  icon: true,
});

app.use(PrimeVue, { theme: { preset: Aura } });

// Tooltip padrão do app. Tema 'menin' (segue os tokens claro/escuro) e — importante —
// NÃO cria tooltip quando o conteúdo está vazio (senão renderiza uma bolha vazia).
// Placement via argumento: v-tippy:right="texto". zIndex acima do Modal (z-[9999]).
// v-tippy aceita duas formas:
//   v-tippy="'texto'"                          → balão simples (o caso comum)
//   v-tippy="{ content, theme, maxWidth }"     → cartão (ex.: tema 'menin-card')
// O objeto existe para o tooltip que carrega um cartão inteiro e precisa de
// mais largura e de um tema sem padding.
const tippyConfig = (binding) => {
  const v = binding.value;
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : { content: v };
};

const tippyOpts = (binding) => {
  // `resto` carrega o que a chamada quiser sobrescrever (maxWidth, interactive,
  // delay...). Na forma string ele vem vazio e o balão sai igual sempre foi.
  const { content, theme = 'menin', ...resto } = tippyConfig(binding);
  return {
    content,
    allowHTML: true,
    theme,
    placement: binding.arg || 'top',
    animation: 'shift-away',
    delay: [150, 0],
    arrow: true,
    zIndex: 100000,
    ...resto,
  };
};

app.directive('tippy', {
  mounted(el, binding) {
    if (tippyConfig(binding).content) tippy(el, tippyOpts(binding));
  },
  updated(el, binding) {
    const { content, theme = 'menin', ...resto } = tippyConfig(binding);
    if (el._tippy) {
      if (!content) { el._tippy.destroy(); return; }
      el._tippy.setContent(content);
      el._tippy.setProps({
        placement: binding.arg || 'top',
        theme,
        ...resto,
      });
    } else if (content) {
      tippy(el, tippyOpts(binding));
    }
  },
  unmounted(el) {
    if (el._tippy) el._tippy.destroy();
  },
});

app.use(router);
 
// Tema: localStorage > preferência do sistema
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
if (isDark) document.documentElement.classList.add('dark');

// ✅ initializeAuth: só aqui, uma vez
import { useAuthStore } from './stores/Settings/Auth/authStore';
import { installAuthInterceptor } from './utils/Auth/installAuthInterceptor';
const authStore = useAuthStore();
// Interceptor global: 401 da nossa API → limpa sessão e manda pro login,
// evitando a tela presa em "Token inválido.".
installAuthInterceptor();
authStore.initializeAuth();

app.mount('#app');