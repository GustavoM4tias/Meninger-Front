<script setup>
/**
 * Gestão de Alçadas — tela EXECUTIVA (ver _design/RECEITA-TELA-EXECUTIVA.md).
 *
 * Aqui não se lê número: administra-se gente. O que a pessoa faz nesta tela
 * recai sobre OUTRA pessoa, e é disso que sai o desenho todo:
 *
 *   - barra de pendências no topo: cada número é uma FILA de trabalho e leva
 *     ao trabalho (clicar recorta a lista de sujeitos);
 *   - mestre-detalhe: escolhe-se um sujeito e trabalha nele, em vez de varrer
 *     uma tabela;
 *   - o efeito aparece ANTES de salvar ("11 telas -> 14");
 *   - o estado é legível em três camadas (herdado / exceção / efetivo), porque
 *     um switch ligado não diz de onde veio o acesso;
 *   - alteração pendente vive na barra do rodapé e só vira realidade no Salvar;
 *   - confirmação proporcional: travar uma tela diz quantas pessoas perde.
 *
 * O estado SALVO vem do servidor (`effectiveRoutes` no GET /permissions). Só o
 * que ainda não foi salvo é calculado aqui, e só para o sujeito aberto - o
 * cliente nunca é a fonte da verdade do que já está gravado.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { managedRegistry, getDeptManagedPages, getAdminOnlyPages, getAlwaysFreePages } from '@/config/navRegistry';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Modal from '@/components/UI/Modal.vue';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import ActionBar from '@/components/UI/ActionBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Switch from '@/components/UI/Switch.vue';
import UserAvatar from '@/components/UI/UserAvatar.vue';
import Favorite from '@/components/config/Favorite.vue';

import DepartmentVisibilityPanel from './DepartmentVisibilityPanel.vue';
import GrantsModal from './GrantsModal.vue';
import RouteMatrix from './RouteMatrix.vue';
import ScreensTab from './ScreensTab.vue';

const route = useRoute();

/* ── Abas: os sujeitos da tela ─────────────────────────────────────────────
   "Telas" é aba nova: travar uma tela não pertence a usuário nenhum. */
const abas = [
  { value: 'users', label: 'Usuários', icon: 'fas fa-users' },
  { value: 'profiles', label: 'Perfis', icon: 'fas fa-layer-group' },
  { value: 'screens', label: 'Telas', icon: 'fas fa-desktop' },
  { value: 'departments', label: 'Departamentos', icon: 'fas fa-eye-slash' },
];
const aba = ref('users');

const loading = ref(true);
const erro = ref('');

const users = ref([]);
const profiles = ref([]);
const departments = ref([]);
const routePolicies = ref([]);
const capCatalog = ref({});
const grantsBulk = ref({ user: {}, profile: {} });
const retired = ref({ retired: [], exclusive: [] });

/* ── Telas travadas ──────────────────────────────────────────────────────── */
const normRoute = (r) => String(r || '').toLowerCase().replace(/\/+$/, '');
const lockedRoutes = computed(() =>
  new Set(routePolicies.value.filter(p => p.adminOnly).map(p => normRoute(p.route))));
const isLocked = (r) => lockedRoutes.value.has(normRoute(r));
const policyFor = (r) => routePolicies.value.find(p => normRoute(p.route) === normRoute(r)) || null;

const delegablePages = (cat) => getDeptManagedPages(cat);
const gruposDelegaveis = computed(() => managedRegistry
  .map(cat => ({ key: cat.key || cat.label, label: cat.label, icon: cat.icon, pages: delegablePages(cat) }))
  .filter(g => g.pages.length));

const todasAsRotas = computed(() => gruposDelegaveis.value.flatMap(g => g.pages.map(p => p.route)));

/* Quantas pessoas têm cada tela hoje. Vem do efetivo do SERVIDOR - é o número
   que a confirmação de travar precisa dizer. */
const alcancePorRota = computed(() => {
  const mapa = {};
  for (const u of users.value) {
    if (u.role === 'admin') continue;
    for (const r of (u.effectiveRoutes || [])) mapa[r] = (mapa[r] || 0) + 1;
  }
  return mapa;
});

/* ── Tipo de pessoa ────────────────────────────────────────────────────────
   O backend resolve `tipo` a partir do auth_provider: INTERNAL e MICROSOFT são
   a EQUIPE; o resto vem do CV e é EXTERNO (corretor, imobiliária,
   correspondente). O domínio do e-mail NÃO serve para isso - há gente da equipe
   com e-mail pessoal e externo com e-mail que parece corporativo. */
const KIND_LABEL = { BROKER: 'Corretor', REALESTATE: 'Imobiliária', CORRESPONDENT: 'Correspondente' };
const rotuloExterno = (u) => KIND_LABEL[u.external_kind] || 'Externo';

/* ── Os dois eixos de população ────────────────────────────────────────────
   Tipo (equipe/externo) e situação (ativo/inativo) eram EXCLUSÃO no backend:
   externo e inativo simplesmente não chegavam na tela. Viraram filtro.

   O padrão reproduz o que a tela sempre mostrou - equipe, só ativos - para
   ninguém estranhar a lista mudando de tamanho sozinha. O resto está a um
   clique. */
const tipoFiltro = ref('equipe');
const tiposOpcoes = [
  { value: 'equipe', label: 'Equipe', icon: 'fas fa-id-badge' },
  { value: 'externo', label: 'Externos', icon: 'fas fa-user-tag' },
  { value: 'todos', label: 'Todos', icon: 'fas fa-users' },
];
const incluirInativos = ref(false);

/* ── Filas de trabalho (a barra de pendências) ─────────────────────────────
   UM predicado por fila, usado pelo cartão E pela lista. Antes o cartão contava
   sem admin e a lista filtrava com admin junto: o cartão dizia 15 e a lista
   entregava 22. O número que se clica tem que ser o número que se recebe.

   Fila é só da EQUIPE. Externo sem perfil é o estado normal dele - perfil aqui
   é "Padrão - <departamento>", e corretor não tem departamento. Contá-lo como
   pendência encheria a fila de gente que não tem nada de errado. */
/* A POPULAÇÃO é quem está na mesa: os dois filtros de eixo, e nada mais.
   Cartão e lista leem daqui - é o que faz o número do cartão ser o número da
   lista sob qualquer combinação de filtro. */
const populacao = computed(() => users.value.filter(u => {
  if (tipoFiltro.value !== 'todos' && u.tipo !== tipoFiltro.value) return false;
  if (!incluirInativos.value && u.ativo === false) return false;
  return true;
}));

