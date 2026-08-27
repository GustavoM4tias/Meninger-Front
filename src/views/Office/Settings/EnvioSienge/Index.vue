<template>
  <div class="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
    <header class="space-y-1">
      <h1 class="text-lg font-semibold">Vendas travadas para o ERP</h1>
      <p class="text-ink-muted">
        Reservas que entraram em <span class="font-medium text-ink">Envio Sienge</span> há mais de
        {{ form.minutos_limite }} minutos e ainda não viraram contrato no Sienge.
      </p>
    </header>

    <PageHelp title="Vendas travadas para o ERP" :intro="ajuda.intro" :steps="ajuda.steps" :tips="ajuda.tips" />

    <Panel class="space-y-4 surface-gradient">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-baseline gap-3">
          <span class="text-2xl font-semibold" :class="itens.length ? 'text-data-neg' : 'text-data-pos'">
            {{ itens.length }}
          </span>
          <span class="text-ink-muted">
            travada(s)<span v-if="comAtoPago"> · <span class="text-data-neg font-medium">{{ comAtoPago }} com ato já pago</span></span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" icon="fas fa-rotate" :loading="carregando" @click="rodar(false)">Verificar</Button>
          <Button variant="primary" icon="fas fa-bell" :loading="carregando" @click="rodar(true)">Verificar e avisar</Button>
        </div>
      </div>
      <p v-if="ultimaRodada" class="text-ink-subtle">Última verificação: {{ ultimaRodada }}</p>
    </Panel>

    <Panel class="space-y-3 surface-gradient">
      <h2 class="font-semibold text-sm">Lista</h2>

      <p v-if="!itens.length" class="text-ink-muted py-6 text-center">
        Nenhuma venda travada. Tudo que entrou em Envio Sienge chegou ao Sienge.
      </p>

      <!-- Estreito: cartão. Largo: tabela. -->
      <div v-else class="space-y-2 md:hidden">
        <Surface v-for="i in itens" :key="i.idreserva" class="p-3 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-semibold">#{{ i.idreserva }}</span>
            <span class="font-medium" :class="i.ato_pago ? 'text-data-neg' : 'text-ink-muted'">
              {{ tempo(i.minutos_esperando) }}
            </span>
          </div>
          <p class="text-ink">{{ i.empreendimento }} - {{ i.unidade }}</p>
          <p class="text-ink-muted">{{ i.titular_nome }}</p>
          <p v-if="i.ato_pago" class="text-data-neg font-medium">Ato já pago</p>
        </Surface>
      </div>

      <div v-if="itens.length" class="hidden md:block overflow-x-auto">
        <table class="w-full text-left">
          <thead class="text-micro font-mono uppercase tracking-wider text-ink-subtle border-b border-line">
            <tr>
              <th class="py-2 pr-3">Reserva</th>
              <th class="py-2 pr-3">Empreendimento / unidade</th>
              <th class="py-2 pr-3">Titular</th>
              <th class="py-2 pr-3">Parada há</th>
              <th class="py-2 pr-3">Ato</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in itens" :key="i.idreserva" class="border-b border-line/60">
              <td class="py-2 pr-3 font-mono">{{ i.idreserva }}</td>
              <td class="py-2 pr-3">{{ i.empreendimento }} <span class="text-ink-subtle">{{ i.unidade }}</span></td>
              <td class="py-2 pr-3">{{ i.titular_nome }}</td>
              <td class="py-2 pr-3">
                {{ tempo(i.minutos_esperando) }}
                <span v-if="i.entrada_estimada" class="text-ink-subtle" title="Esta reserva nunca acionou o fluxo do ato, então o tempo é estimado pela data da reserva e fica maior que o real.">
                  (estimado)
                </span>
              </td>
              <td class="py-2 pr-3">
                <span v-if="i.ato_pago" class="text-data-neg font-medium">pago</span>
                <span v-else class="text-ink-subtle">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel class="space-y-4 surface-gradient">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-sm">Configuração</h2>
          <p class="text-ink-muted">
            {{ form.active ? 'O vigia olha sozinho e avisa quem estiver na lista abaixo.' : 'Aviso automático desligado - a tela continua consultando quando você abre.' }}
          </p>
        </div>
        <button @click="form.active = !form.active"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0"
          :class="form.active ? 'bg-accent' : 'bg-surface-sunken border border-line'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-surface-raised shadow transition-transform"
            :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input v-model.number="form.minutos_limite" type="number" min="5" label="Travada após (minutos)"
          hint="O lote do CV roda de 5 em 5 min e 95% das vendas saem na primeira rodada. 30 min = 6 rodadas sem sair." />
        <Input v-model="form.cron_expression" label="Verificar a cada (cron)"
          hint="Padrão */15 * * * * = de 15 em 15 minutos." />
        <Input v-model.number="form.idsituacao_vigiada" type="number" label="Situação CV vigiada"
          hint="17 = Envio Sienge." />
      </div>

      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Quem recebe o aviso</p>
        <p v-if="!form.notify_user_ids?.length" class="text-ink-muted">Ninguém selecionado - o vigia não avisa.</p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span v-for="id in form.notify_user_ids" :key="id"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 font-mono">
            {{ nomeUsuario(id) }}
            <button type="button" @click="form.notify_user_ids = form.notify_user_ids.filter(x => x !== id)">
              <i class="fas fa-times text-micro"></i>
            </button>
          </span>
        </div>
        <select class="mt-2 bg-surface-sunken border border-line rounded-lg px-2 py-1 w-full md:w-72" @change="addUsuario($event)">
          <option value="">Adicionar pessoa...</option>
          <option v-for="u in usuariosDisponiveis" :key="u.id" :value="u.id">{{ u.username || u.email }}</option>
        </select>
        <p class="text-ink-subtle mt-1">Cada reserva gera um aviso só, não um a cada verificação.</p>
      </div>

      <div class="flex items-center justify-end gap-3">
        <p v-if="erro" class="text-data-neg">{{ erro }}</p>
        <p v-if="salvo" class="text-data-pos"><i class="fas fa-check"></i> Salvo</p>
        <Button variant="primary" icon="fas fa-save" :loading="salvando" @click="salvar">Salvar</Button>
      </div>
    </Panel>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import Panel from '@/components/UI/Panel.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import PageHelp from '@/components/UI/PageHelp.vue';

