<script setup>
/**
 * Cadastros únicos das fichas comerciais: o que é do programa, da cidade ou
 * da empresa, e não do mês. Digitado uma vez aqui, vale para todas as fichas.
 *
 *   - Programas estaduais (Casa Paulista, Casa Fácil, MT PAR...): a ficha
 *     escolhe da lista e mostra valor e público.
 *   - Custos de documentação por cidade: pacote Caixa, cartório e ITBI viram
 *     a referência do módulo ("Usar valores da cidade").
 *   - Prestadores: CCA e certificadora, com o custo de cada um.
 *
 * Ler: quem vê fichas. Gravar: quem edita fichas (mesma regra do módulo).
 */
import { computed, onMounted, ref } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import { brl2, pct } from './ficha/fichaUtils';

const store = useConditionsStore();
const carregando = ref(true);
const aba = ref('cidades');
onMounted(async () => {
  try { await Promise.all([store.fetchCadastros(), store.fetchMyPermissions()]); }
  catch (e) { store.notify(e.message || 'Não foi possível ler os cadastros.', 'error'); }
  finally { carregando.value = false; }
});
const podeEditar = computed(() => !!store.permissions?.canEdit);

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((u) => ({ value: u, label: u }));
const ABAS = computed(() => [
  { value: 'cidades', label: 'Custos por cidade', count: store.cadastros.cidades.length },
  { value: 'programas', label: 'Programas estaduais', count: store.cadastros.programas.filter((p) => p.ativo !== false).length },
  { value: 'prestadores', label: 'CCA e certificadora', count: store.cadastros.prestadores.filter((p) => p.ativo !== false).length },
]);

const VAZIO = {
  cidades: () => ({ cidade: '', uf: 'SP', itbi_isento: false, itbi_aliquota_pct: '', itbi_lei: '', cartorio_prenotacao: '', cartorio_registro: '', pacote_caixa: '', observacao: '' }),
  programas: () => ({ uf: 'SP', nome: '', valor: '', valor_especial: '', publico_especial: '', renda_max: '', regras: '', vigente_ate: '' }),
  prestadores: () => ({ tipo: 'cca', nome: '', contato: '', telefone: '', email: '', custo: '' }),
};
const editando = ref(null);   // { tipo, id|null, form }
const salvando = ref(false);
function novo(tipo) { editando.value = { tipo, id: null, form: VAZIO[tipo]() }; }
function editar(tipo, row) {
  const base = VAZIO[tipo]();
  const form = Object.fromEntries(Object.keys(base).map((k) => [k, row[k] ?? base[k]]));
  if (form.vigente_ate) form.vigente_ate = String(form.vigente_ate).slice(0, 10);
  editando.value = { tipo, id: row.id, form };
}
async function salvar() {
  const e = editando.value; if (!e) return;
  salvando.value = true;
  try {
    await store.saveCadastro(e.tipo, e.form, e.id);
    store.notify(e.id ? 'Cadastro atualizado. As fichas passam a usar o valor novo como referência.' : 'Cadastro criado.');
    editando.value = null;
  } catch (err) {
    store.notify(err.message || 'Não foi possível salvar.', 'error');
  } finally {
    salvando.value = false;
  }
}
async function remover(tipo, row) {
  const consequencia = tipo === 'cidades'
    ? `O cadastro de ${row.cidade}/${row.uf} será apagado. As fichas guardam os valores que já têm; só deixam de ter a referência da cidade.`
    : `${row.nome} sai da lista de escolha. As fichas que já usam continuam mostrando o nome.`;
  if (!(await pedirConfirmacao({ title: tipo === 'cidades' ? 'Apagar cadastro da cidade?' : 'Tirar da lista?', consequence: consequencia, tone: 'danger', confirmLabel: tipo === 'cidades' ? 'Apagar' : 'Tirar da lista' }))) return;
  try { await store.removeCadastro(tipo, row.id); store.notify('Feito.'); }
  catch (err) { store.notify(err.message || 'Não foi possível remover.', 'error'); }
}
async function reativar(tipo, row) {
  try { await store.saveCadastro(tipo, { ativo: true }, row.id); store.notify(`${row.nome} voltou para a lista.`); }
  catch (err) { store.notify(err.message || 'Não foi possível reativar.', 'error'); }
}

const cidades = computed(() => store.cadastros.cidades);
const programas = computed(() => [...store.cadastros.programas].sort((a, b) => Number(b.ativo !== false) - Number(a.ativo !== false)));
const prestadores = computed(() => [...store.cadastros.prestadores].sort((a, b) => Number(b.ativo !== false) - Number(a.ativo !== false) || String(a.tipo).localeCompare(b.tipo)));
</script>

