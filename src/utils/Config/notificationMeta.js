// src/utils/Config/notificationMeta.js
//
// Aparência de UMA notificação: rótulo curto, ícone e tom. É a tradução da chave
// técnica do catálogo do back (services/notification/notificationTypes.js) para o
// que o olho lê no sino, na caixa de entrada e no toast.
//
// Existia um mapa de 5 tipos copiado em dois arquivos enquanto o catálogo tinha
// 47: tudo que não fosse evento ou suporte virava "Aviso" com o mesmo ícone
// cinza, então a lista inteira parecia a mesma coisa repetida. Aqui o casamento
// é por PREFIXO ('checklist.', 'academy.', ...), logo tipo novo no back já nasce
// com a cara do seu grupo — e só precisa de linha própria quando merece
// destaque diferente dos irmãos (atraso, aprovação, falha).
//
// Tom = token semântico do design system, nunca cor crua. Ver reference_design_system.

const TONES = {
    accent:  { text: 'text-accent',      soft: 'bg-accent-soft',      ring: 'border-accent/20' },
    pos:     { text: 'text-data-pos',    soft: 'bg-data-pos-soft',    ring: 'border-data-pos/20' },
    warn:    { text: 'text-data-warn',   soft: 'bg-data-warn-soft',   ring: 'border-data-warn/20' },
    neg:     { text: 'text-data-neg',    soft: 'bg-data-neg-soft',    ring: 'border-data-neg/20' },
    neutral: { text: 'text-ink-muted',   soft: 'bg-surface-sunken',   ring: 'border-line' },
};

const FALLBACK = { label: 'Aviso', icon: 'fas fa-circle-info', tone: 'neutral' };

// Casamento EXATO (o tipo pede destaque diferente dos irmãos do grupo).
const BY_TYPE = {
    'event.created':   { label: 'Evento',     icon: 'fas fa-calendar-plus', tone: 'pos' },
    'event.reminder':  { label: 'Lembrete',   icon: 'fas fa-bell',          tone: 'warn' },
    'meeting.starting': { label: 'Reunião',   icon: 'fas fa-video',         tone: 'accent' },

    'support.opened':  { label: 'Suporte',    icon: 'fas fa-life-ring',     tone: 'accent' },
    'support.updated': { label: 'Suporte',    icon: 'fas fa-comments',      tone: 'accent' },

    'alert.shared':    { label: 'Alerta',     icon: 'fas fa-share-nodes',   tone: 'accent' },
    'generic':         { label: 'Aviso',      icon: 'fas fa-circle-info',   tone: 'neutral' },

    'condition.authorization.requested': { label: 'Ficha comercial', icon: 'fas fa-file-signature', tone: 'warn' },
    'sales.closing.divergence':          { label: 'Fechamento',      icon: 'fas fa-scale-unbalanced', tone: 'neg' },
    'contract.adjustment.drift':         { label: 'Contrato',        icon: 'fas fa-file-invoice-dollar', tone: 'warn' },

    'lead.dispatch.failed':          { label: 'Leads',   icon: 'fas fa-triangle-exclamation', tone: 'neg' },
    'lead.webhook.rejected':         { label: 'Leads',   icon: 'fas fa-plug-circle-xmark',    tone: 'neg' },
    'lead.binding.missing':          { label: 'Leads',   icon: 'fas fa-link-slash',           tone: 'warn' },
    'meta.campaigns.token_expiring': { label: 'Meta',    icon: 'fas fa-key',                  tone: 'warn' },

    'checklist.task.due_soon':      { label: 'Prazo',      icon: 'fas fa-hourglass-half',   tone: 'warn' },
    'checklist.task.overdue':       { label: 'Atraso',     icon: 'fas fa-clock',            tone: 'neg' },
    'checklist.task.nudge':         { label: 'Cobrança',   icon: 'fas fa-hand-point-right', tone: 'warn' },
    'checklist.task.completed':     { label: 'Concluída',  icon: 'fas fa-circle-check',     tone: 'pos' },
    'checklist.task.comment':       { label: 'Comentário', icon: 'fas fa-comment-dots',     tone: 'accent' },
    'checklist.approval.requested': { label: 'Autorização', icon: 'fas fa-user-shield',     tone: 'warn' },
    'checklist.approval.decided':   { label: 'Autorização', icon: 'fas fa-gavel',           tone: 'accent' },

    'event_plan.returned':       { label: 'Plano devolvido', icon: 'fas fa-rotate-left', tone: 'warn' },
    'event_plan.chase':          { label: 'Cobrança',        icon: 'fas fa-hand-point-right', tone: 'warn' },
    'event_plan.empty':          { label: 'Plano vazio',     icon: 'fas fa-inbox',       tone: 'warn' },
    'event_plan.closed':         { label: 'Plano fechado',   icon: 'fas fa-lock',        tone: 'neutral' },

    'academy.leveled_up':   { label: 'Nível',     icon: 'fas fa-arrow-trend-up', tone: 'pos' },
    'academy.badge.earned': { label: 'Conquista', icon: 'fas fa-award',          tone: 'pos' },
    'academy.mentioned':    { label: 'Menção',    icon: 'fas fa-at',             tone: 'accent' },

    'report.public.expiring': { label: 'Link vencendo', icon: 'fas fa-hourglass-end', tone: 'warn' },

    'user.signup.pending': { label: 'Cadastro', icon: 'fas fa-user-clock', tone: 'warn' },

    // Legados: saíram do catálogo do back, mas seguem vivos no histórico de quem
    // recebeu (225 avisos no banco em 24/08/2026). Sem estas linhas, tudo isso
    // aparece como "Aviso" cinza — e é justamente o histórico mais antigo, o que
    // a pessoa vê ao rolar até o fim da caixa.
    'todo.daily_digest':   { label: 'Resumo do dia', icon: 'fas fa-list-check',    tone: 'accent' },
    'signature.requested': { label: 'Assinatura',    icon: 'fas fa-file-signature', tone: 'warn' },
};