/* Fila é trabalho pendente, então não vale para quem não trabalha aqui:
   administrador (que tem tudo), externo (perfil é por departamento, e ele não
   tem um) e inativo (não entra no sistema). */
const elegivelFila = (u) => u.role !== 'admin' && u.tipo !== 'externo' && u.ativo !== false;

const recorte = ref('');
const FILAS = {
  'sem-perfil': { label: 'sem perfil',
    teste: (u) => elegivelFila(u) && !u.permission_profile_id },
  'sem-grant': { label: 'sem liberação de dados',
    teste: (u) => elegivelFila(u) && !(grantsBulk.value.user?.[String(u.id)] || []).length },
  'excecao': { label: 'com exceção individual',
    teste: (u) => elegivelFila(u) && (u.permission?.routes_extra?.length || 0) + (u.permission?.routes_removed?.length || 0) > 0 },
  'sem-tela': { label: 'sem nenhuma tela',
    teste: (u) => elegivelFila(u) && !(u.effectiveRoutes || []).length },
};

const naFila = (chave) => populacao.value.filter(FILAS[chave].teste);
const inativos = computed(() => users.value.filter(u => u.ativo === false));

/* Fila é trabalho, não medida: `value` pronto (sem count-up), sem série e sem
   variação. Clicar recorta o MESTRE; clicar de novo desliga. */
const pendencias = computed(() => {
  const n = (k) => naFila(k).length;
  return [
    { key: 'todos', label: 'Pessoas', value: String(populacao.value.length),
      hint: rotuloPopulacao.value,
      icon: 'fas fa-users', tone: 'accent', tooltip: 'Ver todo mundo do filtro atual' },
    { key: 'sem-perfil', label: 'Sem perfil', value: String(n('sem-perfil')),
      hint: 'equipe no pacote antigo', icon: 'fas fa-user-slash',
      tone: n('sem-perfil') ? 'warn' : 'neutral', tooltip: 'Ver quem da equipe está sem perfil' },
    { key: 'sem-grant', label: 'Sem dados liberados', value: String(n('sem-grant')),
      hint: 'telas abrem vazias', icon: 'fas fa-building-lock',
      tone: n('sem-grant') ? 'neg' : 'neutral', tooltip: 'Ver quem não enxerga empreendimento nenhum' },
    { key: 'excecao', label: 'Com exceção', value: String(n('excecao')),
      hint: 'fora do perfil', icon: 'fas fa-code-branch',
      tone: n('excecao') ? 2 : 'neutral', tooltip: 'Ver quem tem exceção individual' },
    { key: 'sem-tela', label: 'Sem nenhuma tela', value: String(n('sem-tela')),
      hint: 'não abrem nada', icon: 'fas fa-ban',
      tone: n('sem-tela') ? 'neg' : 'neutral', tooltip: 'Ver quem está sem acesso a tela alguma' },
  ];
});

/* O cartão recorta DENTRO da população vigente, então os filtros de eixo ficam
   como estão: os dois se compõem sem quebrar a conta. */
function aoClicarPendencia(item) {
  aba.value = 'users';
  recorte.value = (item.key === 'todos' || recorte.value === item.key) ? '' : item.key;
}

const rotuloPopulacao = computed(() => {
  const partes = [];
  partes.push(tipoFiltro.value === 'externo' ? 'só externos'
    : tipoFiltro.value === 'equipe' ? 'só a equipe' : 'equipe e externos');
  if (incluirInativos.value) partes.push('com inativos');
  return partes.join(' · ');
});
const filaAtiva = computed(() => FILAS[recorte.value] || null);

/* ── A linha da lista ──────────────────────────────────────────────────────
   Antes era nome + e-mail: o e-mail ocupava a segunda linha inteira e não
   distinguia ninguém (25 dos 30 são @menin.com.br). Ele saiu para o hover e o
   detalhe, e a segunda linha passou a mostrar o ESTADO - que é o assunto da
   tela. O e-mail continua na busca.

   UM selo por linha, nesta ordem de precedência:

     1. inativo    não entra no sistema; nada abaixo importa enquanto isso
     2. admin      tem tudo, não há alçada para editar
     3. externo    o papel dele (Corretor/Imobiliária/Correspondente)
     4. pendência  a mais grave das três, quando houver
     5. departamento  o caso comum: é o que diz se o perfil combina com o cargo

   Pendência TROCA o departamento em vez de somar: dois selos na mesma linha
   competem, e quem varre a lista procurando problema perde o problema. */
const numeroDeGrants = (u) => (grantsBulk.value.user?.[String(u.id)] || []).length;

function seloDaLinha(u) {
  if (u.ativo === false) return { texto: 'inativo', variante: 'neutral', dica: 'Desativado: não entra no Office' };
  if (u.role === 'admin') return { texto: 'admin', variante: 'accent', dica: 'Acesso total por padrão' };
  if (u.tipo === 'externo') return { texto: rotuloExterno(u), variante: 'info', dica: 'Pessoa de fora, vinda do CV' };
  if (!(u.effectiveRoutes || []).length) return { texto: 'sem tela', variante: 'danger', dica: 'Não abre nada no Office' };
  if (!numeroDeGrants(u)) return { texto: 'sem dados', variante: 'danger', dica: 'As telas abrem vazias: nenhum empreendimento liberado' };
  if (!u.permission_profile_id) return { texto: 'sem perfil', variante: 'warning', dica: 'Rodando no pacote antigo, fora de qualquer perfil' };
  if (u.departamento) return { texto: u.departamento, variante: 'neutral', dica: u.cargo || 'Departamento' };
  return null;
}

/* Segunda linha: o que a tela administra, em uma frase. */
function resumoDaLinha(u) {
  if (u.role === 'admin') return 'Acesso total a telas e empreendimentos';
  const telas = (u.effectiveRoutes || []).length;
  const emp = numeroDeGrants(u);
  const partes = [];
  if (u.tipo === 'externo') partes.push(u.organizacao || u.cargo || 'Vindo do CV');
  else partes.push(u.permission_profile_id ? (profileById(u.permission_profile_id)?.name || 'Perfil') : 'Sem perfil');
  partes.push(`${telas} tela${telas === 1 ? '' : 's'}`);
  partes.push(`${emp} empreendimento${emp === 1 ? '' : 's'}`);
  return partes.join(' · ');
}

/* ── Mestre: usuários ────────────────────────────────────────────────────── */
const busca = ref('');
const selectedUser = ref(null);

