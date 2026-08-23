<script setup>
/**
 * Administração do Checklist — régua de cobrança, status e perfis de autorização.
 *
 * Tela EXECUTIVA: nada aqui é sobre quem mexe, e sim sobre quem VAI SER COBRADO.
 * Salvar uma regra muda o que chega no in-app, no e-mail e no WhatsApp de outra
 * pessoa. Por isso toda ação destrutiva ou de disparo diz o alcance antes.
 */
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useCobrancaStore } from '@/stores/Checklist/cobrancaStore.js';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import RuleEditor from './components/RuleEditor.vue';
import TemplateEditor from './components/TemplateEditor.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Collapsible from '@/components/UI/Collapsible.vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useCobrancaStore();
const checklist = useChecklistStore();
const router = useRouter();
const toast = useToast();

const tab = ref('cobranca');
const TABS = [
    { value: 'cobranca', label: 'Régua de Cobrança', icon: 'fas fa-bell' },
    { value: 'modelos', label: 'Modelos', icon: 'fas fa-rocket' },
    { value: 'perfis', label: 'Perfis de Autorização', icon: 'fas fa-user-shield' },
];

onMounted(() => store.load());
async function onTab(v) {
    tab.value = v;
    if (v === 'perfis') await Promise.all([checklist.loadUsers(), checklist.loadAuthProfiles()]);
}

/* ── Diálogos: uma fila só, para não haver dois abertos ─────────────────── */
const dialogo = ref(null);   // { tipo, alvo }
const ocupado = ref(false);
const fecharDialogo = () => { dialogo.value = null; };

/* ── Parâmetros do motor ────────────────────────────────────────────────── */
async function saveSettings() {
    try { await store.saveSettings(); toast.success('Parâmetros salvos.'); }
    catch (e) { toast.error(e.message); }
}

/* ── Regras ─────────────────────────────────────────────────────────────── */
async function addRule() {
    try { await store.addRule(); toast.success('Lembrete adicionado. Ajuste e salve.'); }
    catch (e) { toast.error(e.message); }
}
async function saveRule(r) {
    try { await store.saveRule(r); toast.success('Lembrete salvo.'); }
    catch (e) { toast.error(e.message); }
}
async function confirmarExcluirRegra() {
    ocupado.value = true;
    try { await store.deleteRule(dialogo.value.alvo.id); toast.success('Lembrete excluído.'); fecharDialogo(); }
    catch (e) { toast.error(e.message); }
    finally { ocupado.value = false; }
}

/* ── Disparo ────────────────────────────────────────────────────────────────
   "Disparar agora" manda notificação de verdade, em até três canais, para
   gente que não está olhando esta tela. Antes era um `confirm()` do navegador
   perguntando "tem certeza?" sem dizer QUANTOS. Agora a tela simula primeiro e
   a confirmação mostra o alcance real. */
const simulando = ref(false);

async function simulate() {
    simulando.value = true;
    try {
        const res = await store.runNow(true);
        toast.info(`Simulação: ${res.fired} lembrete(s) seriam enviados.`);
    } catch (e) { toast.error(e.message); }
    finally { simulando.value = false; }
}

async function pedirDisparo() {
    simulando.value = true;
    try {
        const res = await store.runNow(true);        // simula ANTES de perguntar
        dialogo.value = { tipo: 'disparar', alvo: res };
    } catch (e) {
        toast.error(e.message);
    } finally { simulando.value = false; }
}

/** Quantas pessoas distintas recebem, somando todos os lembretes da simulação. */
const alcance = computed(() => {
    const r = dialogo.value?.tipo === 'disparar' ? dialogo.value.alvo : null;
    if (!r) return { lembretes: 0, pessoas: 0 };
    const pessoas = new Set();
    for (const s of r.sent || []) {
        for (const u of s.recipients?.users || []) pessoas.add(u?.id ?? u?.user_id ?? u);
    }
    return { lembretes: r.fired || 0, pessoas: pessoas.size };
});

const canaisAtivos = computed(() => {
    const set = new Set();
    for (const r of store.rules || []) for (const c of r.channels || []) set.add(c);
    const nome = { inapp: 'in-app', email: 'e-mail', whatsapp: 'WhatsApp' };
    return [...set].map(c => nome[c] || c);
});

async function confirmarDisparo() {
    ocupado.value = true;
    try {
        const res = await store.runNow(false);
        toast.success(`Disparados ${res.fired} lembrete(s).`);
        fecharDialogo();
    } catch (e) { toast.error(e.message); }
    finally { ocupado.value = false; }
}

