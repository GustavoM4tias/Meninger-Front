<script setup>
/**
 * /instalar — instalar o Office como app e ligar as notificações.
 *
 * Existe porque instalar um PWA é diferente em cada aparelho e o Safari não
 * oferece botão nenhum: no iPhone e no Mac só dá para instruir. A tela detecta
 * onde o usuário está e mostra o caminho certo, para a diretoria conseguir
 * instalar sozinha, sem passar pelo suporte.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';

import { detectPlatform, onInstallAvailability, promptInstall } from '@/utils/Pwa/install';
import { isPushSupported, pushPermission, enablePush, disablePush } from '@/utils/Pwa/push';

const toast = useToast();

const platform = ref(detectPlatform());
const canPrompt = ref(false);
const permission = ref('default');
const devices = ref([]);
const busy = ref(false);
const testing = ref(false);
let stopWatching = null;

const pushSupported = computed(() => isPushSupported());

// No iPhone o push não existe fora do app instalado — é regra da Apple, não
// falta de permissão. A tela precisa dizer isso, senão o usuário fica tentando
// ativar num botão que nunca vai funcionar ali.
const iosPrecisaInstalar = computed(
    () => platform.value.os === 'ios' && !platform.value.installed
);

const passos = computed(() => {
    const { os, browser } = platform.value;

    if (os === 'ios') {
        return {
            titulo: 'No iPhone ou iPad',
            aviso: browser !== 'safari'
                ? 'Abra este endereço no Safari. O Chrome do iPhone não consegue instalar.'
                : '',
            itens: [
                'Toque no botão Compartilhar, o quadrado com a seta para cima, na barra de baixo.',
                'Role a lista e toque em "Adicionar à Tela de Início".',
                'Confirme em "Adicionar", no canto superior direito.',
                'Abra o Office pelo ícone novo. Só assim as notificações funcionam.',
            ],
        };
    }

    if (os === 'macos') {
        return {
            titulo: 'No Mac',
            aviso: '',
            itens: browser === 'safari'
                ? [
                    'No menu do topo, clique em Arquivo.',
                    'Escolha "Adicionar ao Dock".',
                    'Confirme o nome e clique em Adicionar.',
                ]
                : [
                    'Clique no ícone de instalar na barra de endereço, à direita.',
                    'Se não aparecer, abra o menu do navegador e procure "Instalar".',
                    'Confirme e o Office ganha janela e ícone próprios.',
                ],
        };
    }

    if (os === 'android') {
        return {
            titulo: 'No Android',
            aviso: '',
            itens: [
                'Use o botão "Instalar o app" aqui em cima.',
                'Se ele não aparecer, abra o menu do Chrome, nos três pontinhos.',
                'Toque em "Instalar app" ou "Adicionar à tela inicial".',
            ],
        };
    }

    return {
        titulo: 'No computador',
        aviso: browser === 'firefox'
            ? 'O Firefox no desktop não instala aplicativos web. Use Chrome ou Edge.'
            : '',
        itens: [
            'Use o botão "Instalar o app" aqui em cima.',
            'Ou clique no ícone de instalar na barra de endereço, à direita.',
            'O Office passa a abrir em janela própria, com ícone no menu Iniciar.',
        ],
    };
});

const permissaoTexto = computed(() => ({
    granted: 'Autorizadas neste aparelho',
    denied: 'Bloqueadas no navegador',
    default: 'Ainda não autorizadas',
    unsupported: 'Não suportadas aqui',
}[permission.value] || 'Ainda não autorizadas'));

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
    };
}

async function carregarAparelhos() {
    try {
        const res = await fetch(`${API_URL}/push/devices`, { headers: authHeaders() });
        if (res.ok) devices.value = await res.json();
    } catch { /* lista é acessório: falhar aqui não atrapalha instalar */ }
}

function refresh() {
    platform.value = detectPlatform();
    permission.value = pushPermission();
}

