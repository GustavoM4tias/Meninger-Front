<script setup>
/**
 * VizPaymentAction - cartão de ação sobre um pagamento que já existe
 * (importar medição, medir no saldo, gerar título, registrar boleto).
 * ─────────────────────────────────────────────────────────────────────────────
 * action: { acao, titulo, alvo, ok, validacoes: [{ nivel: ok|aviso|falha, texto }],
 *           efeitos: [texto], pedido }
 *
 * A Eme só montou o plano. Quem age é o clique em Confirmar, pela rota
 * /sienge/payment-flow/action, que VALIDA TUDO DE NOVO no servidor (o Sienge
 * pode ter mudado desde o cartão) e confere o resultado depois de agir.
 * Validação com falha = sem botão. "Já feito" fica em localStorage por bloco.
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
  block: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const router = useRouter();
const toast = useToast();
const CHAVE = 'eme_acoes_pagamento';

const a = computed(() => props.block?.action || {});
const estado = ref('idle'); // idle | sending | done | error
const resultado = ref(null);
const falhasServidor = ref([]);
const erro = ref('');

function lidas() {
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function marcar(id, info) {
  try {
    const v = lidas(); v[id] = info;
    localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(Object.entries(v).slice(-50))));
  } catch { /* sem storage */ }
}
const feito = lidas()[props.block?.id];
if (feito) { estado.value = 'done'; resultado.value = feito; }

const validacoes = computed(() => (falhasServidor.value.length ? falhasServidor.value : a.value.validacoes || []));
const podeConfirmar = computed(() => a.value.ok && !falhasServidor.value.length && estado.value === 'idle');
const ICONE = { ok: 'fas fa-circle-check text-data-pos', aviso: 'fas fa-triangle-exclamation text-data-warn', falha: 'fas fa-circle-xmark text-data-neg' };

async function confirmar() {
  if (!podeConfirmar.value) return;
  estado.value = 'sending';
  erro.value = '';
  try {
    const r = await requestWithAuth(`${API_URL}/sienge/payment-flow/action`, { method: 'POST', body: JSON.stringify(a.value.pedido) });
    resultado.value = r;
    estado.value = r?.ok === false ? 'error' : 'done';
    if (r?.ok === false) erro.value = r.mensagem || 'A conferência depois da ação não bateu.';
    else { marcar(props.block?.id, { mensagem: r.mensagem, launchId: r.launchId }); toast.success(r.mensagem || 'Feito.'); }
  } catch (err) {
    estado.value = 'error';
    // 422 = a validação no servidor barrou (algo mudou desde o cartão).
    if (err?.status === 422) {
      falhasServidor.value = String(err.message || '').split(/(?<=\.)\s+/).filter(Boolean).map(texto => ({ nivel: 'falha', texto }));
      estado.value = 'idle';
    } else erro.value = err?.message || 'Não foi possível concluir.';
  }
}

function abrir() {
  router.push({ path: '/financeiro/paymentflow' });
}
</script>

<template>
  <div class="rounded-xl border bg-surface-raised overflow-hidden"
    :class="estado === 'done' ? 'border-data-pos/40' : a.ok && !falhasServidor.length ? 'border-line' : 'border-data-neg/40'">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface-sunken/50">
      <i class="fas fa-shield-halved" :class="a.ok ? 'text-accent' : 'text-data-neg'"></i>
      <span class="text-sm font-semibold text-ink truncate">{{ a.titulo }}</span>
      <span class="ml-auto text-micro font-mono"
        :class="estado === 'done' ? 'text-data-pos' : a.ok && !falhasServidor.length ? 'text-ink-subtle' : 'text-data-neg'">
        {{ estado === 'done' ? 'feito' : a.ok && !falhasServidor.length ? 'para confirmar' : 'barrado' }}
      </span>
    </div>

    <div class="p-3 space-y-3">
      <p class="text-xs text-ink">{{ a.alvo }}</p>

      <ul class="space-y-1">
        <li v-for="(v, i) in validacoes" :key="i" class="flex items-start gap-2 text-xs">
          <i :class="ICONE[v.nivel] || ICONE.aviso" class="mt-0.5 shrink-0"></i>
          <span :class="v.nivel === 'falha' ? 'text-data-neg' : 'text-ink-muted'">{{ v.texto }}</span>
        </li>
      </ul>

      <div v-if="a.efeitos?.length && estado !== 'done' && a.ok" class="rounded-lg border border-line bg-surface-sunken px-3 py-2">
        <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1">Ao confirmar</p>
        <ul class="space-y-0.5">
          <li v-for="(e, i) in a.efeitos" :key="i" class="text-xs text-ink">{{ e }}</li>
        </ul>
      </div>

      <p v-if="erro" class="text-xs text-data-neg"><i class="fas fa-circle-exclamation mr-1"></i>{{ erro }}</p>
      <p v-if="estado === 'done'" class="text-xs text-data-pos"><i class="fas fa-circle-check mr-1"></i>{{ resultado?.mensagem || 'Feito.' }}</p>

      <div class="flex flex-wrap items-center gap-2">
        <button v-if="estado !== 'done' && a.ok" type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 min-h-[40px] disabled:opacity-50"
          :disabled="!podeConfirmar" @click="confirmar">
          <i :class="estado === 'sending' ? 'fas fa-spinner fa-spin' : 'fas fa-check'"></i>
          {{ estado === 'sending' ? 'Validando e executando...' : 'Confirmar' }}
        </button>
        <button type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-line text-ink-muted hover:bg-surface-sunken text-xs px-3 min-h-[40px]"
          @click="abrir">
          <i class="fas fa-arrow-up-right-from-square"></i>Fluxo de Pagamento
        </button>
      </div>
      <p v-if="estado !== 'done' && a.ok" class="text-micro text-ink-subtle">
        Ao confirmar, tudo é conferido de novo no Sienge antes de agir, e o resultado é checado depois.
      </p>
    </div>
  </div>
</template>
