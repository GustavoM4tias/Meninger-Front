<!--
  Cartão "Parcelas mensais" da aba Configurações do Ato. Toda regra da cobrança
  das parcelas mora aqui (e em boleto_settings no backend); o código só tem o
  fallback. Modo leitura por padrão; Editar abre os campos.

  Virou SettingsCard junto com o resto da aba: fechado, o selo já diz se está
  cobrando e com que antecedência, que é o que se vem conferir na maioria das
  vezes. O Salvar continua sendo daqui - estes campos não passam pelo botão da
  tela, e é por isso que o selo diz "salva neste cartão".

  Os valores em leitura passam pelo CampoConfig: era aqui que o parágrafo sem
  classe de tamanho virava 16px ao lado de um rótulo de 11px. A grade também
  não abre mais em duas colunas no celular - "venda faturada no Sienge (regra
  do Faturamento)" não cabe em meia tela de 375px.
-->
<template>
  <SettingsCard icon="fas fa-calendar-check"
    :icon-color="form.parcelas_ativo ? 'success' : 'neutral'"
    title="Parcelas mensais"
    :badge="editing ? 'Editando' : (form.parcelas_ativo ? 'Cobrando' : 'Pausada')"
    :badge-variant="editing ? 'warning' : (form.parcelas_ativo ? 'success' : 'neutral')"
    :description="resumoCartao">

    <div class="space-y-5 text-sm">

      <p class="text-sm text-ink-muted leading-relaxed">
        Depois do ato pago, o Office cobra as mensais até o Sienge faturar o contrato.
        {{ form.parcelas_ativo
          ? 'Cobrança ligada.'
          : 'Cobrança pausada: os planos são calculados, mas nenhum boleto sai.' }}
      </p>

      <!-- Interruptor mestre, separado do resto: é a decisão que mais pesa. -->
      <div class="rounded-lg border border-line bg-surface-sunken p-3">
        <Switch v-model="form.parcelas_ativo" :disabled="!editing"
          label="Cobrar as parcelas mensais automaticamente"
          description="Ligado: a rodada diária emite os boletos das parcelas que vencem dentro da antecedência, lembra o cliente antes do vencimento e avisa quando venceu. Desligado: só calcula e mostra os planos." />
      </div>

      <!-- ── LEITURA ────────────────────────────────────────────────────── -->
      <div v-if="!editing"
        class="rounded-lg border border-line bg-surface-sunken/40 p-4
               grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        <CampoConfig label="Séries mensais (CV)">
          <div class="flex flex-wrap gap-1">
            <ChipId v-for="id in form.parcelas_idseries" :key="id" :id="id" />
            <span v-if="!form.parcelas_idseries.length" class="font-sans italic text-ink-subtle">
              Nenhuma série
            </span>
          </div>
        </CampoConfig>

        <CampoConfig label="Antecedência da emissão"
          :value="`${form.parcelas_antecedencia_dias} dias`"
          note="O boleto sai esse tanto de dias corridos antes do vencimento." />

        <CampoConfig label="Rodada diária"
          :value="`${String(form.parcelas_hora_rodada).padStart(2, '0')}:00`"
          :note="`${form.parcelas_max_emissoes_rodada > 0
            ? `Até ${form.parcelas_max_emissoes_rodada} boletos por rodada`
            : 'Tudo da janela no mesmo dia'}, em lotes de ${form.parcelas_lote_tamanho}${form.parcelas_lote_pausa_min > 0 ? ` com ${form.parcelas_lote_pausa_min} min de pausa` : ''}.`" />

        <CampoConfig label="Exige ato pago"
          :value="form.parcelas_exigir_ato_pago ? 'Sim' : 'Não'" :mono="false"
          note="Desligado, nasce plano para toda reserva com série mensal." />

        <CampoConfig label="Cobrar a partir de"
          :value="form.parcelas_cobrar_a_partir_de ? formatDate(form.parcelas_cobrar_a_partir_de) : 'Sem corte'"
          note="Parcela vencida antes disso é retroativa: a rodada não toca, fica na tela para trabalho manual." />

        <CampoConfig label="Parcela já vencida na adesão" :mono="false"
          :value="form.parcelas_vencidas_na_adesao === 'ignorar'
            ? 'Ignorar'
            : 'Emitir com vencimento no próximo dia útil'" />

        <CampoConfig label="Parcela vencida" :mono="false"
          :value="form.atraso_reemitir
            ? `A rodada reemite sozinha, até ${form.atraso_max_reemissoes} via(s) nova(s)`
            : `A pedido (cliente responde SIM ou botão Reemitir), até ${form.atraso_max_reemissoes} via(s) nova(s)`"
          :note="`Sempre no próximo dia útil, sem multa nem juros. Acabaram as vias${form.aviso_final_sem_resposta_dias ? ` ou ${form.aviso_final_sem_resposta_dias} dias sem resposta ao aviso` : ''}: aviso final sem nova via, com o número ${form.parcelas_contato}.`" />

        <CampoConfig label="Lembrete e aviso ao cliente" :mono="false"
          :value="`${form.lembrete_dias_antes ? `${form.lembrete_dias_antes} dias antes` : 'Sem lembrete'} · ${form.aviso_atraso_dias_depois ? `${form.aviso_atraso_dias_depois} dia(s) depois` : 'sem aviso'}`" />

        <CampoConfig label="CEP recusado pela Caixa" :mono="false"
          :value="form.parcelas_cep_contingencia_ativo
            ? `Emite com ${form.parcelas_cep_contingencia.endereco}, ${form.parcelas_cep_contingencia.numero} · CEP ${form.parcelas_cep_contingencia.cep} · ${form.parcelas_cep_contingencia.cidade}/${form.parcelas_cep_contingencia.estado}`
            : 'Parcela fica em erro até corrigir o CV'"
          note="A reserva fica com o alerta CEP a corrigir no CV até a Caixa aceitar o endereço do cadastro." />

        <CampoConfig label="Última rodada" :mono="false"
          :value="parcelas.status?.ultima_rodada_em ? formatDateTime(parcelas.status.ultima_rodada_em) : 'Ainda não rodou'" />

        <!-- Regra de encerramento: são duas regras somadas, então ocupa a
             linha inteira em vez de disputar meia coluna com uma data. -->
        <CampoConfig label="Quando o plano encerra" :mono="false"
          class="sm:col-span-2 lg:col-span-3">
          <ul class="space-y-0.5">
            <li class="flex items-start gap-2">
              <span class="h-1.5 w-1.5 rounded-full mt-[7px] shrink-0"
                :class="form.parcelas_encerrar_quando_faturado ? 'bg-data-pos' : 'bg-ink-subtle'"></span>
              <span>{{ form.parcelas_encerrar_quando_faturado
                ? 'Venda faturada no Sienge (a mesma regra do relatório de Faturamento).'
                : 'Não encerra pelo faturamento do Sienge.' }}</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="h-1.5 w-1.5 rounded-full mt-[7px] shrink-0"
                :class="form.parcelas_encerrar_etapas_repasse.length ? 'bg-data-pos' : 'bg-ink-subtle'"></span>
              <span>
                <template v-if="form.parcelas_encerrar_etapas_repasse.length">
                  Repasse do CV em {{ form.parcelas_encerrar_etapas_repasse.length }}
                  etapa{{ form.parcelas_encerrar_etapas_repasse.length === 1 ? '' : 's' }}: {{ etapasResumo }}.
                </template>
                <template v-else>Não encerra pela etapa do repasse.</template>
              </span>
            </li>
          </ul>
          <template #note>
            Qualquer uma das regras basta. Ao encerrar, os boletos em aberto são baixados e o cliente
            {{ form.parcelas_aviso_encerramento
              ? 'recebe o aviso de encerramento (e-mail e WhatsApp), com registro no histórico e no CV'
              : 'NÃO é avisado' }}.
          </template>
        </CampoConfig>
      </div>

      <!-- ── EDIÇÃO ─────────────────────────────────────────────────────── -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="min-w-0">
          <label class="block text-xs font-medium text-ink-muted mb-1.5">
            Séries mensais do CV (IDs)
          </label>
          <div class="flex gap-2">
            <Input v-model.number="novaSerie" type="number" placeholder="Ex.: 20"
              @keydown.enter.prevent="addSerie" />
            <Button variant="primary" size="sm" icon="fas fa-plus" @click="addSerie">Adicionar</Button>
          </div>
          <div class="flex flex-wrap gap-1 mt-2">
            <ChipId v-for="id in form.parcelas_idseries" :key="id" :id="id"
              removable remove-label="Remover série" @remove="removeSerie(id)" />
          </div>
          <p class="mt-1.5 text-xs text-ink-muted leading-relaxed">
            Na base: 20 = Recurso Próprio Parcelado, 1 = Parcelas Mensais, 37 = Parcelas Mensais (URBAN).
          </p>
        </div>

        <Input v-model.number="form.parcelas_antecedencia_dias" type="number"
          label="Antecedência da emissão (dias)"
          hint="O boleto da parcela sai N dias corridos antes do vencimento." />

        <Input v-model.number="form.parcelas_hora_rodada" type="number"
          label="Hora da rodada diária (0-23, Brasília)"
          hint="Depois das 08h, que é quando a rodada de pagamento marca o que foi pago ou venceu." />

        <Input v-model.number="form.parcelas_max_emissoes_rodada" type="number"
          label="Teto de boletos por rodada (0 = sem teto)"
          hint="Só use para segurar um dia específico. Com teto, o que sobrar fica para o dia seguinte." />

        <Input v-model.number="form.parcelas_lote_tamanho" type="number"
          label="Boletos por lote"
          hint="A rodada emite em lotes; entre um e outro faz a pausa ao lado." />

        <Input v-model.number="form.parcelas_lote_pausa_min" type="number"
          label="Pausa entre lotes (min)"
          hint="0 = sem pausa. Cada emissão já leva cerca de 1 minuto no portal." />

        <Input v-model="form.parcelas_cobrar_a_partir_de" type="date"
          label="Cobrar parcelas com vencimento a partir de"
          hint="Parcela com vencimento original antes desta data é retroativa: a rodada não emite nem reemite; ela aparece como atraso e só sai pelo botão Emitir agora. Vazio = sem corte." />

        <Select v-model="form.parcelas_vencidas_na_adesao"
          label="Parcela já vencida quando o plano nasce"
          :options="[
            { value: 'emitir', label: 'Emitir agora, com vencimento no próximo dia útil' },
            { value: 'ignorar', label: 'Não emitir (fica prevista para a tela decidir)' },
          ]" />

        <Input v-model.number="form.atraso_max_reemissoes" type="number"
          label="Vias novas por parcela"
          hint="Cada aviso de atraso oferece uma via nova (o cliente responde SIM). Acabaram as vias, o cliente recebe o aviso final, sem nova via, com o número de contato." />

        <Input v-model.number="form.aviso_final_sem_resposta_dias" type="number"
          label="Aviso final sem resposta (dias depois do aviso de atraso)"
          hint="0 desliga. O cliente não respondeu SIM nesse prazo: recebe o aviso final, sem nova via." />

        <Input v-model="form.parcelas_contato"
          label="Número de contato nos avisos"
          hint="Aparece no aviso final e no aviso de baixa. Formato livre, ex.: (44) 99151-0579." />

        <Input v-model.number="form.lembrete_dias_antes" type="number"
          label="Lembrete ao cliente (dias antes do vencimento)"
          hint="0 desliga. E-mail sempre; WhatsApp quando o template estiver aprovado." />

        <Input v-model.number="form.aviso_atraso_dias_depois" type="number"
          label="Aviso de atraso (dias depois do vencimento)"
          hint="0 desliga. Avisa que o boleto venceu e que uma via nova vem aí." />

        <!-- Chaves de comportamento: ficam juntas e ocupam a linha inteira,
             porque a descrição de cada uma é uma frase, não um rótulo. -->
        <div class="md:col-span-2 space-y-4 rounded-lg border border-line bg-surface-sunken p-3">
          <Switch v-model="form.parcelas_exigir_ato_pago"
            label="Só cobrar parcelas com o ato pago"
            description="Desligado, a adesão cria plano para toda reserva com série mensal (ato pago ou não)." />
          <Switch v-model="form.parcelas_encerrar_quando_faturado"
            label="Encerrar o plano quando a venda for faturada no Sienge"
            description="Venda faturada = data com a instituição financeira, a mesma regra do relatório de Faturamento. Aí o ERP passa a cobrar e os boletos em aberto do Office são baixados." />
          <Switch v-model="form.parcelas_aviso_encerramento"
            label="Avisar o cliente quando o plano encerrar"
            description="Ao encerrar por venda faturada ou etapa do repasse, o cliente recebe e-mail e WhatsApp: o contrato chegou à emissão pela Caixa e as parcelas passam para a Confissão de Dívida, com a frase certa para o caso dele (boleto baixado, parcela paga ou sem boleto). Fica no histórico do boleto e vai como mensagem ao corretor no CV. Cancelamento de reserva não avisa." />
          <Switch v-model="form.atraso_reemitir"
            label="Reemitir parcela vencida sem esperar o cliente"
            description="Desligado (padrão): o cliente recebe o aviso de vencida e a nova via sai quando ele responde SIM no WhatsApp ou alguém clica Reemitir na tela. Ligado: a rodada reemite sozinha. Sempre com o mesmo valor e vencimento no próximo dia útil." />
        </div>

        <div class="md:col-span-2 min-w-0">
          <label class="block text-xs font-medium text-ink-muted mb-1.5">
            Encerrar o plano quando o repasse do CV estiver em
          </label>
          <!-- `overlay`: o cartão é overflow-hidden, e sem teleporte o painel do
               seletor ficaria cortado na borda de baixo. -->
          <MultiSelector v-model="etapasLabels" :options="etapasOptions"
            placeholder="Nenhuma etapa (regra desligada)" :page-size="100" overlay />
          <p class="mt-1.5 text-xs text-ink-muted leading-relaxed">
            A partir de "Contrato Emitido CAIXA" vem a confissão de dívida, a assinatura e o faturamento:
            cobrar parcela daí em diante gera pagamento sem a informação para os contratos. Marque a etapa e
            todas as seguintes da linha principal; a rodada encerra o plano e baixa os boletos em aberto
            quando o repasse estiver em qualquer uma delas. Vazio desliga a regra.
          </p>
        </div>

        <!-- Endereço de contingência -->
        <div class="md:col-span-2 space-y-4 rounded-lg border border-line bg-surface-sunken p-3">
          <Switch v-model="form.parcelas_cep_contingencia_ativo"
            label="CEP recusado pela Caixa: emitir com o endereço de contingência"
            description="A Caixa não aceita o CEP genérico da cidade (86360-000, 14940-000). Ligado, o boleto sai mesmo assim com o endereço abaixo (o da Menin, que também está no contrato), a reserva fica com o alerta CEP a corrigir no CV e o corretor recebe a mensagem no CV. Desligado, a parcela fica em erro até o cadastro ser corrigido." />
          <div v-if="form.parcelas_cep_contingencia_ativo"
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Input v-model="form.parcelas_cep_contingencia.cep" label="CEP" placeholder="17500005" />
            <Input v-model="form.parcelas_cep_contingencia.endereco" label="Logradouro"
              class="sm:col-span-2" />
            <Input v-model="form.parcelas_cep_contingencia.numero" label="Número" />
            <Input v-model="form.parcelas_cep_contingencia.complemento" label="Complemento" />
            <Input v-model="form.parcelas_cep_contingencia.bairro" label="Bairro" />
            <Input v-model="form.parcelas_cep_contingencia.cidade" label="Cidade" />
            <Input v-model="form.parcelas_cep_contingencia.estado" label="UF" placeholder="SP" />
          </div>
        </div>
      </div>

      <!-- Templates de WhatsApp das parcelas -->
      <section class="space-y-3 pt-4 border-t border-line-subtle">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-ink">Templates de WhatsApp das parcelas</h3>
            <p class="mt-1 text-xs text-ink-muted leading-relaxed">
              Boleto da parcela, lembrete, aviso de atraso, aviso final, aviso de baixa e aviso de encerramento.
              Até a Meta aprovar, o WhatsApp só sai na janela de 24h; o e-mail sai sempre.
            </p>
          </div>
          <Button variant="ghost" size="sm" icon="fas fa-cloud-arrow-up"
            :loading="parcelas.templatesLoading" @click="parcelas.syncTemplates()">
            Criar / sincronizar na Meta
          </Button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <Badge v-for="t in parcelas.templates" :key="t.name"
            :variant="t.approved ? 'success' : (t.status ? 'warning' : 'neutral')" size="sm" dot>
            {{ t.name }} · {{ t.status || 'não criado' }}
          </Badge>
        </div>
        <p v-if="parcelas.templatesMsg" class="text-xs text-ink-muted">{{ parcelas.templatesMsg }}</p>
      </section>

      <!-- Ação do cartão no rodapé: primeiro se lê, depois se decide. -->
      <div class="flex items-center justify-end gap-2 pt-4 border-t border-line-subtle">
        <template v-if="!editing">
          <Button variant="ghost" size="sm" icon="fas fa-pen-to-square" @click="startEdit">Editar</Button>
        </template>
        <template v-else>
          <Button variant="ghost" size="sm" icon="fas fa-xmark" @click="cancelEdit">Cancelar</Button>
          <Button variant="primary" size="sm" icon="fas fa-check"
            :loading="boletoStore.settingsLoading" @click="save">Salvar</Button>
        </template>
      </div>
    </div>
  </SettingsCard>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import SettingsCard from '@/components/UI/SettingsCard.vue';
import CampoConfig from './CampoConfig.vue';
import ChipId from './ChipId.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import { formatDateTime, formatDate } from './parcelasFormat';

const boletoStore = useBoletoStore();
const parcelas = useParcelasStore();

const CAMPOS = [
  'parcelas_ativo', 'parcelas_idseries', 'parcelas_exigir_ato_pago', 'parcelas_antecedencia_dias',
  'parcelas_encerrar_quando_faturado', 'parcelas_encerrar_etapas_repasse', 'parcelas_vencidas_na_adesao', 'parcelas_cobrar_a_partir_de',
  'parcelas_hora_rodada', 'parcelas_max_emissoes_rodada', 'parcelas_lote_tamanho', 'parcelas_lote_pausa_min',
  'atraso_reemitir', 'atraso_max_reemissoes',
  'lembrete_dias_antes', 'aviso_atraso_dias_depois', 'aviso_final_sem_resposta_dias', 'parcelas_aviso_encerramento', 'parcelas_contato',
  'parcelas_cep_contingencia_ativo', 'parcelas_cep_contingencia',
];
const DEFAULTS = {
  parcelas_ativo: false, parcelas_idseries: [20], parcelas_exigir_ato_pago: true, parcelas_antecedencia_dias: 10,
  parcelas_encerrar_quando_faturado: true, parcelas_encerrar_etapas_repasse: [45, 27, 57, 47, 48, 46, 54, 33, 34, 35, 36], parcelas_aviso_encerramento: true,
  parcelas_cep_contingencia_ativo: true,
  parcelas_cep_contingencia: { cep: '17500005', endereco: 'Rua São Luiz', numero: '231', complemento: '', bairro: 'Centro', cidade: 'Marília', estado: 'SP' },
  parcelas_vencidas_na_adesao: 'emitir', parcelas_cobrar_a_partir_de: '',
  parcelas_hora_rodada: 9, parcelas_max_emissoes_rodada: 0, parcelas_lote_tamanho: 10, parcelas_lote_pausa_min: 5,
  atraso_reemitir: false, atraso_max_reemissoes: 2,
  lembrete_dias_antes: 3, aviso_atraso_dias_depois: 1, aviso_final_sem_resposta_dias: 15, parcelas_contato: '(44) 99151-0579',
};
const form = ref(JSON.parse(JSON.stringify(DEFAULTS)));
const editing = ref(false);
let snapshot = null;
const novaSerie = ref(null);

function carregar() {
  const s = boletoStore.settings || {};
  for (const k of CAMPOS) {
    if (s[k] === undefined || s[k] === null) continue;
    if (Array.isArray(DEFAULTS[k])) form.value[k] = [...s[k]];
    else if (DEFAULTS[k] && typeof DEFAULTS[k] === 'object') form.value[k] = { ...DEFAULTS[k], ...(typeof s[k] === 'object' ? s[k] : {}) };
    else form.value[k] = typeof DEFAULTS[k] === 'number' ? Number(s[k]) : s[k];
  }
}
function startEdit() { snapshot = JSON.parse(JSON.stringify(form.value)); editing.value = true; }
function cancelEdit() { if (snapshot) form.value = snapshot; snapshot = null; editing.value = false; }
async function save() {
  const payload = {};
  for (const k of CAMPOS) payload[k] = form.value[k];
  await boletoStore.saveSettings(payload);
  if (!boletoStore.settingsError) { editing.value = false; snapshot = null; parcelas.fetchStatus(); }
}
function addSerie() {
  const id = Number(novaSerie.value);
  if (!id || form.value.parcelas_idseries.includes(id)) return;
  form.value.parcelas_idseries = [...form.value.parcelas_idseries, id];
  novaSerie.value = null;
}
function removeSerie(id) { form.value.parcelas_idseries = form.value.parcelas_idseries.filter(s => s !== id); }

/* Linha do cartão fechado: o que se vem conferir sem abrir - se está cobrando,
   com quanta antecedência e a partir de qual vencimento. */
const resumoCartao = computed(() => [
  `${form.value.parcelas_antecedencia_dias} dias de antecedência`,
  `rodada às ${String(form.value.parcelas_hora_rodada).padStart(2, '0')}:00`,
].join(' · '));

/* Etapas do repasse: o MultiSelector trabalha com rótulos; o form guarda os ids. */
const etapaLabel = (e) => `${e.id} · ${e.nome}`;
const etapasOptions = computed(() => parcelas.repasseEtapas.map(etapaLabel));
const etapasLabels = computed({
  get: () => form.value.parcelas_encerrar_etapas_repasse.map(id => {
    const e = parcelas.repasseEtapas.find(x => x.id === Number(id));
    return e ? etapaLabel(e) : `${id} · (etapa não encontrada no CV)`;
  }),
  set: (labels) => { form.value.parcelas_encerrar_etapas_repasse = labels.map(l => Number(String(l).split(' · ')[0])).filter(n => n > 0); },
});
const etapasResumo = computed(() => {
  const nomes = form.value.parcelas_encerrar_etapas_repasse.map(id => parcelas.repasseEtapas.find(x => x.id === Number(id))?.nome || `#${id}`);
  return nomes.length <= 3 ? nomes.join(', ') : `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}`;
});

onMounted(async () => {
  if (!boletoStore.settings) await boletoStore.fetchSettings();
  carregar();
  parcelas.fetchTemplates();
  parcelas.fetchStatus();
  parcelas.fetchRepasseEtapas();
});
</script>