const usuariosVisiveis = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return naoAdminsPrimeiro.value.filter(u => {
    if (filaAtiva.value && !filaAtiva.value.teste(u)) return false;
    if (!q) return true;
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
});
/* Admin no fim: não tem alçada para editar, e ocupar o topo da lista com quem
   não se edita atrapalha quem veio trabalhar. */
const naoAdminsPrimeiro = computed(() =>
  [...populacao.value].sort((a, b) => (a.role === 'admin') - (b.role === 'admin')));

/* ── Estado local do usuário aberto (perfil vivo + exceções) ─────────────── */
const localProfileId = ref('');
const localExtra = ref([]);
const localRemoved = ref([]);
const original = ref({ profileId: '', extra: [], removed: [] });
const salvando = ref(false);
const feedback = ref({ msg: '', ok: true });

const profileById = (id) => profiles.value.find(p => Number(p.id) === Number(id)) || null;
const profileRoutes = computed(() => {
  const p = profileById(localProfileId.value);
  return new Set(p && p.active !== false ? (p.routes || []) : []);
});
const extraSet = computed(() => new Set(localExtra.value));
const removedSet = computed(() => new Set(localRemoved.value));

/* As três camadas. É o que o switch sozinho não conta. */
function estadoRota(r) {
  const travada = isLocked(r);
  const herdado = profileRoutes.value.has(r);
  const excecaoMais = extraSet.value.has(r);
  const excecaoMenos = removedSet.value.has(r);
  return { travada, herdado, excecaoMais, excecaoMenos,
    efetivo: !travada && (herdado || excecaoMais) && !excecaoMenos };
}

function setRota(r, conceder) {
  const st = estadoRota(r);
  if (conceder) {
    if (st.excecaoMenos) localRemoved.value = localRemoved.value.filter(x => x !== r);
    if (!st.herdado && !st.excecaoMais) localExtra.value = [...localExtra.value, r];
  } else {
    if (st.excecaoMais) localExtra.value = localExtra.value.filter(x => x !== r);
    if (st.herdado && !st.excecaoMenos) localRemoved.value = [...localRemoved.value, r];
  }
}
function setGrupo(grupo, conceder) {
  for (const p of grupo.pages) if (!isLocked(p.route)) setRota(p.route, conceder);
}

/* Efeito: o salvo (servidor) e o que vai ficar (local). A diferença é o que a
   linha de efeito mostra antes de salvar. */
const efetivasSalvas = computed(() => (selectedUser.value?.effectiveRoutes || []).length);
const efetivasPrevistas = computed(() =>
  todasAsRotas.value.filter(r => estadoRota(r).efetivo).length);
const excecoesPrevistas = computed(() => localExtra.value.length + localRemoved.value.length);

const alteracoes = computed(() => {
  if (!selectedUser.value || selectedUser.value.role === 'admin') return 0;
  const norm = (a) => [...a].sort().join(',');
  let n = 0;
  if (String(localProfileId.value || '') !== String(original.value.profileId || '')) n++;
  if (norm(localExtra.value) !== norm(original.value.extra)) n++;
  if (norm(localRemoved.value) !== norm(original.value.removed)) n++;
  return n;
});
const sujo = computed(() => alteracoes.value > 0);

const resumoAlteracoes = computed(() => {
  const partes = [];
  if (String(localProfileId.value || '') !== String(original.value.profileId || '')) {
    partes.push(localProfileId.value ? `perfil: ${profileById(localProfileId.value)?.name}` : 'perfil removido');
  }
  const d = efetivasPrevistas.value - efetivasSalvas.value;
  if (d) partes.push(`${d > 0 ? '+' : ''}${d} tela${Math.abs(d) === 1 ? '' : 's'}`);
  return partes.join(' · ') || 'exceções ajustadas';
});

function abrirUsuario(u) {
  if (sujo.value && u?.id !== selectedUser.value?.id) {
    pendenteTroca.value = u;
    dialogo.value = 'descartar';
    return;
  }
  aplicarUsuario(u);
}
function aplicarUsuario(u) {
  selectedUser.value = u;
  feedback.value = { msg: '', ok: true };
  const pid = u?.permission_profile_id ? String(u.permission_profile_id) : '';
  const extra = [...(u?.permission?.routes_extra ?? [])];
  const removed = [...(u?.permission?.routes_removed ?? [])];
  localProfileId.value = pid;
  localExtra.value = extra;
  localRemoved.value = removed;
  original.value = { profileId: pid, extra: [...extra], removed: [...removed] };
}
function descartar() {
  aplicarUsuario(selectedUser.value);
}

