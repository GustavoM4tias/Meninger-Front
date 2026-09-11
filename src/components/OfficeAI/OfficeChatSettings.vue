<script setup>
// Configurações da Eme para ESTA pessoa: modelo, memória e histórico.
//
// É um modal de configuração, não o painel de histórico: seções com título,
// explicação curta e o controle - a pessoa entende o que muda antes de mexer.
// A memória segue a regra da casa: nada entra sem um clique dela, e tudo o
// que está guardado aparece aqui, ligável, editável e apagável.
import { ref, computed, watch, onMounted } from 'vue';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Modal from '@/components/UI/Modal.vue';
import Switch from '@/components/UI/Switch.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';

const aiStore = useOfficeAIStore();

const MODOS = [
  { value: 'auto', label: 'Automático', icon: 'fas fa-wand-magic-sparkles' },
  { value: 'fast', label: 'Rápido', icon: 'fas fa-bolt' },
  { value: 'smart', label: 'Avançado', icon: 'fas fa-brain' },
];
const MODO_DESC = {
  auto: 'A Eme escolhe pela pergunta: simples vai no modelo rápido, análise e comparação vão no avançado.',
  fast: 'Sempre o modelo rápido. Respostas imediatas; em análise longa pode simplificar demais.',
  smart: 'Sempre o modelo avançado. Raciocínio mais cuidadoso, alguns segundos a mais por resposta.',
};

const salvando = ref(false);
const novo = ref({ key: '', value: '' });
const editando = ref(null);   // { id, value }
const erro = ref('');

const memorias = computed(() => aiStore.memories);
const ativas = computed(() => memorias.value.filter(m => m.enabled).length);

async function carregar() {
  erro.value = '';
  await Promise.all([aiStore.loadSettings(), aiStore.loadMemories(), aiStore.loadStorageUsage()]);
}
onMounted(() => { if (aiStore.settingsOpen) carregar(); });
watch(() => aiStore.settingsOpen, (v) => { if (v) carregar(); });

async function setModo(v) {
  salvando.value = true;
  try { await aiStore.saveSettings({ model_mode: v }); }
  catch (e) { erro.value = e?.message || 'Não salvou.'; }
  finally { salvando.value = false; }
}

async function setMemoria(v) {
  if (!v) {
    const ok = await pedirConfirmacao({
      title: 'Desligar a memória?',
      consequence: `A Eme deixa de usar as ${ativas.value} preferência(s) guardada(s) e para de oferecer guardar novas. Nada é apagado: você pode religar quando quiser.`,
      confirmLabel: 'Desligar',
      tone: 'warning',
    });
    if (!ok) return;
  }
  salvando.value = true;
  try { await aiStore.saveSettings({ memory_enabled: v }); }
  catch (e) { erro.value = e?.message || 'Não salvou.'; }
  finally { salvando.value = false; }
}

async function adicionar() {
  if (!novo.value.key.trim() || !novo.value.value.trim()) return;
  salvando.value = true;
  erro.value = '';
  try {
    await aiStore.addMemory({ key: novo.value.key, value: novo.value.value, source: 'manual' });
    novo.value = { key: '', value: '' };
  } catch (e) { erro.value = e?.message || 'Não guardou.'; }
  finally { salvando.value = false; }
}

function comecarEdicao(m) { editando.value = { id: m.id, value: m.value }; }
async function salvarEdicao() {
  if (!editando.value) return;
  salvando.value = true;
  try { await aiStore.updateMemory(editando.value.id, { value: editando.value.value }); editando.value = null; }
  catch (e) { erro.value = e?.message || 'Não salvou.'; }
  finally { salvando.value = false; }
}

async function alternar(m) {
  try { await aiStore.updateMemory(m.id, { enabled: !m.enabled }); }
  catch (e) { erro.value = e?.message || 'Não salvou.'; }
}

async function apagar(m) {
  const ok = await pedirConfirmacao({
    title: 'Apagar esta preferência?',
    consequence: `A Eme esquece "${m.key}: ${m.value}". Se ela voltar a perceber essa preferência, vai perguntar de novo antes de guardar.`,
    confirmLabel: 'Apagar',
    tone: 'danger',
  });
  if (!ok) return;
  try { await aiStore.removeMemory(m); }
  catch (e) { erro.value = e?.message || 'Não apagou.'; }
}

function abrirHistorico() {
  aiStore.settingsOpen = false;
  aiStore.historyOpen = true;
}

const origemLabel = (s) => ({ chat: 'confirmada no chat', manual: 'você digitou', legado: 'antiga (desligada)' }[s] || s);
const storagePercent = computed(() => aiStore.storageUsage?.percent ?? 0);
</script>

