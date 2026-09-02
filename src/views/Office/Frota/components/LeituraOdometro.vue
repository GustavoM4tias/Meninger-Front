<script setup>
/* O campo do odômetro, com leitura por foto.
 *
 * POR QUE A FOTO
 *
 * Digitar seis dígitos de pé, no estacionamento, é onde o erro entra. E um km
 * errado não estraga só aquela linha: ele vira o piso da próxima leitura e
 * contamina a quilometragem de todas as viagens seguintes. A pessoa fotografa o
 * painel, a IA lê e preenche - ela só confere.
 *
 * A LEITURA É SUGESTÃO, NUNCA DECISÃO
 *
 * O número entra no campo e fica editável. Se a IA errar, a pessoa corrige; se
 * a IA não conseguir ler, o campo continua lá para digitar. E o valor passa
 * pelas mesmas regras de consistência do número digitado - a origem não muda a
 * lei.
 */
import { ref, computed } from 'vue';
import { compressImage } from '@/utils/Checklist/imageCompress';
import { lerOdometroFoto } from '@/utils/Frota/apiFrota';
import { mensagemDeErro } from '@/utils/mensagemDeErro';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    modelValue: { type: [String, Number], default: '' },
    label: { type: String, default: 'KM do odômetro' },
    piso: { type: Number, default: 0 },          // última leitura conhecida
    pisoRotulo: { type: String, default: 'Última leitura registrada' },
    kmMaxDia: { type: Number, default: 1000 },
    desde: { type: [String, Date], default: null },
    obrigatorio: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue']);

const inputRef = ref(null);
const lendo = ref(false);
const erro = ref('');
const lida = ref(null);

const valor = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
});

/* As mesmas duas regras que o servidor aplica, aqui só para avisar antes:
   quem decide continua sendo a API. */
const problema = computed(() => {
    if (valor.value === '' || valor.value === null) return '';
    const km = Number(valor.value);
    if (!Number.isFinite(km)) return 'Informe só números.';

    if (props.piso && km < props.piso) {
        return `O odômetro não anda para trás: a última leitura foi ${props.piso.toLocaleString('pt-BR')} km. `
            + 'Confira se você leu o hodômetro total, e não o parcial.';
    }

    if (props.piso) {
        const msDia = 86400000;
        const dias = props.desde
            ? Math.max(1, Math.ceil((Date.now() - new Date(props.desde).getTime()) / msDia))
            : 1;
        const rodado = km - props.piso;
        if (rodado > dias * props.kmMaxDia) {
            return `Isso daria ${rodado.toLocaleString('pt-BR')} km em ${dias} dia(s), acima do limite de `
                + `${props.kmMaxDia.toLocaleString('pt-BR')} km por dia. Confira o número.`;
        }
    }
    return '';
});

defineExpose({ problema });

function abrirCamera() {
    erro.value = '';
    inputRef.value?.click();
}

async function aoEscolher(evento) {
    const arquivo = (evento.target.files || [])[0];
    evento.target.value = '';
    if (!arquivo) return;

    lendo.value = true;
    erro.value = '';
    lida.value = null;

    try {
        const comprimida = await compressImage(arquivo, { maxDim: 1280, quality: 0.8, type: 'image/jpeg' });
        const base64 = await new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload = () => resolve(String(leitor.result).split(',').pop());
            leitor.onerror = () => reject(new Error('Não consegui ler a foto do aparelho.'));
            leitor.readAsDataURL(comprimida);
        });

        const r = await lerOdometroFoto({ base64, mime_type: comprimida.type || 'image/jpeg' });
        if (r?.km) {
            valor.value = String(r.km);
            lida.value = r;
        } else {
            erro.value = r?.observacao || 'Não consegui ler o painel. Digite o número.';
        }
    } catch (e) {
        erro.value = mensagemDeErro(e, 'Não consegui ler o painel. Digite o número.');
    } finally {
        lendo.value = false;
    }
}
</script>

<template>
  <div>
    <div class="flex items-end gap-2">
      <Input v-model="valor" type="number" inputmode="numeric" step="1" :min="piso || 0"
             :label="label" :required="obrigatorio" class="flex-1"
             :hint="piso ? `${pisoRotulo}: ${piso.toLocaleString('pt-BR')} km` : ''" />
      <Button variant="secondary" icon="fas fa-camera" :loading="lendo"
              class="shrink-0 min-h-[40px]" @click="abrirCamera">
        <span class="hidden sm:inline">Ler da foto</span>
      </Button>
    </div>

    <input ref="inputRef" type="file" accept="image/*" capture="environment"
           class="hidden" @change="aoEscolher" />

    <p v-if="lendo" class="mt-1 text-sm text-ink-muted">
      <i class="fas fa-circle-notch fa-spin"></i> Lendo o painel...
    </p>

    <!-- Confiança baixa merece um olhar a mais, não um bloqueio: a pessoa está
         vendo o painel de verdade e decide melhor que a IA. -->
    <p v-else-if="lida" class="mt-1 text-sm"
       :class="lida.confianca >= 0.7 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
      <i class="fas" :class="lida.confianca >= 0.7 ? 'fa-circle-check' : 'fa-triangle-exclamation'"></i>
      {{ lida.confianca >= 0.7
        ? 'Número lido da foto. Confira antes de continuar.'
        : 'Leitura incerta. Confira o número com atenção.' }}
    </p>

    <p v-if="problema" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ problema }}</p>
    <p v-else-if="erro" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ erro }}</p>
  </div>
</template>
