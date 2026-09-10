<template>
  <!-- Configuração do link de cartão (portal Userede), montada dentro do
       cartão "Link de cartão" da aba Configurações do Ato. Era uma tela própria
       até 23/08/2026, quando o boleto e o cartão viraram a mesma tela: são a
       mesma cobrança, muda só a forma de pagamento. O estado da automação e a
       ajuda ficam no cabeçalho do Ato, por isso saíram daqui.

       Como agora mora DENTRO de um cartão, os blocos daqui deixaram de ser
       cartões: cabeçalho de 11px em caixa alta, igual ao resto da aba, em vez
       do quadrado de ícone que repetia a hierarquia do cartão de fora. -->
  <div class="space-y-6">

    <div v-if="store.settingsError"
      class="rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2.5">
      <p class="text-xs text-data-neg">{{ store.settingsError }}</p>
    </div>

    <!-- ── Sessão precisa de gente ───────────────────────────────────────── -->
    <div v-if="store.settings?.session_precisa_humano"
      class="rounded-lg border border-data-warn/30 bg-data-warn/10 px-3 py-2.5">
      <div class="flex items-start gap-2">
        <i class="fas fa-triangle-exclamation mt-0.5 text-xs text-data-warn shrink-0"></i>
        <div class="min-w-0 space-y-1">
          <p class="text-xs font-semibold text-data-warn">
            O portal pediu verificação e a sessão parou
          </p>
          <p class="text-xs text-data-warn leading-relaxed">
            {{ store.settings.session_ultimo_erro }}
          </p>
          <p class="text-xs text-data-warn leading-relaxed">
            Acesse <span class="font-mono">meu.userede.com.br</span>, conclua o acesso e clique em
            Testar conexão. As emissões pendentes saem sozinhas depois disso.
          </p>
        </div>
      </div>
    </div>

    <!-- ── Acesso ao portal ──────────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
          Acesso ao portal Userede
        </h3>
        <p class="text-micro text-ink-subtle">
          Gravado criptografado; depois de salvo nunca mais é exibido.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Input v-model="form.usuario" type="email" label="E-mail de acesso"
          :placeholder="store.settings?.usuario_set ? '•••••••• (já cadastrado)' : 'usuario@menin.com.br'"
          hint="O mesmo e-mail usado para entrar no meu.userede.com.br." />
        <Input v-model="form.senha" type="password" label="Senha"
          :placeholder="store.settings?.senha_set ? '•••••••• (já cadastrada)' : 'Senha do portal'"
          hint="Deixe em branco para manter a senha atual." />
        <Input v-model="form.pv_principal" label="Estabelecimento (PV)"
          placeholder="18309232"
          hint="Número do PV usado na emissão." />

        <!-- O que já está gravado. Era uma coluna de três linhas encaixada com
             `items-end` ao lado de um campo, e só ficava alinhada por sorte. -->
        <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 space-y-1">
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
            O que já está gravado
          </p>
          <p v-for="item in estadoCredenciais" :key="item.rotulo"
            class="flex items-center gap-1.5 text-xs text-ink-muted">
            <i class="fas fa-circle-check text-xs shrink-0"
              :class="item.ok ? 'text-data-pos' : 'text-ink-subtle'"></i>
            <span>{{ item.rotulo }} <span class="text-ink">{{ item.estado }}</span></span>
          </p>
        </div>
      </div>

      <!-- Teste de conexão -->
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" icon="fas fa-plug-circle-check"
          :loading="store.testing" :disabled="store.testing || !store.settings?.senha_set"
          @click="store.testConnection()">
          Testar conexão
        </Button>
        <Button v-if="store.settings?.session_set" variant="ghost" size="sm"
          icon="fas fa-arrow-rotate-left"
          :loading="store.resetting" :disabled="store.resetting"
          @click="store.resetSession()">
          Descartar sessão salva
        </Button>
        <span v-if="!store.settings?.senha_set" class="text-xs text-ink-muted">
          Cadastre e salve a senha para liberar o teste.
        </span>
      </div>

      <div v-if="store.testResult"
        class="rounded-lg border px-3 py-2.5"
        :class="store.testResult.ok
          ? 'border-data-pos/30 bg-data-pos/10'
          : 'border-data-neg/30 bg-data-neg/10'">
        <div class="flex items-start gap-2">
          <i class="mt-0.5 text-xs shrink-0"
            :class="store.testResult.ok
              ? 'fas fa-circle-check text-data-pos'
              : 'fas fa-circle-xmark text-data-neg'"></i>
          <div class="min-w-0 space-y-1">
            <p class="text-xs font-semibold"
              :class="store.testResult.ok ? 'text-data-pos' : 'text-data-neg'">
              {{ store.testResult.mensagem }}
            </p>
            <p v-if="store.testResult.estabelecimento" class="text-xs text-ink-muted">
              Estabelecimento: <span class="font-medium text-ink">{{ store.testResult.estabelecimento }}</span>
            </p>
            <p v-if="store.testResult.duracao_ms" class="text-xs text-ink-muted tabular-nums">
              Levou {{ (store.testResult.duracao_ms / 1000).toFixed(1) }}s
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Regras de emissão ─────────────────────────────────────────────── -->
    <section class="space-y-4 pt-5 border-t border-line-subtle">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
          Regras de emissão
        </h3>
        <p class="text-micro text-ink-subtle">
          Limites aplicados antes de criar o link no portal.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      <!-- Terceiro campo de lista de ids da aba; o mesmo componente dos dois
           do cartão de séries do ato. -->
      <ChipListField v-model="form.idserie_credito" class="max-w-md"
        label="IDs de série - Recurso Próprio à Vista (crédito)"
        placeholder="Ex.: 3"
        empty-text="Nenhuma série configurada"
        remove-label="Remover série"
        hint="O link só é criado quando a reserva tem parcela de uma dessas séries. A quantidade de parcelas da série vira o limite de vezes oferecido no link." />
    </section>

    <!-- ── Automação e salvar ────────────────────────────────────────────── -->
    <section class="space-y-4 pt-5 border-t border-line-subtle">
      <div class="rounded-lg border border-line bg-surface-sunken p-3">
        <Switch v-model="form.active"
          label="Gerar link de cartão automaticamente"
          :description="form.active
            ? 'O webhook do CV gera links sem ninguém pedir.'
            : 'Nada é gerado automaticamente enquanto estiver pausada.'" />
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3">
        <span v-if="store.settingsSaved" class="flex items-center gap-1.5 text-xs text-data-pos">
          <i class="fas fa-check"></i>Salvo.
        </span>
        <Button variant="primary" size="sm" icon="fas fa-floppy-disk"
          :loading="store.settingsLoading" :disabled="store.settingsLoading"
          @click="handleSave">
          Salvar link de cartão
        </Button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUseredeStore } from '@/stores/Financeiro/LinkCartao/useredeStore';

import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import ChipListField from './ChipListField.vue';

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

/* As tres linhas de "o que ja esta gravado". Viraram lista porque escritas a
   mao elas repetiam a marcacao tres vezes e cada uma tinha um espacamento. */
const estadoCredenciais = computed(() => [
    { rotulo: 'Usuário', ok: !!store.settings?.usuario_set, estado: store.settings?.usuario_set ? 'cadastrado' : 'não cadastrado' },
    { rotulo: 'Senha', ok: !!store.settings?.senha_set, estado: store.settings?.senha_set ? 'cadastrada' : 'não cadastrada' },
    { rotulo: 'Sessão', ok: !!store.settings?.session_set, estado: sessaoLabel.value },
]);


// O campo de lista de ids vive no ChipListField (add/remove e validacao).

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
