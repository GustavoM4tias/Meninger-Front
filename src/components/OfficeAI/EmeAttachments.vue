<script setup>
/**
 * EmeAttachments - clipe + anexos do chat da Eme (PDF de nota e boleto).
 * ─────────────────────────────────────────────────────────────────────────────
 * Hoje o único uso é lançar no Fluxo de Pagamento, então o clipe só aparece
 * para quem tem essa tela. Os arquivos sobem na hora (officeAIStore) e vão
 * junto com a próxima mensagem.
 *
 * Dois pedaços, para caber no layout de cada campo de digitação:
 *   <EmeAttachments part="button" />  o clipe
 *   <EmeAttachments part="chips" />   a lista do que está anexado
 */
import { ref, computed } from 'vue';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

const props = defineProps({
  part: { type: String, default: 'button' },   // button | chips
  size: { type: String, default: 'md' },
});

const aiStore = useOfficeAIStore();
const perm = usePermissionStore();
const input = ref(null);

const disponivel = computed(() => perm.hasAccess('/financeiro/paymentflow'));
const tam = computed(() => (props.size === 'lg' ? 'w-9 h-9' : 'w-8 h-8'));

function escolher(e) {
  for (const f of Array.from(e.target.files || []).slice(0, 5)) aiStore.addAttachment(f);
  e.target.value = '';
}
</script>

<template>
  <template v-if="disponivel">
    <template v-if="part === 'button'">
      <button type="button" :class="[tam, 'rounded-full grid place-items-center bg-surface-sunken hover:bg-accent-soft border border-line transition-colors']"
        title="Anexar nota ou boleto (PDF) para a Eme lançar no Sienge"
        :disabled="aiStore.isStreaming" @click="input?.click()">
        <i class="fas fa-paperclip text-xs text-ink-subtle"></i>
      </button>
      <input ref="input" type="file" accept="application/pdf" multiple class="hidden" @change="escolher" />
    </template>

    <div v-else-if="aiStore.pendingAttachments.length" class="flex flex-wrap gap-1.5">
      <span v-for="a in aiStore.pendingAttachments" :key="a.key"
        class="inline-flex items-center gap-1.5 max-w-full rounded-lg border px-2 py-1 text-xs"
        :class="a.error ? 'border-data-neg/30 bg-data-neg/10 text-data-neg' : 'border-line bg-surface-sunken text-ink'">
        <i :class="a.uploading ? 'fas fa-spinner fa-spin' : a.error ? 'fas fa-circle-exclamation' : 'fas fa-file-pdf text-data-neg'"></i>
        <span class="truncate max-w-[12rem]">{{ a.fileName }}</span>
        <span v-if="a.error" class="opacity-80">{{ a.error }}</span>
        <button type="button" class="text-ink-subtle hover:text-data-neg" title="Tirar" @click="aiStore.removeAttachment(a.key)">
          <i class="fas fa-xmark"></i>
        </button>
      </span>
    </div>
  </template>
</template>
