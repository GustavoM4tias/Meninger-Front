<script setup>
// Os crons que puxam dado do CV: o que roda, em que horário, e se está dando
// certo.
//
// Isto era vinte e duas variáveis de ambiente, duas por cron. Mudar a
// frequência de um sync exigia mexer no Railway e reiniciar o processo, e a
// regra vigente não aparecia em lugar nenhum do sistema - nem para quem opera,
// nem para quem sustenta.
//
// A coluna de última execução é o que transforma esta tela de "configuração"
// em "diagnóstico": sem ela, um sync que quebrou há dois dias tem exatamente a
// mesma aparência de um saudável.

import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import Panel from '@/components/UI/Panel.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';

const store = useRealEstateStore();
const toast = useToast();

// Rascunho por job: o horário só vai para o servidor quando a pessoa confirma.
const rascunho = ref({});
const salvando = ref(null);
const rodando = ref(null);

const jobs = computed(() => store.cvJobs);

// Tradução do essencial. Não cobre tudo que cron aceita, e não precisa: serve
// para conferir "é isso mesmo que eu quis dizer" antes de salvar.
function emPortugues(expr) {
    const p = String(expr || '').trim().split(/\s+/);
    if (p.length !== 5) return '';
    const [min, hora] = p;
    const faixa = hora.includes('-') ? ` entre ${hora.replace('-', 'h e ')}h` : '';
    if (min.startsWith('*/')) return `a cada ${min.slice(2)} minutos${faixa}`;
    if (hora === '*') return `no minuto ${min} de cada hora`;
    if (hora.startsWith('*/')) return `no minuto ${min}, a cada ${hora.slice(2)} horas`;
    if (/^\d+$/.test(hora)) return `todo dia às ${hora.padStart(2, '0')}:${min.padStart(2, '0')}`;
    return `minuto ${min}, hora ${hora}`;
}

const STATUS = {
    ok:           { label: 'ok', variant: 'success' },
    parcial:      { label: 'parcial', variant: 'warning' },
    error:        { label: 'falhou', variant: 'danger' },
    running:      { label: 'rodando', variant: 'info' },
    interrompido: { label: 'interrompido', variant: 'neutral' },
};

const fmt = (d) => d
    ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'nunca rodou por aqui';

const duracao = (ms) => {
    if (ms == null) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}min`;
};

const editado = (j) => rascunho.value[j.key] !== undefined && rascunho.value[j.key] !== j.cron_expression;

async function alternar(j) {
    salvando.value = j.key;
    try {
        await store.saveCvJob(j.key, { active: !j.active });
        toast.success(`${j.label}: ${!j.active ? 'ligado' : 'desligado'}.`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar.');
    } finally {
        salvando.value = null;
    }
}

async function salvarHorario(j) {
    salvando.value = j.key;
    try {
        await store.saveCvJob(j.key, { cron_expression: rascunho.value[j.key] });
        delete rascunho.value[j.key];
        toast.success(`${j.label}: horário atualizado.`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar o horário.');
    } finally {
        salvando.value = null;
    }
}

async function rodarAgora(j) {
    rodando.value = j.key;
    try {
        const r = await store.runCvJob(j.key);
        toast.success(`${j.label}: concluído em ${duracao(r?.resultado?.duracao_ms)}.`);
    } catch (err) {
        toast.error(err?.message || `${j.label}: a execução falhou. Veja a última execução na linha.`);
        store.fetchCvJobs().catch(() => {});
    } finally {
        rodando.value = null;
    }
}
</script>

<template>
    <Panel title="Sincronizações automáticas" icon="fas fa-clock"
        subtitle="O que o Office puxa do CV sozinho, de quanto em quanto tempo, e como foi a última vez"
        :loading="store.cvJobsLoading && !jobs.length" loading-variant="row">
        <div class="space-y-2.5">
            <div v-for="j in jobs" :key="j.key"
                class="rounded-xl border border-line bg-surface-sunken p-3.5">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-medium text-ink text-sm">
                            {{ j.label }}
                            <Badge v-if="j.executando" variant="info" size="sm" class="ml-1.5">rodando agora</Badge>
                            <Badge v-else-if="j.bloqueado_por_dependencia" variant="warning" size="sm" class="ml-1.5">parado</Badge>
                            <Badge v-else-if="!j.active" variant="neutral" size="sm" class="ml-1.5">desligado</Badge>
                            <Badge v-else-if="j.agendado" variant="success" size="sm" class="ml-1.5">agendado</Badge>
                        </p>
                        <p class="text-xs text-ink-muted mt-0.5">{{ j.descricao }}</p>
                        <p v-if="j.bloqueado_por_dependencia" class="text-xs text-data-warn mt-1">
                            <i class="fas fa-link-slash mr-1"></i>
                            Está ligado, mas não roda enquanto "{{ jobs.find(x => x.key === j.depende_de)?.label }}"
                            estiver desligado - ele é o complemento daquele.
                        </p>
                    </div>
                    <Switch :model-value="j.active" :disabled="salvando === j.key" @update:model-value="alternar(j)" />
                </div>

                <!-- Última execução: a resposta para "isto está funcionando?" -->
                <div class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <Badge v-if="j.last_status" :variant="(STATUS[j.last_status] || {}).variant || 'neutral'" size="sm">
                        {{ (STATUS[j.last_status] || {}).label || j.last_status }}
                    </Badge>
                    <span class="text-ink-muted">
                        <i class="fas fa-clock-rotate-left mr-1 text-ink-subtle"></i>{{ fmt(j.last_run_at) }}
                        <template v-if="j.last_duration_ms != null"> · {{ duracao(j.last_duration_ms) }}</template>
                        <template v-if="j.last_origin"> · {{ j.last_origin }}</template>
                    </span>
                </div>
                <p v-if="j.last_message" class="mt-1 text-xs"
                    :class="j.last_status === 'error' ? 'text-data-neg' : 'text-data-warn'">
                    {{ j.last_message }}
                </p>

                <div class="mt-3 flex flex-wrap items-end gap-2">
                    <div class="flex-1 min-w-[180px]">
                        <Input
                            :model-value="rascunho[j.key] ?? j.cron_expression"
                            label="Horário (cron)"
                            :hint="emPortugues(rascunho[j.key] ?? j.cron_expression) || `Padrão do sistema: ${j.padrao}`"
                            @update:model-value="v => rascunho[j.key] = v"
                        />
                    </div>
                    <Button v-if="editado(j)" variant="primary" size="sm" icon="fas fa-check"
                        :loading="salvando === j.key" @click="salvarHorario(j)">Aplicar</Button>
                    <Button v-if="editado(j)" variant="ghost" size="sm"
                        @click="delete rascunho[j.key]">Cancelar</Button>
                    <Button v-else variant="outline" size="sm" icon="fas fa-play"
                        :loading="rodando === j.key" :disabled="j.executando"
                        v-tippy="'Executa agora, sem esperar o horário. É a mesma execução do agendamento.'"
                        @click="rodarAgora(j)">Rodar agora</Button>
                </div>
            </div>
        </div>

        <template #footer>
            <p class="text-xs text-ink-muted">
                Salvar reagenda na hora, sem reiniciar o sistema, e não dispara sincronização - para isso existe
                o "Rodar agora". Execução interrompida por reinício aparece como "interrompido".
            </p>
        </template>
    </Panel>
</template>
