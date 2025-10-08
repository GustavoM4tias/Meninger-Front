export const formatDateHour = (s) => {
    if (!s) return '';
    try {
        return new Date(s).toLocaleString('pt-BR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).replace(',', '');
    } catch { return ''; }
};
