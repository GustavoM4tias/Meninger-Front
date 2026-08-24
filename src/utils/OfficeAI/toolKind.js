// utils/OfficeAI/toolKind.js
//
// "Consultando a agenda…" e "Cancelando a reunião…" não podem aparecer com a
// mesma palavra. A linha do tempo da Eme dizia "Consultando" para tudo - e
// quando o passo era CANCELAR uma série de reuniões, o verbo errado escondia o
// que estava acontecendo de verdade.
//
// Esta lista é só de rótulo: quem barra escrita indevida é o `requiredPermissions`
// da tool no servidor e a trava de confirmação dela. Aqui é vocabulário.

const ESCRITA = new Set([
    // Microsoft
    'schedule_meeting',
    'update_meeting',
    'cancel_meeting',
    'send_teams_message',
    // Relatórios e alertas
    'create_report',
    'create_alert',
    'delete_alert',
    'share_alert',
    // Checklist
    'update_checklist_task',
    // Preferências
    'manage_notifications',
    // Memória do usuário
    'save_memory',
]);

export function ehEscrita(nome) {
    return ESCRITA.has(String(nome || ''));
}

/** Verbo no gerúndio para a etapa em andamento. */
export function verboDoPasso(nome) {
    return ehEscrita(nome) ? 'Executando' : 'Consultando';
}
