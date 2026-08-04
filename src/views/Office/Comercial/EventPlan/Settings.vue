<script setup>
// Configuração do Plano de Eventos (admin).
//
// Sem esta tela o módulo não anda: as etapas nascem sem perfil, e perfil vazio
// significa que ninguém decide. É aqui que se define quem valida no Comercial e
// quem aceita no Marketing.
//
// Lembrando a regra de alçada: o perfil habilita DECIDIR, mas o alcance vem do
// grant de empreendimento de cada pessoa (tela de Alçadas). Estar no perfil não
// dá acesso a empreendimento nenhum por si só.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import api from '@/utils/EventPlan/api.js';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SettingsCard from '@/components/UI/SettingsCard.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Badge from '@/components/UI/Badge.vue';

const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const settings = ref(null);
const profiles = ref([]);
const users = ref([]);
const newProfileName = ref('');

const userOptions = computed(() => users.value.map(u => u.username));
const idsToNames = (ids) => (ids || []).map(id => users.value.find(u => u.id === id)?.username).filter(Boolean);
const namesToIds = (names) => (names || []).map(n => users.value.find(u => u.username === n)?.id).filter(Boolean);

const profileOptions = computed(() =>
    profiles.value.filter(p => p.is_active).map(p => ({ value: String(p.id), label: p.name }))
);

function stageProfileNames(stage) {
    return (stage.profile_ids || [])
        .map(id => profiles.value.find(p => Number(p.id) === Number(id))?.name)
        .filter(Boolean);
}

function setStageProfiles(stage, names) {
    stage.profile_ids = (names || [])
        .map(n => profiles.value.find(p => p.name === n)?.id)
        .filter(Boolean);
}

async function load() {
    loading.value = true;
    try {
        const [config, userList] = await Promise.all([api.settings(), api.users()]);
        settings.value = config.settings;
        profiles.value = config.profiles || [];
        users.value = userList || [];
    } catch (e) {
        toast.error(e?.message || 'Falha ao carregar as configurações.');
    } finally {
        loading.value = false;
    }
}

async function salvar() {
    saving.value = true;
    try {
        await api.saveSettings({
            stages: settings.value.stages,
            open_days_before_month_end: Number(settings.value.open_days_before_month_end),
            priority_window_days: Number(settings.value.priority_window_days),
            item_categories: settings.value.item_categories,
            auto_submit_enabled: settings.value.auto_submit_enabled,
            chase_enabled: settings.value.chase_enabled,
            run_hour: Number(settings.value.run_hour),
        });
        toast.success('Configurações salvas.');
    } catch (e) {
        toast.error(e?.message || 'Falha ao salvar.');
    } finally {
        saving.value = false;
    }
}

async function salvarPerfil(profile) {
    saving.value = true;
    try {
        await api.saveAuthProfile({
            id: profile.id,
            name: profile.name,
            description: profile.description,
            user_ids: profile.user_ids,
            is_active: profile.is_active,
        });
        toast.success('Perfil salvo.');
        await load();
    } catch (e) {
        toast.error(e?.message || 'Falha ao salvar o perfil.');
    } finally {
        saving.value = false;
    }
}

async function criarPerfil() {
    if (!newProfileName.value.trim()) return;
    saving.value = true;
    try {
        await api.saveAuthProfile({ name: newProfileName.value.trim(), user_ids: [] });
        newProfileName.value = '';
        await load();
        toast.success('Perfil criado. Agora escolha os membros.');
    } catch (e) {
        toast.error(e?.message || 'Falha ao criar o perfil.');
    } finally {
        saving.value = false;
    }
}

async function desativarPerfil(profile) {
    if (!confirm(`Desativar o perfil "${profile.name}"? As decisões já registradas continuam no histórico.`)) return;
    try {
        await api.removeAuthProfile(profile.id);
        await load();
        toast.success('Perfil desativado.');
    } catch (e) {
        toast.error(e?.message || 'Falha ao desativar.');
    }
}