async function instalar() {
    busy.value = true;
    try {
        const r = await promptInstall();
        if (r.ok) toast.success('Office instalado.');
        else if (r.reason === 'sem-prompt') toast.info('Siga o passo a passo abaixo para este aparelho.');
    } finally {
        busy.value = false;
        refresh();
    }
}

async function ativarNotificacoes() {
    busy.value = true;
    try {
        const r = await enablePush();
        if (r.ok) {
            toast.success('Notificações ativadas neste aparelho.');
            await carregarAparelhos();
        } else if (r.reason === 'ios-precisa-instalar') {
            toast.warning('No iPhone, adicione à Tela de Início primeiro.');
        } else if (r.reason === 'permissao-negada') {
            toast.error('Permissão negada. Libere as notificações nos ajustes do navegador.');
        } else {
            toast.error('Não consegui ativar as notificações neste aparelho.');
        }
    } catch (err) {
        toast.error(err?.message || 'Falha ao ativar as notificações.');
    } finally {
        busy.value = false;
        refresh();
    }
}

async function desativarNotificacoes() {
    busy.value = true;
    try {
        await disablePush();
        toast.success('Este aparelho não vai mais receber notificações.');
        await carregarAparelhos();
    } finally {
        busy.value = false;
        refresh();
    }
}

async function enviarTeste() {
    testing.value = true;
    try {
        const res = await fetch(`${API_URL}/push/test`, { method: 'POST', headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.sent > 0) toast.success(`Enviado para ${data.sent} aparelho(s).`);
        else if (res.ok) toast.warning('Nenhum aparelho inscrito ainda.');
        else toast.error(data.message || 'Falha ao enviar o teste.');
    } catch {
        toast.error('Falha ao enviar o teste.');
    } finally {
        testing.value = false;
    }
}

function nomeAparelho(ua) {
    const s = String(ua || '').toLowerCase();
    if (/iphone/.test(s)) return 'iPhone';
    if (/ipad/.test(s)) return 'iPad';
    if (/android/.test(s)) return 'Android';
    if (/macintosh|mac os x/.test(s)) return 'Mac';
    if (/windows/.test(s)) return 'Windows';
    return 'Aparelho';
}

function dataCurta(v) {
    if (!v) return '';
    try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return ''; }
}

onMounted(() => {
    refresh();
    stopWatching = onInstallAvailability((v) => { canPrompt.value = v; });
    carregarAparelhos();
});

onBeforeUnmount(() => { stopWatching?.(); });
</script>

