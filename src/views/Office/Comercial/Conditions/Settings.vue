<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Switch from '@/components/UI/Switch.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import ActionBar from '@/components/UI/ActionBar.vue';
import Badge from '@/components/UI/Badge.vue';

const store = useConditionsStore();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const officeUsers = ref([]);

const editorSearch = ref('');
const authorizerSearch = ref('');

const form = ref({
  editor_user_ids: [],
  authorizer_user_ids: [],
  auto_generate_conditions: true,
  signature_config: { enabled: false, placement: 'final', require_initials: false, routing: 'sequential', signers: [] },
});

// ── Assinatura (DocuSign): assinantes (do sistema ou manuais) ─────────────────
const pickUserId = ref('');

function addSigner() {
  form.value.signature_config.signers.push({ name: '', email: '', order: form.value.signature_config.signers.length + 1 });
}

// Adiciona um usuário do sistema (nome + e-mail preenchidos; continua editável).
function addSignerFromSystem() {
  const u = officeUsers.value.find(x => String(x.id) === String(pickUserId.value));
  if (!u) return;
  form.value.signature_config.signers.push({
    name: u.username || '',
    email: u.email || '',
    order: form.value.signature_config.signers.length + 1,
    user_id: u.id,
  });
  pickUserId.value = '';
}
function removeSigner(i) {
  form.value.signature_config.signers.splice(i, 1);
  form.value.signature_config.signers.forEach((s, idx) => { s.order = idx + 1; });
}
function moveSigner(i, dir) {
  const arr = form.value.signature_config.signers;
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  arr.forEach((s, idx) => { s.order = idx + 1; });
}

// Lista pronta para o Select do sistema (o primitivo recebe options, não <option>).
const opcoesUsuario = computed(() => [
    { value: '', label: 'Usuário do sistema...' },
    ...officeUsers.value.map(u => ({ value: u.id, label: u.username + (u.email ? ` (${u.email})` : '') })),
]);

function filterUsers(q) {
  const s = (q || '').toLowerCase().trim();
  if (!s) return officeUsers.value;
  return officeUsers.value.filter(u =>
    (u.username || '').toLowerCase().includes(s) ||
    (u.email || '').toLowerCase().includes(s)
  );
}
const filteredEditorUsers = computed(() => filterUsers(editorSearch.value));
const filteredAuthorizerUsers = computed(() => filterUsers(authorizerSearch.value));

function toggleId(field, id) {
  const arr = form.value[field];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(id);
}

async function handleSave() {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    await store.updateSettings({
      editor_user_ids: form.value.editor_user_ids,
      authorizer_user_ids: form.value.authorizer_user_ids,
      auto_generate_conditions: form.value.auto_generate_conditions,
      signature_config: {
        ...form.value.signature_config,
        signers: form.value.signature_config.signers
          .filter(s => s.name?.trim() && s.email?.trim())
          .map((s, i) => ({ name: s.name.trim(), email: s.email.trim(), order: i + 1, user_id: s.user_id ?? null })),
      },
    });
    // O servidor é a fonte da verdade: relê e refaz a base de comparação.
    await store.fetchSettings();
    aplicarDoServidor();
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch (e) {
    error.value = e.message || 'Erro ao salvar configurações.';
  } finally {
    saving.value = false;
  }
}

// ─── Efeito antes de salvar ──────────────────────────────────────────────────
// A receita de tela executiva pede que o efeito apareça ANTES do save: quem
// salva aqui muda o que OUTRA pessoa pode fazer. Guardamos o que o servidor
// tem (`salvo`) e comparamos com o que está na tela.
const salvo = ref(null);

function instantanea(f) {
    return JSON.stringify({
        e: [...f.editor_user_ids].sort(),
        a: [...f.authorizer_user_ids].sort(),
        g: f.auto_generate_conditions,
        s: f.signature_config,
    });
}

const sujo = computed(() => !!salvo.value && instantanea(form.value) !== salvo.value);

