<template>
  <div class="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
    <header class="space-y-1">
      <h1 class="text-lg font-semibold">Vendas sem contrato no ERP</h1>
      <p class="text-ink-muted">
        Acompanha as vendas paradas em <span class="font-medium text-ink">Envio Sienge</span> que ainda não viraram
        contrato no Sienge, e avisa quando passam do prazo normal da fila.
      </p>
    </header>

    <PageHelp
      title="Vendas sem contrato no ERP"
      :intro="ajuda.intro"
      :steps="ajuda.steps"
      :tips="ajuda.tips" />

    <!-- Situação atual -->
    <Panel class="space-y-4 surface-gradient">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="font-semibold text-sm">Situação agora</h2>
        <div class="flex items-center gap-2">
          <Button variant="ghost" icon="fas fa-rotate" :loading="rodando" @click="rodar(false)">
            Verificar sem avisar
          </Button>
          <Button variant="primary" icon="fas fa-bell" :loading="rodando" @click="rodar(true)">
            Verificar e avisar
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Surface v-for="k in kpis" :key="k.label" class="p-3">
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">{{ k.label }}</p>
          <p class="text-xl font-semibold" :class="k.cor">{{ k.valor }}</p>
          <p v-if="k.hint" class="text-ink-subtle mt-0.5">{{ k.hint }}</p>
        </Surface>
      </div>

      <p v-if="stats.p50_horas" class="text-ink-muted">
        Espera observada por este vigia: mediana de {{ Math.round(stats.p50_horas / 24) }} dia(s),
        9 em cada 10 resolvidas em até {{ Math.round(stats.p90_horas / 24) }} dia(s).
        Use esses números para ajustar os prazos abaixo.
      </p>
      <p v-if="ultimaRodada" class="text-ink-subtle">Última verificação: {{ ultimaRodada }}</p>
    </Panel>

    <!-- Lista -->
    <Panel class="space-y-3 surface-gradient">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="font-semibold text-sm">Em acompanhamento ({{ itens.length }})</h2>
        <select v-model="filtro" class="bg-surface-sunken border border-line rounded-lg px-2 py-1">
          <option value="">Todas</option>
          <option value="critica">Só críticas</option>
          <option value="atrasada">Só atrasadas</option>
          <option value="na_fila">Só na fila</option>
        </select>
      </div>

      <p v-if="!itens.length" class="text-ink-muted py-6 text-center">
        Nenhuma venda em acompanhamento. Rode uma verificação para popular.
      </p>

      <!-- Mobile-first: cartão no estreito, tabela no largo -->
      <div v-else class="space-y-2 md:hidden">
        <Surface v-for="i in itensFiltrados" :key="i.id" class="p-3 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono font-semibold">#{{ i.idreserva }}</span>
            <span class="px-2 py-0.5 rounded-full border" :class="badge(i.severidade)">{{ rotulo(i.severidade) }}</span>
          </div>
          <p class="text-ink">{{ i.empreendimento }} - {{ i.unidade }}</p>
          <p class="text-ink-muted">{{ i.titular_nome }}</p>
          <p class="text-ink-subtle">
            {{ dias(i.pendente_desde) }} dia(s) acompanhada<span v-if="i.ato_pago" class="text-data-neg font-medium">, ato já pago</span>
          </p>
        </Surface>
      </div>

      <div v-if="itens.length" class="hidden md:block overflow-x-auto">
        <table class="w-full text-left">
          <thead class="text-micro font-mono uppercase tracking-wider text-ink-subtle border-b border-line">
            <tr>
              <th class="py-2 pr-3">Reserva</th>
              <th class="py-2 pr-3">Empreendimento / unidade</th>
              <th class="py-2 pr-3">Titular</th>
              <th class="py-2 pr-3">Acompanhada há</th>
              <th class="py-2 pr-3">Registro do CV</th>
              <th class="py-2 pr-3">Estado</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in itensFiltrados" :key="i.id" class="border-b border-line/60">
              <td class="py-2 pr-3 font-mono">{{ i.idreserva }}</td>
              <td class="py-2 pr-3">{{ i.empreendimento }} <span class="text-ink-subtle">{{ i.unidade }}</span></td>
              <td class="py-2 pr-3">{{ i.titular_nome }}</td>
              <td class="py-2 pr-3">{{ dias(i.pendente_desde) }} dia(s)</td>
              <td class="py-2 pr-3 text-ink-subtle">{{ i.data_cad_erp ? dias(i.data_cad_erp) + ' dia(s)' : '-' }}</td>
              <td class="py-2 pr-3">
                <span class="px-2 py-0.5 rounded-full border" :class="badge(i.severidade)">{{ rotulo(i.severidade) }}</span>
                <span v-if="i.ato_pago" class="ml-1 text-data-neg">ato pago</span>
              </td>
              <td class="py-2 text-right">
                <Button variant="ghost" size="sm" @click="encerrar(i)">Encerrar</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <!-- Configuração -->
    <Panel class="space-y-4 surface-gradient">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-sm">Configuração</h2>
          <p class="text-ink-muted">
            {{ form.active ? 'A verificação roda todo dia no horário abaixo.' : 'Verificação automática desligada.' }}
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
        <Input v-model.number="form.dias_atraso" type="number" min="1" label="Considerar atrasada após (dias)"
          hint="Padrão 5: é o prazo em que 3 de cada 4 vendas já foram enviadas." />
        <Input v-model.number="form.dias_critico" type="number" min="1" label="Considerar crítica após (dias)"
          hint="Padrão 15. Não pode ser menor que o prazo de atraso." />
        <Input v-model.number="form.idsituacao_vigiada" type="number" label="Situação CV vigiada"
          hint="17 = Envio Sienge. É a etapa em que a venda espera o ERP." />
        <Input v-model="form.cron_expression" label="Horário da verificação (cron)"
          hint="Padrão 30 9 * * * = todo dia às 09:30." />
      </div>

      <label class="flex items-start gap-2">
        <input type="checkbox" v-model="form.ato_pago_e_critico" class="mt-1" />
        <span>
          <span class="font-medium">Ato pago é sempre crítico</span>
          <span class="block text-ink-muted">O cliente pagou e o ERP não tem o contrato: não espera prazo nenhum.</span>
        </span>
      </label>
      <label class="flex items-start gap-2">
        <input type="checkbox" v-model="form.confirmar_no_sienge" class="mt-1" />
        <span>
          <span class="font-medium">Confirmar no Sienge antes de avisar</span>
          <span class="block text-ink-muted">Consulta a API do Sienge pelo número da reserva. Evita avisar por dado desatualizado do CV.</span>
        </span>
      </label>

      <div>
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Quem recebe o aviso</p>
        <p v-if="!form.notify_user_ids?.length" class="text-ink-muted">
          Ninguém selecionado - o vigia acompanha e registra, mas não avisa.
        </p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span v-for="id in form.notify_user_ids" :key="id"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 font-mono">
            {{ nomeUsuario(id) }}
            <button type="button" @click="form.notify_user_ids = form.notify_user_ids.filter(x => x !== id)">
              <i class="fas fa-times text-micro"></i>
            </button>
          </span>
        </div>
        <select class="mt-2 bg-surface-sunken border border-line rounded-lg px-2 py-1 w-full md:w-72"
          @change="addUsuario($event)">
          <option value="">Adicionar pessoa...</option>
          <option v-for="u in usuariosDisponiveis" :key="u.id" :value="u.id">{{ u.username || u.email }}</option>
        </select>
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