<template>
    <PageContainer size="md">
        <PageHeader icon="fas fa-mobile-screen-button" title="Instalar o app"
            subtitle="Deixe o Office com ícone próprio no celular e no computador, e receba notificações.">
            <template #actions>
                <PageHelp storage-key="instalar" title="Como instalar o Office"
                    intro="O Office pode ser instalado como aplicativo, sem loja e sem baixar nada. Ele passa a ter ícone próprio, abre em janela sem barra de navegação e consegue avisar por notificação."
                    :steps="[
                        { title: 'Instale', text: 'Use o botão desta tela ou siga o passo a passo indicado para o seu aparelho.' },
                        { title: 'Ative as notificações', text: 'Depois de instalar, toque em Ativar notificações e autorize quando o navegador perguntar.' },
                        { title: 'Confirme', text: 'Use Enviar teste. Se o aviso chegar, está tudo certo.' },
                    ]"
                    :tips="[
                        'No iPhone só funciona pelo Safari, e as notificações exigem o app adicionado à Tela de Início.',
                        'Instalar não ocupa espaço nem exige atualização: o app é o próprio site e se atualiza sozinho.',
                    ]" />
            </template>
        </PageHeader>

        <!-- Estado atual do aparelho -->
        <section class="rounded-xl border border-line bg-surface-raised p-5 mb-4">
            <div class="flex items-start gap-4">
                <div class="shrink-0 w-12 h-12 rounded-xl bg-surface-sunken border border-line grid place-items-center">
                    <i class="fas fa-circle-check text-xl"
                        :class="platform.installed ? 'text-emerald-500' : 'text-ink-subtle'"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <h2 class="text-base font-semibold text-ink">
                        {{ platform.installed ? 'Office instalado neste aparelho' : 'Ainda não instalado aqui' }}
                    </h2>
                    <p class="text-sm text-ink-muted mt-0.5">
                        Detectamos: {{ platform.label }}<span v-if="platform.browser !== 'outro'"> ·
                            {{ platform.browser }}</span>
                    </p>

                    <div v-if="!platform.installed && canPrompt" class="mt-3">
                        <Button icon="fas fa-download" :loading="busy" @click="instalar">Instalar o app</Button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Passo a passo do aparelho -->
        <section v-if="!platform.installed" class="rounded-xl border border-line bg-surface-raised p-5 mb-4">
            <h2 class="text-base font-semibold text-ink mb-1">{{ passos.titulo }}</h2>
            <p v-if="passos.aviso" class="text-sm text-amber-600 dark:text-amber-400 mb-3 flex items-start gap-2">
                <i class="fas fa-triangle-exclamation mt-0.5"></i><span>{{ passos.aviso }}</span>
            </p>
            <ol class="space-y-2.5 mt-3">
                <li v-for="(item, i) in passos.itens" :key="i" class="flex gap-3 text-sm text-ink-muted">
                    <span
                        class="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent grid place-items-center text-xs font-semibold">
                        {{ i + 1 }}
                    </span>
                    <span class="pt-0.5">{{ item }}</span>
                </li>
            </ol>
        </section>

        <!-- Notificações -->
        <section class="rounded-xl border border-line bg-surface-raised p-5 mb-4">
            <div class="flex items-start gap-4">
                <div class="shrink-0 w-12 h-12 rounded-xl bg-surface-sunken border border-line grid place-items-center">
                    <i class="fas fa-bell text-xl"
                        :class="permission === 'granted' ? 'text-emerald-500' : 'text-ink-subtle'"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <h2 class="text-base font-semibold text-ink">Notificações</h2>
                    <p class="text-sm text-ink-muted mt-0.5">{{ permissaoTexto }}</p>

                    <p v-if="iosPrecisaInstalar" class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                        No iPhone, a Apple só libera notificação depois que o Office é adicionado à
                        Tela de Início. Instale primeiro, abra pelo ícone e volte aqui.
                    </p>
                    <p v-else-if="permission === 'denied'" class="text-sm text-ink-muted mt-2">
                        O navegador está bloqueando. Libere nas configurações do site e recarregue esta página.
                    </p>

                    <div class="flex flex-wrap gap-2 mt-3">
                        <Button v-if="permission !== 'granted'" icon="fas fa-bell" :loading="busy"
                            :disabled="!pushSupported || permission === 'denied'" @click="ativarNotificacoes">
                            Ativar notificações
                        </Button>
                        <template v-else>
                            <Button variant="secondary" icon="fas fa-paper-plane" :loading="testing"
                                @click="enviarTeste">Enviar teste</Button>
                            <Button variant="ghost" icon="fas fa-bell-slash" :loading="busy"
                                @click="desativarNotificacoes">Desativar aqui</Button>
                        </template>
                    </div>
                </div>
            </div>
        </section>

        <!-- Aparelhos inscritos -->
        <section v-if="devices.length" class="rounded-xl border border-line bg-surface-raised p-5">
            <h2 class="text-base font-semibold text-ink mb-3">Aparelhos recebendo notificações</h2>
            <ul class="divide-y divide-line-subtle">
                <li v-for="d in devices" :key="d.id" class="py-2.5 flex items-center gap-3 text-sm">
                    <i class="fas fa-mobile-screen text-ink-subtle w-4 text-center"></i>
                    <span class="text-ink flex-1 min-w-0 truncate">{{ nomeAparelho(d.user_agent) }}</span>
                    <span class="text-ink-subtle text-xs shrink-0">desde {{ dataCurta(d.created_at) }}</span>
                </li>
            </ul>
        </section>
    </PageContainer>
</template>