// Casamento por PREFIXO — o resto do grupo herda daqui. Ordem importa: o
// primeiro que casar vence, então prefixo mais específico vem antes.
const BY_PREFIX = [
    ['checklist.',  { label: 'Checklist',  icon: 'fas fa-list-check',    tone: 'accent' }],
    ['event_plan.', { label: 'Plano de eventos', icon: 'fas fa-calendar-week', tone: 'accent' }],
    ['event.',      { label: 'Evento',     icon: 'fas fa-calendar-day',  tone: 'pos' }],
    ['academy.',    { label: 'Academy',    icon: 'fas fa-graduation-cap', tone: 'accent' }],
    ['bolao.',      { label: 'Bolão',      icon: 'fas fa-futbol',        tone: 'pos' }],
    ['comunicado.', { label: 'Comunicado', icon: 'fas fa-bullhorn',      tone: 'warn' }],
    ['report.',     { label: 'Relatório',  icon: 'fas fa-chart-column',  tone: 'accent' }],
    ['lead.',       { label: 'Leads',      icon: 'fas fa-bullseye',      tone: 'accent' }],
    ['meta.',       { label: 'Meta',       icon: 'fa-brands fa-meta',    tone: 'accent' }],
    ['support.',    { label: 'Suporte',    icon: 'fas fa-life-ring',     tone: 'accent' }],
    ['sales.',      { label: 'Comercial',  icon: 'fas fa-chart-line',    tone: 'accent' }],
    ['contract.',   { label: 'Contrato',   icon: 'fas fa-file-contract', tone: 'accent' }],
    ['condition.',  { label: 'Ficha comercial', icon: 'fas fa-file-signature', tone: 'accent' }],
    ['meeting.',    { label: 'Reunião',    icon: 'fas fa-video',         tone: 'accent' }],
    ['alert.',      { label: 'Alerta',     icon: 'fas fa-bell',          tone: 'accent' }],
    ['user.',       { label: 'Cadastro',   icon: 'fas fa-user',          tone: 'accent' }],
];

// Alerta do usuário não tem tipo próprio no catálogo: o AlertEngine dispara como
// `generic` e assina no data (`source: 'alert'`). Sem esta exceção, as 251
// notificações de alerta medidas em 24/08/2026 - toda a saída das regras que as
// pessoas criaram - apareciam como "Aviso" cinza, iguais a qualquer recado solto.
const META_ALERTA = { label: 'Alerta', icon: 'fas fa-tower-broadcast', tone: 'accent' };

/**
 * Aparência de um tipo de notificação.
 * @param {string} type chave do catálogo (ex.: 'checklist.task.overdue')
 * @param {object} [data] o `data` do aviso, quando houver (identifica o alerta)
 * @returns {{ label:string, icon:string, tone:string, text:string, soft:string, ring:string }}
 */
export function notificationMeta(type, data = null) {
    if (data?.source === 'alert') {
        return { ...META_ALERTA, ...(TONES[META_ALERTA.tone] || TONES.neutral) };
    }
    const key = String(type || '').toLowerCase();
    let base = BY_TYPE[key];
    if (!base) base = (BY_PREFIX.find(([p]) => key.startsWith(p)) || [])[1];
    if (!base) base = FALLBACK;
    const tone = TONES[base.tone] || TONES.neutral;
    return { ...base, ...tone };
}

/**
 * A notificação leva a algum lugar? Só link interno vira navegação de rota;
 * '#' e vazio contam como SEM destino (o card antigo virava um link para '#',
 * que recarregava a tela e não levava a lugar nenhum).
 */
export function notificationTarget(notification) {
    const raw = String(notification?.link || '').trim();
    if (!raw || raw === '#') return { has: false, to: null, external: false };
    if (/^https?:\/\//i.test(raw)) return { has: true, to: raw, external: true };
    return { has: true, to: raw.startsWith('/') ? raw : `/${raw}`, external: false };
}

/** Data curta e por extenso, no formato que a caixa de entrada usa. */
export function formatNotificationDate(value) {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    const hoje = new Date();
    const mesmoDia = dt.toDateString() === hoje.toDateString();
    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (mesmoDia) return `Hoje • ${hora}`;
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    if (dt.toDateString() === ontem.toDateString()) return `Ontem • ${hora}`;
    return `${dt.toLocaleDateString('pt-BR')} • ${hora}`;
}
