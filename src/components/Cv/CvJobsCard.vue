<script setup>
// Os crons que puxam dado do CV: o que roda e em que horário.
//
// Isto era vinte e duas variáveis de ambiente, duas por cron. Mudar a
// frequência de um sync exigia mexer no Railway e reiniciar o processo, e a
// regra vigente não aparecia em lugar nenhum do sistema - nem para quem opera,
// nem para quem sustenta. Agora está aqui, e salvar reagenda na hora, sem
// reinício.
//
// Salvar NÃO dispara a carga inicial do cron: quem mexe no horário quer mudar
// o horário, não iniciar uma sincronização completa sem querer.

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

const jobs = computed(() => store.cvJobs);

// Tradução do essencial. Não cobre tudo que cron aceita, e não precisa: serve
// para conferir "é isso mesmo que eu quis dizer" antes de salvar.
function emPortugues(expr) {
    const p = String(expr || '').trim().split(/\s+/);
    if (p.length !== 5) return '';
    const [min, hora, , , ] = p;
    const faixa = hora.includes('-') ? ` entre ${hora.replace('-', 'h e ')}h` : '';
    if (min.startsWith('*/')) return `a cada ${min.slice(2)} minutos${faixa || ''}`;
    if (hora === '*') return `no minuto ${min} de cada hora`;
    if (hora.startsWith('*/')) return `no minuto ${min}, a cada ${hora.slice(2)} horas`;
    if (/^\d+$/.test(hora)) return `todo dia às ${hora.padStart(2, '0')}:${min.padStart(2, '0')}`;
    return `minuto ${min}, hora ${hora}`;
}

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
    const expr = rascunho.value[j.key];
    salvando.value = j.key;
    try {
        await store.saveCvJob(j.key, { cron_expression: expr });
        delete rascunho.value[j.key];
        toast.success(`${j.label}: horário atualizado.`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao salvar o horário.');
    } finally {
        salvando.value = null;
    }
}

onMounted(() => {
    store.fetchCvJobs().catch(err => toast.error(err?.message || 'Não foi possível carregar os crons.'));
});
</script>

<template>
    <Panel title="Sincronizações automáticas" icon="fas fa-clock"
        subtitle="O que o Office puxa do CV sozinho, e de quanto em quanto tempo"
        :loading="store.cvJobsLoading && !jobs.length" loading-variant="row">
        <div class="space-y-2.5">
            <div v-for="j in jobs" :key="j.key"
                class="rounded-xl border border-line bg-surface-sunken p-3.5">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-medium text-ink text-sm">
                            {{ j.label }}
                            <Badge v-if="j.active && j.rodando" variant="success" size="sm" class="ml-1.5">no ar</Badge>
                            <Badge v-else-if="j.bloqueado_por_dependencia" variant="warning" size="sm" class="ml-1.5">parado</Badge>
                            <Badge v-else-if="!j.active" variant="neutral" size="sm" class="ml-1.5">desligado</Badge>
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
                </div>
            </div>
        </div>

        <template #footer>
            <p class="text-xs text-ink-muted">
                Salvar reagenda na hora, sem reiniciar o sistema, e não dispara uma sincronização -
                só muda quando a próxima acontece.
            </p>
        </template>
    </Panel>
</template>
