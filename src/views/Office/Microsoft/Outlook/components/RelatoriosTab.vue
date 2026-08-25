<script setup>
// Outlook › aba Relatórios. Como foi a semana de e-mail.
//
// Só entra número que dá para medir de verdade a partir da caixa. Duas
// consequências disso, e as duas são de propósito:
//
//   · O tempo médio de resposta só existe onde há PAR (você recebeu e respondeu
//     na mesma conversa). O rodapé diz sobre quantas conversas ele está falando.
//     Média sem base é palpite com cara de métrica.
//   · Não há comparação com "a semana passada". A caixa devolve uma janela de
//     mensagens recentes, não o histórico inteiro - inventar a variação seria
//     escrever um número que ninguém pode conferir.
//
// A leitura em texto é escrita pelo modelo, mas SÓ com os números acima na mão.

import { ref, computed, inject, onMounted, onActivated } from 'vue';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';

import { useToast } from 'vue-toastification';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import VolumeSemanaChart from './VolumeSemanaChart.vue';

const ai = useOutlookAiStore();
const abrirEmail = inject('olAbrirEmail', () => {});
const toast = useToast();

// ── O dia escolhido no gráfico ────────────────────────────────────────────────
// Clicar numa barra recorta a lista abaixo. Sem isto o gráfico só informava; a
// pergunta que ele levanta ("o que chegou na terça?") ficava sem resposta.
const dia = ref(null);
const grafico = ref(null);

function escolherDia(b) { dia.value = b; }

function dataLonga(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1)
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

// ── Ações nos que estão parados ───────────────────────────────────────────────
async function redigirPara(a) {
  try {
    await ai.redigir(a.messageId);
    toast.success('Rascunho pronto no painel da direita, esperando o seu OK.');
  } catch (err) {
    toast.error(err?.message || 'Não consegui redigir agora.');
  }
}

async function tirarDaLista(a, motivo) {
  try {
    await ai.resolver(a.messageId, motivo, '');
    // O relatório é derivado da caixa: recarrega para o número bater com a lista.
    ai.carregarRelatorio();
    toast.success('Saiu da lista. O e-mail continua na caixa.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível tirar da lista.');
  }
}

const menuAberto = ref(null);

onMounted(() => { if (!ai.relatorio) ai.carregarRelatorio(); });
onActivated(() => { if (!ai.relatorio) ai.carregarRelatorio(); });

const r = computed(() => ai.relatorio);
const n = computed(() => r.value?.numeros || {});

const periodo = computed(() => {
  if (!r.value?.periodo) return '';
  const f = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  return `${f(r.value.periodo.de)} a ${f(r.value.periodo.ate)}`;
});

const numeros = computed(() => [
  {
    rotulo: 'Recebidos', valor: n.value.recebidos ?? 0,
    nota: n.value.ruido ? `${n.value.ruido} eram ruído` : 'na Caixa de Entrada',
  },
  {
    rotulo: 'A IA classificou', valor: n.value.classificados ?? 0,
    // A listagem da caixa tem teto, e a triagem guarda o que já leu: numa semana
    // muito movimentada o classificado pode passar do que a janela devolveu.
    // Travar em 100% é melhor do que mostrar "127% do que chegou".
    nota: n.value.recebidos
      ? `${Math.min(100, Math.round(((n.value.classificados || 0) / n.value.recebidos) * 100))}% do que chegou`
      : 'nada ainda',
  },
  {
    rotulo: 'Sua resposta média', valor: n.value.respostaMedia || '—',
    nota: n.value.respostaBase ? `sobre ${n.value.respostaBase} conversas` : 'sem par para medir',
  },
  {
    rotulo: 'Sem resposta', valor: n.value.semResposta ?? 0,
    nota: 'há 2 dias ou mais', alerta: (n.value.semResposta ?? 0) > 0,
  },
]);

</script>

