// stores/Academy/academyTutorStore.js
//
// "Barramento" do tutor Eme. Permite que qualquer tela (ex.: o Painel) abra o
// chat flutuante e já enfileire uma pergunta para envio automático.
// O componente AcademyTutorChat observa este store: usa `isOpen` para abrir/
// fechar e consome `queued` para mandar a pergunta sozinho.
import { defineStore } from 'pinia';

export const useAcademyTutorStore = defineStore('academyTutor', {
    state: () => ({
        isOpen: false,
        // { text, seq } — o seq garante que o watcher do chat dispare mesmo
        // quando a mesma pergunta é enviada duas vezes seguidas.
        queued: null,
        _seq: 0,
    }),

    actions: {
        open() { this.isOpen = true; },
        close() { this.isOpen = false; },
        toggle() { this.isOpen = !this.isOpen; },

        // Abre o chat e enfileira uma pergunta para ser enviada automaticamente.
        ask(message) {
            const text = String(message || '').trim();
            this.isOpen = true;
            if (text) this.queued = { text, seq: ++this._seq };
        },

        // Consumido pelo AcademyTutorChat logo após disparar a pergunta.
        consumeQueued() {
            const q = this.queued;
            this.queued = null;
            return q;
        },
    },
});
