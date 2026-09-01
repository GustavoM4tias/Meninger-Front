<script setup>
/**
 * Aba "Configuração" da tela Sienge (o cabeçalho vive no hub, ../Index.vue).
 *
 * Três blocos, cada um com uma pergunta:
 *   1. Conexão      → ONDE o Sienge mora e com que credencial se entra nele.
 *   2. Carga        → QUANDO o espelho é atualizado e o que fazer se falhar.
 *   3. Vigia do ERP → A PARTIR DE QUANDO uma venda parada é erro, e quem avisar.
 *
 * O bloco 1 nasceu desta tela: endereço e senha do Sienge só existiam em
 * variável de ambiente, então trocar uma senha exigia deploy e acesso ao painel
 * da nuvem. Agora a tabela manda e a variável fica só como piso - campo em
 * branco aqui continua usando o ambiente, e o selo de cada segredo diz de onde
 * ele está vindo.
 *
 * Senha nunca volta do servidor: o GET traz só os selos. Ver SecretField.
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useSiengeBackupStore } from '@/stores/Sienge/backupStore';
import { useEnvioSiengeStore } from '@/stores/Sienge/envioSiengeStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { pedirConfirmacao } from '@/composables/useConfirm';

import SettingsCard from '@/components/UI/SettingsCard.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

import SecretField from '../components/SecretField.vue';
import UserPicker from '../components/UserPicker.vue';

const backup = useSiengeBackupStore();
const envio = useEnvioSiengeStore();
const toast = useToast();

const usuarios = ref([]);
const carregando = ref(true);

// ─── 1. Conexão ─────────────────────────────────────────────────────────────
function conexaoVazia() {
    return {
        backup_url: '', backup_md5_url: '', backup_user: '', backup_password: '',
        pg_url: '', pg_database: '', pg_staging_database: '', pg_read_url: '',
        api_base_url: '', api_user: '', api_password: '',
        auto_restore_enabled: true, download_max_attempts: 3, timezone: 'America/Sao_Paulo',
        read_pool_max: 4, read_statement_timeout_ms: 60000,
    };
}
const conexao = reactive(conexaoVazia());

function hidratarConexao(c) {
    if (!c) return;
    Object.assign(conexao, {
        ...conexaoVazia(),
        backup_url: c.backup_url || '',
        backup_md5_url: c.backup_md5_url || '',
        backup_user: c.backup_user || '',
        pg_database: c.pg_database || '',
        pg_staging_database: c.pg_staging_database || '',
        api_base_url: c.api_base_url || '',
        api_user: c.api_user || '',
        auto_restore_enabled: !!c.auto_restore_enabled,
        download_max_attempts: c.download_max_attempts ?? 3,
        timezone: c.timezone || 'America/Sao_Paulo',
        read_pool_max: c.read_pool_max ?? 4,
        read_statement_timeout_ms: c.read_statement_timeout_ms ?? 60000,
        // Segredos ficam vazios de propósito: vazio = "mantenha o que está lá".
    });
}

const conn = computed(() => backup.connection || {});
const doEnv = computed(() => conn.value.from_env || {});

/* Quantos campos ainda dependem do painel da nuvem. É o número que diz se esta
   tela já assumiu a conexão ou se um deploy ainda pode mudá-la por baixo. */
const aindaNoEnv = computed(() => Object.values(doEnv.value).filter(Boolean).length);

const seloConexao = computed(() => {
    const t = backup.connectionTest || (conn.value.last_test_at
        ? { ok: conn.value.last_test_ok, checks: conn.value.last_test_detail }
        : null);
    if (!t) return { badge: 'Nunca testada', variant: 'neutral' };
    return t.ok
        ? { badge: 'Três portas responderam', variant: 'success' }
        : { badge: 'Alguma porta não respondeu', variant: 'danger' };
});

const resultadoTeste = computed(() => {
    const t = backup.connectionTest;
    const checks = t?.checks || conn.value.last_test_detail;
    if (!checks) return [];
    return [
        { key: 'backup', label: 'Arquivo de backup', ...checks.backup },
        { key: 'postgres', label: 'Postgres do espelho', ...checks.postgres },
        { key: 'api', label: 'API REST', ...checks.api },
    ];
});

