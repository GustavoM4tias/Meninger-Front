<script setup>
/* As fotos do estado do veículo, na retirada e na devolução.
 *
 * COMPRIME ANTES DE SUBIR
 *
 * Foto de celular sai com 4 a 8 MB. Sem tratamento, cada viagem deixaria uns 30
 * MB no armazenamento e o histórico do carro viraria uma galeria pesada demais
 * para abrir - além de fazer a pessoa esperar o upload de pé no estacionamento,
 * que é exatamente onde ela desiste do sistema. Redimensiona para 1600px e
 * reexporta em WebP: a mesma foto cai para algo em torno de 200 kB, e a marca
 * na lataria continua visível.
 *
 * SOBE UMA POR UMA, NA HORA
 *
 * Cada foto sobe assim que é escolhida, e não junto do formulário. Assim a
 * pessoa vê o progresso e uma falha de rede custa uma foto, não o formulário
 * inteiro preenchido.
 */
import { ref, computed } from 'vue';
import { compressImage } from '@/utils/Checklist/imageCompress';
import { subirFoto } from '@/utils/Frota/apiFrota';
import { mensagemDeErro } from '@/utils/mensagemDeErro';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    vehicleId: { type: [Number, String], default: null },
    reservationId: { type: [Number, String], default: null },
    momento: { type: String, default: 'saida' },   // saida | chegada
    minimo: { type: Number, default: 1 },
    sugestoes: {
        type: Array,
        default: () => ['Frente', 'Traseira', 'Lateral esquerda', 'Lateral direita', 'Painel', 'Interior'],
    },
});

const emit = defineEmits(['update:modelValue']);

const inputRef = ref(null);
const enviando = ref(false);
const erro = ref('');
const progresso = ref('');

const fotos = computed(() => props.modelValue || []);
const faltam = computed(() => Math.max(0, props.minimo - fotos.value.length));

function abrirSeletor() {
    erro.value = '';
    inputRef.value?.click();
}

async function aoEscolher(evento) {
    const arquivos = Array.from(evento.target.files || []);
    // Limpa o input para a mesma foto poder ser escolhida de novo depois de
    // removida (o navegador não dispara change para valor idêntico).
    evento.target.value = '';
    if (!arquivos.length) return;

    enviando.value = true;
    erro.value = '';

    try {
        for (const [i, arquivo] of arquivos.entries()) {
            progresso.value = arquivos.length > 1 ? `Enviando ${i + 1} de ${arquivos.length}...` : 'Enviando...';

            const comprimida = await compressImage(arquivo, { maxDim: 1600, quality: 0.72, type: 'image/webp' });
            const base64 = await paraBase64(comprimida);

            const foto = await subirFoto({
                base64,
                mime_type: comprimida.type || 'image/webp',
                vehicle_id: props.vehicleId,
                reservation_id: props.reservationId,
                momento: props.momento,
                indice: fotos.value.length + i,
            });

            emit('update:modelValue', [...(props.modelValue || []), foto]);
        }
    } catch (e) {
        erro.value = mensagemDeErro(e, 'Não foi possível enviar a foto.');
    } finally {
        enviando.value = false;
        progresso.value = '';
    }
}

function paraBase64(blob) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result).split(',').pop());
        leitor.onerror = () => reject(new Error('Não consegui ler a foto do aparelho.'));
        leitor.readAsDataURL(blob);
    });
}

/* Só tira da lista. O arquivo fica no armazenamento até alguém limpar: apagar
   aqui exigiria confiar no cliente para remover objeto do bucket, e o custo de
   um arquivo esquecido é menor que o de uma foto sumindo por engano. */
function remover(indice) {
    const restantes = (props.modelValue || []).filter((_, i) => i !== indice);
    emit('update:modelValue', restantes);
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink">
          Fotos do veículo
          <span v-if="minimo > 0" class="text-red-500">*</span>
        </p>
        <p class="text-micro text-ink-subtle">
          {{ sugestoes.join(' · ') }}
        </p>
      </div>
      <Button size="sm" variant="secondary" icon="fas fa-camera" :loading="enviando"
              class="shrink-0 min-h-[40px]" @click="abrirSeletor">
        Adicionar
      </Button>
    </div>

    <!-- `capture` faz o celular abrir a câmera traseira direto, em vez da
         galeria: a foto que interessa é a do carro que está na frente. -->
    <input ref="inputRef" type="file" accept="image/*" capture="environment"
           multiple class="hidden" @change="aoEscolher" />

    <div v-if="fotos.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <div v-for="(foto, i) in fotos" :key="foto.path || i"
           class="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-sunken">
        <img :src="foto.url" alt="Foto do veículo" class="h-full w-full object-cover" loading="lazy" />
        <!-- 40px de alvo: quem remove uma foto errada está de pé, no
             estacionamento, com uma mão só. -->
        <button type="button" aria-label="Remover foto"
                class="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full
                       border border-line bg-surface-overlay text-ink shadow-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                @click="remover(i)">
          <i class="fas fa-xmark text-xs"></i>
        </button>
      </div>
    </div>

    <p v-if="progresso" class="mt-2 text-sm text-ink-muted">
      <i class="fas fa-circle-notch fa-spin"></i> {{ progresso }}
    </p>

    <p v-else-if="faltam > 0" class="mt-2 text-sm text-amber-700 dark:text-amber-400">
      <i class="fas fa-triangle-exclamation"></i>
      {{ faltam === 1 ? 'Falta 1 foto' : `Faltam ${faltam} fotos` }} para continuar.
    </p>

    <p v-else-if="fotos.length" class="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
      <i class="fas fa-circle-check"></i>
      {{ fotos.length === 1 ? '1 foto anexada' : `${fotos.length} fotos anexadas` }}.
    </p>

    <p v-if="erro" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
  </div>
</template>
