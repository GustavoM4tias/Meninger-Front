<script setup>
import { computed, ref, watch } from 'vue';
import { useCaptureStore } from '@/stores/Marketing/Capture/captureStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import EnterpriseMultiSelect from '@/components/Marketing/EnterpriseMultiSelect.vue';

defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open']);

const store = useCaptureStore();
const lead = computed(() => store.detail?.lead || null);
const events = computed(() => store.detail?.events || []);
const metaForm = computed(() => store.detail?.meta_form || null);
const leadForm = computed(() => store.detail?.lead_form || null);

// Nome de exibição com fallback ao email/telefone.
const displayName = computed(() => {
    const l = lead.value;
    if (!l) return '—';
    return l.nome || l.email || l.telefone || '(sem nome ou contato)';
});

// Opções de origem (enum CV de 2 letras).
const CV_ORIGEM_OPTIONS = [
  { v: 'SI', label: 'WebSite' },
  { v: 'FB', label: 'Facebook' },
  { v: 'IG', label: 'Instagram' },
  { v: 'GO', label: 'Google' },
  { v: 'MP', label: 'Mídia Paga' },
  { v: 'OU', label: 'Outros' },
];

// Formulário de roteamento (leads "held"). bound_empreendimentos = array de IDs.
const routeForm = ref({ midia_slug: '', cv_origem: 'SI', bound_empreendimentos: [], tags: '' });

watch(lead, (l) => {
  if (!l) return;
  routeForm.value = {
    midia_slug: l.midia_slug || '',
    cv_origem: l.cv_origem || 'SI',
    bound_empreendimentos: Array.isArray(l.bound_empreendimentos) ? [...l.bound_empreendimentos] : [],
    tags: Array.isArray(l.tags) ? l.tags.join(', ') : '',
  };
});

function close() { emit('update:open', false); }

const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function parseTags(s) {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean);
}

async function doRoute() {
  if (!routeForm.value.midia_slug.trim()) {
    window.alert('Informe a mídia (slug).');
    return;
  }
  const ok = await store.routeLead(lead.value.id, {
    midia_slug: routeForm.value.midia_slug.trim(),
    cv_origem: routeForm.value.cv_origem,
    bound_empreendimentos: Array.isArray(routeForm.value.bound_empreendimentos) ? routeForm.value.bound_empreendimentos : [],
    tags: parseTags(routeForm.value.tags),
  });
  if (ok) window.alert('Lead roteado — em despacho para o CV.');
}

async function doRedispatch() {
  const ok = await store.redispatchLead(lead.value.id);
  if (ok) window.alert('Redisparo solicitado.');
}

async function doMarkSpam() {
  if (!window.confirm('Marcar este lead como spam?')) return;
  await store.setSpam(lead.value.id, true);
}

async function doUnmarkSpam() {
  await store.setSpam(lead.value.id, false);
}

async function doReconcileCv() {
  const result = await store.reconcileCv(lead.value.id);
  if (!result) return;
  if (result.matched) {
    window.alert(`✅ Encontrado no CV!\n\ncv_idlead: ${result.cv_idlead}\nVia: ${result.via} (${result.confidence})`);
  } else {
    window.alert(`Nenhum match encontrado no CV.\nCandidatos: ${result.candidates_count}`);
  }
}
</script>