async function salvarConexao() {
    try {
        await backup.saveConnection({ ...conexao });
        hidratarConexao(backup.connection);
        toast.success('Conexão salva. Já vale para a próxima consulta e para a próxima carga.');
    } catch (err) {
        toast.error(err.message || 'Falha ao salvar a conexão.');
    }
}

async function testarConexao() {
    try {
        const r = await backup.testConnection();
        if (r?.ok) toast.success('As três portas do Sienge responderam.');
        else toast.error('Alguma porta não respondeu - veja o detalhe abaixo.');
    } catch (err) {
        toast.error(err.message || 'Falha ao testar a conexão.');
    }
}

// ─── 2. Carga do espelho ────────────────────────────────────────────────────
function cargaVazia() {
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
    };
}
const carga = reactive(cargaVazia());

/* O backoff é uma lista no banco e um texto na tela: "15, 30, 60, 120" se lê
   muito melhor que quatro campos numerados. */
function hidratarCarga(s) {
    if (!s) return;
    Object.assign(carga, {
        ...cargaVazia(),
        ...s,
        retry_backoff_minutes: (s.retry_backoff_minutes || []).join(', '),
        notify_user_ids: [...(s.notify_user_ids || [])],
    });
}

function lerBackoff(texto) {
    return String(texto || '')
        .split(',')
        .map(n => Number(String(n).trim()))
        .filter(n => Number.isFinite(n) && n > 0);
}

/* Espelha em texto o que vai acontecer num dia ruim. Sem isto, "5 tentativas" e
   "espera 15, 30, 60, 120" são dois números soltos que ninguém soma de cabeça
   pra saber a que horas o sistema desiste. */
const resumoRetentativa = computed(() => {
    const backoff = lerBackoff(carga.retry_backoff_minutes);
    const max = Number(carga.retry_max_attempts) || 1;
    if (!backoff.length) return '';
    const esperas = [];
    for (let i = 1; i < max; i++) esperas.push(backoff[Math.min(i - 1, backoff.length - 1)]);
    const total = esperas.reduce((a, b) => a + b, 0);
    const horas = (total / 60).toFixed(1).replace('.', ',');
    return `Falhando sempre: ${max} tentativa(s), esperando ${esperas.join(' + ')} min entre elas `
        + `(${horas} h no total), parando às ${String(carga.retry_until_hour).padStart(2, '0')}h.`;
});

async function salvarCarga() {
    const backoff = lerBackoff(carga.retry_backoff_minutes);
    if (!backoff.length) {
        toast.error('Informe pelo menos um intervalo de espera, em minutos.');
        return;
    }
    try {
        await backup.saveSettings({ ...carga, retry_backoff_minutes: backoff });
        hidratarCarga(backup.settings);
        toast.success('Configuração da carga salva. O agendamento já está valendo.');
    } catch (err) {
        toast.error(err.message || 'Falha ao salvar a configuração da carga.');
    }
}

// ─── 3. Vigia do envio ao ERP ───────────────────────────────────────────────
function vigiaVazio() {
    return {
        active: false,
        minutos_limite: 30,
        idsituacao_vigiada: 17,
        notify_user_ids: [],
        cron_expression: '*/15 * * * *',
    };
}
const vigia = reactive(vigiaVazio());

function hidratarVigia(s) {
    if (!s) return;
    Object.assign(vigia, { ...vigiaVazio(), ...s, notify_user_ids: [...(s.notify_user_ids || [])] });
}

async function salvarVigia() {
    if (Number(vigia.minutos_limite) < 5) {
        toast.error('O limite deve ser de pelo menos 5 minutos - uma rodada do lote do CV.');
        return;
    }
    /* Ligar o vigia manda notificação de verdade para gente de verdade: a
       confirmação diz o que vai acontecer, não pergunta "tem certeza?". */
    if (vigia.active && !envio.settings?.active) {
        const quantos = vigia.notify_user_ids.length;
        if (!await pedirConfirmacao({
            title: 'Ligar o aviso automático de venda travada?',
            consequence: quantos
                ? `A cada rodada do cron, ${quantos} pessoa(s) passam a receber uma notificação por reserva nova que passar de ${vigia.minutos_limite} minutos em Envio Sienge.`
                : `Ninguém está na lista de destinatários, então o vigia vai rodar e não avisar ninguém.`,
            hint: 'Cada reserva gera um aviso só, não um a cada verificação.',
            tone: 'accent',
            confirmLabel: 'Ligar o aviso',
        })) return;
    }
    try {
        await envio.saveSettings({ ...vigia });
        hidratarVigia(envio.settings);
        toast.success('Régua do vigia salva. A próxima rodada já usa o novo prazo.');
    } catch (err) {
        toast.error(err.message || 'Falha ao salvar a régua do vigia.');
    }
}

