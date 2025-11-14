// main.js
import './assets/main.css'
import 'vue-toastification/dist/index.css';

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

const app = createApp(App)

// Instalar o Pinia antes de acessar as stores
const pinia = createPinia();
app.use(pinia);

// Registrar o Vue Toastification
const toastOptions = {
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
};
app.use(Toast, toastOptions);
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
});
// Diretiva para Tippy.js
app.directive('tippy', {
  mounted(el, binding) {
    tippy(el, {
      content: binding.value,
      allowHTML: true,
    });
  },
  updated(el, binding) {
    if (el._tippy) {
      el._tippy.setContent(binding.value);
    }
  }
});

app.use(router);

// Agora que o Pinia está instalado, é seguro acessar a store e inicializar a autenticação
import { useAuthStore } from './stores/Settings/Auth/authStore';
const authStore = useAuthStore();
authStore.initializeAuth();
 
app.mount('#app')