/** Quem entrou e quem saiu de uma lista, comparado ao que está no servidor. */
function delta(campo) {
    if (!store.settings) return { entram: 0, saem: 0 };
    const antes = new Set(store.settings[campo] ?? []);
    const agora = new Set(form.value[campo]);
    return {
        entram: [...agora].filter(id => !antes.has(id)).length,
        saem: [...antes].filter(id => !agora.has(id)).length,
    };
}
const deltaEditores = computed(() => delta('editor_user_ids'));
const deltaAutorizadores = computed(() => delta('authorizer_user_ids'));

/** Frase do que muda, para a barra de pendências dizer o alcance. */
const resumoEfeito = computed(() => {
    const partes = [];
    for (const [rot, d] of [['editar', deltaEditores.value], ['autorizar', deltaAutorizadores.value]]) {
        if (d.entram) partes.push(`+${d.entram} pode(m) ${rot}`);
        if (d.saem) partes.push(`−${d.saem} deixa(m) de ${rot}`);
    }
    if (store.settings && form.value.auto_generate_conditions !== store.settings.auto_generate_conditions) {
        partes.push(form.value.auto_generate_conditions ? 'auto-geração LIGADA' : 'auto-geração DESLIGADA');
    }
    const sigAntes = JSON.stringify(store.settings?.signature_config ?? {});
    if (store.settings && JSON.stringify(form.value.signature_config) !== sigAntes) {
        partes.push('assinatura alterada');
    }
    return partes.join(' · ') || 'sem mudança de alcance';
});

function descartar() {
    aplicarDoServidor();
    error.value = '';
}

function aplicarDoServidor() {
    if (!store.settings) return;
    const sig = store.settings.signature_config ?? {};
    form.value = {
        editor_user_ids: [...(store.settings.editor_user_ids ?? [])],
        authorizer_user_ids: [...(store.settings.authorizer_user_ids ?? [])],
        auto_generate_conditions: store.settings.auto_generate_conditions ?? true,
        signature_config: {
            enabled: sig.enabled ?? false,
            placement: sig.placement === 'livre' ? 'livre' : 'final',
            require_initials: sig.require_initials ?? false,
            routing: sig.routing === 'parallel' ? 'parallel' : 'sequential',
            signers: (sig.signers ?? []).map((x, i) => ({ name: x.name ?? '', email: x.email ?? '', order: x.order ?? i + 1, user_id: x.user_id ?? null })),
        },
    };
    salvo.value = instantanea(form.value);
}

