// src/main.js
import './assets/main.css'
import 'vue-toastification/dist/index.css';
import '@splidejs/splide/dist/css/splide.min.css'

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
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

app.directive('tippy', {
  mounted(el, binding) {
    tippy(el, { content: binding.value, allowHTML: true });
  },
  updated(el, binding) {
    if (el._tippy) el._tippy.setContent(binding.value);
  }
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
