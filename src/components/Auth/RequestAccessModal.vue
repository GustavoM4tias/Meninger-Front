<script setup>
// "Solicite acesso" da tela de login: mesmo formulário do primeiro acesso
// Microsoft, mas SEM conta Microsoft. Cai direto na fila de aprovação do
// gestor; a senha de acesso chega por e-mail quando o cadastro for liberado.
import { ref, watch } from 'vue';
import { getSignupOptions, requestSignup } from '@/utils/Auth/apiAuth';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open']);

const emptyForm = () => ({ username: '', email: '', birth_date: '', phone: '', department_id: '', city: '' });
const form = ref(emptyForm());

const departmentsOptions = ref([]);
const citiesOptions = ref([]);
const loading = ref(false);
const error = ref('');
const sent = ref(false);

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;
  sent.value = false;
  error.value = '';
  form.value = emptyForm();
  try {
    const data = await getSignupOptions();
    departmentsOptions.value = (Array.isArray(data.departments) ? data.departments : [])
      .map(d => ({ label: d.name, value: String(d.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    citiesOptions.value = (Array.isArray(data.cities) ? data.cities : [])
      .map(c => ({ label: c.uf ? `${c.name} - ${c.uf}` : c.name, value: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (e) {
    console.error('[RequestAccess] Erro ao carregar opções:', e);
    error.value = 'Não foi possível carregar as opções de cadastro. Feche e tente novamente.';
  }
});

async function submit() {
  error.value = '';
  const f = form.value;
  if (!f.username?.trim() || !f.email?.trim() || !f.birth_date || !f.department_id || !f.city) {
    error.value = 'Preencha todos os campos obrigatórios.';
    return;
  }
  loading.value = true;
  try {
    await requestSignup({
      username: f.username.trim(),
      email: f.email.trim(),
      birth_date: f.birth_date,
      phone: f.phone || null,
      department_id: Number(f.department_id),
      city: f.city,
    });
    sent.value = true;
  } catch (e) {
    error.value = e?.message || 'Erro ao enviar o cadastro. Tente novamente.';
  } finally {
    loading.value = false;
  }
}

function close() { emit('update:open', false); }
</script>

<template>
  <Modal :open="open" size="md" @close="close">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-user-plus text-sm"></i>
        </div>
        <div>
          <h3 class="text-base font-semibold text-ink">Solicitar acesso</h3>
          <p class="text-xs text-ink-muted mt-0.5">Seu cadastro passa pela aprovação do gestor responsável</p>
        </div>
      </div>
    </template>

    <!-- Enviado -->
    <div v-if="sent" class="text-center py-4">
      <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <i class="fas fa-user-clock text-lg"></i>
      </div>
      <h4 class="text-base font-semibold text-ink mb-2">Cadastro enviado!</h4>
      <p class="text-sm text-ink-muted">
        Sua solicitação está passando pela aprovação do gestor responsável.
        Assim que for liberada, você receberá um <strong class="text-ink">e-mail</strong> com as
        instruções e a senha de acesso.
      </p>
    </div>

    <!-- Formulário -->
    <form v-else @submit.prevent="submit" class="space-y-4">
      <Input v-model="form.username" type="text" label="Nome completo" placeholder="Seu nome completo"
        iconLeft="fas fa-user" required />
      <Input v-model="form.email" type="email" label="E-mail" placeholder="seu@email.com"
        iconLeft="fas fa-envelope" required />

      <div class="grid grid-cols-2 gap-3">
        <Input v-model="form.birth_date" type="date" label="Nascimento" required />
        <Input v-model="form.phone" type="tel" label="Telefone (DDD)" placeholder="(11) 99999-9999" />
      </div>

      <Select v-model="form.department_id" :options="departmentsOptions"
        label="Departamento" placeholder="Selecione seu departamento" required />

      <Select v-model="form.city" :options="citiesOptions"
        label="Cidade" placeholder="Selecione sua cidade" required />

      <p class="text-xs text-ink-muted flex items-start gap-1.5">
        <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
        <span>Após enviar, seu cadastro passa pela aprovação do gestor responsável.
        Você receberá um e-mail com a senha de acesso quando for liberado.</span>
      </p>

      <Transition name="fade">
        <p v-if="error" class="text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>{{ error }}
        </p>
      </Transition>
    </form>

    <template #footer>
      <template v-if="sent">
        <Button block @click="close">Entendi</Button>
      </template>
      <template v-else>
        <Button variant="ghost" :disabled="loading" @click="close">Cancelar</Button>
        <Button icon="fas fa-paper-plane" :loading="loading" @click="submit">
          {{ loading ? 'Enviando...' : 'Enviar cadastro' }}
        </Button>
      </template>
    </template>
  </Modal>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
