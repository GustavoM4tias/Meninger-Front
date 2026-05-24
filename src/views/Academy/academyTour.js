// views/Academy/academyTour.js
//
// Tour de apresentação do Menin Academy, narrado pelo tutor Eme.
// Usa driver.js (passo a passo com destaque + popover). É um tour GUIADO:
// o usuário apenas avança/volta — não é uma lista de itens selecionáveis.
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './academyTour.css';

const TOUR_KEY = 'academy:tour:seen:v1';

// Instância ativa — garante que nunca rodem dois tours ao mesmo tempo.
let currentTour = null;

export function hasSeenAcademyTour() {
    try {
        return localStorage.getItem(TOUR_KEY) === '1';
    } catch {
        return false;
    }
}

export function markAcademyTourSeen() {
    try {
        localStorage.setItem(TOUR_KEY, '1');
    } catch {
        /* storage indisponível — segue sem persistir */
    }
}

function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// Monta a "fala" do Eme como um bloquinho com avatar.
function emeSays(html) {
    return '<div class="eme-pop">'
        + '<span class="eme-pop-ava"><i class="fa-solid fa-graduation-cap"></i></span>'
        + `<p class="eme-pop-text">${html}</p>`
        + '</div>';
}

// Só inclui um passo se o elemento existir e estiver visível na tela atual
// (ex.: a barra lateral some no mobile — esses passos são pulados).
function isVisible(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Descarta o que está fora da tela na horizontal — no mobile a barra
    // lateral fica deslocada via translate(-100%) e não deve entrar no tour.
    if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
    return true;
}

function buildSteps({ firstName } = {}) {
    const name = esc(firstName || 'pessoa');
    const steps = [];

    steps.push({
        popover: {
            title: `Oi, ${name}! 👋`,
            description: emeSays('Eu sou o <strong>Eme</strong>, o seu tutor aqui no Menin Academy. Em menos de um minuto eu te mostro como tudo funciona.'),
        },
    });

    if (isVisible('#tour-ask')) {
        steps.push({
            element: '#tour-ask',
            popover: {
                title: 'Fale comigo por aqui',
                description: emeSays('É neste campo que você me pergunta qualquer coisa: o que estudar, como anda o seu progresso, onde achar um material...'),
                side: 'bottom',
                align: 'start',
            },
        });
    }

    if (isVisible('#tour-pillars')) {
        steps.push({
            element: '#tour-pillars',
            popover: {
                title: 'Os 4 pilares do Academy',
                description: emeSays('Trilhas, Base de Conhecimento, Comunidade e Conquistas — é só clicar em um deles para navegar.'),
                side: 'bottom',
                align: 'center',
            },
        });
    }

    if (isVisible('[data-tour="nav-tracks"]')) {
        steps.push({
            element: '[data-tour="nav-tracks"]',
            popover: {
                title: 'Trilhas',
                description: emeSays('Trilhas são cursos em sequência. Conclua os itens e, no final, você ganha um <strong>certificado</strong>.'),
                side: 'right',
                align: 'start',
            },
        });
    }

    if (isVisible('[data-tour="nav-kb"]')) {
        steps.push({
            element: '[data-tour="nav-kb"]',
            popover: {
                title: 'Base de Conhecimento',
                description: emeSays('Aqui ficam artigos, procedimentos e materiais de estudo. Na dúvida, comece sempre por aqui.'),
                side: 'right',
                align: 'start',
            },
        });
    }

    if (isVisible('[data-tour="nav-community"]')) {
        steps.push({
            element: '[data-tour="nav-community"]',
            popover: {
                title: 'Comunidade',
                description: emeSays('Um espaço para tirar dúvidas e trocar conhecimento com a comunidade. Ninguém aprende sozinho.'),
                side: 'right',
                align: 'start',
            },
        });
    }

    if (isVisible('#tour-continue')) {
        steps.push({
            element: '#tour-continue',
            popover: {
                title: 'Continue de onde parou',
                description: emeSays('As suas trilhas em andamento aparecem aqui — clique para voltar a estudar a qualquer momento.'),
                side: 'top',
                align: 'start',
            },
        });
    }

    steps.push({
        popover: {
            title: 'Tudo pronto! 🎓',
            description: emeSays(`Sempre que precisar, é só me chamar — estou por aqui o tempo todo. Bons estudos, ${name}!`),
        },
    });

    return steps;
}

/**
 * Inicia o tour. opts: { firstName, onFinish }.
 */
export function startAcademyTour(opts = {}) {
    if (currentTour) {
        try { currentTour.destroy(); } catch { /* ignora */ }
        currentTour = null;
    }

    const driverObj = driver({
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Próximo',
        prevBtnText: 'Voltar',
        doneBtnText: 'Concluir',
        overlayColor: 'rgba(15, 23, 42, 0.72)',
        smoothScroll: true,
        stagePadding: 6,
        stageRadius: 14,
        popoverClass: 'driver-eme',
        steps: buildSteps(opts),
        onDestroyed: () => {
            currentTour = null;
            markAcademyTourSeen();
            if (typeof opts.onFinish === 'function') {
                try { opts.onFinish(); } catch { /* ignora */ }
            }
        },
    });

    currentTour = driverObj;
    driverObj.drive();
    return driverObj;
}
