<script setup>
import { computed, ref, watch } from 'vue';
import { useCaptureStore } from '@/stores/Marketing/Capture/captureStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open']);

const store = useCaptureStore();
const lead = computed(() => store.detail?.lead || null);
const events = computed(() => store.detail?.events || []);

// Opções de origem (enum CV de 2 letras).
const CV_ORIGEM_OPTIONS = [
  { v: 'SI', label: 'WebSite' },
  { v: 'FB', label: 'Facebook' },
  { v: 'IG', label: 'Instagram' },
  { v: 'GO', label: 'Google' },
  { v: 'MP', label: 'Mídia Paga' },
  { v: 'OU', label: 'Outros' },
];

// Formulário de roteamento (leads "held").
const routeForm = ref({ midia_slug: '', cv_origem: 'SI', empreendimentos: '', tags: '' });

watch(lead, (l) => {
  if (!l) return;
  routeForm.value = {
    midia_slug: l.midia_slug || '',
    cv_origem: l.cv_origem || 'SI',
    empreendimentos: Array.isArray(l.bound_empreendimentos) ? l.bound_empreendimentos.join(', ') : '',
    tags: Array.isArray(l.tags) ? l.tags.join(', ') : '',
  };
});

function close() { emit('update:open', false); }

const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function parseIds(s) {
  return String(s || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => Number.isFinite(n));
}
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
    bound_empreendimentos: parseIds(routeForm.value.empreendimentos),
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
</script>

<template>
  <Modal :open="open" size="xl" title="Detalhe do lead captado" @close="close">
    <div v-if="store.detailLoading" class="py-12 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
    </div>

    <div v-else-if="lead" class="space-y-5">
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="routeForm.midia_slug" label="Mídia (slug)" placeholder="ex: meta-mond-marilia" size="sm" />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1">Origem CV</label>
            <select v-model="routeForm.cv_origem"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              <option v-for="o in CV_ORIGEM_OPTIONS" :key="o.v" :value="o.v">{{ o.label }} ({{ o.v }})</option>
            </select>
          </div>
          <Input v-model="routeForm.empreendimentos" label="Empreendimentos (IDs CV, separados por vírgula)" placeholder="ex: 10, 12" size="sm" />
          <Input v-model="routeForm.tags" label="Tags (separadas por vírgula)" placeholder="ex: feirao, alto-padrao" size="sm" />
        </div>
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