async function salvarUsuario() {
  if (!selectedUser.value || salvando.value) return;
  salvando.value = true;
  try {
    await requestWithAuth(`/permissions/${selectedUser.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        profileId: localProfileId.value ? Number(localProfileId.value) : null,
        routesExtra: localExtra.value,
        routesRemoved: localRemoved.value,
      }),
    });
    /* Recarrega a lista: quem manda no efetivo é o servidor, e é dele que sai
       o número que a tela mostra depois de salvar. */
    await carregarUsuarios();
    const atualizado = users.value.find(u => u.id === selectedUser.value.id);
    if (atualizado) aplicarUsuario(atualizado);
    feedback.value = { msg: `Alçadas de ${selectedUser.value.username} salvas.`, ok: true };
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao salvar as alçadas.', ok: false };
  } finally {
    salvando.value = false;
    setTimeout(() => { feedback.value = { msg: '', ok: true }; }, 5000);
  }
}

/* ── Perfis ──────────────────────────────────────────────────────────────── */
const selectedProfile = ref(null);
const profileForm = ref({ name: '', description: '', department_id: '', routes: [] });
const profileOriginal = ref('');
const savingProfile = ref(false);
const novoPerfilModal = ref(false);
const novoPerfil = ref({ name: '', description: '', department_id: '' });

const departmentOptions = computed(() => [
  { value: '', label: 'Nenhum (perfil avulso)' },
  ...departments.value.map(d => ({ value: String(d.id), label: d.name })),
]);
/* Só perfil ATIVO é oferecido - inativo não concede tela nenhuma. O perfil já
   aplicado continua na lista mesmo inativo, rotulado: sumir com a opção faria
   parecer que a pessoa está sem perfil. */
const profileOptions = computed(() => {
  const atual = String(localProfileId.value || '');
  return [
    { value: '', label: 'Sem perfil' },
    ...profiles.value
      .filter(p => p.active !== false || String(p.id) === atual)
      .map(p => ({ value: String(p.id), label: p.active === false ? `${p.name} (inativo)` : p.name })),
  ];
});
const usersByProfile = computed(() => {
  const m = new Map();
  for (const u of users.value) {
    if (!u.permission_profile_id) continue;
    m.set(u.permission_profile_id, (m.get(u.permission_profile_id) || 0) + 1);
  }
  return m;
});

function abrirPerfil(p) {
  selectedProfile.value = p;
  profileForm.value = {
    name: p.name, description: p.description || '',
    department_id: p.department_id ? String(p.department_id) : '',
    routes: [...(p.routes || [])],
  };
  profileOriginal.value = JSON.stringify(profileForm.value);
}
const perfilSujo = computed(() =>
  !!selectedProfile.value && JSON.stringify(profileForm.value) !== profileOriginal.value);

function estadoRotaPerfil(r) {
  return { travada: isLocked(r), herdado: false, excecaoMais: false, excecaoMenos: false,
    efetivo: profileForm.value.routes.includes(r) };
}
function setRotaPerfil(r, conceder) {
  const tem = profileForm.value.routes.includes(r);
  if (conceder && !tem) profileForm.value.routes = [...profileForm.value.routes, r];
  if (!conceder && tem) profileForm.value.routes = profileForm.value.routes.filter(x => x !== r);
}
function setGrupoPerfil(grupo, conceder) {
  for (const p of grupo.pages) if (!isLocked(p.route)) setRotaPerfil(p.route, conceder);
}

async function salvarPerfil() {
  if (!selectedProfile.value || savingProfile.value) return;
  savingProfile.value = true;
  try {
    await requestWithAuth(`/permissions/profiles/${selectedProfile.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: profileForm.value.name.trim(),
        description: profileForm.value.description.trim() || null,
        department_id: profileForm.value.department_id ? Number(profileForm.value.department_id) : null,
        routes: profileForm.value.routes,
      }),
    });
    await Promise.all([carregarPerfis(), carregarUsuarios()]);
    const atualizado = profiles.value.find(p => p.id === selectedProfile.value.id);
    if (atualizado) abrirPerfil(atualizado);
    feedback.value = { msg: 'Perfil salvo. Quem usa ele já está com as telas novas.', ok: true };
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao salvar o perfil.', ok: false };
  } finally {
    savingProfile.value = false;
    setTimeout(() => { feedback.value = { msg: '', ok: true }; }, 5000);
  }
}

async function criarPerfil() {
  if (!novoPerfil.value.name.trim()) return;
  savingProfile.value = true;
  try {
    await requestWithAuth('/permissions/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: novoPerfil.value.name.trim(),
        description: novoPerfil.value.description.trim() || null,
        department_id: novoPerfil.value.department_id ? Number(novoPerfil.value.department_id) : null,
        routes: [],
      }),
    });
    await carregarPerfis();
    novoPerfilModal.value = false;
    const criado = profiles.value.find(p => p.name === novoPerfil.value.name.trim());
    novoPerfil.value = { name: '', description: '', department_id: '' };
    if (criado) abrirPerfil(criado);
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao criar o perfil.', ok: false };
  } finally {
    savingProfile.value = false;
  }
}

/* ── Diálogos ────────────────────────────────────────────────────────────── */
const dialogo = ref('');           // '' | 'travar' | 'excluir-perfil' | 'restaurar-perfil' | 'descartar' | 'revogar'
const alvoTela = ref(null);
const pendenteTroca = ref(null);
const dialogoBusy = ref(false);
const lockBusy = ref('');

const pessoasAfetadas = computed(() => alcancePorRota.value[alvoTela.value?.route] || 0);

function pedirTravar(page) { alvoTela.value = page; dialogo.value = 'travar'; }

async function confirmarTravar(motivo) {
  dialogoBusy.value = true;
  lockBusy.value = alvoTela.value.route;
  try {
    await requestWithAuth('/permissions/route-policies', {
      method: 'PUT',
      body: JSON.stringify({ route: alvoTela.value.route, adminOnly: true, note: motivo || null }),
    });
    await Promise.all([carregarPoliticas(), carregarUsuarios()]);
    feedback.value = { msg: `"${alvoTela.value.name}" agora é exclusiva de administradores.`, ok: true };
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao travar a tela.', ok: false };
  } finally {
    dialogoBusy.value = false; lockBusy.value = ''; dialogo.value = ''; alvoTela.value = null;
    setTimeout(() => { feedback.value = { msg: '', ok: true }; }, 5000);
  }
}

/* Destravar devolve a tela ao perfil de cada um: reversível e sem risco de
   acesso indevido, então vai direto. */
async function destravar(page) {
  lockBusy.value = page.route;
  try {
    await requestWithAuth('/permissions/route-policies', {
      method: 'PUT', body: JSON.stringify({ route: page.route, adminOnly: false }),
    });
    await Promise.all([carregarPoliticas(), carregarUsuarios()]);
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao destravar a tela.', ok: false };
  } finally { lockBusy.value = ''; }
}

async function confirmarExcluirPerfil() {
  dialogoBusy.value = true;
  try {
    await requestWithAuth(`/permissions/profiles/${selectedProfile.value.id}`, { method: 'DELETE' });
    profiles.value = profiles.value.filter(p => p.id !== selectedProfile.value.id);
    selectedProfile.value = null;
    await carregarUsuarios();
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao excluir o perfil.', ok: false };
  } finally { dialogoBusy.value = false; dialogo.value = ''; }
}

async function confirmarRestaurarPerfil() {
  dialogoBusy.value = true;
  try {
    await requestWithAuth(`/permissions/profiles/${selectedProfile.value.id}/reset-default`, { method: 'POST' });
    await Promise.all([carregarPerfis(), carregarUsuarios()]);
    const atualizado = profiles.value.find(p => p.id === selectedProfile.value.id);
    if (atualizado) abrirPerfil(atualizado);
  } catch (e) {
    feedback.value = { msg: e.message || 'Erro ao restaurar o padrão.', ok: false };
  } finally { dialogoBusy.value = false; dialogo.value = ''; }
}

function confirmarDescartar() {
  const proximo = pendenteTroca.value;
  dialogo.value = ''; pendenteTroca.value = null;
  aplicarUsuario(proximo);
}

function confirmarRevogar() {
  for (const g of gruposDelegaveis.value) setGrupo(g, false);
  dialogo.value = '';
}

/* ── Grants ──────────────────────────────────────────────────────────────── */
const grantsModal = ref({ open: false, type: 'user', id: null, name: '' });
function abrirGrants(type, id, name) { grantsModal.value = { open: true, type, id, name }; }
async function aoFecharGrants() {
  grantsModal.value.open = false;
  await carregarGrants();
}