<template>
  <PageContainer>
    <PageHeader title="Cadastros das fichas" subtitle="Programa, cidade e prestador: digitados uma vez, valem para todas as fichas" icon="fas fa-database">
      <template #actions>
        <PageHelp storage-key="fichas-cadastros" title="Cadastros das fichas"
          intro="O que não muda de mês para mês mora aqui, e não em cada ficha. A ficha usa estes valores como referência."
          :steps="[
            { title: 'Custos por cidade', text: 'Pacote Caixa, prenotação, registro e isenção de ITBI do município. Na ficha, o botão Usar valores da cidade copia estes valores para o módulo.' },
            { title: 'Programas estaduais', text: 'Nome, valor e público de cada programa. Na ficha, o módulo escolhe o programa da lista do estado do empreendimento.' },
            { title: 'CCA e certificadora', text: 'Empresas que atendem o cliente, com o custo por contrato. Na ficha, escolher a empresa já traz o custo.' },
          ]"
          :tips="['Mudar um valor aqui não altera ficha já preenchida: a ficha mostra o valor novo como referência e quem edita decide usar.', 'A primeira carga veio do que já estava digitado nas fichas; nomes repetidos com grafia diferente podem ser unificados aqui.']" />
        <RouterLink to="/comercial/conditions"><Button variant="ghost" size="sm" icon="fas fa-arrow-left">Fichas</Button></RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <SegmentedControl v-model="aba" :options="ABAS" />
      <Button v-if="podeEditar" class="ml-auto" size="sm" icon="fas fa-plus" @click="novo(aba)">Novo</Button>
    </div>

    <Skeleton v-if="carregando" variant="table" :lines="6" />

    <template v-else>
      <!-- formulário (no lugar, nunca em modal) -->
      <Panel v-if="editando" class="mb-4" :title="editando.id ? 'Alterar cadastro' : 'Novo cadastro'" icon="fas fa-pen">
        <div v-if="editando.tipo === 'cidades'" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input v-model="editando.form.cidade" label="Cidade" class="col-span-2 lg:col-span-1" />
          <Select v-model="editando.form.uf" :options="UFS" label="Estado" />
          <Input v-model="editando.form.pacote_caixa" type="number" label="Pacote Caixa (R$)" />
          <Input v-model="editando.form.cartorio_prenotacao" type="number" label="Prenotação (R$)" />
          <Input v-model="editando.form.cartorio_registro" type="number" label="Registro (R$)" />
          <Input v-model="editando.form.itbi_aliquota_pct" type="number" label="Alíquota do ITBI (%)" />
          <div class="col-span-2 flex items-end"><Switch v-model="editando.form.itbi_isento" label="ITBI isento para MCMV" /></div>
          <Input v-model="editando.form.itbi_lei" label="Lei da isenção" class="col-span-2" />
          <Input v-model="editando.form.observacao" label="Observação" class="col-span-2" />
        </div>
        <div v-else-if="editando.tipo === 'programas'" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Input v-model="editando.form.nome" label="Programa" class="col-span-2" />
          <Select v-model="editando.form.uf" :options="UFS" label="Estado" />
          <Input v-model="editando.form.vigente_ate" type="date" label="Vale até" />
          <Input v-model="editando.form.valor" type="number" label="Valor por família (R$)" />
          <Input v-model="editando.form.renda_max" type="number" label="Renda máxima (R$)" />
          <Input v-model="editando.form.valor_especial" type="number" label="Valor especial (R$)" />
          <Input v-model="editando.form.publico_especial" label="Para quem é o especial" placeholder="Ex.: acima de 60 anos" />
          <label class="col-span-2 lg:col-span-4 block">
            <span class="block text-xs font-medium text-ink-muted mb-1.5">Regras</span>
            <textarea v-model="editando.form.regras" rows="3" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-ring"></textarea>
          </label>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div><span class="block text-xs font-medium text-ink-muted mb-1.5">Tipo</span>
            <SegmentedControl v-model="editando.form.tipo" :options="[{ value: 'cca', label: 'CCA' }, { value: 'certificadora', label: 'Certificadora' }]" size="sm" /></div>
          <Input v-model="editando.form.nome" label="Nome" class="lg:col-span-2" />
          <Input v-model="editando.form.custo" type="number" label="Custo por contrato (R$)" />
          <Input v-model="editando.form.contato" label="Contato" />
          <Input v-model="editando.form.telefone" label="Telefone" />
          <Input v-model="editando.form.email" type="email" label="E-mail" class="col-span-2" />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <Button variant="ghost" @click="editando = null">Cancelar</Button>
            <Button :loading="salvando" icon="fas fa-check" @click="salvar">Salvar</Button>
          </div>
        </template>
      </Panel>

      <!-- listas -->
      <Panel v-if="aba === 'cidades'" title="Custos de documentação por cidade" icon="fas fa-city" :padded="false"
        :empty="!cidades.length" empty-icon="fas fa-city" empty-title="Nenhuma cidade cadastrada">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="metric-label text-left border-b border-line"><th class="px-4 py-2">Cidade</th><th class="px-3 py-2 text-right">Pacote Caixa</th><th class="px-3 py-2 text-right">Prenotação</th><th class="px-3 py-2 text-right">Registro</th><th class="px-3 py-2">ITBI</th><th class="px-3 py-2"></th></tr></thead>
            <tbody>
              <tr v-for="c in cidades" :key="c.id" class="border-b border-line-subtle">
                <td class="px-4 py-2.5 font-medium">{{ c.cidade }}/{{ c.uf }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ brl2(c.pacote_caixa) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ brl2(c.cartorio_prenotacao) }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ brl2(c.cartorio_registro) }}</td>
                <td class="px-3 py-2.5">{{ c.itbi_isento ? 'isento' : (c.itbi_aliquota_pct != null ? pct(c.itbi_aliquota_pct, 1) : '-') }}</td>
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <template v-if="podeEditar">
                    <Button size="sm" variant="ghost" icon="fas fa-pen" @click="editar('cidades', c)">Alterar</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-trash" @click="remover('cidades', c)" />
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel v-else-if="aba === 'programas'" title="Programas estaduais" icon="fas fa-landmark" :padded="false"
        :empty="!programas.length" empty-icon="fas fa-landmark" empty-title="Nenhum programa cadastrado">
        <ul class="divide-y divide-line-subtle">
          <li v-for="p in programas" :key="p.id" class="px-4 py-3 flex flex-wrap items-start gap-x-4 gap-y-1" :class="p.ativo === false ? 'opacity-60' : ''">
            <div class="min-w-0 flex-1">
              <div class="font-medium">{{ p.nome }} <span class="text-ink-subtle font-normal">· {{ p.uf }}</span><span v-if="p.ativo === false" class="text-micro text-ink-subtle"> · fora da lista</span></div>
              <div class="text-micro text-ink-muted">
                <template v-if="p.valor">até {{ brl2(p.valor) }}</template><template v-if="p.renda_max"> · renda até {{ brl2(p.renda_max) }}</template>
                <template v-if="p.valor_especial"> · {{ brl2(p.valor_especial) }} {{ p.publico_especial || '' }}</template>
                <template v-if="p.vigente_ate"> · vale até {{ String(p.vigente_ate).slice(0, 10).split('-').reverse().join('/') }}</template>
              </div>
              <p v-if="p.regras" class="text-xs text-ink-muted mt-1 whitespace-pre-line line-clamp-3">{{ p.regras }}</p>
            </div>
            <div v-if="podeEditar" class="flex gap-1">
              <Button size="sm" variant="ghost" icon="fas fa-pen" @click="editar('programas', p)">Alterar</Button>
              <Button v-if="p.ativo !== false" size="sm" variant="ghost" icon="fas fa-eye-slash" @click="remover('programas', p)" />
              <Button v-else size="sm" variant="ghost" icon="fas fa-rotate-left" @click="reativar('programas', p)">Voltar</Button>
            </div>
          </li>
        </ul>
      </Panel>

      <Panel v-else title="CCA e certificadora" icon="fas fa-building-user" :padded="false"
        :empty="!prestadores.length" empty-icon="fas fa-building-user" empty-title="Nenhum prestador cadastrado">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="metric-label text-left border-b border-line"><th class="px-4 py-2">Nome</th><th class="px-3 py-2">Tipo</th><th class="px-3 py-2">Contato</th><th class="px-3 py-2 text-right">Custo</th><th class="px-3 py-2"></th></tr></thead>
            <tbody>
              <tr v-for="p in prestadores" :key="p.id" class="border-b border-line-subtle" :class="p.ativo === false ? 'opacity-60' : ''">
                <td class="px-4 py-2.5 font-medium">{{ p.nome }}<span v-if="p.ativo === false" class="block text-micro text-ink-subtle">fora da lista</span></td>
                <td class="px-3 py-2.5">{{ p.tipo === 'cca' ? 'CCA' : 'Certificadora' }}</td>
                <td class="px-3 py-2.5 text-ink-muted">{{ [p.contato, p.telefone, p.email].filter(Boolean).join(' · ') || '-' }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">{{ brl2(p.custo) }}</td>
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <template v-if="podeEditar">
                    <Button size="sm" variant="ghost" icon="fas fa-pen" @click="editar('prestadores', p)">Alterar</Button>
                    <Button v-if="p.ativo !== false" size="sm" variant="ghost" icon="fas fa-eye-slash" @click="remover('prestadores', p)" />
                    <Button v-else size="sm" variant="ghost" icon="fas fa-rotate-left" @click="reativar('prestadores', p)">Voltar</Button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </template>
  </PageContainer>
</template>
