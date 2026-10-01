<script setup>
/**
 * SiengeImportModal — "Importar do Sienge".
 *
 * Traz para o Fluxo de Pagamento o que foi medido no Sienge por fora do Office,
 * já na etapa em que está. Ninguém informa nada: a busca roda sozinha (em
 * segundo plano no servidor, porque o Sienge limita consultas) e a importação
 * usa o resultado dela. Só lê o Sienge - nada muda lá.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { useCan } from '@/composables/useCan';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';

const emit = defineEmits(['close', 'imported']);
const store = usePaymentFlowStore();
const toast = useToast();
const can = useCan('/financeiro/paymentflow');

const scan = ref({ status: 'idle' });
const erro = ref(null);
const importando = ref(false);
const selecionados = ref(new Set());
const filtroEtapa = ref('');
let timer = null;

const resultado = computed(() => scan.value.result || null);
const candidatos = computed(() => resultado.value?.candidatos || []);
const visiveis = computed(() => (filtroEtapa.value ? candidatos.value.filter(c => c.etapa === filtroEtapa.value) : candidatos.value));
const totalSel = computed(() => candidatos.value.filter(c => selecionados.value.has(c.key)).length);

const ETAPA_TOM = {
    medicao_pendente: 'warning', medicao_autorizada: 'info',
    titulo_sem_boleto: 'danger', titulo_aberto: 'accent', liberada_sem_titulo: 'warning',
};

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (v) => { if (!v) return '—'; const [y, m, d] = String(v).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const decorrido = computed(() => {
    if (!scan.value.startedAt) return '';
    const fim = scan.value.finishedAt || Date.now();
    const s = Math.round((fim - scan.value.startedAt) / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
});

async function atualizar() {
    try {
        scan.value = await store.getSiengeImportScan();
        if (scan.value.status === 'done' && scan.value.result && !selecionados.value.size) {
            selecionados.value = new Set(scan.value.result.candidatos.map(c => c.key));
        }
        if (scan.value.status !== 'running') pararTimer();
    } catch (err) {
        erro.value = err.message;
        pararTimer();
    }
}

function pararTimer() { if (timer) { clearInterval(timer); timer = null; } }
function iniciarTimer() { pararTimer(); timer = setInterval(atualizar, 3000); }

async function buscar() {
    erro.value = null;
    selecionados.value = new Set();
    try {
        scan.value = await store.startSiengeImportScan();
        iniciarTimer();
    } catch (err) {
        erro.value = err.message;
    }
}

function alternar(key) {
    const s = new Set(selecionados.value);
    if (s.has(key)) s.delete(key); else s.add(key);
    selecionados.value = s;
}
function marcarTodos(v) {
    selecionados.value = v ? new Set(visiveis.value.map(c => c.key).concat([...selecionados.value])) : new Set([...selecionados.value].filter(k => !visiveis.value.some(c => c.key === k)));
}

async function importar() {
    const n = totalSel.value;
    if (!n) return;
    if (!await pedirConfirmacao({
        title: `Importar ${n} lançamento(s) do Sienge?`,
        consequence: `Cria ${n} lançamento(s) no Fluxo de Pagamento, cada um na etapa em que está no Sienge, e passa a acompanhar o pagamento. Nada é alterado no Sienge. Medição autorizada sem título fica esperando a nota fiscal; ao anexar a nota, o título é gerado.`,
        confirmLabel: `Importar ${n}`,
        tone: 'accent',
    })) return;
    importando.value = true;
    try {
        const all = totalSel.value === candidatos.value.length;
        const r = await store.applySiengeImport(all ? null : [...selecionados.value]);
        toast.success(`${r.importados} lançamento(s) importado(s) do Sienge.`);
        emit('imported');
        emit('close');
    } catch (err) {
        erro.value = err.message;
    } finally {
        importando.value = false;
    }
}

// ── Critério (capacidade configure) ──────────────────────────────────────────
const mostrarCriterio = ref(false);
const criterio = ref({ windowDays: '', documents: '' });
async function abrirCriterio() {
    mostrarCriterio.value = !mostrarCriterio.value;
    if (mostrarCriterio.value) {
        const s = await store.getSiengeImportSettings().catch(() => null);
        if (s) criterio.value = { windowDays: s.windowDays, documents: (s.documents || []).join(', ') };
    }
}
async function salvarCriterio() {
    try {
        await store.saveSiengeImportSettings({ windowDays: Number(criterio.value.windowDays), documents: criterio.value.documents });
        toast.success('Critério salvo. Buscando de novo...');
        mostrarCriterio.value = false;
        await buscar();
    } catch (err) {
        erro.value = err.message;
    }
}

onMounted(async () => {
    await atualizar();
    if (['idle', 'expired', 'error'].includes(scan.value.status)) await buscar();
    else if (scan.value.status === 'running') iniciarTimer();
});
onBeforeUnmount(pararTimer);
</script>

<template>
  <Modal :open="true" size="lg" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-cloud-arrow-down text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Importar do Sienge</h2>
          <p class="text-ink-muted mt-0.5">O que foi medido no Sienge por fora do Office, já na etapa em que está.</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Buscando -->
      <div v-if="scan.status === 'running'" class="py-8 grid place-items-center gap-2 text-center">
        <Spinner size="md" />
        <p class="text-sm text-ink">{{ scan.progresso?.etapa || 'Buscando no Sienge' }}<span v-if="scan.progresso?.total"> ({{ scan.progresso.feito }}/{{ scan.progresso.total }})</span></p>
        <p class="text-micro text-ink-subtle">Leva alguns minutos: o Sienge limita as consultas. Pode fechar e voltar depois; a busca continua. {{ decorrido }}</p>
      </div>

      <div v-if="erro || scan.status === 'error'" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-data-neg">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ erro || scan.error }}
      </div>

      <!-- Resultado -->
      <template v-if="scan.status === 'done' && resultado">
        <p class="text-ink-muted">
          Período {{ data(resultado.periodo.de) }} a {{ data(resultado.periodo.ate) }} · {{ resultado.analisadas }} medições comerciais no seu acesso ·
          {{ resultado.jaAcompanhadas }} já estão no Office · {{ resultado.pagosIgnorados }} já pagas (ficam de fora).
        </p>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-lg border px-3 min-h-[40px] text-xs"
            :class="!filtroEtapa ? 'border-accent bg-accent-soft/40 text-accent' : 'border-line text-ink-muted'"
            @click="filtroEtapa = ''">Todas ({{ candidatos.length }})</button>
          <button v-for="(n, etapa) in resultado.resumo" :key="etapa" type="button" class="rounded-lg border px-3 min-h-[40px] text-xs"
            :class="filtroEtapa === etapa ? 'border-accent bg-accent-soft/40 text-accent' : 'border-line text-ink-muted'"
            @click="filtroEtapa = filtroEtapa === etapa ? '' : etapa">
            {{ resultado.etapas[etapa] }} ({{ n }})
          </button>
        </div>

        <div v-for="(a, i) in resultado.avisos" :key="i" class="rounded-lg border border-data-warn/30 bg-data-warn/10 px-3 py-2 text-data-warn text-xs">
          <i class="fas fa-triangle-exclamation mr-1"></i>{{ a }}
        </div>

        <p v-if="!candidatos.length" class="py-6 text-center text-ink-muted">Nada pendente para importar: tudo o que está no Sienge já é acompanhado pelo Office.</p>

        <div v-else class="space-y-2">
          <label class="flex items-center gap-2 text-xs text-ink-muted min-h-[40px]">
            <input type="checkbox" :checked="visiveis.every(c => selecionados.has(c.key))" @change="e => marcarTodos(e.target.checked)" />
            Marcar todos desta lista ({{ visiveis.length }})
          </label>
          <div class="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            <label v-for="c in visiveis" :key="c.key"
              class="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-2 cursor-pointer">
              <input type="checkbox" class="mt-1" :checked="selecionados.has(c.key)" @change="alternar(c.key)" />
              <span class="min-w-0 flex-1 space-y-0.5">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium text-ink truncate">{{ c.fornecedor }}</span>
                  <Badge :variant="ETAPA_TOM[c.etapa] || 'neutral'" size="sm">{{ c.etapaLabel }}</Badge>
                </span>
                <span class="block text-xs text-ink-muted">
                  {{ c.contrato }} · medição nº {{ c.measurementNumber }} · {{ c.obra }}
                </span>
                <span class="block text-xs text-ink">
                  {{ moeda(c.valor) }}<span v-if="c.valorLiquido && Math.abs(c.valorLiquido - c.valor) > 0.009" class="text-ink-muted"> (líquido {{ moeda(c.valorLiquido) }})</span>
                  <span v-if="c.titulo"> · título {{ c.titulo.id }} {{ c.titulo.documento }} {{ c.titulo.numero }}</span>
                  <span v-if="c.vencimento"> · vence {{ data(c.vencimento) }}</span>
                </span>
                <span class="block text-micro text-ink-subtle">
                  Tipo: {{ c.tipo || 'não identificado' }}<span v-if="c.tipoAlternativas?.length"> (ou {{ c.tipoAlternativas.join(', ') }})</span>
                  <span v-if="c.observacao"> · {{ c.observacao }}</span>
                </span>
              </span>
            </label>
          </div>
        </div>
      </template>

      <!-- Critério -->
      <div v-if="can('configure')" class="border-t border-line pt-3">
        <button type="button" class="text-xs text-accent hover:underline min-h-[40px]" @click="abrirCriterio">
          <i class="fas fa-sliders mr-1"></i>Critério da busca
        </button>
        <div v-if="mostrarCriterio" class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="criterio.windowDays" type="number" label="Período (dias para trás)" hint="Medições feitas neste período." />
          <Input v-model="criterio.documents" label="Documentos de contrato" hint="Vazio = os documentos dos tipos de lançamento ativos." />
          <p class="sm:col-span-2 text-micro text-ink-subtle">
            Entram só os empreendimentos comerciais (pareados com o CV) que estão no acesso de quem importa.
          </p>
          <div class="sm:col-span-2"><Button size="sm" icon="fas fa-check" @click="salvarCriterio">Salvar e buscar de novo</Button></div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" :disabled="scan.status === 'running'" icon="fas fa-rotate-right" @click="buscar">Buscar de novo</Button>
      <Button variant="ghost" @click="emit('close')">Fechar</Button>
      <Button v-if="scan.status === 'done'" :loading="importando" :disabled="!totalSel" icon="fas fa-cloud-arrow-down" @click="importar">
        Importar {{ totalSel }}
      </Button>
    </template>
  </Modal>
</template>