// ─── Carga inicial ──────────────────────────────────────────────────────────
onMounted(async () => {
    carregando.value = true;
    try {
        const data = await requestWithAuth('/users');
        usuarios.value = Array.isArray(data) ? data : (data?.users || data?.data || []);
    } catch { usuarios.value = []; }

    await Promise.all([
        backup.fetchConnection().then(hidratarConexao),
        backup.fetchSettings().then(hidratarCarga),
        envio.fetchAll().then(() => hidratarVigia(envio.settings)).catch(() => {}),
    ]);
    carregando.value = false;
});
</script>

<template>
  <div class="space-y-4">

    <div v-if="carregando" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" variant="row" />
    </div>

    <template v-else>

      <!-- ── 1. Conexão ───────────────────────────────────────────────── -->
      <SettingsCard icon="fas fa-plug" icon-color="accent"
        title="Conexão com o Sienge"
        :badge="seloConexao.badge" :badge-variant="seloConexao.variant"
        :description="aindaNoEnv
          ? `${aindaNoEnv} campo(s) ainda vindo(s) da variável de ambiente`
          : 'Todos os campos configurados aqui'"
        default-open>

        <div class="space-y-6 text-sm">

          <p class="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
            <i class="fas fa-circle-info mr-1.5"></i>
            Campo em branco continua usando a variável de ambiente. O que você
            preenche aqui passa a valer na hora, sem deploy - e senha gravada
            aqui é cifrada, nunca volta para a tela.
          </p>

          <!-- Arquivo de backup -->
          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
              Arquivo de backup
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Input v-model="conexao.backup_url" label="URL do arquivo (.dmpc.gz)"
                :hint="doEnv.backup_url ? 'Hoje vindo da variável de ambiente.' : ''"
                placeholder="https://..." />
              <Input v-model="conexao.backup_md5_url" label="URL do md5"
                :hint="doEnv.backup_md5_url ? 'Hoje vindo da variável de ambiente.' : 'Serve para conferir se o download veio inteiro.'"
                placeholder="https://..." />
              <Input v-model="conexao.backup_user" label="Usuário"
                :hint="doEnv.backup_user ? 'Hoje vindo da variável de ambiente.' : ''" />
              <SecretField v-model="conexao.backup_password" label="Senha"
                :configured="!!conn.has_backup_password" :from-env="!!doEnv.backup_password" />
            </div>
          </section>

          <!-- Postgres do espelho -->
          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
              Postgres do espelho
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <SecretField v-model="conexao.pg_url" label="URL de conexão"
                placeholder="postgresql://usuario:senha@host:porta"
                hint="É por onde o restore entra. Guarda a senha, então é tratada como segredo."
                :configured="!!conn.has_pg_url" :from-env="!!doEnv.pg_url" />
              <SecretField v-model="conexao.pg_read_url" label="URL de leitura (opcional)"
                placeholder="postgresql://..."
                hint="Só quando as telas leem por um endereço diferente do restore. Em branco, é derivada da URL acima."
                :configured="!!conn.has_pg_read_url" :from-env="!!doEnv.pg_read_url" />
              <Input v-model="conexao.pg_database" label="Database do espelho"
                :hint="doEnv.pg_database ? 'Hoje vindo da variável de ambiente.' : 'Vazio = sie214801.'" />
              <Input v-model="conexao.pg_staging_database" label="Database de staging"
                hint="Onde o restore acontece antes da troca. Vazio = <database>_staging." />
              <Input v-model.number="conexao.read_pool_max" type="number" min="1" max="20"
                label="Conexões de leitura simultâneas"
                hint="Quantas consultas às telas de Custos e Inadimplência podem correr juntas." />
              <Input v-model.number="conexao.read_statement_timeout_ms" type="number" min="5000" max="600000"
                label="Tempo máximo de uma consulta (ms)"
                hint="Passou disso, a consulta é abortada em vez de segurar o pool." />
            </div>
          </section>

          <!-- API REST -->
          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
              API REST do Sienge
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Input v-model="conexao.api_base_url" label="URL base"
                placeholder="https://api.sienge.com.br/<empresa>/public/api"
                :hint="doEnv.api_base_url ? 'Hoje vindo da variável de ambiente.' : ''" />
              <Input v-model="conexao.api_user" label="Usuário"
                :hint="doEnv.api_user ? 'Hoje vindo da variável de ambiente.' : ''" />
              <SecretField v-model="conexao.api_password" label="Senha"
                hint="Um 401 do Sienge quase sempre é aspas ou espaço colados junto da senha - aqui isso é limpo antes de gravar."
                :configured="!!conn.has_api_password" :from-env="!!doEnv.api_password" />
            </div>
          </section>

          <!-- Comportamento do pipeline -->
          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
              Comportamento
            </h3>
            <Switch v-model="conexao.auto_restore_enabled" label="Restaurar o espelho automaticamente"
              description="Desligado, a carga baixa e confere o arquivo mas NÃO troca o espelho - as telas seguem no dado antigo." />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input v-model.number="conexao.download_max_attempts" type="number" min="1" max="10"
                label="Tentativas do download"
                hint="Dentro da mesma rodada, para queda de rede no meio do arquivo." />
              <Input v-model="conexao.timezone" label="Fuso dos horários"
                hint="É o fuso em que os crons da carga são lidos. Padrão America/Sao_Paulo." />
            </div>
          </section>

          <!-- Teste -->
          <div v-if="resultadoTeste.length" class="space-y-2">
            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Último teste</p>
            <div v-for="c in resultadoTeste" :key="c.key"
              class="flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs"
              :class="c.ok ? 'border-data-pos/30 bg-data-pos/[0.06]' : 'border-data-neg/30 bg-data-neg/[0.06]'">
              <i class="mt-0.5" :class="c.ok ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-xmark text-data-neg'"></i>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-ink">{{ c.label }}</p>
                <p class="text-ink-muted break-words">{{ c.detail }}</p>
              </div>
              <span v-if="c.ms != null" class="font-mono tabular-nums text-ink-subtle shrink-0">
                {{ c.ms }} ms
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 flex-wrap">
            <Button variant="secondary" icon="fas fa-vial" :loading="backup.connectionTesting"
              @click="testarConexao">
              Testar conexão
            </Button>
            <Button variant="primary" icon="fas fa-save" :loading="backup.connectionSaving"
              @click="salvarConexao">
              Salvar conexão
            </Button>
          </div>
        </div>
      </SettingsCard>

      <!-- ── 2. Carga do espelho ──────────────────────────────────────── -->
      <SettingsCard icon="fas fa-database" icon-color="accent"
        title="Carga do espelho"
        :badge="carga.active ? 'Automática ligada' : 'Só disparo manual'"
        :badge-variant="carga.active ? 'success' : 'warning'"
        :description="`Horário ${carga.cron_expression} · espelho velho a partir de ${carga.stale_limit_hours} h`">

        <div class="space-y-6 text-sm">

          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Quando roda</h3>
            <Switch v-model="carga.active" label="Carga automática ligada"
              description="Desligada, só o botão Rodar backup agora, na aba Backup, dispara." />
            <Input v-model="carga.cron_expression" label="Horário da carga (cron)"
              hint="Padrão 0 5 * * * = todo dia às 5h, no fuso configurado no bloco da conexão." />
          </section>

          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Se falhar</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input v-model.number="carga.retry_max_attempts" type="number" min="1" max="20"
                label="Tentativas no dia" hint="Contando a primeira." />
              <Input v-model="carga.retry_backoff_minutes" label="Esperar entre elas (min)"
                hint="Lista separada por vírgula. O último valor repete." />
              <Input v-model.number="carga.retry_until_hour" type="number" min="0" max="23"
                label="Parar de tentar às" hint="Hora de Brasília. Depois disso, avisa." />
            </div>
            <p v-if="resumoRetentativa"
              class="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
              <i class="fas fa-circle-info mr-1.5"></i>{{ resumoRetentativa }}
            </p>
            <Input v-model.number="carga.restore_retry_attempts" type="number" min="0" max="5"
              label="Refazer o restore na mesma rodada"
              hint="Quando a conexão cai no meio, refaz usando o arquivo já baixado - não repete o download de 1,5 GB." />
          </section>

          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Vigia de frescor</h3>
            <Switch v-model="carga.watchdog_enabled" label="Vigiar a idade do espelho"
              description="Confere de quando é o dado, não se a última rodada deu certo. É o que cobre a carga que morreu no meio sem deixar rastro." />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input v-model="carga.watchdog_cron" label="Verificar a cada (cron)"
                :disabled="!carga.watchdog_enabled"
                hint="Padrão */30 * * * * = de 30 em 30 minutos." />
              <Input v-model.number="carga.stale_limit_hours" type="number" min="2" max="240"
                label="Espelho velho a partir de (horas)"
                hint="28 h cobre a carga do dia com folga. Passou disso, o vigia dispara e a aba Backup marca em vermelho." />
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">pg_restore</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input v-model.number="carga.restore_jobs" type="number" min="1" max="8"
                label="Processos em paralelo"
                hint="Mais processos aceleram, mas pesam no Postgres." />
              <Input v-model.number="carga.restore_timeout_minutes" type="number" min="10" max="480"
                label="Tempo máximo (min)"
                hint="Passou disso, o restore é abortado. Uma carga normal leva ~20 min." />
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Aviso</h3>
            <Switch v-model="carga.alert_on_failure" label="Avisar quando o dia esgotar as tentativas" />
            <Switch v-model="carga.alert_on_stale" label="Avisar quando o espelho passar do limite de idade" />
            <UserPicker v-model="carga.notify_user_ids" :users="usuarios"
              empty-text="Ninguém escolhido - o aviso vai para todos os administradores." />
          </section>

          <div class="flex items-center justify-end">
            <Button variant="primary" icon="fas fa-save" :loading="backup.settingsSaving"
              @click="salvarCarga">
              Salvar carga
            </Button>
          </div>
        </div>
      </SettingsCard>

      <!-- ── 3. Vigia do envio ao ERP ─────────────────────────────────── -->
      <SettingsCard icon="fas fa-triangle-exclamation" icon-color="warning"
        title="Vigia do envio ao ERP"
        :badge="vigia.active ? 'Aviso automático ligado' : 'Aviso automático desligado'"
        :badge-variant="vigia.active ? 'success' : 'neutral'"
        :description="`Travada após ${vigia.minutos_limite} min · verifica em ${vigia.cron_expression}`">

        <div class="space-y-6 text-sm">

          <p class="rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
            <i class="fas fa-circle-info mr-1.5"></i>
            O lote do CV roda de 5 em 5 minutos. Medindo agosto de 2026 a partir
            da entrada na etapa, 226 de 238 vendas chegaram ao ERP em até 5
            minutos, com mediana de 2 - por isso passar de 30 minutos (seis
            rodadas) não é demora, é erro.
          </p>

          <Switch v-model="vigia.active" label="Avisar sozinho"
            description="Desligado, a aba Travadas no ERP continua consultando quando você abre; só o aviso automático para." />

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input v-model.number="vigia.minutos_limite" type="number" min="5" label="Travada após (minutos)"
              hint="Menos de 5 acusaria venda que nem teve a primeira chance de sair." />
            <Input v-model="vigia.cron_expression" label="Verificar a cada (cron)"
              hint="Padrão */15 * * * * = de 15 em 15 minutos." />
            <Input v-model.number="vigia.idsituacao_vigiada" type="number" label="Situação do CV vigiada"
              hint="17 = Envio Sienge." />
          </div>

          <UserPicker v-model="vigia.notify_user_ids" :users="usuarios"
            label="Quem recebe o aviso"
            empty-text="Ninguém selecionado - o vigia roda e não avisa." />
          <p class="text-xs text-ink-subtle">
            Cada reserva gera um aviso só, não um a cada verificação.
          </p>

          <div class="flex items-center justify-end gap-2 flex-wrap">
            <Badge v-if="envio.error" variant="danger" size="sm">{{ envio.error }}</Badge>
            <Button variant="primary" icon="fas fa-save" :loading="envio.saving" @click="salvarVigia">
              Salvar vigia
            </Button>
          </div>
        </div>
      </SettingsCard>

    </template>
  </div>
</template>
