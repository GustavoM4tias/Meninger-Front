<script setup>
// Configuração do relatório de Recurso Próprio (admin).
//
// Vale para TODOS os leitores do relatório: é aqui que se diz como ler o
// financeiro da reserva do CV (qual série é ato, parcela, subsídio...), quais
// situações ficam de fora, o limite da renda quando a ficha não diz, e o que
// conta como recebido no Sienge.
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { fmtDateTime } from '@/utils/format';

import Modal from '@/components/UI/Modal.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open', 'salvo']);
const toast = useToast();

const GRUPOS = [
  { value: 'ato', label: 'Ato (recurso próprio à vista)' },
  { value: 'mensais', label: 'Parcela mensal (pesa na renda)' },
  { value: 'outras_parcelas', label: 'Outra parcela (entrada, anual, chaves...)' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'fgts', label: 'FGTS' },
  { value: 'federal', label: 'Subsídio federal' },
  { value: 'estadual', label: 'Subsídio estadual' },
  { value: 'desconto', label: 'Desconto construtora' },
  { value: 'fora', label: 'Fora da conta' },
];

const carregando = ref(false);
const salvando = ref(false);
const catalogo = ref([]);
const atualizadoEm = ref(null);
const grupoDe = ref({});      // idserie -> grupo
const form = ref({});

const lista = (v) => (Array.isArray(v) ? v.join(', ') : '');
const partes = (t) => String(t || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

async function carregar() {
  carregando.value = true;
  try {
    const r = await requestWithAuth('/recurso-proprio/config');
    const c = r.config;
    catalogo.value = r.catalogo || [];
    atualizadoEm.value = r.atualizadoEm;
    const g = {};
    for (const [grupo, ids] of Object.entries(c.series || {})) for (const id of ids) g[id] = grupo;
    grupoDe.value = g;
    form.value = {
      situacoes_excluidas: lista(c.situacoes_excluidas),
      limite_renda_pct: c.limite_renda_pct,
      tolerancia_renda_pct: c.tolerancia_renda_pct,
      recebido_folga_dias: c.recebido_folga_dias,
      sienge_documentos: lista(c.sienge_documentos),
      sienge_condicoes_ato: lista(c.sienge_condicoes_ato),
      sienge_condicoes_excluidas: lista(c.sienge_condicoes_excluidas),
      sienge_operacoes_contam: lista(c.sienge_operacoes_contam),
    };
  } catch (e) {
    toast.error(e.message || 'Não foi possível abrir a configuração.');
    emit('update:open', false);
  } finally {
    carregando.value = false;
  }
}

watch(() => props.open, (v) => { if (v) carregar(); }, { immediate: true });

const semGrupo = computed(() => catalogo.value.filter((s) => !grupoDe.value[s.id] || grupoDe.value[s.id] === 'fora').length);

async function salvar() {
  salvando.value = true;
  try {
    const series = Object.fromEntries(GRUPOS.filter((g) => g.value !== 'fora').map((g) => [g.value, []]));
    for (const [id, grupo] of Object.entries(grupoDe.value)) if (grupo && series[grupo]) series[grupo].push(Number(id));
    const f = form.value;
    await requestWithAuth('/recurso-proprio/config', {
      method: 'PUT',
      body: JSON.stringify({
        series,
        situacoes_excluidas: partes(f.situacoes_excluidas),
        limite_renda_pct: Number(String(f.limite_renda_pct).replace(',', '.')),
        tolerancia_renda_pct: Number(String(f.tolerancia_renda_pct).replace(',', '.')),
        recebido_folga_dias: Number(f.recebido_folga_dias),
        sienge_documentos: partes(f.sienge_documentos),
        sienge_condicoes_ato: partes(f.sienge_condicoes_ato),
        sienge_condicoes_excluidas: partes(f.sienge_condicoes_excluidas),
        sienge_operacoes_contam: partes(f.sienge_operacoes_contam).map(Number),
      }),
    });
    toast.success('Configuração salva. O relatório de todos os empreendimentos passa a ler assim.');
    emit('salvo');
  } catch (e) {
    toast.error(e.message || 'Não foi possível salvar.');
  } finally {
    salvando.value = false;
  }
}
</script>

<template>
  <Modal :open="open" size="xl" title="Configurar Recurso Próprio"
    subtitle="Vale para todos que abrem o relatório, em todos os empreendimentos."
    @update:open="(v) => emit('update:open', v)" @close="emit('update:open', false)">
    <div v-if="carregando" class="py-10 text-center text-sm text-ink-muted">Carregando...</div>
    <div v-else class="space-y-6">
      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-ink">Séries do financeiro da reserva (CV)</h3>
        <p class="text-xs text-ink-muted">
          Diz em que coluna cada série entra. Recurso próprio = ato + parcela mensal + outra parcela. A parcela que pesa na renda é a mensal.
          <span v-if="semGrupo" class="text-data-warn">{{ semGrupo }} {{ semGrupo > 1 ? 'séries estão' : 'série está' }} fora da conta.</span>
        </p>
        <div class="rounded-xl border border-line divide-y divide-line max-h-80 overflow-y-auto">
          <div v-for="s in catalogo" :key="s.id" class="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-ink truncate">{{ s.nome }} <span class="text-ink-subtle tabular-nums">· série {{ s.id }} · {{ s.sigla }}</span></p>
              <p class="text-micro text-ink-subtle tabular-nums">{{ s.usos }} usos nas reservas</p>
            </div>
            <div class="w-full sm:w-72">
              <Select v-model="grupoDe[s.id]" size="sm" :options="GRUPOS" placeholder="Fora da conta" />
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <Input v-model="form.situacoes_excluidas" label="Situações da reserva que ficam de fora"
            hint="Separadas por vírgula, como aparecem no CV. Ex.: Cancelada, Distrato, Vencida" />
        </div>
        <Input v-model="form.limite_renda_pct" label="Limite da parcela sobre a renda (%)"
          hint="Só vale quando a ficha comercial não diz. A ficha diz no texto da Regra do RP (ex.: “30% da renda”)." />
        <Input v-model="form.tolerancia_renda_pct" label="Tolerância (pontos percentuais)"
          hint="Até o limite + tolerância a linha fica amarela; acima, vermelha." />
      </section>

      <section class="space-y-2">
        <h3 class="text-sm font-semibold text-ink">Recebido no Sienge</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model="form.sienge_operacoes_contam" label="Operações que contam como dinheiro"
            hint="Códigos de operação da baixa. 2 = Recebimento, 10 = Adiantamento." />
          <Input v-model="form.sienge_documentos" label="Tipos de documento"
            hint="CT = contrato, AVC = adiantamento de ato. Mútuo e empréstimo ficam de fora." />
          <Input v-model="form.sienge_condicoes_ato" label="Condições que são ato"
            hint="Sem nenhuma delas, o primeiro recebimento do cliente vira o ato." />
          <Input v-model="form.sienge_condicoes_excluidas" label="Condições que não são recurso próprio"
            hint="Ex.: FI financiamento, SB/SE/SF subsídios, DC desconto." />
          <Input v-model="form.recebido_folga_dias" type="number" label="Folga antes da reserva (dias)"
            hint="Recebimento só conta a partir desses dias antes da data da reserva." />
        </div>
      </section>

      <p v-if="atualizadoEm" class="text-micro text-ink-subtle">Última alteração em {{ fmtDateTime(atualizadoEm) }}.</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('update:open', false)">Cancelar</Button>
        <Button :loading="salvando" :disabled="carregando" @click="salvar">Salvar para todos</Button>
      </div>
    </template>
  </Modal>
</template>
