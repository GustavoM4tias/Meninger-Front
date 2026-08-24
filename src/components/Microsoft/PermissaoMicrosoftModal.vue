<script setup>
// Aviso de permissão da Microsoft que falta.
//
// Antes, permissão faltando chegava como "Permissão insuficiente. Código:
// ErrorAccessDenied" - que não diz o que liberar, para quem pedir nem onde. A
// pessoa desistia da funcionalidade e ninguém ficava sabendo que bastava marcar
// uma linha no portal do Azure.
//
// Este aviso aparece SEMPRE que a operação bloqueada for tentada. Não tem
// "não mostrar de novo" de propósito: enquanto a permissão não for concedida, a
// funcionalidade não funciona, e o lembrete é o que faz a liberação acontecer.
//
// Ele não bloqueia nada por conta própria - a ação já falhou no servidor. O que
// ele faz é explicar a falha e dar o caminho.

import { ref, onMounted, onUnmounted } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const aberto = ref(false);
const info = ref(null);
const copiado = ref(false);

function abrir(e) {
  const p = e?.detail;
  if (!p?.nome) return;
  info.value = p;
  copiado.value = false;
  aberto.value = true;
}

async function copiarLink() {
  try {
    await navigator.clipboard.writeText(info.value?.portal || '');
    copiado.value = true;
    setTimeout(() => { copiado.value = false; }, 2500);
  } catch { /* navegador sem clipboard: o link fica visível para copiar à mão */ }
}

onMounted(()   => window.addEventListener('microsoft:permissao', abrir));
onUnmounted(() => window.removeEventListener('microsoft:permissao', abrir));
</script>

<template>
  <Modal :open="aberto" size="md" @close="aberto = false">
    <template #header>
      <div class="flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-lg bg-data-warn/15 grid place-items-center shrink-0">
          <i class="fas fa-lock text-data-warn text-sm"></i>
        </span>
        <div>
          <h2 class="text-base font-bold text-ink leading-tight">Falta uma permissão da Microsoft</h2>
          <p class="text-micro text-ink-subtle">Esta parte fica indisponível até alguém liberar</p>
        </div>
      </div>
    </template>

    <div v-if="info" class="space-y-4">
      <p class="text-sm text-ink-muted">{{ info.destrava }}</p>

      <div class="rounded-xl border border-line bg-surface-sunken p-3">
        <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-1">Permissão que falta</p>
        <p class="font-mono text-sm text-ink break-all">{{ info.nome }}</p>
        <p class="text-micro text-ink-muted mt-1">
          Tipo <strong>{{ info.tipo }}</strong>.
          <span v-if="info.tipo === 'Aplicação'">
            Entrar com a conta Microsoft não concede este tipo - ele é do app, não da pessoa.
          </span>
          <span v-else>
            Ela entra no seu acesso na próxima vez que você entrar no Office.
          </span>
        </p>
      </div>

      <div v-if="info.alem" class="rounded-xl border border-data-warn/25 bg-data-warn/10 p-3">
        <p class="text-xs text-data-warn">{{ info.alem }}</p>
      </div>

      <div>
        <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">Onde liberar</p>
        <p class="text-sm text-ink-muted mb-2">
          No portal do Azure, no app <span class="font-mono text-xs">AppGraphMenin</span>, em
          <strong>Permissões de API</strong>: adicionar a permissão acima com o tipo certo e clicar em
          <strong>Conceder consentimento do administrador</strong>. Precisa de Administrador Global.
        </p>
        <div class="flex items-center gap-2">
          <a :href="info.portal" target="_blank" rel="noopener" class="flex-1 min-w-0">
            <Button variant="primary" icon="fas fa-arrow-up-right-from-square" class="w-full">
              Abrir no portal
            </Button>
          </a>
          <Button variant="outline" :icon="copiado ? 'fas fa-check' : 'fas fa-link'" @click="copiarLink">
            {{ copiado ? 'Copiado' : 'Copiar link' }}
          </Button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="aberto = false">Entendi</Button>
    </template>
  </Modal>
</template>
