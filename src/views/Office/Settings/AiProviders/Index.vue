<script setup>
/**
 * Conexões de IA - de onde vem a inteligência do Office.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O QUE ESTA TELA RESOLVE
 *
 * O fornecedor de IA estava ESPALHADO: nove arquivos instanciavam o SDK do
 * Gemini, cada um com a sua chave e o seu retry, e o formato dele aparecia em
 * 41 pontos de chamada. Trocar de IA - ou reagir ao dia em que o modelo é
 * aposentado - era mexer no produto inteiro e subir deploy.
 *
 * Aqui a conexão virou DADO: qual fornecedor, com qual chave, com quais
 * modelos, atendendo qual contexto. Vale na hora, sem deploy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRÊS DECISÕES QUE APARECEM NA TELA
 *
 * 1. A CHAVE SÓ VAI. O campo nasce vazio e mostra `****a1b2` do que já está
 *    cadastrado. Quem quiser trocar digita a nova inteira. Campo que volta
 *    preenchido é credencial no cache do navegador e no print de tela.
 *
 * 2. MODELOS POR USO, EM ORDEM DE TENTATIVA. O chat pede raciocínio, a
 *    extração de JSON pede barato e rápido. Um nome por linha, porque é um
 *    valor técnico que se COLA da documentação do fornecedor.
 *
 * 3. CONTEXTO QUE AINDA NÃO PASSA PELA PORTA ÚNICA VEM TRAVADO, com o motivo.
 *    Tela que oferece botão inerte é pior que tela que não oferece nada: o
 *    admin trocaria o fornecedor, nada mudaria, e ele passaria a desconfiar
 *    também das partes que funcionam. A trava é do servidor, não daqui.
 *
 * Admin-only nos três níveis (navRegistry, meta da rota e requireAdmin na API).
 */
import { ref, reactive, computed, onMounted } from 'vue';
import {
    carregar, criarProvider, salvarProvider, removerProvider, salvarRota, testarProvider,
} from '@/utils/Settings/apiAiProviders';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const carregando = ref(true);
const salvando = ref(false);
const testandoId = ref(null);
const erro = ref('');
const aviso = ref('');

const dados = ref(null);      // { providers, routes, tipos, usos, contextos }
const providers = computed(() => dados.value?.providers || []);
const rotas = computed(() => dados.value?.routes || []);
const usos = computed(() => dados.value?.usos || ['chat', 'json', 'visao', 'embed']);

// ── Vocabulário da tela ──────────────────────────────────────────────────────
//
// O `kind` decide o ADAPTADOR, não a marca. 'openai' atende qualquer API
// compatível (Azure, Groq, DeepSeek, Together, modelo rodando na empresa), e é
// o que dá alcance real a esta tela: fornecedor novo compatível não precisa de
// código, precisa de um endereço base.
const TIPOS = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI (e qualquer API compatível)' },
    { value: 'anthropic', label: 'Anthropic Claude' },
];

const ROTULO_USO = {
    chat: 'Conversa (com ferramentas)',
    json: 'Extração de JSON',
    visao: 'Imagem e PDF',
    embed: 'Embedding (busca semântica)',
};

const AJUDA_USO = {
    chat: 'Onde entra o raciocínio. É o modelo mais caro e o que mais importa.',
    json: 'Triagem de e-mail, digests, insights. Pede barato e rápido.',
    visao: 'Leitura de odômetro na foto, cartão CNPJ, PDF escaneado.',
    embed: 'Busca do Academy e roteamento de tools. Trocar exige reindexar.',
};

const DICA_BASE = {
    gemini: 'Vazio usa https://generativelanguage.googleapis.com/v1beta',
    openai: 'Vazio usa https://api.openai.com/v1. Para Azure, Groq, DeepSeek ou um modelo local, cole o endereço aqui.',
    anthropic: 'Vazio usa https://api.anthropic.com/v1',
};