onMounted(async () => {
    try {
        await Promise.all([store.fetchSettings(), store.fetchOfficeUsers()]);
        officeUsers.value = store.officeUsers;
        aplicarDoServidor();
    } finally {
        loading.value = false;
    }
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative pb-24">
    <PageContainer size="md">

      <PageHeader
        title="Configurações — Fichas comerciais"
        subtitle="Quem edita, quem autoriza e o que acontece sozinho"
        icon="fas fa-sliders">
        <template #actions>
          <PageHelp
            storage-key="fichas-config"
            title="Como usar estas configurações"
            intro="O que se define aqui recai sobre OUTRAS pessoas: quem pode mexer nas fichas e quem pode liberá-las. Por isso a tela mostra o efeito antes de você salvar."
            :steps="[
              { title: 'Escolha quem edita', text: 'Editores criam, alteram e enviam fichas para autorização. Administradores editam sempre, estejam ou não nesta lista.' },
              { title: 'Escolha quem autoriza', text: 'Basta UM autorizador para liberar uma ficha. Administradores autorizam sempre.' },
              { title: 'Confira a barra de pendências', text: 'Ao mexer em qualquer campo, uma barra aparece no rodapé dizendo quantas pessoas ganham ou perdem permissão. Nada é gravado até você confirmar.' },
            ]"
            :tips="[
              'Auto-geração cria a ficha do mês para cada série ativa todo dia 1, herdando da última. Ficha encerrada não gera a próxima.',
              'A assinatura só fica disponível para fichas já autorizadas, e as credenciais do DocuSign ficam em Configurações → DocuSign.',
            ]"
          />
          <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="router.back()">
            <span class="hidden sm:inline">Voltar</span>
          </Button>
        </template>
      </PageHeader>

      <!-- Carregando: a forma dos quatro blocos, para a tela não saltar -->
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 4" :key="i" variant="card" class="h-52" />
      </div>

      <template v-else>
        <div class="space-y-4">

          <!-- Editores -->
          <Panel title="Quem pode editar as fichas" icon="fas fa-pen-to-square">
            <template #actions>
              <Badge v-if="deltaEditores.entram || deltaEditores.saem" variant="warning" size="sm">
                <template v-if="deltaEditores.entram">+{{ deltaEditores.entram }}</template>
                <template v-if="deltaEditores.entram && deltaEditores.saem"> · </template>
                <template v-if="deltaEditores.saem">−{{ deltaEditores.saem }}</template>
              </Badge>
            </template>
            <div class="space-y-3">
              <p class="text-xs text-ink-muted leading-relaxed">
                Quem estiver marcado pode criar, editar e enviar fichas para autorização.
                <strong>Administradores editam sempre</strong>, estejam ou não nesta lista.
              </p>

              <Input v-model="editorSearch" placeholder="Buscar usuário..." size="sm"
                iconLeft="fas fa-magnifying-glass" />

              <div class="max-h-60 overflow-auto rounded-lg border border-line divide-y divide-line">
                <label v-for="u in filteredEditorUsers" :key="u.id"
                  class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-sunken transition duration-120 ease-out-expo">
                  <input type="checkbox" :checked="form.editor_user_ids.includes(u.id)"
                    @change="toggleId('editor_user_ids', u.id)"
                    class="w-4 h-4 accent-accent rounded" />
                  <span class="min-w-0">
                    <span class="text-sm text-ink">{{ u.username }}</span>
                    <span v-if="u.email" class="text-xs text-ink-subtle ml-1">{{ u.email }}</span>
                  </span>
                </label>
                <p v-if="!filteredEditorUsers.length" class="px-3 py-4 text-sm text-ink-subtle text-center">Nenhum usuário encontrado.</p>
              </div>
              <p class="text-xs text-ink-muted">
                <strong class="font-mono tabular-nums text-ink">{{ form.editor_user_ids.length }}</strong>
                pessoa(s) marcadas — mais os administradores.
              </p>
            </div>
          </Panel>

          <!-- Autorizadores -->
          <Panel title="Quem pode autorizar as fichas" icon="fas fa-user-check">
            <template #actions>
              <Badge v-if="deltaAutorizadores.entram || deltaAutorizadores.saem" variant="warning" size="sm">
                <template v-if="deltaAutorizadores.entram">+{{ deltaAutorizadores.entram }}</template>
                <template v-if="deltaAutorizadores.entram && deltaAutorizadores.saem"> · </template>
                <template v-if="deltaAutorizadores.saem">−{{ deltaAutorizadores.saem }}</template>
              </Badge>
            </template>
            <div class="space-y-3">
              <p class="text-xs text-ink-muted leading-relaxed">
                Quem estiver marcado pode liberar uma ficha enviada — basta <strong>um</strong> autorizador.
                <strong>Administradores autorizam sempre.</strong>
              </p>

              <Input v-model="authorizerSearch" placeholder="Buscar usuário..." size="sm"
                iconLeft="fas fa-magnifying-glass" />

              <div class="max-h-60 overflow-auto rounded-lg border border-line divide-y divide-line">
                <label v-for="u in filteredAuthorizerUsers" :key="u.id"
                  class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-sunken transition duration-120 ease-out-expo">
                  <input type="checkbox" :checked="form.authorizer_user_ids.includes(u.id)"
                    @change="toggleId('authorizer_user_ids', u.id)"
                    class="w-4 h-4 accent-accent rounded" />
                  <span class="min-w-0">
                    <span class="text-sm text-ink">{{ u.username }}</span>
                    <span v-if="u.email" class="text-xs text-ink-subtle ml-1">{{ u.email }}</span>
                  </span>
                </label>
                <p v-if="!filteredAuthorizerUsers.length" class="px-3 py-4 text-sm text-ink-subtle text-center">Nenhum usuário encontrado.</p>
              </div>
              <p class="text-xs text-ink-muted">
                <strong class="font-mono tabular-nums text-ink">{{ form.authorizer_user_ids.length }}</strong>
                pessoa(s) marcadas — mais os administradores.
              </p>
              <p v-if="!form.authorizer_user_ids.length" class="cfg-aviso">
                <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
                <span>Sem autorizadores nomeados, <strong>só administradores</strong> conseguirão liberar fichas.</span>
              </p>
            </div>
          </Panel>

          <!-- Auto-geração -->
          <Panel title="Auto-geração mensal" icon="far fa-calendar">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink">Gerar fichas automaticamente todo dia 1</p>
                <p class="text-xs text-ink-muted mt-1 leading-relaxed">
                  Cria a ficha do mês para cada série ativa (com ou sem CV), herdando da última.
                  Ficha encerrada não gera a próxima.
                </p>
              </div>
              <Switch v-model="form.auto_generate_conditions" />
            </div>
          </Panel>

          <!-- Assinatura DocuSign -->
          <Panel title="Assinatura (DocuSign) após autorização" icon="fas fa-file-signature">
            <template #actions>
              <Switch v-model="form.signature_config.enabled" />
            </template>
            <div class="space-y-4">
              <p class="text-xs text-ink-muted leading-relaxed">
                Com a assinatura ativa, fichas <strong>autorizadas</strong> podem ser enviadas ao DocuSign na aba Assinatura.
                As credenciais da integração ficam em <RouterLink to="/settings/docusign" class="text-accent underline">Configurações → DocuSign</RouterLink> (admin).
              </p>

              <template v-if="form.signature_config.enabled">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p class="cfg-rotulo">Como assinar</p>
                    <div class="flex gap-2">
                      <label v-for="opt in [{ v: 'final', l: 'Ao final do documento' }, { v: 'livre', l: 'Posição livre' }]" :key="opt.v"
                        class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition duration-120 ease-out-expo"
                        :class="form.signature_config.placement === opt.v ? 'border-accent bg-accent-soft text-accent font-semibold' : 'border-line text-ink-muted hover:border-accent/30'">
                        <input type="radio" :value="opt.v" v-model="form.signature_config.placement" class="sr-only" />
                        {{ opt.l }}
                      </label>
                    </div>
                  </div>
                  <div>
                    <p class="cfg-rotulo">Ordem de assinatura</p>
                    <div class="flex gap-2">
                      <label v-for="opt in [{ v: 'sequential', l: 'Em sequência' }, { v: 'parallel', l: 'Todos juntos' }]" :key="opt.v"
                        class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition duration-120 ease-out-expo"
                        :class="form.signature_config.routing === opt.v ? 'border-accent bg-accent-soft text-accent font-semibold' : 'border-line text-ink-muted hover:border-accent/30'">
                        <input type="radio" :value="opt.v" v-model="form.signature_config.routing" class="sr-only" />
                        {{ opt.l }}
                      </label>
                    </div>
                    <p class="text-micro text-ink-subtle mt-1">
                      {{ form.signature_config.routing === 'parallel' ? 'Todos recebem o e-mail ao mesmo tempo.' : 'O 2º só recebe depois que o 1º assinar, e assim por diante.' }}
                    </p>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-line cursor-pointer text-sm text-ink-muted w-fit">
                      <input type="checkbox" v-model="form.signature_config.require_initials" class="w-4 h-4 accent-accent rounded" />
                      Exigir rubrica junto à assinatura
                    </label>
                  </div>
                </div>

                <!-- Assinantes -->
                <div>
                  <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <p class="cfg-rotulo mb-0">
                      Assinantes{{ form.signature_config.routing === 'sequential' ? ' (na ordem de assinatura)' : '' }}
                    </p>
                    <div class="flex items-center gap-2 flex-wrap">
                      <div class="max-w-[220px]">
                        <Select v-model="pickUserId" :options="opcoesUsuario" size="sm" />
                      </div>
                      <Button variant="outline" size="sm" icon="fas fa-user-plus"
                        :disabled="!pickUserId" @click="addSignerFromSystem">Do sistema</Button>
                      <Button variant="ghost" size="sm" icon="fas fa-plus" @click="addSigner">Manual</Button>
                    </div>
                  </div>
                  <div v-if="form.signature_config.signers.length" class="space-y-2">
                    <div v-for="(sg, i) in form.signature_config.signers" :key="i" class="flex items-center gap-2">
                      <span class="w-6 text-center text-xs font-bold text-ink-subtle shrink-0 font-mono tabular-nums">
                        <template v-if="form.signature_config.routing === 'sequential'">{{ i + 1 }}º</template>
                        <i v-else class="fas fa-user text-micro"></i>
                      </span>
                      <i v-if="sg.user_id" class="fas fa-id-badge text-accent text-xs shrink-0" v-tippy="'Usuário do sistema'"></i>
                      <input v-model="sg.name" type="text" placeholder="Nome completo" class="cfg-campo flex-1 min-w-0" />
                      <input v-model="sg.email" type="email" placeholder="email@exemplo.com" class="cfg-campo flex-1 min-w-0" />
                      <div class="flex items-center gap-0.5 shrink-0">
                        <template v-if="form.signature_config.routing === 'sequential'">
                          <IconButton icon="fas fa-chevron-up" size="sm" :disabled="i === 0"
                            title="Subir na ordem" @click="moveSigner(i, -1)" />
                          <IconButton icon="fas fa-chevron-down" size="sm"
                            :disabled="i === form.signature_config.signers.length - 1"
                            title="Descer na ordem" @click="moveSigner(i, 1)" />
                        </template>
                        <IconButton icon="fas fa-trash" size="sm" variant="danger"
                          title="Remover assinante" @click="removeSigner(i)" />
                      </div>
                    </div>
                  </div>
                  <p v-else class="cfg-aviso">
                    <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
                    <span>Nenhum assinante — com a assinatura ligada e a lista vazia, a aba Assinatura fica indisponível.</span>
                  </p>
                </div>
              </template>
            </div>
          </Panel>

          <!-- Erro / Sucesso -->
          <p v-if="error" class="flex items-center gap-2 p-3 bg-data-neg/10 border border-data-neg/25 rounded-xl text-sm text-data-neg">
            <i class="fas fa-circle-exclamation shrink-0"></i>{{ error }}
          </p>
          <p v-if="saved" class="flex items-center gap-2 p-3 bg-data-pos/10 border border-data-pos/25 rounded-xl text-sm text-data-pos">
            <i class="fas fa-circle-check shrink-0"></i>Configurações salvas. O servidor confirmou e esta tela já mostra o que ficou gravado.
          </p>
        </div>
      </template>
    </PageContainer>

    <!-- Barra de pendências: nada é gravado até confirmar, e a barra diz o alcance. -->
    <ActionBar v-if="sujo" :count="1" unit="alteração" :summary="resumoEfeito"
      clear-label="Descartar" @clear="descartar">
      <Button :loading="saving" :disabled="saving" icon="fas fa-save" @click="handleSave">
        Salvar configurações
      </Button>
    </ActionBar>
  </div>
</template>

<style scoped>
.cfg-rotulo { @apply block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5; }
.cfg-campo {
    @apply px-3 py-2 text-sm text-ink bg-surface-sunken border border-line rounded-lg
           placeholder:text-ink-subtle outline-none transition duration-120 ease-out-expo
           focus:border-accent focus:ring-2 focus:ring-accent/15;
}
/* Aviso de consequência: a configuração é válida, mas alguém vai sentir. */
.cfg-aviso {
    @apply flex items-start gap-2 p-3 rounded-lg border text-xs
           bg-data-warn/10 border-data-warn/25 text-data-warn;
}
</style>