/* ── Carga ───────────────────────────────────────────────────────────────── */
async function carregarUsuarios() {
  const data = await requestWithAuth('/permissions');
  users.value = Array.isArray(data) ? data : [];
}
async function carregarPerfis() {
  const data = await requestWithAuth('/permissions/profiles');
  profiles.value = Array.isArray(data) ? data : [];
}
async function carregarPoliticas() {
  const data = await requestWithAuth('/permissions/route-policies');
  routePolicies.value = Array.isArray(data?.policies) ? data.policies : [];
}
async function carregarGrants() {
  const data = await requestWithAuth('/permissions/grants');
  grantsBulk.value = { user: data?.user || {}, profile: data?.profile || {} };
}

async function carregarTudo() {
  loading.value = true; erro.value = '';
  try {
    const [, , , , depts, cat, ret] = await Promise.all([
      carregarUsuarios(), carregarPerfis(), carregarPoliticas(), carregarGrants(),
      requestWithAuth('/admin/departments'),
      requestWithAuth('/permissions/capabilities'),
      requestWithAuth('/permissions/retired-routes'),
    ]);
    const lista = Array.isArray(depts) ? depts : (depts?.data || []);
    departments.value = lista.filter(d => d.active !== false);
    capCatalog.value = Object.fromEntries((cat?.screens || []).map(s => [s.route, s]));
    retired.value = { retired: ret?.retired || [], exclusive: ret?.exclusive || [] };

    const preselect = route.query.userId ? parseInt(route.query.userId) : null;
    if (preselect) {
      const found = users.value.find(u => u.id === preselect);
      if (found) aplicarUsuario(found);
    }
  } catch (e) {
    erro.value = e.message || 'Não foi possível carregar a gestão de alçadas.';
  } finally {
    loading.value = false;
  }
}

const orphanPolicies = computed(() => {
  const conhecidas = new Set(todasAsRotas.value.map(normRoute));
  return routePolicies.value.filter(p => p.adminOnly && !conhecidas.has(normRoute(p.route)));
});

/* Trocar de aba com alteração pendente: a barra continua visível, então o
   trabalho não se perde de vista. */
watch(aba, () => { feedback.value = { msg: '', ok: true }; });

onMounted(carregarTudo);
</script>