// Texto da ajuda da tela: o "porquê" que evita ler a fila como se fosse erro.
const ajuda = {
  intro: 'O CV manda as vendas para o Sienge em uma fila que leva dias, não minutos. Medindo 1.274 envios de 2026: metade saiu em 20 horas, um quarto levou mais de 5 dias e um em cada dez passou de 25 dias. Por isso "ainda não enviada" não é problema - problema é esperar mais do que isso.',
  steps: [
    { title: 'Na fila', text: 'Está dentro do prazo normal. Não há nada a fazer.' },
    { title: 'Atrasada', text: 'Passou do prazo que você definiu na configuração desta tela.' },
    { title: 'Crítica', text: 'Passou muito do prazo, ou o ato já foi pago e o ERP não tem o contrato - venda com dinheiro entrando e sem registro.' },
    { title: 'Para destravar', text: 'Abra a reserva no CV, veja o que o painel aponta no envio ao Sienge, corrija e devolva a etapa para Envio Sienge.' },
  ],
  tips: [
    'Reserva parada na etapa, sem nenhuma alteração, tende a não ser reprocessada sozinha: é o gesto de devolver a etapa que a recoloca na fila.',
    'Devolver a etapa redispara a cobrança do ato: confira antes se isso geraria um boleto novo para o cliente.',
    'Os prazos vêm da fila real. Conforme o vigia acumula histórico, ajuste-os pelos números que ele mostra acima.',
  ],
};

