<script setup>
/**
 * Aba Saúde do Validador de Contratos - o diagnóstico e a configuração.
 *
 * A pergunta que esta tela responde é "dá para validar agora?", e ela responde
 * ANTES de um contrato descobrir que não dá. Antes disto, a única pista de que
 * o validador tinha parado era um repasse preso em "Analise Contratos" por mais
 * de 4h - tarde, dependente de ter contrato na fila, e sem dizer a causa.
 *
 * O bloco mais importante é o de MODELOS: é ali que aparece, com nome e tudo,
 * o modelo que o Google aposentou. O conserto é trocar o nome na lista logo
 * abaixo e salvar - sem deploy, sem mexer em variável de ambiente.
 *
 * Só admin chega aqui (requireCapability '/validator','configure'). Esconder
 * por `can()` é cosmético; quem barra é a API.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { fetchDetalhe, rodarSonda, salvarConfig } from '@/utils/Validator/apiValidatorHealth';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import UserPicker from '@/components/UI/UserPicker.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const carregando = ref(true);
const testando = ref(false);
const salvando = ref(false);
const erro = ref('');
const aviso = ref('');

const dados = ref(null);          // { saude, configuracao, webhook, execucoes, parados }
const usuarios = ref([]);

// Cópia editável: só o que a tela grava. O estado da sonda nunca volta daqui.
const form = reactive({
    models: [],
    probe_enabled: true,
    probe_cron: '*/15 * * * *',
    probe_timeout_ms: 25000,
    queue_check_enabled: true,
    queue_check_cron: '7 * * * *',
    webhook_silence_hours: 48,
    stuck_alert_hours: 4,
    failure_streak_to_alert: 2,
    notify_user_ids: [],
    alert_on_down: true,
    alert_on_recovery: true,
});

// Editar a lista de modelos como texto (um por linha) em vez de chips: o valor
// é um nome técnico que a pessoa COLA da documentação do Google, e colar numa
// caixa de texto é mais rápido e menos frágil que digitar num campo por item.
const modelosTexto = ref('');

const saude = computed(() => dados.value?.saude || null);
const modelos = computed(() => saude.value?.last_models || []);

const tomDoStatus = (s) => ({
    ok: { badge: 'success', icone: 'fas fa-circle-check', cor: 'text-data-pos', fundo: 'bg-data-pos/10 border-data-pos/30' },
    degraded: { badge: 'warning', icone: 'fas fa-triangle-exclamation', cor: 'text-data-warn', fundo: 'bg-data-warn/10 border-data-warn/30' },
    down: { badge: 'danger', icone: 'fas fa-circle-xmark', cor: 'text-data-neg', fundo: 'bg-data-neg/10 border-data-neg/30' },
}[s] || { badge: 'neutral', icone: 'fas fa-circle-question', cor: 'text-ink-muted', fundo: 'bg-surface-sunken border-line' });

const rotuloStatus = (s) => ({
    ok: 'Operando', degraded: 'Parcial', down: 'Fora do ar',
}[s] || 'Desconhecido');

function quando(iso) {
    if (!iso) return 'nunca';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function desdeQuando(iso) {
    if (!iso) return '';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'agora há pouco';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `há ${h}h`;
    return `há ${Math.floor(h / 24)} dias`;
}

function hidratar(d) {
    dados.value = d;
    const c = d?.configuracao || {};
    Object.assign(form, {
        ...form,
        ...c,
        models: [...(c.models || [])],
        notify_user_ids: [...(c.notify_user_ids || [])],
    });
    modelosTexto.value = (c.models || []).join('\n');
}

async function carregar() {
    carregando.value = true;
    erro.value = '';
    try {
        hidratar(await fetchDetalhe());
    } catch (e) {
        erro.value = e.message || 'Não consegui carregar o diagnóstico.';
    } finally {
        carregando.value = false;
    }
}

async function testarAgora() {
    testando.value = true;
    erro.value = '';
    aviso.value = '';
    try {
        const r = await rodarSonda(true);
        aviso.value = `Checagem concluída: ${rotuloStatus(r.status).toLowerCase()}. ${r.motivo || ''}`;
        await carregar();
    } catch (e) {
        erro.value = e.message || 'Não consegui rodar a checagem.';
    } finally {
        testando.value = false;
    }
}

async function salvar() {
    salvando.value = true;
    erro.value = '';
    aviso.value = '';
    try {
        const patch = {
            ...form,
            models: modelosTexto.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean),
            probe_timeout_ms: Number(form.probe_timeout_ms),
            webhook_silence_hours: Number(form.webhook_silence_hours),
            stuck_alert_hours: Number(form.stuck_alert_hours),
            failure_streak_to_alert: Number(form.failure_streak_to_alert),
        };
        const r = await salvarConfig(patch);
        aviso.value = 'Configuração salva. O novo ritmo da sonda já está valendo.';
        if (r?.configuracao) {
            form.models = [...(r.configuracao.models || [])];
            modelosTexto.value = form.models.join('\n');
        }
    } catch (e) {
        // Nome de modelo inválido volta como 400 com a mensagem pronta: é o erro
        // que a pessoa comete ao colar da documentação com espaço sobrando.
        erro.value = e.message || 'Não consegui salvar.';
    } finally {
        salvando.value = false;
    }
}