<template>
  <div class="space-y-4">

    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-bold text-ink leading-tight">Relatório de e-mail</h2>
        <p class="text-sm text-ink-muted">{{ periodo || 'últimos 7 dias' }}</p>
      </div>
      <Button size="sm" variant="ghost" icon="fas fa-rotate"
        :loading="ai.carregandoRelatorio" @click="ai.carregarRelatorio()">Atualizar</Button>
    </div>

    <template v-if="ai.carregandoRelatorio && !r">
      <Skeleton class="h-28 rounded-2xl" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Skeleton v-for="i in 4" :key="i" class="h-20 rounded-2xl" />
      </div>
      <Skeleton class="h-64 rounded-2xl" />
    </template>

    <template v-else-if="r">

      <!-- Leitura da semana -->
      <section v-if="r.leitura?.length"
        class="rounded-2xl border border-accent/25 p-5 bg-gradient-to-br from-accent-soft to-surface-raised
               animate-slide-up">
        <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent mb-2">
          <i class="fas fa-wand-magic-sparkles"></i> Leitura da semana
        </p>
        <p v-for="(p, i) in r.leitura" :key="i"
          class="text-[0.9rem] leading-relaxed text-ink max-w-[80ch] text-pretty mb-2 last:mb-0 animate-slide-up"
          :style="{ animationDelay: `${i * 70}ms` }">{{ p }}</p>
      </section>

      <!-- Sem modelo configurado: os números continuam valendo, e a tela diz
           por que o texto não veio. -->
      <div v-else-if="!r.temIA"
        class="flex items-start gap-3 p-3 rounded-xl border border-line bg-surface-sunken">
        <i class="fas fa-circle-info text-ink-subtle mt-0.5 shrink-0"></i>
        <p class="text-xs text-ink-muted leading-relaxed">
          Os números abaixo são medidos da sua caixa e valem do mesmo jeito. A leitura em texto depende do
          modelo de IA, que não está configurado neste ambiente.
        </p>
      </div>

      <!-- Números -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div v-for="(k, i) in numeros" :key="k.rotulo"
          class="rounded-2xl border bg-surface-raised px-3.5 py-3 animate-slide-up
                 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-soft"
          :class="k.alerta ? 'border-data-warn/35' : 'border-line'"
          :style="{ animationDelay: `${i * 45}ms` }">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">{{ k.rotulo }}</p>
          <p class="text-metric-sm font-bold text-ink tabular-nums mt-1"
            :class="k.alerta ? 'text-data-warn' : ''">{{ k.valor }}</p>
          <p class="text-micro text-ink-subtle mt-0.5">{{ k.nota }}</p>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">

        <!-- Volume por dia -->
        <section class="rounded-2xl border border-line bg-surface-raised p-4">
          <VolumeSemanaChart ref="grafico" :barras="r.barras || []" @dia="escolherDia" />

          <!-- O que chegou no dia escolhido. É a resposta da pergunta que a
               barra levanta; antes o gráfico terminava a conversa nele mesmo. -->
          <Transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120" leave-to-class="opacity-0">
            <div v-if="dia" class="mt-3 pt-3 border-t border-line">
              <p class="text-micro font-semibold text-ink-muted mb-2 capitalize">
                {{ dataLonga(dia.data) }} · {{ dia.valor }} e-mail(s)
              </p>

              <p v-if="!dia.itens?.length" class="text-micro text-ink-subtle">
                Nada chegou neste dia.
              </p>

              <div v-else class="flex flex-col max-h-64 overflow-y-auto -mx-1">
                <button v-for="(it, i) in dia.itens" :key="it.messageId" type="button"
                  @click="abrirEmail(it.messageId)"
                  class="group flex items-center gap-2.5 px-1 py-2 rounded-lg text-left animate-slide-up
                         hover:bg-surface-sunken transition-all duration-120 ease-out-expo"
                  :style="{ animationDelay: `${Math.min(i, 10) * 30}ms` }">
                  <span class="w-1 self-stretch rounded-full shrink-0"
                    :class="it.naoLido ? 'bg-accent' : 'bg-transparent'"></span>
                  <span class="text-micro font-mono tabular-nums text-ink-subtle shrink-0 w-9">{{ it.hora }}</span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-xs truncate group-hover:text-accent transition-colors duration-120"
                      :class="it.naoLido ? 'text-ink font-medium' : 'text-ink-muted'">{{ it.assunto }}</span>
                    <span class="block text-micro text-ink-subtle truncate">{{ it.de }}</span>
                  </span>
                  <i v-if="it.anexo" class="fas fa-paperclip text-micro text-ink-subtle shrink-0"></i>
                  <i class="fas fa-arrow-right text-micro text-accent shrink-0 opacity-0 -translate-x-1
                            group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"></i>
                </button>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Esperando resposta há mais tempo -->
        <section class="rounded-2xl border border-line bg-surface-raised p-4">
          <h3 class="text-sm font-semibold text-ink mb-2">Esperando sua resposta há mais tempo</h3>

          <EmptyState v-if="!r.atrasados?.length" icon="fas fa-check" size="sm"
            title="Nada parado"
            description="Toda conversa que chegou nos últimos dias teve resposta sua." />

          <!-- Cada linha vira um cartão que RESOLVE: abrir, mandar a IA
               escrever, ou tirar da lista dizendo por quê. Antes era só um
               nome e um número de dias - informação que não leva a lugar
               nenhum vira decoração. -->
          <div v-else class="flex flex-col gap-1.5">
            <article v-for="(a, i) in r.atrasados" :key="a.messageId"
              class="group rounded-xl border border-line bg-surface-sunken p-2.5 animate-slide-up
                     transition-all duration-200 ease-out-expo hover:border-accent/40 hover:shadow-soft"
              :style="{ animationDelay: `${i * 45}ms` }">

              <button type="button" class="flex items-center gap-2.5 w-full text-left"
                @click="abrirEmail(a.messageId)">
                <span class="flex-1 min-w-0">
                  <span class="block text-xs font-medium text-ink truncate group-hover:text-accent
                               transition-colors duration-120">{{ a.assunto }}</span>
                  <span class="block text-micro text-ink-subtle truncate mt-0.5">{{ a.de }}</span>
                </span>
                <span class="text-micro font-semibold shrink-0 px-2 py-0.5 rounded-md tabular-nums"
                  :class="a.dias >= 5 ? 'text-data-neg bg-data-neg-soft' : 'text-ink-muted bg-surface-raised'">
                  {{ a.dias }} d
                </span>
              </button>

              <div class="flex flex-wrap items-center gap-1.5 mt-2 opacity-0 max-h-0 overflow-hidden
                          group-hover:opacity-100 group-hover:max-h-20 focus-within:opacity-100
                          focus-within:max-h-20 transition-all duration-200 ease-out-expo">
                <Button size="sm" variant="primary" icon="fas fa-wand-magic-sparkles"
                  :loading="ai.redigindoEste(a.messageId)" @click="redigirPara(a)">
                  Responder
                </Button>
                <Button size="sm" variant="ghost" class="text-ink-subtle"
                  @click="menuAberto = menuAberto === a.messageId ? null : a.messageId">
                  Tirar da lista
                </Button>
              </div>

              <Transition
                enter-active-class="transition duration-200 ease-out-expo"
                enter-from-class="opacity-0 -translate-y-1"
                leave-active-class="transition duration-120" leave-to-class="opacity-0">
                <div v-if="menuAberto === a.messageId" class="flex flex-wrap gap-1 mt-2">
                  <button v-for="mo in (ai.painel?.motivos || [])" :key="mo.id" type="button"
                    @click="menuAberto = null; tirarDaLista(a, mo.id)"
                    class="px-2 py-1 min-h-8 rounded-lg text-micro border border-line text-ink-muted
                           hover:text-accent hover:border-accent/40 transition-all duration-120">
                    {{ mo.label }}
                  </button>
                </div>
              </Transition>
            </article>
          </div>
        </section>
      </div>
    </template>

    <EmptyState v-else icon="fas fa-chart-line" size="lg"
      title="Não consegui montar o relatório"
      :description="ai.erro || 'Tente atualizar em alguns instantes.'">
      <template #actions>
        <Button variant="outline" icon="fas fa-rotate" @click="ai.carregarRelatorio()">Tentar de novo</Button>
      </template>
    </EmptyState>
  </div>
</template>
