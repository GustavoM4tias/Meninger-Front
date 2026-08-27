<script setup>
/**
 * Regra de operação da carga do Sienge.
 *
 * Tudo aqui morava em env var ou constante no código. Passou a viver em
 * `sienge_backup_settings` porque horário, teto de tentativas e quem recebe o
 * aviso são decisões da operação, não do deploy.
 */
import { computed, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import Input from '@/components/UI/Input.vue'
import Switch from '@/components/UI/Switch.vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth'

const props = defineProps({
    open: { type: Boolean, default: false },
    settings: { type: Object, default: null },
    saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const toast = useToast()

const form = ref(blank())
const usuarios = ref([])

function blank() {
    return {
        active: true,
        cron_expression: '0 5 * * *',
        retry_max_attempts: 5,
        retry_backoff_minutes: '15, 30, 60, 120',
        retry_until_hour: 20,
        restore_retry_attempts: 2,
        watchdog_enabled: true,
        watchdog_cron: '*/30 * * * *',
        stale_limit_hours: 28,
        restore_jobs: 2,
        restore_timeout_minutes: 90,
        notify_user_ids: [],
        alert_on_failure: true,
        alert_on_stale: true,
    }
}

/* O backoff é uma lista no banco e um texto na tela: "15, 30, 60, 120" se lê
   muito melhor que quatro campos numerados. */
function hydrate(s) {
    if (!s) return blank()
    return {
        ...blank(),
        ...s,
        retry_backoff_minutes: (s.retry_backoff_minutes || []).join(', '),
        notify_user_ids: [...(s.notify_user_ids || [])],
    }
}

watch(() => props.open, async (aberto) => {
    if (!aberto) return
    form.value = hydrate(props.settings)
    if (!usuarios.value.length) await carregarUsuarios()
}, { immediate: true })

watch(() => props.settings, (s) => { if (props.open) form.value = hydrate(s) })

async function carregarUsuarios() {
    try {
        const data = await requestWithAuth('/users')
        usuarios.value = Array.isArray(data) ? data : (data?.users || data?.data || [])
    } catch { usuarios.value = [] }
}

const nomeUsuario = (id) => {
    const u = usuarios.value.find(x => Number(x.id) === Number(id))
    return u?.username || u?.email || `#${id}`
}
const usuariosDisponiveis = computed(
    () => usuarios.value.filter(u => !form.value.notify_user_ids?.includes(u.id))
)

function addUsuario(ev) {
    const id = Number(ev.target.value)
    if (id && !form.value.notify_user_ids.includes(id)) {
        form.value.notify_user_ids = [...form.value.notify_user_ids, id]
    }
    ev.target.value = ''
}

function parseBackoff(text) {
    return String(text || '')
        .split(',')
        .map(n => Number(String(n).trim()))
        .filter(n => Number.isFinite(n) && n > 0)
}

function salvar() {
    const backoff = parseBackoff(form.value.retry_backoff_minutes)
    if (!backoff.length) {
        toast.error('Informe pelo menos um intervalo de espera, em minutos.')
        return
    }
    emit('save', { ...form.value, retry_backoff_minutes: backoff })
}

/* Espelha em texto o que vai acontecer num dia ruim. Sem isto, "5 tentativas"
   e "espera 15, 30, 60, 120" são dois números soltos que ninguém soma de
   cabeça pra saber a que horas o sistema desiste. */
const resumoRetentativa = computed(() => {
    const backoff = parseBackoff(form.value.retry_backoff_minutes)
    const max = Number(form.value.retry_max_attempts) || 1
    if (!backoff.length) return ''
    const esperas = []
    for (let i = 1; i < max; i++) esperas.push(backoff[Math.min(i - 1, backoff.length - 1)])
    const total = esperas.reduce((a, b) => a + b, 0)
    const horas = (total / 60).toFixed(1).replace('.', ',')
    return `Falhando sempre: ${max} tentativa(s), esperando ${esperas.join(' + ')} min entre elas `
        + `(${horas} h no total), parando às ${String(form.value.retry_until_hour).padStart(2, '0')}h.`
})
</script>

<template>
    <Modal :open="open" size="lg" title="Configurar a carga do Sienge"
        subtitle="Horário, retentativa e aviso. Vale na hora, sem deploy." @close="emit('close')">

        <div class="space-y-6 text-sm">

            <!-- Quando roda -->
            <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Quando roda</h3>

                <Switch v-model="form.active" label="Carga automática ligada"
                    description="Desligada, só o botão Rodar backup agora dispara." />

                <Input v-model="form.cron_expression" label="Horário da carga (cron)"
                    hint="Padrão 0 5 * * * = todo dia às 5h, fuso de Brasília." />
            </section>

            <!-- Retentativa -->
            <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                    Se falhar
                </h3>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input v-model.number="form.retry_max_attempts" type="number" min="1" max="20"
                        label="Tentativas no dia"
                        hint="Contando a primeira." />
                    <Input v-model="form.retry_backoff_minutes" label="Esperar entre elas (min)"
                        hint="Lista separada por vírgula. O último valor repete." />
                    <Input v-model.number="form.retry_until_hour" type="number" min="0" max="23"
                        label="Parar de tentar às"
                        hint="Hora de Brasília. Depois disso, avisa." />
                </div>

                <p v-if="resumoRetentativa"
                    class="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
                    <i class="fas fa-circle-info mr-1.5"></i>{{ resumoRetentativa }}
                </p>

                <Input v-model.number="form.restore_retry_attempts" type="number" min="0" max="5"
                    label="Refazer o restore na mesma rodada"
                    hint="Quando a conexão cai no meio, refaz usando o arquivo já baixado - não repete o download de 1,5 GB." />
            </section>

            <!-- Vigia -->
            <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                    Vigia de frescor
                </h3>

                <Switch v-model="form.watchdog_enabled" label="Vigiar a idade do espelho"
                    description="Confere de quando é o dado, não se a última rodada deu certo. É o que cobre a carga que morreu no meio sem deixar rastro." />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input v-model="form.watchdog_cron" label="Verificar a cada (cron)"
                        :disabled="!form.watchdog_enabled"
                        hint="Padrão */30 * * * * = de 30 em 30 minutos." />
                    <Input v-model.number="form.stale_limit_hours" type="number" min="2" max="240"
                        label="Espelho velho a partir de (horas)"
                        hint="28 h cobre a carga do dia com folga. Passou disso, o vigia dispara e a tela marca em vermelho." />
                </div>
            </section>

            <!-- Restore -->
            <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">pg_restore</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input v-model.number="form.restore_jobs" type="number" min="1" max="8"
                        label="Processos em paralelo"
                        hint="Mais processos aceleram, mas pesam no Postgres." />
                    <Input v-model.number="form.restore_timeout_minutes" type="number" min="10" max="480"
                        label="Tempo máximo (min)"
                        hint="Passou disso, o restore é abortado. Uma carga normal leva ~20 min." />
                </div>
            </section>

            <!-- Aviso -->
            <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Aviso</h3>

                <Switch v-model="form.alert_on_failure" label="Avisar quando o dia esgotar as tentativas" />
                <Switch v-model="form.alert_on_stale" label="Avisar quando o espelho passar do limite de idade" />

                <div>
                    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">
                        Quem recebe
                    </p>
                    <p v-if="!form.notify_user_ids?.length" class="text-xs text-ink-muted">
                        Ninguém escolhido - o aviso vai para todos os administradores.
                    </p>
                    <div class="flex flex-wrap gap-1 mt-1">
                        <span v-for="id in form.notify_user_ids" :key="id"
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs">
                            {{ nomeUsuario(id) }}
                            <button type="button" class="min-h-0"
                                @click="form.notify_user_ids = form.notify_user_ids.filter(x => x !== id)">
                                <i class="fas fa-times text-micro"></i>
                            </button>
                        </span>
                    </div>
                    <select
                        class="mt-2 bg-surface-sunken border border-line rounded-lg px-2 py-2 w-full sm:w-72 text-sm min-h-10"
                        @change="addUsuario($event)">
                        <option value="">Adicionar pessoa...</option>
                        <option v-for="u in usuariosDisponiveis" :key="u.id" :value="u.id">
                            {{ u.username || u.email }}
                        </option>
                    </select>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-2">
                <Button variant="secondary" @click="emit('close')">Cancelar</Button>
                <Button variant="primary" icon="fas fa-save" :loading="saving" @click="salvar">
                    Salvar
                </Button>
            </div>
        </template>
    </Modal>
</template>
