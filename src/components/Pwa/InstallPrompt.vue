<script setup>
/**
 * Aviso central de instalação do app.
 *
 * Aparece no meio da tela para quem ainda NÃO tem o Office instalado neste
 * aparelho, com o caminho para instalar. Existe porque ninguém entra numa tela
 * de configuração por conta própria: sem empurrão, o app não é adotado.
 *
 * ─── Quando aparece ───────────────────────────────────────────────────────────
 *   • só para usuário autenticado
 *   • só quando o app NÃO está instalado NESTE aparelho
 *   • uma vez por sessão do navegador — volta na próxima vez que a pessoa
 *     abrir o Office, e é justamente esse o ponto: insistir sem irritar
 *   • nunca mais, se a pessoa marcar "não mostrar novamente"
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

const NUNCA_MAIS = 'menin:pwa-promo:nunca';
const VISTO_NA_SESSAO = 'menin:pwa-promo:sessao';
const ATRASO_MS = 2500;   // deixa a tela carregar antes de interromper

const router = useRouter();
const toast = useToast();

const open = ref(false);
const naoMostrarMais = ref(false);
const busy = ref(false);
const podeInstalarAqui = ref(false);
const plataforma = ref(detectPlatform());

let timer = null;
let stopWatching = null;

// No iPhone não existe botão de instalar (a Apple não expõe API), então lá o
// aviso manda para a tela com o passo a passo em vez de prometer um clique.
const rotuloAcao = computed(() => (podeInstalarAqui.value ? 'Instalar agora' : 'Ver como instalar'));

const passoNoAparelho = computed(() => {
    if (plataforma.value.os === 'ios') return 'No iPhone leva 3 toques, pelo menu Compartilhar do Safari.';
    if (plataforma.value.os === 'macos') return 'No Mac é pelo menu Arquivo > Adicionar ao Dock.';
    return 'Leva um clique.';
});

function podeAparecer() {
    if (isStandalone()) return false;                              // já instalado aqui
    if (localStorage.getItem(NUNCA_MAIS) === '1') return false;    // dispensado de vez
    if (sessionStorage.getItem(VISTO_NA_SESSAO) === '1') return false;  // já apareceu nesta sessão
    return true;
}

function fechar() {
    open.value = false;
    sessionStorage.setItem(VISTO_NA_SESSAO, '1');
    if (naoMostrarMais.value) localStorage.setItem(NUNCA_MAIS, '1');
}

async function instalar() {
    busy.value = true;
    try {
        const r = await instalarEAtivar();

        if (r.instalado && r.pushOk) {
            toast.success('Tudo pronto: app instalado e notificações ligadas.');
            localStorage.setItem(NUNCA_MAIS, '1');  // instalou: não precisa mais do aviso
            fechar();
            return;
        }
        if (r.instalado) {
            toast.info('App instalado. Falta autorizar as notificações.');
            localStorage.setItem(NUNCA_MAIS, '1');
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
    if (!podeAparecer()) return;
    stopWatching = onInstallAvailability((v) => { podeInstalarAqui.value = v || canPromptInstall(); });
    timer = setTimeout(() => {
        // Confere de novo: o app pode ter sido instalado durante o atraso.
        if (podeAparecer()) open.value = true;
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
                    <h2 class="text-base font-semibold text-ink">O Office agora tem aplicativo</h2>
                    <p class="text-xs text-ink-muted mt-0.5">{{ passoNoAparelho }}</p>
                </div>
            </div>
        </template>

        <div class="px-4 sm:px-5 py-4">
            <ul class="space-y-2.5">
                <li class="flex gap-3 text-sm text-ink-muted">
                    <i class="fas fa-mobile-screen-button text-accent w-4 text-center mt-0.5"></i>
                    <span>Ícone próprio no celular e no computador, sem passar por loja.</span>
                </li>
                <li class="flex gap-3 text-sm text-ink-muted">
                    <i class="fas fa-bell text-accent w-4 text-center mt-0.5"></i>
                    <span>Notificação no aparelho quando algo precisar de você.</span>
                </li>
                <li class="flex gap-3 text-sm text-ink-muted">
                    <i class="fas fa-bolt text-accent w-4 text-center mt-0.5"></i>
                    <span>Abre em janela limpa, sem a barra do navegador, e atualiza sozinho.</span>
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
                <Button icon="fas fa-download" :loading="busy" @click="instalar">{{ rotuloAcao }}</Button>
            </div>
        </template>
    </Modal>
</template>
