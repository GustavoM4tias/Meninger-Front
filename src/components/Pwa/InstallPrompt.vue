<script setup>
/**
 * Aviso central de instalação do app.
 *
 * Aparece no meio da tela para quem ainda NÃO tem o Office instalado neste
 * aparelho, com o caminho para instalar. Existe porque ninguém entra numa tela
 * de configuração por conta própria: sem empurrão, o app não é adotado.
 *
 * ─── Dois momentos, dois avisos ───────────────────────────────────────────────
 * 1. INSTALAR — quando o app ainda não está neste aparelho.
 * 2. NOTIFICAÇÃO — quando a pessoa já abriu PELO app instalado mas ainda não
 *    autorizou os avisos.
 *
 * A separação existe por causa do iPhone: no Safari comum o push simplesmente
 * NÃO EXISTE, então pedir permissão ali seria pedir algo impossível. Primeiro
 * a pessoa põe o ícone na tela de início; quando ela entra pelo ícone, aí sim
 * o segundo aviso aparece e o pedido funciona.
 *
 * ─── Quando aparece ───────────────────────────────────────────────────────────
 *   • só para usuário autenticado
 *   • uma vez por sessão do navegador — volta na próxima vez que a pessoa
 *     abrir o Office, e é justamente esse o ponto: insistir sem irritar
 *   • nunca mais, se a pessoa marcar "não mostrar novamente"
 *   • nunca quando já não há o que pedir (instalado + notificação autorizada,
 *     ou permissão bloqueada no navegador, onde nada que a gente faça resolve)
 *
 * ─── Por que o "não mostrar" é por APARELHO ───────────────────────────────────
 * Fica em localStorage, não no perfil do usuário. Instalar é uma ação por
 * aparelho: quem instalou no Windows continua precisando instalar no celular,
 * e guardar a dispensa no perfil silenciaria o aviso justamente onde ele ainda
 * faz falta.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

import { isStandalone } from '@/utils/Pwa/serviceWorker';
import { detectPlatform, canPromptInstall, onInstallAvailability, instalarEAtivar } from '@/utils/Pwa/install';
import { isPushSupported, pushPermission, enablePush } from '@/utils/Pwa/push';

// Chaves separadas por modo: dispensar o convite de instalar não pode calar o
// pedido de notificação depois, que é o passo mais importante dos dois.
const CHAVES = {
    instalar:   { nunca: 'menin:pwa-promo:nunca',      sessao: 'menin:pwa-promo:sessao' },
    notificacao:{ nunca: 'menin:pwa-push-promo:nunca', sessao: 'menin:pwa-push-promo:sessao' },
};
const ATRASO_MS = 2500;   // deixa a tela carregar antes de interromper

const router = useRouter();
const toast = useToast();

const open = ref(false);
const modo = ref('instalar');   // 'instalar' | 'notificacao'
const naoMostrarMais = ref(false);
const busy = ref(false);
const podeInstalarAqui = ref(false);
const plataforma = ref(detectPlatform());

let timer = null;
let stopWatching = null;

// No iPhone não existe botão de instalar (a Apple não expõe API), então lá o
// aviso manda para a tela com o passo a passo em vez de prometer um clique.
const ehNotificacao = computed(() => modo.value === 'notificacao');

const rotuloAcao = computed(() => {
    if (ehNotificacao.value) return 'Ativar notificações';
    return podeInstalarAqui.value ? 'Instalar agora' : 'Ver como instalar';
});

const titulo = computed(() => (
    ehNotificacao.value ? 'Falta ligar as notificações' : 'O Office agora tem aplicativo'
));

const subtitulo = computed(() => {
    if (ehNotificacao.value) return 'Só falta autorizar para os avisos chegarem neste aparelho.';
    if (plataforma.value.os === 'ios') return 'No iPhone leva 3 toques, pelo menu Compartilhar do Safari.';
    if (plataforma.value.os === 'macos') return 'No Mac é pelo menu Arquivo > Adicionar ao Dock.';
    return 'Leva um clique.';
});

const beneficios = computed(() => (
    ehNotificacao.value
        ? [
            { icone: 'fas fa-bell', texto: 'Aviso na tela quando algo depender de você: aprovação, prazo, divergência.' },
            { icone: 'fas fa-clock', texto: 'Chega na hora, sem precisar estar com o Office aberto.' },
            { icone: 'fas fa-sliders', texto: 'Dá para escolher o que recebe em Notificações, e desligar quando quiser.' },
        ]
        : [
            { icone: 'fas fa-mobile-screen-button', texto: 'Ícone próprio no celular e no computador, sem passar por loja.' },
            { icone: 'fas fa-bell', texto: 'Notificação no aparelho quando algo precisar de você.' },
            { icone: 'fas fa-bolt', texto: 'Abre em janela limpa, sem a barra do navegador, e atualiza sozinho.' },
        ]
));

/** Qual aviso cabe agora, ou null se não há nada a pedir. */
function modoAplicavel() {
    const instalado = isStandalone();

    if (!instalado) return 'instalar';

    // Já entrou pelo app: falta a permissão. 'denied' fica de fora porque o
    // desbloqueio é nos ajustes do navegador, não em nada que a gente mostre.
    if (isPushSupported() && pushPermission() === 'default') return 'notificacao';

    return null;
}