/* ── Status ─────────────────────────────────────────────────────────────── */
const STATE_CLASSES = [
    { value: 'TODO', label: 'A fazer' },
    { value: 'IN_PROGRESS', label: 'Em andamento' },
    { value: 'BLOCKED', label: 'Bloqueada' },
    { value: 'DONE', label: 'Concluída' },
    { value: 'CANCELLED', label: 'Cancelada / N-A' },
];
async function addStatus() {
    try { await store.addStatus(); } catch (e) { toast.error(e.message); }
}
async function saveStatus(s) {
    try { await store.saveStatus(s); toast.success('Status salvo.'); }
    catch (e) { toast.error(e.message); }
}
async function confirmarExcluirStatus() {
    ocupado.value = true;
    try { await store.deleteStatus(dialogo.value.alvo.id); toast.success('Status removido.'); fecharDialogo(); }
    catch (e) { toast.error(e.message); }
    finally { ocupado.value = false; }
}

const lastRun = computed(() => store.lastRun);

/* ── Perfis de autorização ──────────────────────────────────────────────── */
const profiles = computed(() => checklist.authProfiles);
const userOptions = computed(() => (checklist.users || []).map(u => u.username));
const idsToNames = (ids) => (ids || []).map(id => checklist.users.find(u => u.id === id)?.username).filter(Boolean);
const namesToIds = (names) => (names || []).map(n => checklist.users.find(u => u.username === n)?.id).filter(Boolean);
const savingProfile = ref(false);

async function addProfile() {
    savingProfile.value = true;
    try { await checklist.saveAuthProfile({ name: 'Novo perfil', description: '', user_ids: [], is_active: true }); toast.success('Perfil criado. Edite e salve.'); }
    catch (e) { toast.error(e.message); } finally { savingProfile.value = false; }
}
async function saveProfile(p) {
    savingProfile.value = true;
    try {
        await checklist.saveAuthProfile({ id: p.id, name: p.name, description: p.description, user_ids: p.user_ids, is_active: p.is_active });
        toast.success('Perfil salvo.');
    } catch (e) { toast.error(e.message); } finally { savingProfile.value = false; }
}
async function confirmarExcluirPerfil() {
    ocupado.value = true;
    try { await checklist.removeAuthProfile(dialogo.value.alvo.id); toast.success('Perfil excluído.'); fecharDialogo(); }
    catch (e) { toast.error(e.message); }
    finally { ocupado.value = false; }
}
</script>

