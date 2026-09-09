<!--
  Card "Parcelas mensais" da aba Configurações do Ato. Toda regra da cobrança
  das parcelas mora aqui (e em boleto_settings no backend); o código só tem o
  fallback. Modo leitura por padrão; Editar abre os campos.
-->
<template>
  <Panel class="space-y-4 surface-gradient">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl grid place-items-center border"
          :class="form.parcelas_ativo ? 'bg-data-pos/10 text-data-pos border-data-pos/20' : 'bg-surface-sunken text-ink-muted border-line'">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div>
          <h2 class="font-semibold text-sm">Parcelas mensais</h2>
          <p class="text-ink-muted">
            Depois do ato pago, o Office cobra as mensais até o Sienge faturar o contrato.
            {{ form.parcelas_ativo ? 'Cobrança ligada.' : 'Cobrança pausada: os planos são calculados, mas nenhum boleto sai.' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <template v-if="!editing">
          <Button variant="ghost" size="sm" icon="fas fa-pen-to-square" @click="startEdit">Editar</Button>
        </template>
        <template v-else>
          <Button variant="ghost" size="sm" icon="fas fa-xmark" @click="cancelEdit">Cancelar</Button>
          <Button variant="primary" size="sm" icon="fas fa-check" :loading="boletoStore.settingsLoading" @click="save">Salvar</Button>
        </template>
      </div>
    </div>

    <!-- Interruptor mestre, separado do resto: é a decisão que mais pesa. -->
    <div class="rounded-xl border border-line bg-surface-sunken/60 p-3">
      <Switch v-model="form.parcelas_ativo" :disabled="!editing"
        label="Cobrar as parcelas mensais automaticamente"
        description="Ligado: a rodada diária emite os boletos das parcelas que vencem dentro da antecedência, lembra o cliente antes do vencimento e avisa quando venceu. Desligado: só calcula e mostra os planos." />
    </div>

    <!-- ── LEITURA ──────────────────────────────────────────────────────── -->
    <div v-if="!editing" class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Séries mensais (CV)</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="id in form.parcelas_idseries" :key="id" class="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-mono">{{ id }}</span>
        </div>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Antecedência da emissão</p>
        <p class="text-ink font-mono">{{ form.parcelas_antecedencia_dias }} dias</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Hora da rodada</p>
        <p class="text-ink font-mono">
          {{ String(form.parcelas_hora_rodada).padStart(2, '0') }}:00 ·
          {{ form.parcelas_max_emissoes_rodada > 0 ? `até ${form.parcelas_max_emissoes_rodada} boletos` : 'tudo da janela no mesmo dia' }}
          · lotes de {{ form.parcelas_lote_tamanho }}{{ form.parcelas_lote_pausa_min > 0 ? ` com ${form.parcelas_lote_pausa_min} min de pausa` : '' }}
        </p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Exige ato pago</p>
        <p class="text-ink font-mono">{{ form.parcelas_exigir_ato_pago ? 'sim' : 'não' }}</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Quando o plano encerra</p>
        <p class="text-ink font-mono">{{ form.parcelas_encerrar_quando_faturado ? 'venda faturada no Sienge (regra do Faturamento)' : 'não encerra pelo Sienge' }}</p>
        <p class="text-ink font-mono mt-0.5">
          <template v-if="form.parcelas_encerrar_etapas_repasse.length">repasse do CV em {{ form.parcelas_encerrar_etapas_repasse.length }} etapa{{ form.parcelas_encerrar_etapas_repasse.length === 1 ? '' : 's' }}: {{ etapasResumo }}</template>
          <template v-else>não encerra pela etapa do repasse</template>
        </p>
        <p class="text-ink-subtle mt-0.5">Qualquer uma das regras basta. Ao encerrar, os boletos em aberto são baixados e o cliente para de receber cobrança do Office.</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Cobrar a partir de</p>
        <p class="text-ink font-mono">{{ form.parcelas_cobrar_a_partir_de ? formatDate(form.parcelas_cobrar_a_partir_de) : 'sem corte' }}</p>
        <p class="text-ink-subtle mt-0.5">Parcela vencida antes disso é retroativa: a rodada não toca, fica na tela para trabalho manual.</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Parcela já vencida na adesão</p>
        <p class="text-ink font-mono">{{ form.parcelas_vencidas_na_adesao === 'ignorar' ? 'ignorar' : 'emitir com vencimento no próximo dia útil' }}</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Parcela vencida</p>
        <p class="text-ink font-mono">
          {{ form.atraso_reemitir ? `a rodada reemite sozinha, até ${form.atraso_max_reemissoes} via(s) nova(s)` : `a pedido (cliente responde SIM ou botão Reemitir), até ${form.atraso_max_reemissoes} via(s) nova(s)` }} · próximo dia útil
        </p>
        <p class="text-ink-subtle mt-0.5">Acabaram as vias{{ form.aviso_final_sem_resposta_dias ? ` ou ${form.aviso_final_sem_resposta_dias} dias sem resposta ao aviso` : '' }}: aviso final sem nova via, com o número {{ form.parcelas_contato }}.</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">CEP recusado pela Caixa</p>
        <p class="text-ink font-mono">
          <template v-if="form.parcelas_cep_contingencia_ativo">emite com {{ form.parcelas_cep_contingencia.endereco }}, {{ form.parcelas_cep_contingencia.numero }} · CEP {{ form.parcelas_cep_contingencia.cep }} · {{ form.parcelas_cep_contingencia.cidade }}/{{ form.parcelas_cep_contingencia.estado }}</template>
          <template v-else>parcela fica em erro até corrigir o CV</template>
        </p>
        <p class="text-ink-subtle mt-0.5">A reserva fica com o alerta "CEP a corrigir no CV" até a Caixa aceitar o endereço do cadastro.</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Lembrete / aviso ao cliente</p>
        <p class="text-ink font-mono">
          {{ form.lembrete_dias_antes ? `${form.lembrete_dias_antes} dias antes` : 'sem lembrete' }} ·
          {{ form.aviso_atraso_dias_depois ? `${form.aviso_atraso_dias_depois} dia(s) depois` : 'sem aviso' }}
        </p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Última rodada</p>
        <p class="text-ink font-mono">{{ parcelas.status?.ultima_rodada_em ? formatDateTime(parcelas.status.ultima_rodada_em) : 'ainda não rodou' }}</p>
      </div>
    </div>

    <!-- ── EDIÇÃO ───────────────────────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">Séries mensais do CV (IDs)</label>
        <div class="flex gap-2">
          <Input v-model.number="novaSerie" type="number" placeholder="Ex.: 20" @keydown.enter.prevent="addSerie" />
          <Button variant="primary" size="sm" icon="fas fa-plus" @click="addSerie">Adicionar</Button>
        </div>
        <div class="flex flex-wrap gap-1 mt-2">
          <span v-for="id in form.parcelas_idseries" :key="id" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-mono">
            {{ id }}
            <button type="button" class="hover:text-data-neg leading-none" @click="removeSerie(id)"><i class="fas fa-times text-micro"></i></button>
          </span>
        </div>
        <p class="text-ink-subtle mt-1.5">Na base: 20 = Recurso Próprio Parcelado, 1 = Parcelas Mensais, 37 = Parcelas Mensais (URBAN).</p>
      </div>
      <Input v-model.number="form.parcelas_antecedencia_dias" type="number" label="Antecedência da emissão (dias)" hint="O boleto da parcela sai N dias corridos antes do vencimento." />
      <Input v-model.number="form.parcelas_hora_rodada" type="number" label="Hora da rodada diária (0-23, Brasília)" hint="Depois das 08h, que é quando a rodada de pagamento marca o que foi pago ou venceu." />
      <div class="grid grid-cols-2 gap-3">
        <Input v-model.number="form.parcelas_lote_tamanho" type="number" label="Boletos por lote" hint="A rodada emite em lotes; entre um e outro faz a pausa ao lado. Tudo que está na janela sai no mesmo dia." />
        <Input v-model.number="form.parcelas_lote_pausa_min" type="number" label="Pausa entre lotes (min)" hint="0 = sem pausa. Cada emissão já leva cerca de 1 minuto no portal." />
      </div>
      <Input v-model.number="form.parcelas_max_emissoes_rodada" type="number" label="Teto de boletos por rodada (0 = sem teto)" hint="Só use para segurar um dia específico. Com teto, o que sobrar fica para o dia seguinte." />
      <div class="space-y-3">
        <Switch v-model="form.parcelas_exigir_ato_pago" label="Só cobrar parcelas com o ato pago" description="Desligado, a adesão cria plano para toda reserva com série mensal (ato pago ou não)." />
        <Switch v-model="form.parcelas_encerrar_quando_faturado" label="Encerrar o plano quando a venda for faturada no Sienge" description="Venda faturada = data com a instituição financeira, a mesma regra do relatório de Faturamento. Aí o ERP passa a cobrar e os boletos em aberto do Office são baixados." />
      </div>
      <div class="md:col-span-2">
        <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">Encerrar o plano quando o repasse do CV estiver em</label>
        <MultiSelector v-model="etapasLabels" :options="etapasOptions" placeholder="Nenhuma etapa (regra desligada)" :page-size="100" />
        <p class="text-ink-subtle mt-1.5">
          A partir de "Contrato Emitido CAIXA" vem a confissão de dívida, a assinatura e o faturamento: cobrar parcela daí em diante gera
          pagamento sem a informação para os contratos. Marque a etapa e todas as seguintes da linha principal; a rodada encerra o plano
          e baixa os boletos em aberto quando o repasse estiver em qualquer uma delas. Vazio desliga a regra.
        </p>
      </div>
      <Input v-model="form.parcelas_cobrar_a_partir_de" type="date" label="Cobrar parcelas com vencimento a partir de"
        hint="Parcela com vencimento original antes desta data é retroativa: a rodada não emite nem reemite; ela aparece como atraso e só sai pelo botão Emitir agora. Vazio = sem corte." />
      <Select v-model="form.parcelas_vencidas_na_adesao" label="Parcela já vencida quando o plano nasce"
        :options="[{ value: 'emitir', label: 'Emitir agora, com vencimento no próximo dia útil' }, { value: 'ignorar', label: 'Não emitir (fica prevista para a tela decidir)' }]" />
      <div class="space-y-3">
        <Switch v-model="form.atraso_reemitir" label="Reemitir parcela vencida sem esperar o cliente" description="Desligado (padrão): o cliente recebe o aviso de vencida e a nova via sai quando ele responde SIM no WhatsApp ou alguém clica Reemitir na tela. Ligado: a rodada reemite sozinha. Sempre com o mesmo valor e vencimento no próximo dia útil." />
        <Input v-model.number="form.atraso_max_reemissoes" type="number" label="Vias novas por parcela" hint="Cada aviso de atraso oferece uma via nova (o cliente responde SIM). Acabaram as vias, o cliente recebe o aviso final, sem nova via, com o número de contato; a parcela fica como atraso para alguém decidir." />
      </div>
      <Input v-model.number="form.aviso_final_sem_resposta_dias" type="number" label="Aviso final sem resposta (dias depois do aviso de atraso)" hint="0 desliga. O cliente não respondeu SIM nesse prazo: recebe o aviso final, sem nova via, com o número de contato." />
      <Input v-model="form.parcelas_contato" label="Número de contato nos avisos" hint="Aparece no aviso final e no aviso de baixa. Formato livre, ex.: (44) 99151-0579." />
      <Input v-model.number="form.lembrete_dias_antes" type="number" label="Lembrete ao cliente (dias antes do vencimento)" hint="0 desliga. E-mail sempre; WhatsApp quando o template estiver aprovado." />
      <Input v-model.number="form.aviso_atraso_dias_depois" type="number" label="Aviso de atraso (dias depois do vencimento)" hint="0 desliga. Avisa que o boleto venceu e que uma via nova vem aí." />
      <div class="md:col-span-2 pt-3 border-t border-line space-y-3">
        <Switch v-model="form.parcelas_cep_contingencia_ativo" label="CEP recusado pela Caixa: emitir com o endereço de contingência"
          description="A Caixa não aceita o CEP genérico da cidade (86360-000, 14940-000). Ligado, o boleto sai mesmo assim com o endereço abaixo (o da Menin, que também está no contrato), a reserva fica com o alerta 'CEP a corrigir no CV' e o corretor recebe a mensagem no CV. Desligado, a parcela fica em erro até o cadastro ser corrigido." />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input v-model="form.parcelas_cep_contingencia.cep" label="CEP" placeholder="17500005" />
          <Input v-model="form.parcelas_cep_contingencia.endereco" label="Logradouro" class="col-span-2" />
          <Input v-model="form.parcelas_cep_contingencia.numero" label="Número" />
          <Input v-model="form.parcelas_cep_contingencia.complemento" label="Complemento" />
          <Input v-model="form.parcelas_cep_contingencia.bairro" label="Bairro" />
          <Input v-model="form.parcelas_cep_contingencia.cidade" label="Cidade" />
          <Input v-model="form.parcelas_cep_contingencia.estado" label="UF" placeholder="SP" />
        </div>
      </div>
    </div>

    <!-- Templates WhatsApp das parcelas -->
    <div class="pt-3 border-t border-line">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Templates de WhatsApp das parcelas</p>
          <p class="text-ink-muted">Boleto da parcela, lembrete, aviso de atraso, aviso final e aviso de baixa. Até a Meta aprovar, o WhatsApp só sai na janela de 24h; o e-mail sai sempre.</p>
        </div>
        <Button variant="outline" size="sm" icon="fas fa-cloud-arrow-up" :loading="parcelas.templatesLoading" @click="parcelas.syncTemplates()">Criar / sincronizar na Meta</Button>
      </div>
      <div class="flex flex-wrap gap-2 mt-2">
        <Badge v-for="t in parcelas.templates" :key="t.name" :variant="t.approved ? 'success' : (t.status ? 'warning' : 'neutral')" size="sm" dot>
          {{ t.name }} · {{ t.status || 'não criado' }}
        </Badge>
      </div>
      <p v-if="parcelas.templatesMsg" class="text-xs text-ink-muted mt-2">{{ parcelas.templatesMsg }}</p>
    </div>
  </Panel>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import Panel from '@/components/UI/Panel.vue';
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
  'lembrete_dias_antes', 'aviso_atraso_dias_depois', 'aviso_final_sem_resposta_dias', 'parcelas_contato',
  'parcelas_cep_contingencia_ativo', 'parcelas_cep_contingencia',
];
const DEFAULTS = {
  parcelas_ativo: false, parcelas_idseries: [20], parcelas_exigir_ato_pago: true, parcelas_antecedencia_dias: 10,
  parcelas_encerrar_quando_faturado: true, parcelas_encerrar_etapas_repasse: [45, 27, 57, 47, 48, 46, 54, 33, 34, 35, 36],
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
