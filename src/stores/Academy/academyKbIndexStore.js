// stores/Academy/academyKbIndexStore.js
//
// Índice de artigos PUBLICADOS usado para o auto-link estilo wiki:
// quando um artigo cita o título OU apelido de outro artigo, o TokenRenderer
// transforma o termo em link automaticamente.
//
// Cacheia em memória por 5 minutos — qualquer alteração que afete o índice
// (criar artigo, mudar apelidos, publicar/despublicar) pode chamar
// `invalidate()` para forçar refresh no próximo `ensureLoaded()`.
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const TTL_MS = 5 * 60 * 1000;

export const useAcademyKbIndexStore = defineStore('academyKbIndex', {
    state: () => ({
        // [{ slug, categorySlug, title, aliases:[] }]
        links: [],
        loaded: false,
        loading: false,
        loadedAt: 0,
        error: null,
    }),

    actions: {
        async ensureLoaded({ force = false } = {}) {
            const fresh = Date.now() - this.loadedAt < TTL_MS;
            if (this.loaded && fresh && !force) return this.links;
            if (this.loading) return this.links;
            return this.fetchIndex();
        },

        async fetchIndex() {
            this.loading = true;
            this.error = null;
            try {
                const data = await requestWithAuth('/academy/kb/link-index');
                this.links = Array.isArray(data?.results) ? data.results : [];
                this.loaded = true;
                this.loadedAt = Date.now();
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar índice de links.';
                this.links = [];
            } finally {
                this.loading = false;
            }
            return this.links;
        },

        // Marca o índice como velho — próxima leitura refaz o fetch.
        invalidate() {
            this.loaded = false;
            this.loadedAt = 0;
        },

        // Resolve um href tipo `/academy/kb/categoria/slug` para a entrada
        // do índice (ou null se não encontrar / for externo).
        findByHref(href) {
            if (!href) return null;
            // aceita a forma canônica (/academy/kb/..) e a do host Academy (/kb/..)
            const m = String(href).match(/^\/(?:academy\/)?kb\/([^/]+)\/([^/?#]+)/);
            if (!m) return null;
            let categorySlug = m[1];
            let slug = m[2];
            try { categorySlug = decodeURIComponent(categorySlug); } catch { /* mantém */ }
            try { slug = decodeURIComponent(slug); } catch { /* mantém */ }
            return this.links.find(
                (a) => a && a.slug === slug && a.categorySlug === categorySlug
            ) || null;
        },
    },
});