<template>
  <Modal :open="aiStore.settingsOpen" size="md" title="Configurações da Eme"
    subtitle="Como a Eme responde para você" @close="aiStore.settingsOpen = false">
    <div class="space-y-6">

      <!-- Modelo -->
      <section>
        <h3 class="text-sm font-semibold text-ink flex items-center gap-2">
          <i class="fas fa-microchip text-accent text-xs"></i> Modelo
        </h3>
        <p class="text-xs text-ink-muted mt-0.5 mb-3">Qual modelo responde. Vale só para as suas conversas.</p>
        <SegmentedControl :model-value="aiStore.settings.model_mode" :options="MODOS" size="sm" block
          @change="setModo" />
        <p class="text-xs text-ink-subtle mt-2 leading-relaxed">{{ MODO_DESC[aiStore.settings.model_mode] }}</p>
      </section>

      <!-- Memória -->
      <section>
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-bookmark text-accent text-xs"></i> Memória
              <Badge v-if="memorias.length" variant="neutral" size="sm">{{ ativas }}/{{ memorias.length }}</Badge>
            </h3>
            <p class="text-xs text-ink-muted mt-0.5 leading-relaxed">
              Preferências que <strong>você confirmou</strong>. A Eme nunca guarda sozinha: quando percebe uma
              preferência, ela pergunta e você decide no botão. O que está aqui não vale como dado do sistema -
              se conflitar com uma consulta, a consulta ganha.
            </p>
          </div>
          <Switch :model-value="aiStore.settings.memory_enabled" size="sm" :disabled="salvando" @change="setMemoria" />
        </div>

        <div class="mt-3 space-y-2" :class="!aiStore.settings.memory_enabled ? 'opacity-60' : ''">
          <div v-for="m in memorias" :key="m.id"
            class="rounded-xl border border-line bg-surface-sunken px-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-mono text-micro text-ink-subtle truncate shrink-0 max-w-[40%]">{{ m.key }}</span>
              <template v-if="editando?.id === m.id">
                <input v-model="editando.value" class="flex-1 min-w-0 bg-transparent border-b border-accent/50 focus:outline-none text-sm text-ink py-0.5"
                  @keydown.enter.prevent="salvarEdicao" @keydown.esc="editando = null" />
                <IconButton icon="fas fa-check" size="sm" label="Salvar" @click="salvarEdicao" />
                <IconButton icon="fas fa-xmark" size="sm" label="Cancelar" @click="editando = null" />
              </template>
              <template v-else>
                <span class="flex-1 min-w-0 text-sm text-ink truncate" :class="!m.enabled ? 'line-through text-ink-subtle' : ''">{{ m.value }}</span>
                <Switch :model-value="m.enabled" size="sm" @change="alternar(m)" />
                <IconButton icon="fas fa-pen" size="sm" label="Editar" @click="comecarEdicao(m)" />
                <IconButton icon="fas fa-trash" size="sm" label="Apagar" @click="apagar(m)" />
              </template>
            </div>
            <p class="text-micro text-ink-subtle mt-0.5">{{ origemLabel(m.source) }}</p>
          </div>
          <p v-if="!memorias.length" class="text-xs text-ink-subtle italic py-2">
            Nada guardado ainda. Diga à Eme algo como "sempre me mostra em VGV sem DC" e ela vai oferecer guardar.
          </p>

          <!-- Adicionar à mão -->
          <div class="flex items-end gap-2 pt-1">
            <Input v-model="novo.key" size="sm" label="Chave" placeholder="empreendimento_padrao" class="w-2/5" />
            <Input v-model="novo.value" size="sm" label="Preferência" placeholder="Residencial Ingá" class="flex-1"
              @keydown.enter="adicionar" />
            <Button variant="outline" size="sm" icon="fas fa-plus" :loading="salvando"
              :disabled="!novo.key.trim() || !novo.value.trim() || !aiStore.settings.memory_enabled" @click="adicionar">Guardar</Button>
          </div>
        </div>
      </section>

      <!-- Histórico -->
      <section>
        <h3 class="text-sm font-semibold text-ink flex items-center gap-2">
          <i class="far fa-clock text-accent text-xs"></i> Histórico
        </h3>
        <div v-if="aiStore.storageUsage" class="mt-2">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="text-ink-muted">Armazenamento das conversas</span>
            <span class="font-mono text-ink">{{ aiStore.storageUsage.used_mb }}<span class="text-ink-subtle"> / 20 MB</span></span>
          </div>
          <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div class="h-full rounded-full bg-accent transition-all duration-700 ease-out-expo" :style="{ width: `${storagePercent}%` }"></div>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon="fas fa-clock-rotate-left" class="mt-2" @click="abrirHistorico">Ver conversas anteriores</Button>
      </section>

      <p v-if="erro" class="text-xs text-data-neg"><i class="fas fa-circle-exclamation mr-1"></i>{{ erro }}</p>
    </div>
  </Modal>
</template>
