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
        description="Ligado: a rodada diária emite os boletos das parcelas que vencem dentro da antecedência, reemite as vencidas com encargos e avisa o cliente. Desligado: só calcula e mostra os planos." />
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
        <p class="text-ink font-mono">{{ String(form.parcelas_hora_rodada).padStart(2, '0') }}:00 · até {{ form.parcelas_max_emissoes_rodada }} boletos</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Exige ato pago</p>
        <p class="text-ink font-mono">{{ form.parcelas_exigir_ato_pago ? 'sim' : 'não' }}</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Encerra quando o Sienge fatura</p>
        <p class="text-ink font-mono">{{ form.parcelas_encerrar_quando_faturado ? 'sim' : 'não' }}</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Parcela já vencida na adesão</p>
        <p class="text-ink font-mono">{{ form.parcelas_vencidas_na_adesao === 'ignorar' ? 'ignorar' : `emitir com vencimento em ${form.parcelas_prazo_vencida_dias} dias, sem encargos` }}</p>
      </div>
      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Atraso</p>
        <p class="text-ink font-mono">
          {{ form.atraso_reemitir ? `reemite até ${form.atraso_max_reemissoes}x` : 'não reemite' }}
          <span v-if="form.atraso_reemitir && form.atraso_cobrar_encargos"> · multa {{ form.atraso_multa_pct }}% + juros {{ form.atraso_juros_mes_pct }}% a.m.</span>
          <span v-else-if="form.atraso_reemitir"> · sem encargos</span>
        </p>
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
      <Input v-model.number="form.parcelas_max_emissoes_rodada" type="number" label="Máx. de boletos por rodada" hint="O resto sai no dia seguinte. Segura a primeira rodada, que tem fila acumulada." />
      <div class="space-y-3">
        <Switch v-model="form.parcelas_exigir_ato_pago" label="Só cobrar parcelas com o ato pago" description="Desligado, a adesão cria plano para toda reserva com série mensal (ato pago ou não)." />
        <Switch v-model="form.parcelas_encerrar_quando_faturado" label="Encerrar o plano quando o Sienge faturar" description="Contrato com título no Sienge = o ERP cobra. Os boletos em aberto do Office são baixados." />
      </div>
      <div>
        <Select v-model="form.parcelas_vencidas_na_adesao" label="Parcela já vencida quando o plano nasce"
          :options="[{ value: 'emitir', label: 'Emitir agora, com vencimento novo e sem encargos' }, { value: 'ignorar', label: 'Não emitir (fica prevista para a tela decidir)' }]" />
        <Input v-model.number="form.parcelas_prazo_vencida_dias" type="number" class="mt-3" label="Prazo do vencimento novo (dias)" hint="Vale para a parcela vencida na adesão e para a reemissão por atraso." />
      </div>
      <div class="space-y-3">
        <Switch v-model="form.atraso_reemitir" label="Reemitir parcela vencida automaticamente" description="Boleto vencido é baixado pela rodada das 08h; no dia, a rodada de parcelas gera uma via nova." />
        <Input v-model.number="form.atraso_max_reemissoes" type="number" label="Máx. de reemissões por parcela" hint="Depois disso a parcela para e aparece como atraso para alguém decidir." />
      </div>
      <div class="space-y-3">
        <Switch v-model="form.atraso_cobrar_encargos" label="Cobrar multa e juros na reemissão" description="Mesmos percentuais que o CV manda ao Sienge (2% e 1% a.m.). Calculados sobre o valor original, pro rata dia." />
        <div class="grid grid-cols-2 gap-3">
          <Input v-model.number="form.atraso_multa_pct" type="number" step="0.01" label="Multa (%)" />
          <Input v-model.number="form.atraso_juros_mes_pct" type="number" step="0.01" label="Juros (% ao mês)" />
        </div>
      </div>
      <Input v-model.number="form.lembrete_dias_antes" type="number" label="Lembrete ao cliente (dias antes do vencimento)" hint="0 desliga. E-mail sempre; WhatsApp quando o template estiver aprovado." />
      <Input v-model.number="form.aviso_atraso_dias_depois" type="number" label="Aviso de atraso (dias depois do vencimento)" hint="0 desliga. Avisa que o boleto venceu e que uma via nova vem aí." />
    </div>

    <!-- Templates WhatsApp das parcelas -->
    <div class="pt-3 border-t border-line">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-sm font-semibold">Templates de WhatsApp das parcelas</p>
          <p class="text-ink-muted">Boleto da parcela, lembrete e aviso de atraso. Até a Meta aprovar, o WhatsApp só sai na janela de 24h; o e-mail sai sempre.</p>
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
import { ref, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import { formatDateTime } from './parcelasFormat';

const boletoStore = useBoletoStore();
const parcelas = useParcelasStore();

const CAMPOS = [
  'parcelas_ativo', 'parcelas_idseries', 'parcelas_exigir_ato_pago', 'parcelas_antecedencia_dias',
  'parcelas_encerrar_quando_faturado', 'parcelas_vencidas_na_adesao', 'parcelas_prazo_vencida_dias',
  'parcelas_hora_rodada', 'parcelas_max_emissoes_rodada', 'atraso_reemitir', 'atraso_max_reemissoes',
  'atraso_cobrar_encargos', 'atraso_multa_pct', 'atraso_juros_mes_pct', 'lembrete_dias_antes', 'aviso_atraso_dias_depois',
];
const DEFAULTS = {
  parcelas_ativo: false, parcelas_idseries: [20, 1, 37], parcelas_exigir_ato_pago: true, parcelas_antecedencia_dias: 10,
  parcelas_encerrar_quando_faturado: true, parcelas_vencidas_na_adesao: 'emitir', parcelas_prazo_vencida_dias: 5,
  parcelas_hora_rodada: 9, parcelas_max_emissoes_rodada: 40, atraso_reemitir: true, atraso_max_reemissoes: 3,
  atraso_cobrar_encargos: true, atraso_multa_pct: 2, atraso_juros_mes_pct: 1, lembrete_dias_antes: 3, aviso_atraso_dias_depois: 1,
};
const form = ref({ ...DEFAULTS });
const editing = ref(false);
let snapshot = null;
const novaSerie = ref(null);

function carregar() {
  const s = boletoStore.settings || {};
  for (const k of CAMPOS) {
    if (s[k] === undefined || s[k] === null) continue;
    form.value[k] = Array.isArray(DEFAULTS[k]) ? [...s[k]] : (typeof DEFAULTS[k] === 'number' ? Number(s[k]) : s[k]);
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

onMounted(async () => {
  if (!boletoStore.settings) await boletoStore.fetchSettings();
  carregar();
  parcelas.fetchTemplates();
  parcelas.fetchStatus();
});
</script>
