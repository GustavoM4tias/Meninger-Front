import './assets/main.css'
import 'vue-toastification/dist/index.css';

import tippy from 'tippy.js'; // Importando o Tippy.js
import 'tippy.js/dist/tippy.css'; // Importando o estilo do Tippy

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification';

const options = {
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

// Configurações opcionais para o Toast
// const options = {
//     position: 'top-right',
//     timeout: 3000,
//     closeOnClick: true,
//     pauseOnHover: true,
//   };

const app = createApp(App)

// Registrando a diretiva globalmente
app.directive('tippy', {
  mounted(el, binding) {
    tippy(el, {
      content: binding.value, // O conteúdo do tooltip será passado através do binding
      allowHTML: true, // Permite interpretar HTML dentro do tooltip
    })
  },
  updated(el, binding) {
    if (el._tippy) {
      el._tippy.setContent(binding.value) // Atualiza o conteúdo do tooltip caso a prop mude
    }
  }
})

// Registrar o Vue Toastification
app.use(Toast, options);

app.use(createPinia())
app.use(router)

app.mount('#app')