onMounted(async () => {
    await carregar();
    try {
        const data = await requestWithAuth('/users');
        usuarios.value = Array.isArray(data) ? data : (data?.users || data?.data || []);
    } catch { usuarios.value = []; }
});
</script>

<template>
  <div class="space-y-4">

    <!-- Mensagens -->
    <div v-if="erro" class="rounded-lg border border-data-neg/30 bg-data-neg/10 p-3 text-sm text-data-neg">
      <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ erro }}
    </div>
    <div v-if="aviso" class="rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-ink">
      <i class="fas fa-circle-info mr-1.5 text-accent"></i>{{ aviso }}
    </div>

    <!-- Farol -->
    <Surface variant="raised" padding="md">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="h-11 w-11 grid place-items-center rounded-xl border shrink-0"
            :class="tomDoStatus(saude?.status).fundo">
            <i :class="[tomDoStatus(saude?.status).icone, tomDoStatus(saude?.status).cor]"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-semibold text-ink">{{ rotuloStatus(saude?.status) }}</h3>
              <Badge :variant="tomDoStatus(saude?.status).badge" size="sm">{{ saude?.status || 'unknown' }}</Badge>
              <Badge v-if="saude?.alert_open" variant="danger" size="sm">alerta aberto</Badge>
            </div>
            <p v-if="saude?.last_error" class="text-xs text-ink-muted mt-1 leading-relaxed">{{ saude.last_error }}</p>
            <p class="text-micro font-mono text-ink-subtle mt-1">
              nesse estado {{ desdeQuando(saude?.status_since) || '-' }} ·
              última checagem {{ quando(saude?.last_probe_at) }} ·
              último OK {{ quando(saude?.last_ok_at) }}
            </p>
          </div>
        </div>
        <Button size="sm" icon="fas fa-stethoscope" :loading="testando" @click="testarAgora">
          Testar agora
        </Button>
      </div>
    </Surface>

    <div v-if="carregando" class="text-sm text-ink-muted py-6 text-center">
      <i class="fas fa-circle-notch fa-spin mr-1.5"></i>Carregando diagnóstico...
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Modelos: o bloco que denuncia modelo aposentado -->
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h3 class="text-sm font-semibold text-ink">Modelos de IA</h3>
            <p class="text-xs text-ink-muted mt-0.5">
              Resultado do último toque em cada modelo do pool, na ordem de tentativa.
            </p>
          </div>
          <div class="p-5">
            <EmptyState v-if="!modelos.length" icon="fas fa-microchip"
              title="Nenhuma checagem ainda"
              description="Clique em Testar agora para saber quais modelos respondem." />
            <ul v-else class="space-y-2">
              <li v-for="(m, i) in modelos" :key="m.model"
                class="flex items-start justify-between gap-3 rounded-lg border p-3"
                :class="m.ok ? 'border-data-pos/25 bg-data-pos/5' : 'border-data-neg/25 bg-data-neg/5'">
                <div class="min-w-0">
                  <p class="text-sm font-mono text-ink truncate">
                    {{ m.model }}
                    <span v-if="i === 0" class="ml-1 text-micro text-ink-subtle">(principal)</span>
                  </p>
                  <p v-if="!m.ok" class="text-xs text-data-neg mt-1 leading-relaxed">
                    <template v-if="m.tipo === 'modelo'">
                      Não existe mais no provedor (404). Troque o nome na configuração abaixo.
                    </template>
                    <template v-else-if="m.tipo === 'quota'">Chave sem quota (429).</template>
                    <template v-else-if="m.tipo === 'sobrecarga'">Provedor sobrecarregado (5xx).</template>
                    <template v-else>{{ m.erro }}</template>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <Badge :variant="m.ok ? 'success' : 'danger'" size="sm">{{ m.ok ? 'ok' : (m.tipo || 'erro') }}</Badge>
                  <p v-if="m.ms != null" class="text-micro font-mono text-ink-subtle mt-1">{{ m.ms }}ms</p>
                </div>
              </li>
            </ul>
          </div>
        </Surface>

        <!-- Gatilho do CV -->
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h3 class="text-sm font-semibold text-ink">Gatilho do CV (CONTRATOS_IA)</h3>
            <p class="text-xs text-ink-muted mt-0.5">
              É ele que dispara a análise quando o repasse entra na etapa. Silêncio longo
              costuma ser gatilho desligado no painel do CV.
            </p>
          </div>
          <div class="p-5 space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-ink-muted">Situação</span>
              <Badge :variant="dados?.webhook?.ativo ? 'success' : 'danger'" size="sm">
                {{ dados?.webhook?.ativo ? 'ativo' : 'inativo' }}
              </Badge>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-ink-muted">Última chamada</span>
              <span class="font-mono text-xs text-ink">{{ quando(dados?.webhook?.ultima_chamada) }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-ink-muted">Chamadas no total</span>
              <span class="font-mono text-ink">{{ dados?.webhook?.chamadas_total ?? '-' }}</span>
            </div>
            <div v-if="dados?.webhook?.endereco" class="pt-3 border-t border-line">
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5">
                Endereço para colar no painel do CV
              </p>
              <p class="text-xs font-mono break-all text-ink-muted bg-surface-sunken rounded p-2 border border-line">
                {{ dados.webhook.endereco }}
              </p>
            </div>
          </div>
        </Surface>
      </div>

      <!-- Repasses parados -->
      <Surface variant="raised" padding="none" class="overflow-hidden">
        <div class="px-5 py-3.5 border-b border-line">
          <h3 class="text-sm font-semibold text-ink">
            Parados em "Analise Contratos"
            <Badge v-if="dados?.parados?.length" variant="warning" size="sm" class="ml-1">
              {{ dados.parados.length }}
            </Badge>
          </h3>
          <p class="text-xs text-ink-muted mt-0.5">
            Repasse cuja análise falhou fica na etapa de propósito, esperando alguém.
          </p>
        </div>
        <div class="p-5">
          <EmptyState v-if="!dados?.parados?.length" icon="fas fa-check"
            title="Nada preso" description="Nenhum repasse aguardando conserto." />
          <ul v-else class="space-y-2">
            <li v-for="p in dados.parados" :key="p.idrepasse"
              class="rounded-lg border border-data-warn/25 bg-data-warn/5 p-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm text-ink font-medium truncate">
                    {{ p.cliente || 'Cliente não identificado' }}
                    <span class="text-ink-muted font-normal">· {{ p.empreendimento || 'sem empreendimento' }}</span>
                  </p>
                  <p v-if="p.last_error" class="text-xs text-ink-muted mt-1 leading-relaxed">{{ p.last_error }}</p>
                </div>
                <div class="text-right shrink-0 text-micro font-mono text-ink-subtle">
                  <p>repasse {{ p.idrepasse }}</p>
                  <p>{{ desdeQuando(p.status_since) }}</p>
                  <p>{{ p.attempts }} tentativa(s)</p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </Surface>

      <!-- Configuração -->
      <Surface variant="raised" padding="none" class="overflow-hidden">
        <div class="px-5 py-3.5 border-b border-line">
          <h3 class="text-sm font-semibold text-ink">Configuração</h3>
          <p class="text-xs text-ink-muted mt-0.5">
            Vale na hora, sem deploy. O pool de modelos é o que a análise tenta, na ordem.
          </p>
        </div>

        <div class="p-5 space-y-6">

          <!-- Modelos -->
          <div>
            <label for="pool-modelos" class="block text-xs font-medium text-ink-muted mb-1.5">
              Pool de modelos <span class="text-data-neg">*</span>
            </label>
            <textarea id="pool-modelos" v-model="modelosTexto" rows="4" spellcheck="false"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-mono
                     text-ink focus-ring resize-y"
              placeholder="gemini-2.5-pro&#10;gemini-2.5-flash"></textarea>
            <p class="text-xs text-ink-subtle mt-1.5 leading-relaxed">
              Um por linha, na ordem de tentativa. O primeiro é o principal; os demais só
              entram quando ele falha. Quando o provedor aposenta um modelo, é aqui que se
              troca o nome - o próximo contrato já usa o novo.
            </p>
          </div>

          <!-- Sonda -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line">
            <div class="space-y-3">
              <Switch v-model="form.probe_enabled" label="Sonda automática"
                description="Confere modelos e API sozinha, sem depender de haver contrato na fila." />
              <Input v-model="form.probe_cron" label="Ritmo da sonda (cron)" size="sm"
                hint="Padrão */15 * * * * (a cada 15 minutos)." />
              <Input v-model.number="form.probe_timeout_ms" type="number" size="sm"
                label="Tempo máximo por modelo (ms)"
                hint="Entre 5000 e 120000. Abaixo disso, lentidão normal viraria falsa queda." />
            </div>

            <div class="space-y-3">
              <Switch v-model="form.queue_check_enabled" label="Conferir a fila do CV"
                description="Conta o que está preso na etapa. Custa uma chamada à API do CV por rodada." />
              <Input v-model="form.queue_check_cron" label="Ritmo da fila (cron)" size="sm"
                hint="Padrão 7 * * * * (de hora em hora, no minuto 7)." />
              <Input v-model.number="form.failure_streak_to_alert" type="number" size="sm"
                label="Rodadas ruins até avisar"
                hint="1 avisa na primeira falha. 2 ignora o soluço isolado do provedor." />
            </div>
          </div>

          <!-- Prazos -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line">
            <Input v-model.number="form.stuck_alert_hours" type="number" size="sm"
              label="Horas até um repasse preso virar aviso"
              hint="Conta desde que ele entrou em Analise Contratos, segundo o CV." />
            <Input v-model.number="form.webhook_silence_hours" type="number" size="sm"
              label="Horas de silêncio do gatilho até desconfiar"
              hint="Generoso de propósito: feriado sem contrato nenhum não é defeito." />
          </div>

          <!-- Alertas -->
          <div class="pt-4 border-t border-line space-y-3">
            <Switch v-model="form.alert_on_down" label="Avisar quando quebrar"
              description="Sino e e-mail para quem estiver na lista abaixo." />
            <Switch v-model="form.alert_on_recovery" label="Avisar quando voltar"
              description="Sem isso, a única pista de recuperação é parar de receber aviso - que é ambíguo." />
            <UserPicker v-model="form.notify_user_ids" :users="usuarios"
              label="Quem recebe o aviso"
              empty-text="Ninguém escolhido: o aviso vai para todos os administradores ativos." />
          </div>

          <div class="flex items-center justify-end pt-4 border-t border-line">
            <Button :loading="salvando" icon="fas fa-floppy-disk" @click="salvar">Salvar configuração</Button>
          </div>
        </div>
      </Surface>

      <!-- Rastro -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h3 class="text-sm font-semibold text-ink">Últimas checagens</h3>
          </div>
          <div class="p-5">
            <EmptyState v-if="!saude?.historico?.length" icon="fas fa-clock-rotate-left"
              title="Sem rastro ainda" description="A primeira checagem aparece aqui." />
            <ul v-else class="space-y-1.5 max-h-72 overflow-auto">
              <li v-for="h in saude.historico" :key="h.id"
                class="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-line last:border-0">
                <Badge :variant="tomDoStatus(h.status).badge" size="sm">{{ h.status }}</Badge>
                <span class="flex-1 min-w-0 truncate text-ink-muted">{{ h.message }}</span>
                <span class="font-mono text-ink-subtle shrink-0">{{ quando(h.created_at) }}</span>
              </li>
            </ul>
          </div>
        </Surface>

        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h3 class="text-sm font-semibold text-ink">Últimas análises disparadas</h3>
          </div>
          <div class="p-5">
            <EmptyState v-if="!dados?.execucoes?.length" icon="fas fa-list-check"
              title="Nenhuma execução" description="O webhook do CV ainda não disparou nenhuma análise." />
            <ul v-else class="space-y-1.5 max-h-72 overflow-auto">
              <li v-for="e in dados.execucoes" :key="e.id"
                class="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-line last:border-0">
                <Badge :variant="e.errors ? 'danger' : 'neutral'" size="sm">{{ e.origin }}</Badge>
                <span class="flex-1 min-w-0 truncate text-ink-muted">
                  {{ e.found }} achado(s), {{ e.processed }} processado(s), {{ e.errors }} erro(s)
                  <template v-if="e.message">· {{ e.message }}</template>
                </span>
                <span class="font-mono text-ink-subtle shrink-0">{{ quando(e.started_at) }}</span>
              </li>
            </ul>
          </div>
        </Surface>
      </div>
    </template>
  </div>
</template>
