<!-- src/views/Office/layouts/OfficeShell.vue -->
<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Button from '@/components/UI/Button.vue';

import Nav from '@/components/Navigation/Nav.vue'; 
import Carregamento from '@/components/Loading/Carregamento.vue';
import InPersonRecordingBar from '@/components/InPersonRecordingBar.vue';
import MuralFloatingCard from '@/components/Mural/MuralFloatingCard.vue';
import PwaInstallPrompt from '@/components/Pwa/InstallPrompt.vue';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isAuthenticated = computed(() => authStore.isAuthenticated());

/* Aviso de "não deu para avaliar sua alçada".
   O guard manda para cá quem tentou abrir uma tela enquanto a API não
   respondia (ver DESIGN-LANGUAGE, "Sessão e acesso"). Sem este aviso a pessoa
   clica em Alçadas, aparece na home e não entende por quê - e abre chamado
   achando que perdeu o acesso. */
const indisponivel = computed(() => route.query.indisponivel === '1');
const rotaPretendida = computed(() => String(route.query.de || ''));

function tentarDeNovo() {
  const destino = rotaPretendida.value;
  dispensar();
  if (destino) router.push(destino);
}

function dispensar() {
  const q = { ...route.query };
  delete q.indisponivel;
  delete q.de;
  router.replace({ path: route.path, query: q });
}
</script>

<template>
    <!-- Office: não-autenticado -->
    <div v-if="!isAuthenticated" class="flex w-full">
        <router-view />
        <Carregamento />
    </div>

    <!-- Office: autenticado -->
    <div v-else class="flex w-full">
        <main class="flex flex-col h-dvh w-full md:overflow-hidden">
            <div class="flex">
                <Nav />

                <div
                    class="flex flex-1 mt-16 sm:mt-12 w-full h-auto md:h-[calc(100dvh-3rem)] break-words overflow-auto">
                    <!-- md:h-full dá altura definida ao wrapper: páginas que querem scroll
                         próprio (ex.: ficha comercial) usam h-full e preenchem exatamente a
                         área útil; páginas normais continuam crescendo e rolando aqui. -->
                    <div class="w-full max-w-full md:h-full">
                        <!-- Negou, explica e oferece a saída. A sessão continua
                             de pé: isso precisa estar escrito, senão o silêncio
                             parece perda de acesso. -->
                        <div v-if="indisponivel" class="px-4 pt-4 sm:px-6">
                            <div class="panel border-data-warn/30 bg-data-warn-soft p-3 sm:p-4
                                        flex flex-col sm:flex-row sm:items-center gap-3">
                                <i class="fas fa-plug-circle-exclamation text-data-warn mt-0.5 shrink-0"></i>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm text-data-warn">
                                        Não foi possível confirmar sua alçada agora.
                                        <b>Você continua conectado</b> - tente de novo em instantes.
                                    </p>
                                    <p v-if="rotaPretendida" class="text-micro text-data-warn/80 mt-0.5 truncate">
                                        Tela pretendida: <span class="font-mono">{{ rotaPretendida }}</span>
                                    </p>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <Button v-if="rotaPretendida" size="sm" variant="secondary"
                                        icon="fas fa-rotate-right" @click="tentarDeNovo">
                                        Tentar de novo
                                    </Button>
                                    <Button size="sm" variant="ghost" icon="fas fa-xmark"
                                        @click="dispensar">
                                        <span class="hidden sm:inline">Dispensar</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <router-view />
                    </div>
                </div>
            </div>
        </main>
 
        <InPersonRecordingBar />
        <MuralFloatingCard />
        <!-- Convite para instalar o app. Só aparece para quem ainda não instalou
             NESTE aparelho, uma vez por sessão, e some de vez se a pessoa
             marcar o checkbox. Fica só no ramo autenticado. -->
        <PwaInstallPrompt />
        <Carregamento />
    </div>
</template>
