<script setup>
// /settings/outlook-lab — Laboratório do Outlook (admin).
//
// Antes de desenhar o módulo de e-mail, descobrir onde a credencial do Office
// chega nesta conta. Cada linha aqui é uma pergunta objetiva respondida pelo
// Graph de verdade: funciona, não funciona, ou não deu para saber.
//
// Os escopos de e-mail ficam FORA do login de propósito. Se entrassem no
// BASE_SCOPES, todo mundo veria consentimento novo no próximo login e, num
// tenant que não permita consentimento do usuário, o login quebraria para todos.

import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { pedirConfirmacao } from '@/composables/useConfirm';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const toast = useToast();
const BASE = `${API_URL}/microsoft/mail`;

const status  = ref(null);
const loading = ref(true);
const running = ref(false);
const result  = ref(null);

async function loadStatus() {
  loading.value = true;
  try {
    status.value = await requestWithAuth(`${BASE}/status`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível ler o estado da autorização.');
  } finally {
    loading.value = false;
  }
}

async function authorize() {
  try {
    const resp = await requestWithAuth(`${BASE}/consent/start`, { method: 'POST' });
    const url = resp?.data?.authUrl;
    if (!url) throw new Error('Não foi possível iniciar a autorização.');
    window.location.href = url;
  } catch (err) {
    toast.error(err?.message || 'Erro ao iniciar a autorização do e-mail.');
  }
}

async function run(includeWrite) {
  if (includeWrite) {
    const ok = await pedirConfirmacao({
      title: 'Rodar também os testes de escrita?',
      consequence: `Serão criados rascunhos de teste na sua caixa e enviados 2 e-mails para ${status.value?.account}. `
                 + 'Os rascunhos são apagados no fim; os 2 e-mails ficam na sua Caixa de Entrada e em Enviados '
                 + 'para você conferir, e você apaga quando quiser.',
      confirmLabel: 'Rodar com escrita',
    });
    if (!ok) return;
  }

  running.value = true;
  try {
    result.value = await requestWithAuth(`${BASE}/probe`, {
      method: 'POST',
      body: JSON.stringify({ write: !!includeWrite }),
    });
    toast.success(`${result.value.summary.ok} de ${result.value.summary.total} operações funcionaram.`);
  } catch (err) {
    toast.error(err?.message || 'A sondagem falhou.');
  } finally {
    running.value = false;
  }
}

onMounted(loadStatus);

const authorized = computed(() => !!status.value?.authorized);
const allProbes  = computed(() => [...(result.value?.read || []), ...(result.value?.write || [])]);

function badgeFor(r) {
  if (r.ok === true)  return { variant: 'success', text: 'Funciona' };
  if (r.ok === false) return { variant: 'danger',  text: `Falhou${r.status ? ` (${r.status})` : ''}` };
  return { variant: 'neutral', text: 'Sem resposta' };
}
</script>

<template>
  <PageContainer size="md">
    <PageHeader
      title="Laboratório do Outlook"
      subtitle="Descobre, operação por operação, até onde o Office chega no e-mail desta conta."
      icon="fas fa-envelope-open-text">
      <template #actions>
        <PageHelp
          storage-key="outlook-lab"
          title="Como usar o laboratório"
          intro="Esta tela existe para responder uma pergunta antes de construir o módulo de e-mail: o que a credencial do Office consegue fazer no Outlook desta conta?"
          :steps="[
            { title: 'Autorize o e-mail', text: 'O acesso ao e-mail não vem junto com o login do Office - é uma autorização à parte, por conta, feita aqui. Isso é de propósito: se o e-mail entrasse no login, todo mundo veria uma tela de consentimento nova e o login poderia parar de funcionar.' },
            { title: 'Rode a leitura', text: 'A sondagem de leitura não muda nada na sua caixa. Ela lista pastas, lê recebidos, busca, tenta anexo, configurações e mais.' },
            { title: 'Rode a escrita quando quiser', text: 'A sondagem de escrita cria rascunho, anexa arquivo, envia, marca, categoriza, move e apaga. Tudo na sua própria caixa, e os 2 e-mails de teste vão para você mesmo.' },
          ]"
          :tips="[
            'A autorização vale só para a sua conta. Cada pessoa que for usar e-mail no Office autoriza a dela.',
            'Falha 403 quase sempre é consentimento faltando, não erro de código - a linha diz qual.',
            'Os 2 e-mails de teste ficam na sua caixa para você conferir; pode apagar depois.',
          ]" />
      </template>
    </PageHeader>

    <div class="space-y-5">

      <!-- Estado da autorização -->
      <div v-if="!loading" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm"
        :class="authorized
          ? 'bg-data-pos/10 border-data-pos/25 text-data-pos'
          : 'bg-data-warn/10 border-data-warn/30 text-data-warn'">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fas" :class="authorized ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
          <span v-if="authorized" class="truncate">E-mail autorizado para <strong>{{ status.account }}</strong>.</span>
          <span v-else-if="status?.connected" class="truncate">
            O e-mail ainda não foi autorizado nesta conta. É uma autorização separada do login.
          </span>
          <span v-else class="truncate">Conecte sua conta Microsoft antes de autorizar o e-mail.</span>
        </div>
        <Button v-if="status?.connected" size="sm" :variant="authorized ? 'outline' : 'primary'"
          icon="fab fa-microsoft" @click="authorize">
          {{ authorized ? 'Reautorizar' : 'Autorizar acesso ao e-mail' }}
        </Button>
      </div>

      <!-- Escopos pedidos -->
      <Panel v-if="status?.connected" title="Permissões desta autorização" icon="fas fa-key">
        <p class="text-sm text-ink-muted mb-3">
          O laboratório pede exatamente estas, e nada além. Nenhuma delas entra no login do Office.
        </p>
        <ul class="space-y-2">
          <li v-for="s in status.scopes" :key="s" class="flex items-center gap-2 text-sm">
            <i class="fas fa-circle-check text-xs"
              :class="status.grantedScopes?.some(g => g.toLowerCase().endsWith(s.toLowerCase())) ? 'text-data-pos' : 'text-ink-subtle'"></i>
            <code class="text-xs">{{ s }}</code>
            <span class="text-xs text-ink-muted">{{
              s === 'Mail.ReadWrite' ? 'ler e-mail, criar e editar rascunho, marcar, mover'
              : s === 'Mail.Send' ? 'enviar em nome da pessoa'
              : 'ler assinatura, fuso e resposta automática'
            }}</span>
          </li>
        </ul>
      </Panel>

      <!-- Ações -->
      <div v-if="authorized" class="flex flex-wrap gap-3">
        <Button icon="fas fa-play" :loading="running" @click="run(false)">
          Rodar sondagem de leitura
        </Button>
        <Button variant="outline" icon="fas fa-pen" :loading="running" @click="run(true)">
          Rodar leitura + escrita
        </Button>
      </div>

      <!-- Resultado -->
      <Panel v-if="result" :padded="false"
        :title="`Resultado - ${result.summary.ok} de ${result.summary.total} funcionaram`"
        icon="fas fa-clipboard-check">
        <template #subtitle>
          {{ result.account }} · {{ (result.ms / 1000).toFixed(1) }}s
        </template>

        <ul class="divide-y divide-line">
          <li v-for="r in allProbes" :key="r.key" class="px-4 sm:px-5 py-3.5">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-ink">{{ r.label }}</span>
                  <Badge :variant="badgeFor(r).variant" size="sm">{{ badgeFor(r).text }}</Badge>
                  <span v-if="r.count !== undefined" class="text-xs text-ink-subtle font-mono tabular-nums">
                    {{ r.count }} itens
                  </span>
                </div>
                <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ r.why }}</p>

                <!-- Amostra real: é o que prova que funcionou -->
                <ul v-if="r.sample?.length" class="mt-2 space-y-0.5">
                  <li v-for="(line, i) in r.sample" :key="i"
                    class="text-xs text-ink-subtle font-mono break-all pl-3 border-l border-line">
                    {{ line }}
                  </li>
                </ul>
                <p v-if="r.detail" class="text-xs text-data-pos mt-1.5">{{ r.detail }}</p>
                <p v-if="r.hint" class="text-xs mt-1.5"
                  :class="r.ok === false ? 'text-data-neg' : 'text-ink-muted'">
                  {{ r.hint }}
                </p>
              </div>
              <span v-if="r.ms" class="text-xs text-ink-subtle font-mono tabular-nums shrink-0">{{ r.ms }}ms</span>
            </div>
          </li>
        </ul>
      </Panel>

      <EmptyState v-else-if="authorized && !running"
        icon="fas fa-flask"
        title="Nenhuma sondagem rodada ainda"
        description="Comece pela leitura: ela não muda nada na sua caixa." />

    </div>
  </PageContainer>
</template>