function dispensado(m) {
    return localStorage.getItem(CHAVES[m].nunca) === '1'
        || sessionStorage.getItem(CHAVES[m].sessao) === '1';
}

/** Define o modo e diz se deve abrir. */
function resolver() {
    const m = modoAplicavel();
    if (!m || dispensado(m)) return false;
    modo.value = m;
    return true;
}

function fechar() {
    open.value = false;
    sessionStorage.setItem(CHAVES[modo.value].sessao, '1');
    if (naoMostrarMais.value) localStorage.setItem(CHAVES[modo.value].nunca, '1');
    naoMostrarMais.value = false;
}

async function agir() {
    busy.value = true;
    try {
        if (modo.value === 'notificacao') {
            const r = await enablePush();
            if (r.ok) {
                toast.success('Pronto. Você vai receber os avisos neste aparelho.');
                localStorage.setItem(CHAVES.notificacao.nunca, '1');
            } else if (r.reason === 'permissao-negada') {
                toast.error('Permissão negada. Libere as notificações nos ajustes do navegador.');
                localStorage.setItem(CHAVES.notificacao.nunca, '1');  // não há o que insistir
            } else {
                toast.error('Não consegui ativar as notificações aqui.');
            }
            fechar();
            return;
        }

        const r = await instalarEAtivar();

        if (r.instalado && r.pushOk) {
            toast.success('Tudo pronto: app instalado e notificações ligadas.');
            localStorage.setItem(CHAVES.instalar.nunca, '1');
            localStorage.setItem(CHAVES.notificacao.nunca, '1');
            fechar();
            return;
        }
        if (r.instalado) {
            // Instalou mas falta autorizar: o aviso de notificação assume na
            // próxima abertura, que é quando o pedido de fato funciona.
            toast.info('App instalado. Abra pelo ícone para ligar as notificações.');
            localStorage.setItem(CHAVES.instalar.nunca, '1');
            fechar();
            return;
        }

        // Sem API de instalação (iPhone, Mac, Firefox): manda para o passo a passo.
        fechar();
        router.push('/instalar');
    } catch {
        fechar();
        router.push('/instalar');
    } finally {
        busy.value = false;
    }
}

onMounted(() => {
    if (!resolver()) return;
    stopWatching = onInstallAvailability((v) => { podeInstalarAqui.value = v || canPromptInstall(); });
    timer = setTimeout(() => {
        // Confere de novo: o estado pode ter mudado durante o atraso.
        if (resolver()) open.value = true;
    }, ATRASO_MS);
});

onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    stopWatching?.();
});
</script>

<template>
    <!-- close-on-backdrop desligado: clicar fora fecharia sem a pessoa ler, e o
         X (do próprio Modal) fica como a saída explícita. -->
    <Modal :open="open" size="sm" :close-on-backdrop="false" @close="fechar">
        <template #header>
            <div class="flex items-center gap-3">
                <img src="/pwa-192.png" alt="" class="w-10 h-10 rounded-xl shrink-0" />
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-ink">{{ titulo }}</h2>
                    <p class="text-xs text-ink-muted mt-0.5">{{ subtitulo }}</p>
                </div>
            </div>
        </template>

        <div class="px-4 sm:px-5 py-4">
            <ul class="space-y-2.5">
                <li v-for="(b, i) in beneficios" :key="i" class="flex gap-3 text-sm text-ink-muted">
                    <i :class="[b.icone, 'text-accent w-4 text-center mt-0.5']"></i>
                    <span>{{ b.texto }}</span>
                </li>
            </ul>

            <label class="flex items-center gap-2 mt-5 text-xs text-ink-subtle cursor-pointer select-none">
                <input v-model="naoMostrarMais" type="checkbox"
                    class="rounded border-line text-accent focus-ring w-4 h-4 cursor-pointer" />
                <span>Não mostrar novamente neste aparelho</span>
            </label>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-2">
                <Button variant="ghost" :disabled="busy" @click="fechar">Agora não</Button>
                <Button :icon="ehNotificacao ? 'fas fa-bell' : 'fas fa-download'" :loading="busy" @click="agir">
                    {{ rotuloAcao }}
                </Button>
            </div>
        </template>
    </Modal>
</template>
