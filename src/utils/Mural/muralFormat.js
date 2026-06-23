// utils/Mural/muralFormat.js
// Helpers compartilhados pelas telas do Mural (usuário, banner, admin).

export const KIND_META = {
    INFORMATIVO: { label: 'Informativo', icon: 'fas fa-circle-info',        badge: 'info' },
    OBRIGATORIO: { label: 'Obrigatório', icon: 'fas fa-triangle-exclamation', badge: 'warning' },
    URGENTE:     { label: 'Urgente',     icon: 'fas fa-bolt',               badge: 'danger' },
};

export function kindMeta(kind) {
    return KIND_META[String(kind || '').toUpperCase()] || KIND_META.INFORMATIVO;
}

export const KIND_OPTIONS = [
    { value: 'INFORMATIVO', label: 'Informativo' },
    { value: 'OBRIGATORIO', label: 'Obrigatório' },
    { value: 'URGENTE', label: 'Urgente' },
];

export function formatDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Para preencher <input type="datetime-local"> a partir de um ISO/Date.
export function toLocalInput(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