<template>
  <PageContainer size="xl">

    <PageHeader title="Gestão de alçadas"
      subtitle="Quem enxerga cada tela, quais dados, e o que pode fazer dentro delas. Administradores têm acesso total por padrão."
      icon="fas fa-shield-halved">
      <template #title>
        <span>Gestão de alçadas</span>
        <Favorite :router="'/settings/permissions'" :section="'Alçadas'" />
      </template>
      <template #actions>
        <Button v-if="aba === 'profiles'" size="sm" variant="secondary" icon="fas fa-plus"
          @click="novoPerfilModal = true">
          <span class="hidden sm:inline">Novo perfil</span>
        </Button>
        <PageHelp
          storage-key="alcadas"
          title="Como usar a Gestão de alçadas"
          intro="Esta tela decide o que cada pessoa enxerga no Office: quais telas, quais empreendimentos e o que ela pode fazer dentro de cada tela. O que você salva aqui vale na hora, no menu, na rota, na API e na Eme."
          :steps="[
            { title: 'Comece pelas pendências', text: 'Os cartões do topo são filas de trabalho, não estatística. Clicar em um deles deixa na lista só as pessoas naquela situação; clicar de novo desfaz.' },
            { title: 'Escolha a pessoa', text: 'A lista da esquerda é o ponto de partida. O painel da direita mostra o que ela tem hoje e o que vai passar a ter.' },
            { title: 'Aponte um perfil', text: 'O perfil é vivo: editar o perfil na aba Perfis muda todo mundo que aponta para ele, na hora. Use exceção só quando a pessoa foge do padrão do cargo.' },
            { title: 'Confira o efeito antes de salvar', text: 'A linha abaixo do nome mostra quantas telas ela tem e quantas vai ficar. Nada é gravado até você clicar em Salvar na barra de baixo.' },
            { title: 'Libere os dados', text: 'Ter a tela não é ver o dado: sem empreendimento liberado a tela abre vazia. O botão Empreendimentos resolve isso, por pessoa ou por perfil.' },
          ]"
          :tips="[
            'Travar uma tela na aba Telas tira ela de todos os não-administradores de uma vez, sem depender de perfil - e o aviso diz quantas pessoas perdem o acesso.',
            'A aba Telas também mostra as AÇÕES de cada tela: o que a alçada libera por dentro e o que continua sendo só de administrador.',
            'A lista tem dois eixos no topo: EQUIPE ou EXTERNOS (corretor, imobiliária, correspondente, que entram pelo CV) e a chave de incluir os desativados. Ela abre como sempre abriu - equipe, só ativos - e o resto está a um clique.',
            'As pendências contam só quem trabalha aqui: administrador, externo e desativado ficam fora das filas. Externo sem perfil é o estado normal dele, porque perfil aqui é por departamento.',
            'O número do cartão é sempre o número que a lista devolve: o cartão recorta dentro do filtro que estiver valendo, seja qual for.',
            'Cada linha da lista mostra um selo só, na ordem: desativado, administrador, externo, a pendência mais grave e, no caso comum, o departamento - que é o que diz se o perfil combina com o cargo. O e-mail saiu para o hover, mas continua valendo na busca.',
            'Selo cinza é herança do perfil; azul é exceção liberada; âmbar é exceção negada. Exceção é o que se revisa depois.',
            'Rota aposentada volta a sair no próximo reinício: religar por exceção não adianta, está listado na aba Telas.',
          ]"
        />
      </template>
    </PageHeader>

    <!-- Erro -->
    <div v-if="erro"
      class="mb-4 rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
             flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start gap-2 min-w-0">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i><span class="min-w-0">{{ erro }}</span>
      </div>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0" @click="carregarTudo">
        Tentar novamente
      </Button>
    </div>

    <!-- Carga -->
    <div v-else-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 5" :key="i" variant="stat" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton variant="row" :lines="6" />
        <div class="lg:col-span-2"><Skeleton variant="table" :lines="6" /></div>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Barra de pendências: cada número leva ao trabalho -->
      <StatRow :items="pendencias" :cols="{ sm: 2, md: 3, lg: 5 }" size="sm"
        selectable :active-key="recorte" @select="aoClicarPendencia" />

      <SegmentedControl v-model="aba" :options="abas" size="sm" class="overflow-x-auto" />

      <!-- ══════════ USUÁRIOS ══════════ -->
      <div v-if="aba === 'users'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Mestre -->
        <div class="lg:col-span-1">
          <Panel :padded="false" class="lg:sticky lg:top-20">
            <template #title>
              <span class="flex items-center gap-2">
                Pessoas
                <Badge size="sm" :variant="filaAtiva ? 'accent' : 'neutral'">{{ usuariosVisiveis.length }}</Badge>
              </span>
            </template>
            <template #actions>
              <button v-if="filaAtiva" type="button"
                class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                       text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
                @click="recorte = ''">
                só {{ filaAtiva.label }}
                <i class="fas fa-xmark text-micro"></i>
              </button>
            </template>

            <div class="p-3 border-b border-line-subtle space-y-2.5">
              <!-- Os dois eixos ficam aqui, no topo do mestre: são o que define
                   quem está na mesa. Nada de painel de filtro para dois
                   controles. -->
              <SegmentedControl v-model="tipoFiltro" :options="tiposOpcoes" size="sm" />
              <!-- Contagem vai como `description` do proprio Switch: o <label>
                   do primitivo envolve rotulo e descricao, entao clicar em
                   qualquer parte da linha alterna. Solto ao lado, o texto ficava
                   fora do alvo. -->
              <Switch v-model="incluirInativos" size="sm" label="Incluir inativos"
                :description="`${inativos.length} desativado${inativos.length === 1 ? '' : 's'} no sistema`" />
              <Input v-model="busca" placeholder="Buscar por nome ou e-mail" iconLeft="fas fa-magnifying-glass" />
            </div>

            <EmptyState v-if="!usuariosVisiveis.length" size="sm" icon="fas fa-user-slash"
              title="Ninguém nesta fila"
              description="Nenhuma pessoa está nessa situação agora." />

            <ul v-else class="max-h-[32rem] overflow-y-auto divide-y divide-line-subtle">
              <li v-for="u in usuariosVisiveis" :key="u.id">
                <button type="button"
                  class="w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[3.25rem]
                         hover:bg-surface-sunken/60 transition-colors duration-120 focus-ring"
                  :class="selectedUser?.id === u.id ? 'bg-accent-soft/60' : ''"
                  :title="`${u.username} · ${u.email}`"
                  @click="abrirUsuario(u)">
                  <UserAvatar :name="u.username" size="sm" />
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium text-ink truncate"
                      :class="u.ativo === false ? 'text-ink-muted' : ''">{{ u.username }}</span>
                    <span class="block text-micro text-ink-subtle truncate">{{ resumoDaLinha(u) }}</span>
                  </span>
                  <Badge v-if="seloDaLinha(u)" :variant="seloDaLinha(u).variante" size="sm"
                    class="shrink-0 max-w-[7.5rem]" v-tippy="seloDaLinha(u).dica">
                    <span class="truncate">{{ seloDaLinha(u).texto }}</span>
                  </Badge>
                </button>
              </li>
            </ul>
          </Panel>
        </div>

        <!-- Detalhe -->
        <div class="lg:col-span-2 space-y-4">
          <EmptyState v-if="!selectedUser" icon="fas fa-hand-pointer"
            title="Escolha uma pessoa à esquerda"
            description="O painel mostra o que ela enxerga hoje e o que vai passar a enxergar." />

          <template v-else>
            <!-- Identidade + linha de efeito -->
            <Panel padded>
              <div class="flex items-start gap-3">
                <UserAvatar :name="selectedUser.username" size="lg" />
                <div class="min-w-0 flex-1">
                  <h2 class="text-base font-semibold text-ink truncate">{{ selectedUser.username }}</h2>
                  <p class="text-xs text-ink-muted truncate">{{ selectedUser.email }}</p>

                  <!-- Linha de efeito: o salvo e o previsto -->
                  <p v-if="selectedUser.role !== 'admin'"
                    class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                    <span class="tabular-nums">
                      <b class="text-ink">{{ efetivasSalvas }}</b> tela{{ efetivasSalvas === 1 ? '' : 's' }} efetiva{{ efetivasSalvas === 1 ? '' : 's' }}
                    </span>
                    <template v-if="sujo">
                      <i class="fas fa-arrow-right text-micro text-accent"></i>
                      <b class="text-accent tabular-nums">{{ efetivasPrevistas }}</b>
                    </template>
                    <span class="text-ink-subtle">·</span>
                    <span class="tabular-nums">{{ excecoesPrevistas }} exceç{{ excecoesPrevistas === 1 ? 'ão' : 'ões' }}</span>
                    <span class="text-ink-subtle">·</span>
                    <span class="truncate">
                      {{ localProfileId ? profileById(localProfileId)?.name : 'sem perfil' }}
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="secondary" icon="fas fa-building"
                  class="shrink-0"
                  @click="abrirGrants('user', selectedUser.id, selectedUser.username)">
                  <span class="hidden sm:inline">Empreendimentos</span>
                </Button>
              </div>

              <!-- Avisos de estado do sujeito -->
              <!-- Tipo: fica ao lado do e-mail porque muda a leitura de tudo
                   que vem abaixo (perfil de departamento não serve a externo). -->
              <div class="mt-2 flex flex-wrap items-center gap-2 text-micro text-ink-subtle">
                <Badge :variant="selectedUser.tipo === 'externo' ? 'info' : 'neutral'" size="sm">
                  <i :class="selectedUser.tipo === 'externo' ? 'fas fa-user-tag' : 'fas fa-id-badge'"
                    class="text-micro"></i>
                  {{ selectedUser.tipo === 'externo' ? rotuloExterno(selectedUser) : 'Equipe' }}
                </Badge>
                <span v-if="selectedUser.cargo" class="truncate">
                  {{ selectedUser.cargo }}<template v-if="selectedUser.departamento"> · {{ selectedUser.departamento }}</template>
                </span>
                <span v-if="selectedUser.organizacao" class="truncate">{{ selectedUser.organizacao }}</span>
                <span class="font-mono">{{ selectedUser.auth_provider }}</span>
              </div>

              <div v-if="selectedUser.ativo === false"
                class="mt-3 rounded-lg border border-data-warn/25 bg-data-warn-soft p-3 text-xs text-data-warn
                       flex items-start gap-2">
                <i class="fas fa-user-slash mt-0.5 shrink-0"></i>
                <span>
                  Usuário desativado: não entra no Office. As alçadas abaixo continuam gravadas e
                  voltam a valer se ele for reativado - é por isso que ele aparece aqui.
                </span>
              </div>

              <div v-if="selectedUser.role === 'admin'"
                class="mt-3 rounded-lg border border-accent/25 bg-accent-soft p-3 text-xs text-accent">
                Administrador enxerga todas as telas e todos os empreendimentos. Não há alçada para editar.
              </div>
              <div v-else-if="selectedUser.tipo === 'externo'"
                class="mt-3 rounded-lg border border-line bg-surface-sunken p-3 text-xs text-ink-muted
                       flex items-start gap-2">
                <i class="fas fa-circle-info mt-0.5 shrink-0 text-accent"></i>
                <span>
                  Pessoa de fora, vinda do CV. Os perfis desta tela são por departamento e não se
                  aplicam a ela: libere as telas uma a uma, como exceção.
                </span>
              </div>
              <div v-else-if="!(grantsBulk.user?.[String(selectedUser.id)] || []).length"
                class="mt-3 rounded-lg border border-data-neg/25 bg-data-neg/10 p-3 text-xs text-data-neg
                       flex items-start gap-2">
                <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
                <span>
                  Sem nenhum empreendimento liberado: mesmo com telas na alçada, elas abrem vazias.
                  Use <b>Empreendimentos</b> acima.
                </span>
              </div>
            </Panel>

            <template v-if="selectedUser.role !== 'admin'">
              <!-- Perfil vivo -->
              <Panel padded title="Perfil"
                subtitle="Editar o perfil na aba Perfis muda todo mundo que aponta para ele, na hora.">
                <div class="grid sm:grid-cols-2 gap-3">
                  <Select v-model="localProfileId" :options="profileOptions" label="Perfil aplicado" />
                  <div class="flex items-end">
                    <p class="text-xs text-ink-muted">
                      <template v-if="localProfileId">
                        {{ profileRoutes.size }} tela{{ profileRoutes.size === 1 ? '' : 's' }} vêm do perfil.
                        O que estiver marcado como exceção continua valendo por cima.
                      </template>
                      <template v-else>
                        Sem perfil: a pessoa só tem o que for liberado como exceção, uma a uma.
                      </template>
                    </p>
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" icon="fas fa-eraser"
                    :disabled="!excecoesPrevistas" @click="localExtra = []; localRemoved = []">
                    Limpar exceções
                  </Button>
                  <Button size="sm" variant="ghost" icon="fas fa-ban"
                    @click="dialogo = 'revogar'">
                    Tirar todas as telas
                  </Button>
                </div>
              </Panel>

              <!-- As três camadas, tela a tela -->
              <RouteMatrix :grupos="gruposDelegaveis" :estado="estadoRota" modo="usuario"
                @toggle="setRota" @toggle-grupo="setGrupo" />
            </template>
          </template>
        </div>
      </div>

      <!-- ══════════ PERFIS ══════════ -->
      <div v-else-if="aba === 'profiles'" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-1">
          <Panel :padded="false" class="lg:sticky lg:top-20" title="Perfis">
            <EmptyState v-if="!profiles.length" size="sm" icon="fas fa-layer-group"
              title="Nenhum perfil ainda"
              description="Crie um perfil por cargo e aponte as pessoas para ele." />
            <ul v-else class="max-h-[32rem] overflow-y-auto divide-y divide-line-subtle">
              <li v-for="p in profiles" :key="p.id">
                <button type="button"
                  class="w-full text-left px-3 py-2.5 min-h-[3.25rem] hover:bg-surface-sunken/60
                         transition-colors duration-120 focus-ring"
                  :class="selectedProfile?.id === p.id ? 'bg-accent-soft/60' : ''"
                  @click="abrirPerfil(p)">
                  <span class="flex items-center gap-2 min-w-0">
                    <span class="text-sm font-medium text-ink truncate">{{ p.name }}</span>
                    <!-- Perfil inativo não concede nada, e sem selo fica igual
                         aos outros na lista. -->
                    <Badge v-if="p.active === false" variant="neutral" size="sm">inativo</Badge>
                  </span>
                  <span class="block text-micro text-ink-subtle">
                    {{ (p.routes || []).length }} telas ·
                    {{ usersByProfile.get(p.id) || 0 }} pessoa{{ (usersByProfile.get(p.id) || 0) === 1 ? '' : 's' }}
                  </span>
                </button>
              </li>
            </ul>
          </Panel>
        </div>

        <div class="lg:col-span-2 space-y-4">
          <EmptyState v-if="!selectedProfile" icon="fas fa-hand-pointer"
            title="Escolha um perfil à esquerda"
            description="O perfil é vivo: o que você mudar aqui vale na hora para todo mundo que aponta para ele." />

          <template v-else>
            <Panel padded>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h2 class="text-base font-semibold text-ink truncate">{{ selectedProfile.name }}</h2>
                  <p class="mt-1 text-xs text-ink-muted">
                    <b class="text-ink tabular-nums">{{ usersByProfile.get(selectedProfile.id) || 0 }}</b>
                    pessoa{{ (usersByProfile.get(selectedProfile.id) || 0) === 1 ? '' : 's' }} usa{{ (usersByProfile.get(selectedProfile.id) || 0) === 1 ? '' : 'm' }} este perfil ·
                    <span class="tabular-nums">{{ profileForm.routes.length }}</span> telas
                  </p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="secondary" icon="fas fa-building"
                    @click="abrirGrants('profile', selectedProfile.id, selectedProfile.name)">
                    <span class="hidden sm:inline">Empreendimentos</span>
                  </Button>
                  <IconButton icon="fas fa-rotate-left" size="sm" label="Restaurar telas padrão do departamento"
                    @click="dialogo = 'restaurar-perfil'" />
                  <IconButton icon="fas fa-trash" size="sm" label="Excluir perfil"
                    @click="dialogo = 'excluir-perfil'" />
                </div>
              </div>

              <div v-if="selectedProfile.active === false"
                class="mt-3 rounded-lg border border-data-warn/25 bg-data-warn-soft p-3 text-xs text-data-warn
                       flex items-start gap-2">
                <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
                <span>Perfil inativo: quem aponta para ele não recebe tela nenhuma por aqui, só pelas exceções.</span>
              </div>

              <div class="mt-3 grid sm:grid-cols-3 gap-3">
                <Input v-model="profileForm.name" label="Nome" />
                <Input v-model="profileForm.description" label="Descrição" placeholder="Para que serve" />
                <Select v-model="profileForm.department_id" :options="departmentOptions" label="Departamento" />
              </div>
            </Panel>

            <RouteMatrix :grupos="gruposDelegaveis" :estado="estadoRotaPerfil" modo="perfil"
              @toggle="setRotaPerfil" @toggle-grupo="setGrupoPerfil" />
          </template>
        </div>
      </div>

      <!-- ══════════ TELAS ══════════ -->
      <ScreensTab v-else-if="aba === 'screens'"
        :grupos="gruposDelegaveis"
        :admin-only-pages="getAdminOnlyPages()"
        :always-free-pages="getAlwaysFreePages()"
        :capabilities="capCatalog"
        :alcance="alcancePorRota"
        :locked-routes="lockedRoutes"
        :orphan-policies="orphanPolicies"
        :retired="retired.retired"
        :exclusive="retired.exclusive"
        :busy="lockBusy"
        @lock="pedirTravar" @unlock="destravar" />

      <!-- ══════════ DEPARTAMENTOS ══════════ -->
      <DepartmentVisibilityPanel v-else-if="aba === 'departments'" />
    </div>

    <!-- Feedback fica no lugar da ação, não num alerta do navegador -->
    <transition enter-active-class="transition-all duration-200 ease-out-expo"
      enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
      <div v-if="feedback.msg"
        class="fixed bottom-24 right-4 z-10 max-w-sm rounded-xl border p-3 text-sm shadow-overlay"
        :class="feedback.ok
          ? 'border-data-pos/25 bg-data-pos-soft text-data-pos'
          : 'border-data-neg/25 bg-data-neg/10 text-data-neg'">
        <i :class="feedback.ok ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'" class="mr-1.5"></i>
        {{ feedback.msg }}
      </div>
    </transition>

    <!-- Alterações pendentes: nada é gravado sem passar por aqui -->
    <ActionBar :count="sujo ? alteracoes : (perfilSujo ? 1 : 0)"
      :unit="sujo || perfilSujo ? 'alteração pendente' : ''"
      :summary="sujo ? resumoAlteracoes : (perfilSujo ? `perfil ${profileForm.name}` : '')"
      clear-label="Descartar alterações"
      @clear="sujo ? descartar() : abrirPerfil(selectedProfile)">
      <Button v-if="sujo" size="sm" icon="fas fa-check" :loading="salvando" @click="salvarUsuario">
        Salvar
      </Button>
      <Button v-else-if="perfilSujo" size="sm" icon="fas fa-check" :loading="savingProfile" @click="salvarPerfil">
        Salvar perfil
      </Button>
    </ActionBar>

    <!-- ── Diálogos ─────────────────────────────────────────────────────── -->
    <ConfirmDialog :open="dialogo === 'travar'" tone="danger"
      :title="`Tornar ${alvoTela?.name} exclusiva de administradores?`"
      :consequence="pessoasAfetadas
        ? `${pessoasAfetadas} pessoa${pessoasAfetadas === 1 ? '' : 's'} perde${pessoasAfetadas === 1 ? '' : 'm'} o acesso na hora, mesmo com a tela no perfil.`
        : 'Ninguém tem esta tela hoje, então nada muda agora - mas ela deixa de poder ser concedida.'"
      hint="Reversível: destravar devolve a tela a quem já tinha pelo perfil."
      confirm-label="Travar tela" ask-note note-label="Motivo (fica registrado)"
      note-placeholder="Ex.: tela em manutenção" :loading="dialogoBusy"
      @confirm="confirmarTravar" @cancel="dialogo = ''"
      @update:open="v => { if (!v) dialogo = '' }" />

    <ConfirmDialog :open="dialogo === 'excluir-perfil'" tone="danger"
      :title="`Excluir o perfil ${selectedProfile?.name}?`"
      :consequence="`${usersByProfile.get(selectedProfile?.id) || 0} pessoa(s) perdem as telas do perfil e ficam só com as exceções individuais.`"
      hint="As exceções de cada pessoa continuam como estão."
      confirm-label="Excluir perfil" :loading="dialogoBusy"
      @confirm="confirmarExcluirPerfil" @cancel="dialogo = ''"
      @update:open="v => { if (!v) dialogo = '' }" />

    <ConfirmDialog :open="dialogo === 'restaurar-perfil'" tone="accent"
      title="Restaurar as telas padrão do departamento?"
      consequence="As telas escolhidas à mão neste perfil são substituídas pelo conjunto padrão do departamento."
      hint="Depois disso o perfil volta a ser mantido em dia quando o sistema ganhar telas novas."
      confirm-label="Restaurar padrão" :loading="dialogoBusy"
      @confirm="confirmarRestaurarPerfil" @cancel="dialogo = ''"
      @update:open="v => { if (!v) dialogo = '' }" />

    <ConfirmDialog :open="dialogo === 'revogar'" tone="danger"
      :title="`Tirar todas as telas de ${selectedUser?.username}?`"
      :consequence="`As ${efetivasPrevistas} telas viram exceção negada. A pessoa continua entrando no Office, mas sem abrir nada.`"
      hint="Ainda não é definitivo: só vale quando você salvar."
      confirm-label="Tirar todas" @confirm="confirmarRevogar" @cancel="dialogo = ''"
      @update:open="v => { if (!v) dialogo = '' }" />

    <ConfirmDialog :open="dialogo === 'descartar'" tone="accent"
      title="Descartar as alterações?"
      :consequence="`Você mexeu nas alçadas de ${selectedUser?.username} e ainda não salvou.`"
      confirm-label="Descartar e trocar" cancel-label="Continuar editando"
      @confirm="confirmarDescartar" @cancel="dialogo = ''; pendenteTroca = null" />

    <!-- Criação rápida: só o nome. As telas se escolhem no detalhe. -->
    <Modal :open="novoPerfilModal" size="md" title="Novo perfil"
      subtitle="Depois de criar, escolha as telas no painel do perfil."
      @close="novoPerfilModal = false">
      <div class="space-y-3">
        <Input v-model="novoPerfil.name" label="Nome" placeholder="Ex.: Padrão - Comercial" />
        <Input v-model="novoPerfil.description" label="Descrição" placeholder="Para que serve" />
        <Select v-model="novoPerfil.department_id" :options="departmentOptions" label="Departamento" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="novoPerfilModal = false">Cancelar</Button>
        <Button :loading="savingProfile" :disabled="!novoPerfil.name.trim()" @click="criarPerfil">
          Criar perfil
        </Button>
      </template>
    </Modal>

    <GrantsModal :open="grantsModal.open" :subject-type="grantsModal.type"
      :subject-id="grantsModal.id" :subject-name="grantsModal.name"
      @close="aoFecharGrants" />
  </PageContainer>
</template>
