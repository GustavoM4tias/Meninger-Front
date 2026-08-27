<script setup>
// A reunião como cartão - e o link de entrada como BOTÃO.
//
// Antes ela saía assim, no meio da frase:
//
//   "O link para a entrada é: https://teams.microsoft.com/l/meetup-join/19%3a
//    meeting_NTEwYTBlY2QtOTZiNC00Njg2LTlhZWUtM2FmY2YxZjhmZDc3%40thread.v2/0?..."
//
// Trezentos caracteres que ninguém acerta de clicar no celular. Aqui é um botão,
// e o texto do modelo fica só com o que ele sabe dizer: que agendou.
//
// A PRÉVIA TAMBÉM É CARTÃO. Confirmar reunião lendo "de 2026-08-26T15:00:00 a
// 2026-08-26T15:30:00" numa frase é onde se confirma o horário errado.

import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import ChatAtalhos from './ChatAtalhos.vue';

const props = defineProps({ action: { type: Object, required: true } });

const TZ = 'America/Sao_Paulo';

function quando(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d;
}

const inicio = computed(() => quando(props.action.inicio));
const fim = computed(() => quando(props.action.fim));

const dia = computed(() => {
    const d = inicio.value;
    if (!(d instanceof Date)) return String(props.action.inicio || '');
    const hoje = new Date();
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    const mesmo = (a, b) => a.toDateString() === b.toDateString();
    if (mesmo(d, hoje)) return 'hoje';
    if (mesmo(d, amanha)) return 'amanhã';
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TZ });
});

const faixa = computed(() => {
    const a = inicio.value, b = fim.value;
    if (!(a instanceof Date)) return '';
    const h = (x) => x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
    return b instanceof Date ? `${h(a)} às ${h(b)}` : h(a);
});

const duracao = computed(() => {
    const a = inicio.value, b = fim.value;
    if (!(a instanceof Date) || !(b instanceof Date)) return null;
    const min = Math.round((b - a) / 60000);
    return min >= 60 ? `${(min / 60).toFixed(min % 60 ? 1 : 0)}h` : `${min} min`;
});

const toast = useToast();
const copiado = ref(false);

function entrar() {
    if (props.action.linkEntrada) window.open(props.action.linkEntrada, '_blank', 'noopener');
}

/**
 * Copia o link sem abrir a reunião.
 *
 * O caso real: a pessoa quer MANDAR o link para alguém, não entrar. Sem isto o
 * único jeito era abrir o Teams e voltar para pegar a URL - ou selecionar à mão
 * 300 caracteres no celular, que é onde ninguém acerta.
 */
async function copiar() {
    const url = props.action.linkEntrada;
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
    } catch {
        // Sem permissão de área de transferência (http, navegador antigo): o
        // caminho de sempre, que funciona em qualquer lugar.
        const campo = document.createElement('textarea');
        campo.value = url;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        try { document.execCommand('copy'); } finally { document.body.removeChild(campo); }
    }
    copiado.value = true;
    toast.success('Link copiado.');
    setTimeout(() => { copiado.value = false; }, 2500);
}
</script>

<template>
    <div class="mt-2">
        <article class="rounded-xl border bg-surface-raised p-3.5 shadow-soft"
            :class="action.previa ? 'border-data-warn/40' : 'border-accent/30'">

            <div class="flex items-start gap-3">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm"
                    :class="action.previa
                        ? 'border-data-warn/30 bg-data-warn-soft text-data-warn'
                        : 'border-accent/25 bg-accent-soft text-accent'">
                    <i :class="action.previa ? 'fas fa-clock' : 'fas fa-calendar-check'"></i>
                </span>

                <div class="min-w-0 flex-1">
                    <p class="text-micro font-semibold uppercase tracking-wide"
                        :class="action.previa ? 'text-data-warn' : 'text-accent'">
                        {{ action.previa ? 'Confirme antes de eu agendar' : 'Reunião agendada' }}
                    </p>
                    <p class="mt-0.5 text-sm font-semibold text-ink">{{ action.assunto }}</p>

                    <p class="mt-1 text-xs text-ink-muted">
                        <i class="fas fa-calendar-day mr-1 text-[0.65rem] text-ink-subtle"></i>
                        <span class="capitalize">{{ dia }}</span>
                        <span v-if="faixa"> · {{ faixa }}</span>
                        <span v-if="duracao" class="text-ink-subtle"> ({{ duracao }})</span>
                    </p>

                    <p class="mt-1 text-xs text-ink-muted">
                        <i class="fas fa-user-group mr-1 text-[0.65rem] text-ink-subtle"></i>
                        <template v-if="action.participantes?.length">
                            {{ action.participantes.join(', ') }}
                        </template>
                        <span v-else class="text-ink-subtle">sem convidados</span>
                    </p>

                    <p v-if="action.repete" class="mt-1 text-micro text-ink-subtle">
                        <i class="fas fa-rotate mr-1 text-[0.65rem]"></i>repete: {{ action.repete }}
                    </p>
                </div>
            </div>

            <!-- Entrar e copiar, lado a lado: quem vai participar clica no
                 primeiro; quem vai REPASSAR o link precisa do segundo, e antes
                 tinha que abrir a reunião só para pegar a URL. -->
            <div v-if="action.linkEntrada" class="mt-3 flex items-stretch gap-2">
                <button type="button" @click="entrar"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2
                           text-xs font-semibold text-white transition-all duration-200 ease-out-expo
                           hover:brightness-110 hover:-translate-y-px">
                    <i class="fas fa-video"></i> Entrar na reunião
                </button>
                <button type="button" @click="copiar" title="Copiar o link"
                    class="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2
                           text-xs font-medium transition-all duration-200 ease-out-expo"
                    :class="copiado
                        ? 'border-data-pos/40 bg-data-pos-soft text-data-pos'
                        : 'border-line text-ink-muted hover:border-accent/40 hover:text-accent'">
                    <i :class="copiado ? 'fas fa-check' : 'fas fa-copy'"></i>
                    <span class="hidden sm:inline">{{ copiado ? 'Copiado' : 'Copiar' }}</span>
                </button>
            </div>

            <!-- O link à vista, selecionável, para quem prefere pegar na mão. -->
            <p v-if="action.linkEntrada"
                class="mt-1.5 select-all break-all font-mono text-[0.65rem] leading-snug text-ink-subtle">
                {{ action.linkEntrada }}
            </p>

            <p v-else-if="action.previa" class="mt-3 text-micro text-ink-subtle">
                Responda "sim" para eu agendar. O convite sai no seu nome.
            </p>
        </article>

        <ChatAtalhos :atalhos="action.atalhos || []" :sugestoes="action.sugestoes || []" />
    </div>
</template>