const tomDoStatus = (s) => ({
    ok: { badge: 'success', icone: 'fas fa-circle-check', cor: 'text-data-pos', fundo: 'bg-data-pos/10 border-data-pos/30' },
    degraded: { badge: 'warning', icone: 'fas fa-triangle-exclamation', cor: 'text-data-warn', fundo: 'bg-data-warn/10 border-data-warn/30' },
    down: { badge: 'danger', icone: 'fas fa-circle-xmark', cor: 'text-data-neg', fundo: 'bg-data-neg/10 border-data-neg/30' },
}[s] || { badge: 'neutral', icone: 'fas fa-circle-question', cor: 'text-ink-muted', fundo: 'bg-surface-sunken border-line' });

const rotuloStatus = (s) => ({ ok: 'Respondendo', degraded: 'Parcial', down: 'Fora do ar' }[s] || 'Sem checagem');

function quando(iso) {
    if (!iso) return 'nunca';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Formulário do provedor ───────────────────────────────────────────────────

const modalAberto = ref(false);
const editandoId = ref(null);

const form = reactive({
    key: '', label: '', kind: 'gemini', base_url: '',
    enabled: true, ordem: 0,
    api_keys: '',                  // SEMPRE nasce vazio (ver cabeçalho)
    models: { chat: '', json: '', visao: '', embed: '' },
});

const chavesAtuais = ref(null);    // { total, finais, vem_da_env } do que já está gravado

// Um nome por linha. É o formato de quem COLA da documentação.
const paraTexto = (v) => (Array.isArray(v) ? v : []).join('\n');
const paraLista = (t) => String(t || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

function abrirNovo() {
    editandoId.value = null;
    Object.assign(form, {
        key: '', label: '', kind: 'openai', base_url: '', enabled: true, ordem: providers.value.length,
        api_keys: '', models: { chat: '', json: '', visao: '', embed: '' },
    });
    chavesAtuais.value = null;
    erro.value = '';
    modalAberto.value = true;
}

function abrirEdicao(p) {
    editandoId.value = p.id;
    Object.assign(form, {
        key: p.key, label: p.label, kind: p.kind, base_url: p.base_url || '',
        enabled: !!p.enabled, ordem: p.ordem ?? 0,
        api_keys: '',
        models: Object.fromEntries(usos.value.map(u => [u, paraTexto(p.models?.[u])])),
    });
    chavesAtuais.value = p.chaves || null;
    erro.value = '';
    modalAberto.value = true;
}

async function gravar() {
    erro.value = '';
    salvando.value = true;
    try {
        const corpo = {
            key: form.key, label: form.label, kind: form.kind,
            base_url: form.base_url, enabled: form.enabled, ordem: form.ordem,
            models: Object.fromEntries(usos.value.map(u => [u, paraLista(form.models[u])])),
        };
        // `api_keys` ausente = deixa as chaves como estão. Mandar `[]` APAGARIA
        // as credenciais, e salvar o formulário sem tocar no campo não pode
        // desconectar o provedor.
        const digitadas = paraLista(form.api_keys);
        if (digitadas.length) corpo.api_keys = digitadas;

        if (editandoId.value) await salvarProvider(editandoId.value, corpo);
        else await criarProvider(corpo);

        modalAberto.value = false;
        aviso.value = 'Provedor salvo. Use "Testar" para confirmar que as chaves e os modelos respondem.';
        await recarregar();
    } catch (e) {
        erro.value = e.message;
    } finally {
        salvando.value = false;
    }
}

async function apagar(p) {
    if (!window.confirm(`Remover "${p.label}"? Os contextos que ele atende precisam apontar para outro antes.`)) return;
    erro.value = '';
    try {
        await removerProvider(p.id);
        await recarregar();
    } catch (e) { erro.value = e.message; }
}

async function testar(p) {
    testandoId.value = p.id;
    erro.value = '';
    aviso.value = '';
    try {
        const r = await testarProvider(p.id);
        aviso.value = r.status === 'ok'
            ? `"${p.label}" respondeu em todos os modelos do pool.`
            : `"${p.label}": ${r.erro || 'algum modelo não respondeu.'}`;
        await recarregar();
    } catch (e) {
        erro.value = e.message;
    } finally {
        testandoId.value = null;
    }
}

// ── Contextos ────────────────────────────────────────────────────────────────

async function trocarProvedorDoContexto(rota, providerKey) {
    erro.value = '';
    try {
        await salvarRota(rota.contexto, { provider_key: providerKey || null });
        await recarregar();
        aviso.value = `"${rota.label}" passou a ser atendido por ${providerKey || 'o provedor padrão'}.`;
    } catch (e) { erro.value = e.message; await recarregar(); }
}

async function alternarContexto(rota, ligado) {
    erro.value = '';
    try {
        await salvarRota(rota.contexto, { enabled: ligado });
        await recarregar();
    } catch (e) { erro.value = e.message; await recarregar(); }
}

const opcoesProvedor = computed(() => [
    { value: '', label: 'Provedor padrão (o primeiro habilitado)' },
    ...providers.value.filter(p => p.enabled).map(p => ({ value: p.key, label: p.label })),
]);

async function recarregar() {
    carregando.value = true;
    try {
        dados.value = await carregar();
    } catch (e) {
        erro.value = e.message;
    } finally {
        carregando.value = false;
    }
}

onMounted(recarregar);
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">

      <PageHeader
        title="Conexões de IA"
        subtitle="Qual fornecedor atende cada parte do sistema, com qual chave e com quais modelos."
        icon="fas fa-plug-circle-bolt">
        <template #actions>
          <PageHelp
            title="Como usar"
            :steps="[
              { title: 'Cadastre o provedor', text: 'Nome, tipo e a chave de API. O tipo OpenAI atende qualquer API compatível: basta colar o endereço base (Azure, Groq, DeepSeek, um modelo rodando aqui dentro).' },
              { title: 'Defina os modelos por uso', text: 'Um nome por linha, na ordem de tentativa. Se o primeiro falhar, o próximo assume sozinho - é assim que modelo aposentado deixa de virar parada.' },
              { title: 'Teste antes de confiar', text: 'O botão Testar faz um toque real em cada modelo do pool. Chave errada aparece aqui, e não na próxima pergunta de alguém.' },
              { title: 'Aponte os contextos', text: 'Cada parte do sistema escolhe seu provedor. Dá para migrar uma de cada vez, em vez de virar a chave de tudo num sábado.' },
            ]"
            :tips="[
              'A chave nunca volta para a tela: você vê só os últimos caracteres. Para trocar, digite a nova inteira.',
              'Contexto pausado não chama IA nenhuma - é o freio de mão quando um fornecedor começa a cobrar caro ou a responder errado.',
              'Trocar o provedor de embedding exige reindexar o Academy: vetor de outro modelo não se compara com os já gravados.',
            ]" />
          <Button icon="fas fa-plus" @click="abrirNovo">Novo provedor</Button>
        </template>
      </PageHeader>

      <div v-if="erro" class="mb-4 rounded-lg border border-data-neg/30 bg-data-neg/10 p-3 text-sm text-data-neg">
        <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ erro }}
      </div>
      <div v-if="aviso" class="mb-4 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-ink">
        <i class="fas fa-circle-info mr-1.5 text-accent"></i>{{ aviso }}
      </div>

      <!--
        Rodando fora da configuração desta tela. Precisa gritar: escondido,
        alguém editaria valores que o sistema não está lendo.
      -->
      <div v-if="dados?.degradado"
        class="mb-4 rounded-lg border border-data-warn/40 bg-data-warn/10 p-3 text-sm text-data-warn">
        <i class="fas fa-triangle-exclamation mr-1.5"></i>
        <strong>O sistema está no provedor de emergência.</strong> {{ dados.degradado }}
        Nada do que está abaixo está valendo até isto se resolver.
      </div>

      <div v-if="carregando" class="text-sm text-ink-muted py-10 text-center">
        <i class="fas fa-circle-notch fa-spin mr-1.5"></i>Carregando conexões...
      </div>

      <div v-else class="space-y-4">

        <!-- ── Provedores ────────────────────────────────────────────────── -->
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h2 class="text-sm font-semibold text-ink">Provedores</h2>
            <p class="text-xs text-ink-muted mt-0.5">
              Quem o sistema pode chamar. O estado é o do último teste, não uma promessa.
            </p>
          </div>

          <div class="p-5">
            <EmptyState v-if="!providers.length" icon="fas fa-plug"
              title="Nenhum provedor cadastrado"
              description="Sem provedor, nenhuma funcionalidade de IA responde." />

            <ul v-else class="space-y-3">
              <li v-for="p in providers" :key="p.id"
                class="rounded-lg border border-line p-4"
                :class="p.enabled ? '' : 'opacity-60'">

                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="h-10 w-10 grid place-items-center rounded-xl border shrink-0"
                      :class="tomDoStatus(p.status).fundo">
                      <i :class="[tomDoStatus(p.status).icone, tomDoStatus(p.status).cor]"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-sm font-semibold text-ink">{{ p.label }}</h3>
                        <Badge variant="neutral" size="sm">{{ p.kind }}</Badge>
                        <Badge :variant="tomDoStatus(p.status).badge" size="sm">{{ rotuloStatus(p.status) }}</Badge>
                        <Badge v-if="!p.enabled" variant="neutral" size="sm">desligado</Badge>
                      </div>

                      <p class="text-micro font-mono text-ink-subtle mt-1 break-all">
                        {{ p.key }} ·
                        {{ p.chaves?.total || 0 }} chave(s)
                        <span v-if="p.chaves?.finais?.length">({{ p.chaves.finais.join(' ') }})</span>
                        <span v-if="p.chaves?.vem_da_env" class="text-data-warn"> · vindo do ambiente</span>
                        · testado {{ quando(p.last_check_at) }}
                      </p>
                      <p v-if="p.base_url" class="text-micro font-mono text-ink-subtle break-all">{{ p.base_url }}</p>
                      <p v-if="p.last_error" class="text-xs text-data-neg mt-1 leading-relaxed">{{ p.last_error }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <Button size="sm" variant="ghost" icon="fas fa-stethoscope"
                      :loading="testandoId === p.id" @click="testar(p)">Testar</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-pen" @click="abrirEdicao(p)">Editar</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-trash" @click="apagar(p)">Remover</Button>
                  </div>
                </div>

                <!-- Pool por uso: o que o provedor sabe fazer, na ordem de tentativa -->
                <div class="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div v-for="u in usos" :key="u"
                    class="rounded-md border border-line bg-surface-sunken px-3 py-2 min-w-0">
                    <p class="text-micro uppercase tracking-wider text-ink-subtle">{{ ROTULO_USO[u] || u }}</p>
                    <p v-if="(p.models?.[u] || []).length" class="text-xs font-mono text-ink mt-1 break-all leading-relaxed">
                      {{ (p.models[u] || []).join(', ') }}
                    </p>
                    <p v-else class="text-xs text-ink-subtle mt-1">nao atende</p>
                  </div>
                </div>

                <!-- Resultado do último teste, modelo a modelo -->
                <ul v-if="(p.last_models || []).length" class="mt-3 flex flex-wrap gap-2">
                  <li v-for="m in p.last_models" :key="m.model"
                    class="rounded-md border px-2.5 py-1 text-micro font-mono"
                    :class="m.ok ? 'border-data-pos/25 bg-data-pos/5 text-data-pos' : 'border-data-neg/25 bg-data-neg/5 text-data-neg'">
                    {{ m.model }}
                    <span v-if="m.ok">· {{ m.ms }}ms</span>
                    <span v-else>· {{ m.tipo }}</span>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </Surface>

        <!-- ── Contextos ─────────────────────────────────────────────────── -->
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line">
            <h2 class="text-sm font-semibold text-ink">Quem atende cada parte</h2>
            <p class="text-xs text-ink-muted mt-0.5">
              Migrar um contexto por vez é o que evita descobrir em produção que um formato não era equivalente.
            </p>
          </div>

          <div class="p-5 space-y-3">
            <div v-for="r in rotas" :key="r.contexto"
              class="rounded-lg border border-line p-4"
              :class="r.enabled ? '' : 'bg-surface-sunken'">

              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-sm font-semibold text-ink">{{ r.label }}</h3>
                    <Badge v-if="!r.roteavel" variant="neutral" size="sm">caminho nativo</Badge>
                    <Badge v-if="!r.enabled" variant="warning" size="sm">pausado</Badge>
                  </div>
                  <p class="text-micro font-mono text-ink-subtle mt-1">{{ r.contexto }}</p>
                  <p v-if="r.motivo" class="text-xs text-ink-muted mt-1.5 leading-relaxed max-w-2xl">
                    <i class="fas fa-circle-info mr-1 text-ink-subtle"></i>{{ r.motivo }}
                  </p>
                  <p v-else-if="r.nota" class="text-xs text-data-warn mt-1.5 leading-relaxed max-w-2xl">
                    <i class="fas fa-triangle-exclamation mr-1"></i>{{ r.nota }}
                  </p>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="w-60">
                    <Select
                      size="sm"
                      :model-value="r.provider_key || ''"
                      :options="opcoesProvedor"
                      :disabled="!r.roteavel"
                      @change="(v) => trocarProvedorDoContexto(r, v)" />
                  </div>
                  <Switch size="sm" :model-value="!!r.enabled"
                    @update:model-value="(v) => alternarContexto(r, v)" />
                </div>
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <!-- ── Modal do provedor ─────────────────────────────────────────────── -->
      <Modal :open="modalAberto" size="lg"
        :title="editandoId ? 'Editar provedor' : 'Novo provedor'"
        subtitle="A chave é gravada cifrada e nunca volta para esta tela."
        @close="modalAberto = false">

        <div class="space-y-4">
          <div v-if="erro" class="rounded-lg border border-data-neg/30 bg-data-neg/10 p-3 text-sm text-data-neg">
            <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ erro }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model="form.label" label="Nome" placeholder="Google Gemini" required />
            <Input v-model="form.key" label="Identificador" placeholder="gemini"
              :disabled="!!editandoId"
              hint="Letras minúsculas, sem espaço. Não muda depois de criado." />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select v-model="form.kind" label="Tipo" :options="TIPOS" required
              hint="Decide o tradutor de formato, não a marca." />
            <Input v-model="form.base_url" label="Endereço base (opcional)"
              placeholder="https://..." :hint="DICA_BASE[form.kind]" />
          </div>

          <!-- CHAVE: escreve, nunca lê -->
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">
              Chaves de API
              <span v-if="chavesAtuais?.total" class="font-mono text-ink-subtle">
                · já cadastradas: {{ chavesAtuais.finais.join(' ') }}
              </span>
            </label>
            <textarea v-model="form.api_keys" rows="3"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-mono text-ink
                     focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="Uma chave por linha"></textarea>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed">
              Deixe em branco para manter as chaves atuais. Mais de uma liga a rotação: a que estourar
              a cota esfria por alguns minutos e a próxima assume, sem ninguém perceber.
            </p>
            <p v-if="chavesAtuais?.vem_da_env" class="text-xs text-data-warn mt-1 leading-relaxed">
              <i class="fas fa-triangle-exclamation mr-1"></i>
              Hoje a chave vem do ambiente do servidor. Cadastrar uma aqui passa o controle para esta tela.
            </p>
          </div>

          <!-- MODELOS POR USO -->
          <div>
            <h4 class="text-sm font-semibold text-ink mb-1">Modelos por uso</h4>
            <p class="text-xs text-ink-muted mb-3 leading-relaxed">
              Um nome por linha, na ordem de tentativa. O primeiro que responder atende; deixar um
              reserva embaixo é o que transforma "modelo aposentado" em nada acontecendo.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="u in usos" :key="u">
                <label class="block text-xs font-medium text-ink-muted mb-1.5">{{ ROTULO_USO[u] || u }}</label>
                <textarea v-model="form.models[u]" rows="3"
                  class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-mono text-ink
                         focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  placeholder="gemini-2.5-flash"></textarea>
                <p class="text-micro text-ink-subtle mt-1 leading-relaxed">{{ AJUDA_USO[u] }}</p>
              </div>
            </div>
          </div>

          <Switch v-model="form.enabled" label="Habilitado"
            description="Desligado, este provedor deixa de ser chamado - inclusive pelos contextos que apontam para ele." />
        </div>

        <template #footer>
          <Button variant="ghost" @click="modalAberto = false">Cancelar</Button>
          <Button :loading="salvando" icon="fas fa-check" @click="gravar">Salvar</Button>
        </template>
      </Modal>

    </PageContainer>
  </div>
</template>
