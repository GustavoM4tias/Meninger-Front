<script setup>
// Pergunta da Eme com opções clicáveis. Fica acima do campo de mensagem, para
// a dúvida não se perder no meio do texto do chat: um clique responde e a
// montagem continua de onde parou.
defineProps({
  ask: { type: Object, required: true }, // { question, options, context }
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['answer'])
</script>

<template>
  <div class="mx-3 mb-2 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5">
    <p class="flex items-start gap-2 text-sm text-ink">
      <i class="fas fa-circle-question text-accent mt-0.5 flex-shrink-0" />
      <span class="min-w-0">{{ ask.question }}</span>
    </p>
    <p v-if="ask.context" class="mt-1 pl-6 text-[11px] text-ink-muted">{{ ask.context }}</p>

    <div v-if="ask.options?.length" class="mt-2 pl-6 flex flex-wrap gap-1.5">
      <button
        v-for="(opt, i) in ask.options" :key="i"
        type="button"
        class="px-2.5 py-1.5 rounded-full border border-accent/50 bg-surface text-xs text-ink hover:bg-accent hover:text-white hover:border-accent transition disabled:opacity-40 min-h-[32px]"
        :disabled="disabled"
        @click="emit('answer', opt)"
      >{{ opt }}</button>
    </div>
    <p v-else class="mt-1 pl-6 text-[11px] text-ink-subtle">Responda abaixo para a Eme continuar.</p>
  </div>
</template>