<template>
  <Modal :open="open" size="xl" title="Detalhe do lead captado" @close="close">
    <div v-if="store.detailLoading" class="py-12 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <div v-else-if="lead" class="space-y-5">
      <!-- Origem (form Meta / form interno) -->
      <div v-if="metaForm || leadForm"
        class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">
          <i class="fas fa-square-poll-vertical mr-1"></i>Origem
        </div>
        <template v-if="metaForm">
          <div class="text-sm font-medium text-ink">{{ metaForm.name || '(sem nome)' }}</div>
          <div class="text-[11px] text-ink-subtle font-mono">
            #{{ metaForm.id }}<span v-if="metaForm.page_name"> · {{ metaForm.page_name }}</span>
            <span v-if="metaForm.status"> · {{ metaForm.status }}</span>
          </div>
          <details v-if="Array.isArray(metaForm.questions) && metaForm.questions.length" class="mt-1.5">
            <summary class="text-[11px] text-accent cursor-pointer">
              Ver {{ metaForm.questions.length }} pergunta(s) do form
            </summary>
            <ul class="mt-1.5 ml-3 space-y-0.5 text-[11px] text-ink-muted list-disc list-inside">
              <li v-for="(q, i) in metaForm.questions" :key="i">
                <span class="font-medium text-ink">{{ q.label || q.key }}</span>
                <span v-if="q.type" class="text-ink-subtle"> · {{ q.type }}</span>
                <span v-if="q.key !== q.label" class="text-ink-subtle font-mono"> ({{ q.key }})</span>
              </li>
            </ul>
          </details>
        </template>
        <template v-else-if="leadForm">
          <div class="text-sm font-medium text-ink">{{ leadForm.name }}</div>
          <div class="text-[11px] text-ink-subtle font-mono">
            /{{ leadForm.slug }}<span v-if="leadForm.midia_slug"> · {{ leadForm.midia_slug }}</span>
          </div>
        </template>
      </div>

      <!-- Dados -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Nome</div>
          <div class="text-sm text-ink">{{ lead.nome || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">E-mail</div>
          <div class="text-sm text-ink break-all">{{ lead.email || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Telefone</div>
          <div class="text-sm text-ink">{{ lead.telefone || '—' }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Canal</div>
          <div class="text-sm text-ink">{{ lead.channel }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Status</div>
          <div class="text-sm text-ink">{{ lead.status }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">idlead CV</div>
          <div class="text-sm text-ink">{{ lead.cv_idlead || '—' }}</div>
        </div>
      </div>

      <!-- Respostas do form (extra_fields) -->
      <div v-if="lead.extra_fields && Object.keys(lead.extra_fields).length"
        class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
        <div class="text-[10px] uppercase tracking-wider text-ink-subtle mb-1.5">
          <i class="fas fa-list-check mr-1"></i>Respostas do formulário ({{ Object.keys(lead.extra_fields).length }})
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <template v-for="(v, k) in lead.extra_fields" :key="k">
            <dt class="text-ink-subtle font-mono truncate" :title="k">{{ k }}</dt>
            <dd class="text-ink break-words">{{ Array.isArray(v) ? v.join(', ') : v }}</dd>
          </template>
        </dl>
      </div>

      <!-- Erro atual -->
      <div v-if="lead.last_error"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ lead.last_error }}
      </div>

      <!-- Roteamento (held) -->
      <div v-if="lead.status === 'held'" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h3 class="text-sm font-semibold text-ink mb-3">
          <i class="fas fa-route mr-1.5 text-amber-500"></i>Resolver vínculo e rotear
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Input v-model="routeForm.midia_slug" label="Mídia (slug)" placeholder="ex: meta-mond-marilia" size="sm" />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1">Origem CV</label>
            <select v-model="routeForm.cv_origem"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              <option v-for="o in CV_ORIGEM_OPTIONS" :key="o.v" :value="o.v">{{ o.label }} ({{ o.v }})</option>
            </select>
          </div>
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-ink-muted mb-1">Empreendimentos (do CV)</label>
          <EnterpriseMultiSelect v-model="routeForm.bound_empreendimentos" />
        </div>
        <Input v-model="routeForm.tags" label="Tags (separadas por vírgula)" placeholder="ex: feirao, alto-padrao" size="sm" />
        <div class="mt-3 flex justify-end">
          <Button variant="primary" size="sm" icon="fas fa-paper-plane" :loading="store.actionBusy" @click="doRoute">
            Rotear e despachar
          </Button>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex flex-wrap gap-2">
        <Button v-if="['failed', 'rejected'].includes(lead.status)"
          variant="primary" size="sm" icon="fas fa-arrows-rotate" :loading="store.actionBusy" @click="doRedispatch">
          Redisparar ao CV
        </Button>
        <Button v-if="!lead.cv_idlead"
          variant="secondary" size="sm" icon="fas fa-link" :loading="store.actionBusy" @click="doReconcileCv"
          title="Busca esse lead no CV pelo email/telefone e grava o cv_idlead se encontrar.">
          Buscar no CV
        </Button>
        <Button v-if="lead.status !== 'spam' && lead.status !== 'delivered'"
          variant="danger" size="sm" icon="fas fa-ban" :loading="store.actionBusy" @click="doMarkSpam">
          Marcar como spam
        </Button>
        <Button v-if="lead.status === 'spam'"
          variant="secondary" size="sm" icon="fas fa-rotate-left" :loading="store.actionBusy" @click="doUnmarkSpam">
          Não é spam
        </Button>
      </div>

      <!-- Timeline -->
      <div>
        <h3 class="text-sm font-semibold text-ink mb-3">Histórico</h3>
        <ol class="relative border-l border-line ml-2 space-y-3">
          <li v-for="ev in events" :key="ev.id" class="ml-4">
            <div class="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-accent border-2 border-surface-raised"></div>
            <div class="text-xs text-ink-subtle font-mono">{{ fmt(ev.created_at) }} · {{ ev.actor }}</div>
            <div class="text-sm text-ink font-medium">
              {{ ev.event_type }}
              <span v-if="ev.status_from || ev.status_to" class="text-ink-subtle font-normal">
                · {{ ev.status_from || '—' }} → {{ ev.status_to || '—' }}
              </span>
            </div>
            <div v-if="ev.message" class="text-sm text-ink-muted">{{ ev.message }}</div>
          </li>
          <li v-if="!events.length" class="ml-4 text-sm text-ink-subtle">Sem eventos.</li>
        </ol>
      </div>
    </div>

    <div v-else class="py-12 text-center text-ink-subtle">Lead não encontrado.</div>
  </Modal>
</template>
