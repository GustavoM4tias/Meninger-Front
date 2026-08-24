<script setup>
// PORTEIRO do mural: quem tem a vez de aparecer sobre a tela.
//
// Antes deste componente, três coisas decidiam sozinhas aparecer na abertura do
// Office — o card de comunicados, o convite para instalar o app e, agora, o
// aviso do sino. No pior caso a pessoa abria o sistema e levava três
// interrupções ao mesmo tempo, nenhuma delas sabendo da outra. Uma fila com
// UMA saída é o que separa "mural" de "mais um popup".
//
// A ordem é por custo de errar, não por quem chegou antes:
//
//   1. COMUNICADO OBRIGATÓRIO  gente falando com gente, com ciência registrada.
//                              Quem cuida da tela é o MuralFloatingCard; aqui
//                              só seguramos os outros enquanto ele existe.
//   2. NOVIDADE DA PLATAFORMA  o que mudou no sistema desde a última visita.
//   3. AÇÃO SUA                instalar o app, autorizar o aviso. Só entra o
//                              que a PESSOA resolve — a permissão da Microsoft
//                              foi removida do Office justamente por falhar
//                              nesse teste: quem concede é o administrador do
//                              tenant, não quem estava na tela.
//
// Os toasts do sino ficam FORA da fila de propósito: são o canto da tela, não
// o meio dela, e não pedem decisão nenhuma.
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMuralStore } from '@/stores/Mural/muralStore';
import { usePlatformUpdatesStore } from '@/stores/Platform/platformUpdatesStore';
import NovidadesModal from './NovidadesModal.vue';
import PwaInstallPrompt from '@/components/Pwa/InstallPrompt.vue';

// Espera a tela pintar antes de interromper. Mesmo atraso do toaster: abrir o
// Office e já levar um modal na cara é pior que esperar um segundo e meio.
const ATRASO_BOOT_MS = 1500;

const auth = useAuthStore();
const mural = useMuralStore();
const updates = usePlatformUpdatesStore();

const liberado = ref(false);
const novidadesAbertas = ref(false);

// Comunicado obrigatório em aberto — o card flutuante está na tela por conta
// dele. Vale também quando o painel foi fechado sem ciência: a pendência
// continua, e enfileirar outra coisa em cima seria empilhar decisão.
const temComunicado = computed(() => mural.ackPendingCount > 0);

// Externo (corretor, imobiliária, correspondente) entra pelo mesmo login e não
// recebe novidade da plataforma - o que muda no Office é assunto de dentro de
// casa, e a API responde 403 pelo mesmo motivo. O convite para instalar o app
// continua valendo para ele. O sinal é auth_provider/external_kind, NUNCA o
// domínio do e-mail.
const externo = computed(() => {
  const u = auth.user || {};
  return String(u.auth_provider || 'INTERNAL').toUpperCase() === 'CVCRM' || !!u.external_kind;
});

const vez = computed(() => {
  if (!liberado.value) return null;
  if (externo.value) return 'acao';
  if (!updates.carregado) return null;
  if (temComunicado.value) return 'comunicado';
  if (updates.temNovidade) return 'novidade';
  return 'acao';
});

// Novidade aparece UMA vez por sessão: quem fechou não recebe de novo ao dar
// ciência num comunicado ou ao trocar de tela.
const novidadesMostradas = ref(false);

onMounted(async () => {
  if (!auth.user) await auth.fetchUserInfo?.();
  if (!externo.value) await updates.fetchState();
  setTimeout(() => { liberado.value = true; }, ATRASO_BOOT_MS);
});

// Abre quando CHEGAR a vez, e não só no instante do boot: quem tinha um
// comunicado obrigatório para dar ciência veria a vez passar enquanto lia o
// comunicado, e a novidade só apareceria na próxima vez que abrisse o Office.
watch(vez, (atual) => {
  if (atual === 'novidade' && !novidadesMostradas.value) {
    novidadesMostradas.value = true;
    novidadesAbertas.value = true;
  }
}, { immediate: true });

// Fechar as novidades libera a vez para a ação seguinte na MESMA sessão: quem
// acabou de ler a novidade do aplicativo é exatamente quem deveria receber o
// convite para instalá-lo.
const fecharNovidades = () => { novidadesAbertas.value = false; };
</script>

<template>
  <NovidadesModal :open="novidadesAbertas" @close="fecharNovidades" />

  <!-- O convite de instalação decide sozinho se tem algo a pedir (aparelho,
       permissão, dispensa). Aqui só controlamos QUANDO ele pode perguntar. -->
  <PwaInstallPrompt v-if="vez === 'acao' && !novidadesAbertas" />
</template>
