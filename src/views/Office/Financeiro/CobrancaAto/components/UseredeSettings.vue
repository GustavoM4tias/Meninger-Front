<template>
  <!-- Seção de configuração do link de cartão (portal Userede), montada dentro
       da aba Configurações do Ato. Era uma tela própria até 23/08/2026, quando
       o boleto e o cartão viraram a mesma tela: são a mesma cobrança, muda só a
       forma de pagamento. O estado da automação e a ajuda ficam no cabeçalho do
       Ato, por isso saíram daqui. -->
  <div class="space-y-5">

    <Surface v-if="store.settingsError" variant="raised" padding="sm"
      class="border-rose-500/30 bg-rose-500/10">
      <p class="text-sm text-rose-700 dark:text-rose-300">{{ store.settingsError }}</p>
    </Surface>

    <!-- ── Sessão precisa de gente ───────────────────────────────────────── -->
    <Surface v-if="store.settings?.session_precisa_humano" variant="raised" padding="sm"
      class="border-amber-500/30 bg-amber-500/10">
      <div class="flex items-start gap-2.5">
        <i class="fas fa-triangle-exclamation mt-0.5 text-amber-600 dark:text-amber-400"></i>
        <div class="min-w-0 space-y-1">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">
            O portal pediu verificação e a sessão parou
          </p>
          <p class="text-xs text-amber-800/90 dark:text-amber-200/90">
            {{ store.settings.session_ultimo_erro }}
          </p>
          <p class="text-xs text-amber-800/90 dark:text-amber-200/90">
            Acesse <span class="font-mono">meu.userede.com.br</span>, conclua o acesso e clique em
            Testar conexão. As emissões pendentes saem sozinhas depois disso.
          </p>
        </div>
      </div>
    </Surface>

    <!-- ── Credenciais ───────────────────────────────────────────────────── -->
    <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl grid place-items-center shrink-0
                    bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <i class="fas fa-key"></i>
        </div>
        <div class="min-w-0">
          <h2 class="font-semibold text-ink text-sm">Acesso ao portal Userede</h2>
          <p class="text-xs text-ink-muted">
            Gravado criptografado. Depois de salvo, nunca mais é exibido.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input v-model="form.usuario" type="email" label="E-mail de acesso"
          :placeholder="store.settings?.usuario_set ? '•••••••• (já cadastrado)' : 'usuario@menin.com.br'"
          hint="O mesmo e-mail usado para entrar no meu.userede.com.br." />
        <Input v-model="form.senha" type="password" label="Senha"
          :placeholder="store.settings?.senha_set ? '•••••••• (já cadastrada)' : 'Senha do portal'"
          hint="Deixe em branco para manter a senha atual." />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input v-model="form.pv_principal" label="Estabelecimento (PV)"
          placeholder="18309232"
          hint="Número do PV usado na emissão." />
        <div class="flex items-end">
          <div class="text-xs text-ink-muted space-y-0.5">
            <p>
              <i class="fas fa-circle-check mr-1"
                :class="store.settings?.usuario_set ? 'text-data-pos' : 'text-ink-subtle'"></i>
              Usuário {{ store.settings?.usuario_set ? 'cadastrado' : 'não cadastrado' }}
            </p>
            <p>
              <i class="fas fa-circle-check mr-1"
                :class="store.settings?.senha_set ? 'text-data-pos' : 'text-ink-subtle'"></i>
              Senha {{ store.settings?.senha_set ? 'cadastrada' : 'não cadastrada' }}
            </p>
            <p>
              <i class="fas fa-circle-check mr-1"
                :class="store.settings?.session_set ? 'text-data-pos' : 'text-ink-subtle'"></i>
              Sessão {{ sessaoLabel }}
            </p>
          </div>
        </div>
      </div>

      <!-- Teste de conexão -->
      <div class="flex items-center gap-2 flex-wrap pt-1">
        <Button variant="primary" size="sm" icon="fas fa-plug-circle-check"
          :loading="store.testing" :disabled="store.testing || !store.settings?.senha_set"
          @click="store.testConnection()">
          Testar conexão
        </Button>
        <Button v-if="store.settings?.session_set" variant="ghost" size="sm" icon="fas fa-arrow-rotate-left"
          :loading="store.resetting" :disabled="store.resetting"
          @click="store.resetSession()">
          Descartar sessão salva
        </Button>
        <span v-if="!store.settings?.senha_set" class="text-xs text-ink-muted">
          Cadastre e salve a senha para liberar o teste.
        </span>
      </div>

      <Surface v-if="store.testResult" variant="raised" padding="sm"
        :class="store.testResult.ok
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-rose-500/30 bg-rose-500/10'">
        <div class="flex items-start gap-2.5">
          <i class="mt-0.5"
            :class="store.testResult.ok
              ? 'fas fa-circle-check text-emerald-600 dark:text-emerald-400'
              : 'fas fa-circle-xmark text-rose-600 dark:text-rose-400'"></i>
          <div class="min-w-0 space-y-1 text-xs">
            <p class="font-semibold"
              :class="store.testResult.ok
                ? 'text-emerald-800 dark:text-emerald-200'
                : 'text-rose-800 dark:text-rose-200'">
              {{ store.testResult.mensagem }}
            </p>
            <p v-if="store.testResult.estabelecimento" class="text-ink-muted">
              Estabelecimento: <span class="font-medium text-ink">{{ store.testResult.estabelecimento }}</span>
            </p>
            <p v-if="store.testResult.duracao_ms" class="text-ink-muted">
              Levou {{ (store.testResult.duracao_ms / 1000).toFixed(1) }}s
            </p>
          </div>
        </div>
      </Surface>
    </Surface>

    <!-- ── Regras de emissão ─────────────────────────────────────────────── -->
    <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl grid place-items-center shrink-0
                    bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
          <i class="fas fa-sliders"></i>
        </div>
        <div class="min-w-0">
          <h2 class="font-semibold text-ink text-sm">Regras de emissão</h2>
          <p class="text-xs text-ink-muted">Limites aplicados antes de criar o link no portal.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input v-model.number="form.valor_maximo" type="number" min="1" :max="limites.max_valor"
          label="Teto por link (R$)"
          :hint="`Acima disto a emissão erra e avisa no CV. Máximo da Rede: R$ ${limites.max_valor.toLocaleString('pt-BR')}.`" />
        <Input v-model.number="form.max_parcelas" type="number" min="1" :max="limites.max_parcelas"
          label="Limite de parcelas"
          :hint="`É um teto: o cliente escolhe até quantas vezes pagar. Máximo da Rede: ${limites.max_parcelas}x.`" />
        <Input v-model.number="form.max_dias_vencimento" type="number" min="0" :max="limites.max_dias_vencimento"
          label="Prazo máximo (dias)"
          :hint="`Vencimento além disto não emite. Máximo da Rede: ${limites.max_dias_vencimento} dias.`" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          IDs de série &mdash; Recurso Próprio à Vista (Crédito)
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <span v-for="id in form.idserie_credito" :key="id"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                   bg-surface-sunken border border-line">
            {{ id }}
            <button type="button" class="text-ink-subtle hover:text-rose-500" @click="removeSerie(id)">
              <i class="fas fa-xmark"></i>
            </button>
          </span>
          <input v-model.number="novaSerie" type="number" placeholder="ID"
            class="w-24 px-2 py-1 text-xs rounded-lg bg-surface-sunken border border-line
                   text-ink focus:outline-none focus:ring-1 focus:ring-sky-500"
            @keyup.enter="addSerie" />
          <Button variant="ghost" size="sm" icon="fas fa-plus" @click="addSerie">Adicionar</Button>
        </div>
        <p class="text-xs text-ink-muted mt-1.5">
          O link só é criado quando a reserva tem parcela de uma dessas séries. A quantidade de
          parcelas da série vira o limite de vezes oferecido no link.
        </p>
      </div>
    </Surface>

    <!-- ── Automação ─────────────────────────────────────────────────────── -->
    <Surface variant="raised" padding="md" class="surface-gradient">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-9 w-9 rounded-xl grid place-items-center shrink-0"
            :class="form.active
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-surface-sunken text-ink-subtle border border-line'">
            <i class="fas fa-robot"></i>
          </div>
          <div class="min-w-0">
            <h2 class="font-semibold text-ink text-sm">Automação</h2>
            <p class="text-xs text-ink-muted">
              {{ form.active
                ? 'O webhook do CV gera links automaticamente.'
                : 'Nada é gerado automaticamente enquanto estiver pausada.' }}
            </p>
          </div>
        </div>
        <button type="button" @click="form.active = !form.active"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0"
          :class="form.active ? 'bg-emerald-500' : 'bg-surface-sunken border border-line'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
      </div>
    </Surface>

    <!-- ── Salvar ────────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 flex-wrap">
      <Button variant="primary" icon="fas fa-floppy-disk"
        :loading="store.settingsLoading" :disabled="store.settingsLoading"
        @click="handleSave">
        Salvar configurações
      </Button>
      <span v-if="store.settingsSaved" class="text-sm text-emerald-600 dark:text-emerald-400">
        <i class="fas fa-check mr-1"></i>Salvo.
      </span>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUseredeStore } from '@/stores/Financeiro/LinkCartao/useredeStore';