onMounted(load);
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Plano de Eventos — Configurações"
            subtitle="Etapas de aprovação, perfis de alçada, ciclo mensal e categorias de item"
            icon="fas fa-sliders"
        >
            <template #actions>
                <Button variant="primary" icon="fas fa-save" :loading="saving" @click="salvar">Salvar</Button>
            </template>
        </PageHeader>

        <div v-if="loading" class="flex justify-center py-16"><Spinner /></div>

        <div v-else-if="settings" class="space-y-4">
            <!-- Perfis -->
            <SettingsCard
                default-open
                title="Perfis de alçada"
                description="Quem pode decidir. O perfil habilita a decisão; o alcance por empreendimento continua vindo do grant de cada pessoa na tela de Alçadas."
            >
                <div class="space-y-3">
                    <Surface v-for="profile in profiles" :key="profile.id" variant="flat">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <strong class="text-ink">{{ profile.name }}</strong>
                                <Badge v-if="!profile.is_active" variant="neutral" size="sm">Inativo</Badge>
                                <span class="text-xs text-ink-subtle">{{ (profile.user_ids || []).length }} membro(s)</span>
                            </div>
                            <div class="flex gap-2">
                                <Button size="sm" variant="ghost" :loading="saving" @click="salvarPerfil(profile)">Salvar</Button>
                                <Button v-if="profile.is_active" size="sm" variant="ghost" @click="desativarPerfil(profile)">
                                    Desativar
                                </Button>
                            </div>
                        </div>
                        <div class="mt-2">
                            <!-- overlay: o SettingsCard tem overflow-hidden (por
                                 causa da animação de recolher), então sem
                                 teleporte o painel do seletor fica cortado. -->
                            <MultiSelector
                                :options="userOptions"
                                :model-value="idsToNames(profile.user_ids)"
                                placeholder="Escolha os membros..."
                                overlay
                                @change="(names) => (profile.user_ids = namesToIds(names))"
                            />
                        </div>
                    </Surface>

                    <div class="flex gap-2">
                        <Input v-model="newProfileName" placeholder="Nome do novo perfil (ex.: Validação Comercial)" />
                        <Button variant="secondary" icon="fas fa-plus" :loading="saving" @click="criarPerfil">Criar</Button>
                    </div>
                </div>
            </SettingsCard>

            <!-- Etapas -->
            <SettingsCard
                default-open
                title="Etapas de aprovação"
                description="A ordem em que o plano caminha. Deixar uma etapa sem perfil trava o fluxo: ninguém consegue decidir nela."
            >
                <div class="space-y-3">
                    <Surface v-for="stage in settings.stages" :key="stage.key" variant="flat">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <strong class="text-ink">{{ stage.order }}. {{ stage.name }}</strong>
                                <span class="ml-2 text-xs text-ink-subtle">{{ stage.key }}</span>
                            </div>
                            <Badge v-if="!(stage.profile_ids || []).length" variant="danger" size="sm">
                                Sem perfil — etapa travada
                            </Badge>
                        </div>
                        <div class="mt-2">
                            <MultiSelector
                                :options="profileOptions.map(o => o.label)"
                                :model-value="stageProfileNames(stage)"
                                placeholder="Perfis que decidem nesta etapa..."
                                overlay
                                @change="(names) => setStageProfiles(stage, names)"
                            />
                        </div>
                    </Surface>
                </div>
            </SettingsCard>

            <!-- Ciclo -->
            <SettingsCard
                default-open
                title="Ciclo mensal"
                description="A janela do plano é a última semana do mês anterior ao mês de referência. O plano de setembro abre por volta de 25/08 e fecha em 31/08."
            >
                <div class="mb-4 rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink-muted">
                    <strong class="text-ink">Como funciona:</strong> na última semana do mês o plano do mês seguinte é
                    aberto e o gestor recebe um e-mail. Ele pode enviar a qualquer momento dentro da janela. No último
                    dia do mês a janela fecha e, se o plano não tiver sido enviado, ele vai sozinho para a validação do
                    Comercial do jeito que estiver.
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <Input
                        v-model="settings.open_days_before_month_end"
                        type="number"
                        label="Tamanho da janela (dias antes do fim do mês)"
                        hint="7 = última semana"
                    />
                    <Input
                        v-model="settings.priority_window_days"
                        type="number"
                        label="Janela de prioridade (dias)"
                        hint="Evento até este dia do mês sobe ao topo da fila de quem decide"
                    />
                </div>

                <div class="mt-4 space-y-3">
                    <Switch
                        v-model="settings.auto_submit_enabled"
                        label="Enviar automaticamente no fechamento da janela"
                        description="Plano ainda em rascunho no último dia do mês segue sozinho para a validação do Comercial. Desligado, o plano simplesmente fica parado em rascunho."
                    />
                    <Switch
                        v-model="settings.chase_enabled"
                        label="Lembrar o gestor durante a janela"
                        description="Avisos automáticos conforme o fechamento se aproxima."
                    />
                </div>

                <div class="mt-4 grid gap-4 sm:grid-cols-2">
                    <Input v-model="settings.run_hour" type="number" label="Hora do disparo" hint="0 a 23" />
                </div>
            </SettingsCard>
        </div>
    </PageContainer>
</template>
