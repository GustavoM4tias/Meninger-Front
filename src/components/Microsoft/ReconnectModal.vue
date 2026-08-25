<script setup>
// "Sua conexão com a Microsoft caiu" — o modal que pede para reconectar.
//
// ELE QUASE NUNCA DEVE APARECER, e isso é o ponto - e "quase nunca" passou a
// ser garantido pelo SERVIDOR, não pela boa vontade do navegador: antes de
// abrir, ele reconfere o estado real em `/microsoft/auth/status`.
//
// O backend agora TENTA DE NOVO sozinho antes de desistir: piscada de rede, 503
// ou 429 da Microsoft não desconectam mais ninguém (até 24/08/2026, qualquer
// falha de renovação apagava o refresh_token e obrigava a relogar - foi assim
// que 19 contas ficaram sem token sem ninguém ter desvinculado nada).
//
// Então quando ISTO aparece, a autorização morreu de verdade: senha trocada,
// consentimento revogado, acesso condicional, MFA exigido. Nesses casos não há
// refresh que resolva - só a pessoa entrando de novo. Por isso o modal não tem
// "tentar de novo": seria um botão que já sabemos que não funciona.
//
// Ele também não é bloqueante. A pessoa pode fechar e continuar no Office: só o
// que depende da Microsoft é que não vai responder.

import { computed, ref, watch } from 'vue';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const ms = useMicrosoftStore();

// Fechado à mão nesta sessão: não insiste a cada rota. Volta a aparecer no
// próximo carregamento, porque o problema continua lá.
const dispensado = ref(false);

// ── Só abre com o SERVIDOR confirmando ──────────────────────────────────────
//
// `needsReconnect` podia ser marcado pelo palpite do navegador depois de
// qualquer erro de rede. Agora, antes de aparecer, o modal confere em
// `/microsoft/auth/status` - que lê o banco e responde `linked && !refresh_token`,
// a única verdade durável. Se o token ainda está lá, não há por que pedir
// relogin, e o modal não abre.
const confirmado = ref(false);

watch(() => ms.needsReconnect, async (precisa) => {
  if (!precisa) { confirmado.value = false; dispensado.value = false; return; }
  await ms.fetchStatus();
  confirmado.value = ms.needsReconnect === true;
}, { immediate: true });

const aberto = computed(() => confirmado.value && ms.needsReconnect && !dispensado.value && !ms.loading);

function reconectar() {
  ms.startLink();
}
</script>

<template>
  <Modal :open="aberto" size="sm" title="Sua conexão com a Microsoft caiu"
    @close="dispensado = true">

    <div class="space-y-3">
      <div class="flex items-start gap-3 p-3 rounded-xl border border-data-warn/30 bg-data-warn-soft">
        <i class="fab fa-microsoft text-data-warn mt-0.5 shrink-0"></i>
        <p class="text-xs text-ink-muted leading-relaxed">
          O Office renova a sua sessão da Microsoft sozinho, e continua tentando quando ela falha por
          instabilidade. <span class="font-semibold text-ink">Desta vez a autorização em si expirou</span> -
          o que costuma acontecer depois de troca de senha, revisão de acesso ou uma política nova de
          segurança. Renovar não resolve: é preciso entrar de novo.
        </p>
      </div>

      <div>
        <p class="text-micro font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
          O que para de funcionar até você reconectar
        </p>
        <ul class="text-xs text-ink-muted space-y-1">
          <li class="flex items-start gap-2">
            <i class="fas fa-calendar-days text-micro text-ink-subtle mt-1 w-3.5 shrink-0"></i>
            Agenda, reuniões e conversas do Teams
          </li>
          <li class="flex items-start gap-2">
            <i class="fas fa-folder-open text-micro text-ink-subtle mt-1 w-3.5 shrink-0"></i>
            SharePoint, OneDrive e Planner
          </li>
        </ul>
        <p class="text-micro text-ink-subtle mt-2 leading-relaxed">
          O e-mail continua funcionando: ele não depende desta sessão.
        </p>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" class="text-ink-subtle" @click="dispensado = true">Agora não</Button>
      <div class="flex-1"></div>
      <Button variant="primary" icon="fab fa-microsoft" :loading="ms.loading" @click="reconectar">
        Reconectar minha conta
      </Button>
    </template>
  </Modal>
</template>
