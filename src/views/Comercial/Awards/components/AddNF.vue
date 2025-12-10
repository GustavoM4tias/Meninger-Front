<template>
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h3 class="text-lg font-semibold mb-4">
                Anexar NF para {{ award.customerName }}
            </h3>

            <input type="file" @change="onFile" accept=".xml,.pdf" class="border p-2 rounded w-full" />

            <div class="mt-6 flex justify-end gap-2">
                <button @click="$emit('close')" class="border px-4 py-2 rounded">Cancelar</button>
                <button @click="submit" :disabled="!file"
                    class="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                    Enviar NF
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue"
import { useAwardsStore } from "@/stores/Comercial/Awards/awardStore"

const props = defineProps({ award: Object })
const emit = defineEmits(["close"])

const awardsStore = useAwardsStore()
const file = ref(null)

const onFile = (e) => file.value = e.target.files[0]

const submit = async () => {
    await awardsStore.attachNfToAward(props.award.id, file.value)
    emit("close")
}
</script>