import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

const store = useUseredeStore();

// Credenciais nascem VAZIAS de propósito: o backend não devolve os valores, e
// campo vazio no PATCH significa "mantém o que já está gravado".
const form = reactive({
    usuario: '',
    senha: '',
    pv_principal: '',
    valor_maximo: 15000,
    max_parcelas: 12,
    max_dias_vencimento: 5,
    idserie_credito: [],
    active: false,
});

// Limites físicos do portal, informados pelo backend — a tela não os inventa.
const limites = computed(() => store.settings?.limites_rede
    || { max_parcelas: 12, max_dias_vencimento: 15, max_valor: 30000 });

const sessaoLabel = computed(() => {
    if (!store.settings?.session_set) return 'não iniciada';
    const em = store.settings.session_valida_em;
    if (!em) return 'salva';
    return `válida desde ${new Date(em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
});

const novaSerie = ref(null);

function addSerie() {
    const n = Number(novaSerie.value);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!form.idserie_credito.includes(n)) form.idserie_credito.push(n);
    novaSerie.value = null;
}

function removeSerie(id) {
    form.idserie_credito = form.idserie_credito.filter(x => x !== id);
}

async function handleSave() {
    const payload = {
        pv_principal: form.pv_principal,
        valor_maximo: form.valor_maximo,
        max_parcelas: form.max_parcelas,
        max_dias_vencimento: form.max_dias_vencimento,
        idserie_credito: form.idserie_credito,
        active: form.active,
    };
    // Só manda credencial quando o campo foi preenchido nesta sessão.
    if (form.usuario.trim()) payload.usuario = form.usuario.trim();
    if (form.senha.trim()) payload.senha = form.senha.trim();

    const ok = await store.saveSettings(payload);
    if (ok) {
        // Some com o que foi digitado: a partir daqui o valor vive só no banco.
        form.usuario = '';
        form.senha = '';
        hydrate();
    }
}

function hydrate() {
    const s = store.settings;
    if (!s) return;
    form.pv_principal = s.pv_principal ?? '';
    form.valor_maximo = s.valor_maximo != null ? Number(s.valor_maximo) : 15000;
    form.max_parcelas = s.max_parcelas ?? 12;
    form.max_dias_vencimento = s.max_dias_vencimento ?? 5;
    form.idserie_credito = Array.isArray(s.idserie_credito) ? [...s.idserie_credito] : [];
    form.active = !!s.active;
}

onMounted(async () => {
    await store.fetchSettings();
    hydrate();
});
</script>