const itens = ref([]);
const stats = ref({});
const usuarios = ref([]);
const filtro = ref('');
const rodando = ref(false);
const salvando = ref(false);
const salvo = ref(false);
const erro = ref('');
const ultimaRodada = ref('');

const form = ref({
  active: false,
  idsituacao_vigiada: 17,
  dias_atraso: 5,
  dias_critico: 15,
  ato_pago_e_critico: true,
  confirmar_no_sienge: true,
  notify_user_ids: [],
  cron_expression: '30 9 * * *',
});

const itensFiltrados = computed(() => (filtro.value ? itens.value.filter(i => i.severidade === filtro.value) : itens.value));

const kpis = computed(() => {
  const criticas = itens.value.filter(i => i.severidade === 'critica').length;
  const atrasadas = itens.value.filter(i => i.severidade === 'atrasada').length;
  const naFila = itens.value.filter(i => i.severidade === 'na_fila').length;
  const atoPago = itens.value.filter(i => i.ato_pago).length;
  return [
    { label: 'Críticas', valor: criticas, cor: criticas ? 'text-data-neg' : 'text-ink', hint: 'exigem ação' },
    { label: 'Atrasadas', valor: atrasadas, cor: atrasadas ? 'text-data-warn' : 'text-ink', hint: `acima de ${form.value.dias_atraso} dias` },
    { label: 'Na fila', valor: naFila, cor: 'text-ink', hint: 'dentro do prazo' },
    { label: 'Com ato pago', valor: atoPago, cor: atoPago ? 'text-data-neg' : 'text-ink', hint: 'dinheiro entrou' },
  ];
});

const dias = (d) => (d ? Math.max(0, Math.round((Date.now() - new Date(d)) / 86400000)) : 0);
const rotulo = (s) => ({ critica: 'Crítica', atrasada: 'Atrasada', na_fila: 'Na fila' }[s] || s);
const badge = (s) => ({
  critica: 'bg-data-neg/10 text-data-neg border-data-neg/30',
  atrasada: 'bg-data-warn/10 text-data-warn border-data-warn/30',
  na_fila: 'bg-surface-sunken text-ink-subtle border-line',
}[s] || 'border-line');

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
    idsituacao_vigiada: s.idsituacao_vigiada ?? 17,
    dias_atraso: s.dias_atraso ?? 5,
    dias_critico: s.dias_critico ?? 15,
    ato_pago_e_critico: !!s.ato_pago_e_critico,
    confirmar_no_sienge: !!s.confirmar_no_sienge,
    notify_user_ids: Array.isArray(s.notify_user_ids) ? s.notify_user_ids.map(Number) : [],
    cron_expression: s.cron_expression || '30 9 * * *',
  });
  ultimaRodada.value = s.last_run_at ? new Date(s.last_run_at).toLocaleString('pt-BR') : '';
  itens.value = p.itens || [];
  stats.value = p.stats || {};
}

async function rodar(notificar) {
  rodando.value = true;
  erro.value = '';
  try {
    await requestWithAuth(`/envio-sienge-watch/run?notificar=${notificar}`, { method: 'POST' });
    await carregar();
  } catch (e) {
    erro.value = e?.message || 'Falha ao verificar.';
  } finally {
    rodando.value = false;
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
  } catch (e) {
    erro.value = e?.message || 'Falha ao salvar.';
  } finally {
    salvando.value = false;
  }
}

async function encerrar(item) {
  await requestWithAuth(`/envio-sienge-watch/itens/${item.id}/encerrar`, { method: 'POST', body: '{}' });
  await carregar();
}

onMounted(async () => {
  try {
    const data = await requestWithAuth('/users');
    usuarios.value = Array.isArray(data) ? data : (data?.users || data?.data || []);
  } catch { usuarios.value = []; }
  await carregar();
});
</script>
