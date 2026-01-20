import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyTrackAssignmentsAdminStore = defineStore('academyTrackAssignmentsAdmin', {
    state: () => ({
        bySlug: {},
        error: null,
    }),

    actions: {
        async fetch(slug) {
            this.error = null;
            const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/assignments`);
            this.bySlug[slug] = Array.isArray(data?.results) ? data.results : [];
            return this.bySlug[slug];
        },

        async add(slug, payload) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/assignments`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            return this.fetch(slug);
        },

        async bulkAdd(slug, payload) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/assignments/bulk`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            return this.fetch(slug);
        },

        async remove(slug, id) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/assignments/${id}`, {
                method: 'DELETE',
            });
            return this.fetch(slug);
        },
    },
});