// O "porquê" da régua: sem isto, 30 minutos parece um número arbitrário.
const ajuda = {
  intro: 'O CV manda as vendas para o Sienge em um lote que roda de 5 em 5 minutos. Medindo agosto de 2026 a partir da entrada na etapa, 226 de 238 vendas chegaram ao ERP em até 5 minutos, com mediana de 2. Por isso passar de 30 minutos (seis rodadas) não é demora: é erro.',
  steps: [
    { title: 'Abra a reserva no CV', text: 'O motivo do erro aparece lá, na própria reserva. A API do CV não expõe esse texto, então não dá para trazê-lo para cá.' },
    { title: 'Corrija o que ele apontar', text: 'Em geral é condição financeira ou cadastro do cliente.' },
    { title: 'Devolva a etapa para Envio Sienge', text: 'É o que recoloca a venda na fila do lote.' },
  ],
  tips: [
    'Ato já pago e sem contrato é o caso mais grave: o dinheiro entrou e o ERP não sabe.',
    'Devolver a etapa redispara a cobrança do ato: confira antes se isso geraria um boleto novo para o cliente.',
    'Reserva que nunca acionou o fluxo do ato aparece com tempo "estimado" - aí a contagem usa a data da reserva e fica maior que a real.',
  ],
};

const itens = ref([]);
const usuarios = ref([]);
const carregando = ref(false);
const salvando = ref(false);
const salvo = ref(false);
const erro = ref('');
const ultimaRodada = ref('');

const form = ref({
  active: false,
  minutos_limite: 30,
  idsituacao_vigiada: 17,
  notify_user_ids: [],
  cron_expression: '*/15 * * * *',
});

const comAtoPago = computed(() => itens.value.filter(i => i.ato_pago).length);
const tempo = (m) => {
  const min = Number(m) || 0;
  if (min < 120) return `${min} min`;
  if (min < 2880) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} dias`;
};

const nomeUsuario = (id) => {
  const u = usuarios.value.find(x => Number(x.id) === Number(id));
  return u?.username || u?.email || `#${id}`;
};
const usuariosDisponiveis = computed(() => usuarios.value.filter(u => !form.value.notify_user_ids?.includes(u.id)));
function addUsuario(ev) {
  const id = Number(ev.target.value);
  if (id && !form.value.notify_user_ids.includes(id)) form.value.notify_user_ids = [...form.value.notify_user_ids, id];
  ev.target.value = '';
}

async function carregar() {
  const [s, p] = await Promise.all([
    requestWithAuth('/envio-sienge-watch/settings'),
    requestWithAuth('/envio-sienge-watch/pendencias'),
  ]);
  Object.assign(form.value, {
    active: !!s.active,
    minutos_limite: s.minutos_limite ?? 30,
    idsituacao_vigiada: s.idsituacao_vigiada ?? 17,
    notify_user_ids: Array.isArray(s.notify_user_ids) ? s.notify_user_ids.map(Number) : [],
    cron_expression: s.cron_expression || '*/15 * * * *',
  });
  ultimaRodada.value = s.last_run_at ? new Date(s.last_run_at).toLocaleString('pt-BR') : '';
  itens.value = p.itens || [];
}

async function rodar(notificar) {
  carregando.value = true;
  erro.value = '';
  try {
    await requestWithAuth(`/envio-sienge-watch/run?notificar=${notificar}`, { method: 'POST' });
    await carregar();
  } catch (e) {
    erro.value = e?.message || 'Falha ao verificar.';
  } finally {
    carregando.value = false;
  }
}

async function salvar() {
  salvando.value = true;
  erro.value = '';
  salvo.value = false;
  try {
    await requestWithAuth('/envio-sienge-watch/settings', { method: 'PUT', body: JSON.stringify(form.value) });
    salvo.value = true;
    setTimeout(() => { salvo.value = false; }, 2500);
    await carregar();
  } catch (e) {
    erro.value = e?.message || 'Falha ao salvar.';
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  carregando.value = true;
  try {
    const data = await requestWithAuth('/users');
    usuarios.value = Array.isArray(data) ? data : (data?.users || data?.data || []);
  } catch { usuarios.value = []; }
  try { await carregar(); } catch (e) { erro.value = e?.message || 'Falha ao carregar.'; }
  carregando.value = false;
});
</script>