<template>
    <PageContainer size="lg">
        <PageHeader
            title="Administração do Checklist"
            subtitle="Régua de cobrança, status e perfis de autorização"
            icon="fas fa-gear">
            <template #actions>
                <PageHelp
                    storage-key="checklist-admin"
                    title="Como usar a administração do Checklist"
                    intro="O que se configura aqui não muda a sua tela: muda o que chega no in-app, no e-mail e no WhatsApp de quem tem tarefa. Por isso a tela mostra o alcance antes de disparar ou excluir."
                    :steps="[
                        { title: 'Monte a régua', text: 'Cada lembrete diz QUANDO avisar (antes do prazo, no dia, em atraso), QUEM recebe (responsável e/ou dono) e por quais canais. Cada um tem o próprio botão Salvar.' },
                        { title: 'Simule antes', text: 'Simular percorre a régua com as tarefas de hoje e diz quantos lembretes sairiam, sem enviar nada. É o jeito seguro de conferir uma regra nova.' },
                        { title: 'Dispare quando precisar', text: 'Disparar agora envia de verdade. A tela simula primeiro e mostra quantos lembretes e quantas pessoas serão atingidas antes de você confirmar.' },
                        { title: 'Status e cores', text: 'A classe do status é o que faz o progresso e o atraso funcionarem com nomes livres. Cancelada/N-A fica fora da conta.' },
                    ]"
                    :tips="[
                        'O motor roda sozinho 1x por dia, na hora e no fuso configurados em Configurações do motor.',
                        'WhatsApp só sai com o template aprovado na Meta; in-app e e-mail saem sempre.',
                        'Perfil de autorização: TODOS os membros do perfil exigido precisam aprovar a tarefa.',
                    ]" />
                <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="router.push('/checklists')">
                    <span class="hidden sm:inline">Checklists</span>
                </Button>
            </template>
        </PageHeader>

        <SegmentedControl :model-value="tab" :options="TABS" class="mb-5" @update:model-value="onTab" />

        <!-- ═══ RÉGUA DE COBRANÇA ═══ -->
        <div v-show="tab === 'cobranca'">
            <div v-if="store.loading" class="space-y-4">
                <Skeleton variant="card" class="h-16" />
                <Skeleton variant="card" class="h-44" />
                <Skeleton variant="card" class="h-32" />
            </div>

            <template v-else>
                <Collapsible v-if="store.settings" title="Configurações do motor"
                    icon="fas fa-sliders" hint="avançado" class="mb-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex items-center justify-between gap-3 sm:col-span-2">
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-ink">Cobrança ativa</p>
                                <p class="text-xs text-ink-muted mt-0.5">Desligado, nenhum lembrete automático sai — nem os já configurados.</p>
                            </div>
                            <Switch v-model="store.settings.cobranca_enabled" />
                        </div>
                        <!-- Input cru de propósito: o `Input` do sistema tem um
                             <div> na raiz e não repassa atributos, então `min` e
                             `max` cairiam no wrapper e o campo aceitaria 99h. -->
                        <div>
                            <label class="cb-rotulo">Hora do disparo</label>
                            <input v-model.number="store.settings.run_hour" type="number" min="0" max="23"
                                class="cb-campo font-mono tabular-nums" />
                            <p class="text-xs text-ink-muted mt-1.5">0 a 23, no fuso abaixo.</p>
                        </div>
                        <Input v-model="store.settings.timezone" label="Fuso horário" hint="Ex: America/Sao_Paulo" />
                        <label class="flex items-center gap-2.5 text-sm text-ink-muted">
                            <input type="checkbox" v-model="store.settings.include_weekends" class="w-4 h-4 rounded accent-accent" />
                            Inclui fins de semana
                        </label>
                        <label class="flex items-center gap-2.5 text-sm text-ink-muted">
                            <input type="checkbox" v-model="store.settings.respect_user_prefs" class="w-4 h-4 rounded accent-accent" />
                            Respeita preferências de canal do usuário
                        </label>
                    </div>
                    <div class="flex items-center gap-3 mt-4 flex-wrap">
                        <Button icon="fas fa-save" :loading="store.saving" :disabled="store.saving" @click="saveSettings">
                            Salvar parâmetros
                        </Button>
                        <span class="text-xs text-ink-subtle">O motor roda 1x/dia, na hora configurada.</span>
                    </div>
                </Collapsible>

                <!-- Status e cores -->
                <Panel title="Status e cores" icon="fas fa-palette" class="mb-4">
                    <template #actions>
                        <Button size="sm" icon="fas fa-plus" @click="addStatus">Novo status</Button>
                    </template>
                    <div class="space-y-2">
                        <div v-for="s in store.statuses" :key="s.id" class="flex items-center gap-2 flex-wrap">
                            <!-- A cor é escolhida pelo usuário e vira a cor do
                                 status no Quadro e na Tabela: input nativo mesmo. -->
                            <input type="color" :value="s.color || '#94a3b8'" @input="s.color = $event.target.value"
                                class="w-9 h-9 rounded-lg border border-line bg-surface p-0.5 cursor-pointer shrink-0"
                                v-tippy="'Cor deste status no Quadro e na Tabela'" />
                            <div class="flex-1 min-w-[140px]"><Input v-model="s.label" size="sm" /></div>
                            <div class="w-full sm:w-44 shrink-0">
                                <Select v-model="s.state_class" :options="STATE_CLASSES" size="sm" />
                            </div>
                            <label class="flex items-center gap-1.5 text-xs text-ink-muted shrink-0">
                                <input type="checkbox" v-model="s.is_active" class="w-4 h-4 rounded accent-accent" /> ativo
                            </label>
                            <Button size="sm" variant="outline" @click="saveStatus(s)">Salvar</Button>
                            <IconButton icon="fas fa-trash" size="sm" variant="danger" title="Remover status"
                                @click="dialogo = { tipo: 'status', alvo: s }" />
                        </div>
                    </div>
                    <p class="text-micro text-ink-subtle mt-3 leading-relaxed">
                        A <strong>classe</strong> é o que faz progresso e atraso funcionarem com nomes livres —
                        Cancelada/N-A fica fora da conta. A autorização é configurada por tarefa, no botão
                        "Precisa de autorização".
                    </p>
                </Panel>

                <!-- Testar -->
                <Panel title="Testar a régua" icon="fas fa-flask" class="mb-4">
                    <template #actions>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" icon="fas fa-flask"
                                :loading="simulando" :disabled="store.running || simulando" @click="simulate">
                                Simular
                            </Button>
                            <Button variant="secondary" size="sm" icon="fas fa-paper-plane"
                                :loading="simulando" :disabled="store.running || simulando" @click="pedirDisparo">
                                Disparar agora
                            </Button>
                        </div>
                    </template>

                    <p class="text-xs text-ink-muted mb-3">
                        <strong>Simular</strong> percorre a régua com as tarefas de hoje e não envia nada.
                        <strong>Disparar agora</strong> envia de verdade — a tela simula antes e mostra o alcance.
                    </p>

                    <div v-if="lastRun" class="space-y-2">
                        <p class="text-sm text-ink-muted">
                            Avaliadas <strong class="font-mono tabular-nums text-ink">{{ lastRun.evaluated }}</strong> combinações —
                            <strong class="font-mono tabular-nums text-ink">{{ lastRun.fired }}</strong>
                            lembrete(s) {{ lastRun.dryRun ? 'seriam enviados' : 'enviados' }}
                            <span class="text-ink-subtle">({{ lastRun.today }})</span>.
                        </p>
                        <div v-if="lastRun.sent?.length" class="space-y-1 max-h-60 overflow-y-auto pr-1">
                            <div v-for="(s, i) in lastRun.sent" :key="i"
                                class="flex items-center justify-between gap-2 bg-surface-sunken border border-line rounded-lg px-3 py-1.5 text-sm">
                                <span class="text-ink truncate min-w-0">
                                    {{ s.taskTitle }}
                                    <span class="text-ink-subtle">— {{ s.ruleName }}</span>
                                </span>
                                <Badge variant="neutral" size="sm">{{ s.recipients.users.length }} dest.</Badge>
                            </div>
                        </div>
                        <p v-else class="text-sm text-ink-subtle">Nenhum lembrete para hoje com a régua atual.</p>
                    </div>
                    <p v-else class="text-sm text-ink-subtle">Ainda não simulado nesta sessão.</p>
                </Panel>

                <!-- Lembretes -->
                <div class="flex items-center justify-between gap-3 mb-1 flex-wrap">
                    <h2 class="font-semibold text-ink">
                        Lembretes automáticos
                        <span class="font-mono tabular-nums text-ink-muted">({{ store.rules.length }})</span>
                    </h2>
                    <Button size="sm" icon="fas fa-plus" @click="addRule">Novo lembrete</Button>
                </div>
                <p class="text-xs text-ink-muted mb-3">
                    Para cada lembrete escolha <strong>quando</strong> avisar (antes / no dia / atraso),
                    <strong>quem</strong> recebe (responsável e/ou dono) e os <strong>canais</strong>.
                    Cada um tem o próprio Salvar.
                </p>

                <EmptyState v-if="!store.rules.length" icon="fas fa-bell-slash"
                    title="Nenhum lembrete configurado"
                    description="Sem régua, ninguém é cobrado automaticamente — as tarefas vencem em silêncio.">
                    <template #actions>
                        <Button icon="fas fa-plus" @click="addRule">Criar o primeiro lembrete</Button>
                    </template>
                </EmptyState>

                <div v-else class="space-y-4">
                    <Panel v-for="r in store.rules" :key="r.id">
                        <RuleEditor :rule="r" @remove="dialogo = { tipo: 'regra', alvo: r }" />
                        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                            <Button size="sm" icon="fas fa-save" :loading="store.saving" :disabled="store.saving"
                                @click="saveRule(r)">Salvar lembrete</Button>
                        </div>
                    </Panel>
                </div>
            </template>
        </div>

        <!-- ═══ MODELOS ═══ -->
        <div v-if="tab === 'modelos'">
            <TemplateEditor />
        </div>

        <!-- ═══ PERFIS DE AUTORIZAÇÃO ═══ -->
        <div v-show="tab === 'perfis'">
            <div class="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <p class="text-sm text-ink-muted flex-1 min-w-[16rem]">
                    Cada perfil agrupa quem precisa aprovar tarefas marcadas com autorização.
                    <strong>Todos os membros</strong> de cada perfil exigido precisam aprovar.
                </p>
                <Button icon="fas fa-plus" :loading="savingProfile" @click="addProfile" class="shrink-0">
                    Novo perfil
                </Button>
            </div>

            <EmptyState v-if="!profiles.length" icon="fas fa-user-shield"
                title="Nenhum perfil ainda"
                description='Crie, por exemplo, "Marketing" e "Comercial" — cada um com quem aprova naquela frente.' />

            <div v-else class="space-y-3">
                <Panel v-for="p in profiles" :key="p.id">
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <input v-model="p.name" placeholder="Nome do perfil"
                            class="font-semibold text-ink bg-transparent border-b border-transparent hover:border-line focus:border-accent outline-none px-1 py-0.5 transition-colors duration-120" />
                        <label class="flex items-center gap-1.5 text-xs text-ink-muted ml-auto">
                            <input type="checkbox" v-model="p.is_active" class="w-4 h-4 rounded accent-accent" /> ativo
                        </label>
                        <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="savingProfile"
                            @click="saveProfile(p)">Salvar</Button>
                        <IconButton icon="fas fa-trash" size="sm" variant="danger" title="Excluir perfil"
                            @click="dialogo = { tipo: 'perfil', alvo: p }" />
                    </div>
                    <label class="block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5">
                        Membros que aprovam
                    </label>
                    <MultiSelector :options="userOptions" :model-value="idsToNames(p.user_ids)"
                        placeholder="Selecionar usuários..."
                        @change="(names) => (p.user_ids = namesToIds(names))" />
                    <p class="text-micro text-ink-subtle mt-1.5">
                        {{ (p.user_ids || []).length }} membro(s). Lembre de Salvar após alterar.
                    </p>
                </Panel>
            </div>
        </div>
    </PageContainer>

    <!-- ── Disparo real: o alcance vem da simulação, não de um "tem certeza?" ── -->
    <ConfirmDialog :open="dialogo?.tipo === 'disparar'" tone="danger"
        title="Disparar a cobrança agora?"
        :consequence="alcance.lembretes
            ? `${alcance.lembretes} lembrete(s) saem agora para ${alcance.pessoas} pessoa(s)${canaisAtivos.length ? ', em ' + canaisAtivos.join(', ') : ''}.`
            : 'A simulação não encontrou nenhum lembrete para hoje: nada seria enviado.'"
        hint="Envio não tem desfazer. O motor já roda sozinho 1x por dia — use isto só para adiantar."
        :confirm-label="alcance.lembretes ? 'Disparar para ' + alcance.pessoas + ' pessoa(s)' : 'Disparar mesmo assim'"
        :loading="ocupado" @confirm="confirmarDisparo" @cancel="fecharDialogo" />

    <ConfirmDialog :open="dialogo?.tipo === 'regra'" tone="danger"
        :title="`Excluir o lembrete ${dialogo?.alvo?.name}?`"
        consequence="Ninguém mais é avisado por esta regra; as outras continuam valendo."
        hint="As tarefas não mudam — só o aviso deixa de sair."
        confirm-label="Excluir lembrete" :loading="ocupado"
        @confirm="confirmarExcluirRegra" @cancel="fecharDialogo" />

    <ConfirmDialog :open="dialogo?.tipo === 'status'" tone="danger"
        :title="`Remover o status ${dialogo?.alvo?.label}?`"
        consequence="Tarefas que estão neste status ficam sem status válido até você movê-las."
        hint="Para tirar de circulação sem perder o histórico, prefira desmarcar 'ativo' e salvar."
        confirm-label="Remover status" :loading="ocupado"
        @confirm="confirmarExcluirStatus" @cancel="fecharDialogo" />

    <ConfirmDialog :open="dialogo?.tipo === 'perfil'" tone="danger"
        :title="`Excluir o perfil ${dialogo?.alvo?.name}?`"
        :consequence="`As tarefas que exigiam este perfil deixam de exigir autorização e passam a avançar direto${(dialogo?.alvo?.user_ids || []).length ? ' — ' + dialogo.alvo.user_ids.length + ' pessoa(s) param de ser chamadas para aprovar' : ''}.`"
        hint="Os usuários continuam no sistema; só o agrupamento é apagado."
        confirm-label="Excluir perfil" :loading="ocupado"
        @confirm="confirmarExcluirPerfil" @cancel="fecharDialogo" />
</template>

<style scoped>
.cb-rotulo { @apply block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5; }
.cb-campo {
    @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-sunken border border-line rounded-lg
           placeholder:text-ink-subtle outline-none transition duration-120 ease-out-expo
           focus:border-accent focus:ring-2 focus:ring-accent/15;
}
</style>
