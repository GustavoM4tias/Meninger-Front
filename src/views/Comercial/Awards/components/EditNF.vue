<template>
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <h3 class="text-lg font-semibold mb-4">
                Editar NF #{{ form.id }}
            </h3>

            <div class="grid grid-cols-2 gap-4">

                <div>
                    <label class="text-xs font-medium">Número NF</label>
                    <input v-model="form.nfNumber" class="border rounded px-2 py-1 w-full" />
                </div>

                <div>
                    <label class="text-xs font-medium">Data Emissão</label>
                    <input type="date" v-model="form.nfIssueDate" class="border rounded px-2 py-1 w-full" />
                </div>

                <div class="col-span-2">
                    <label class="text-xs font-medium">Prestador</label>
                    <input v-model="form.providerName" class="border rounded px-2 py-1 w-full" />
                </div>

                <div class="col-span-2">
                    <label class="text-xs font-medium">CNPJ Prestador</label>
                    <input v-model="form.providerCnpj" class="border rounded px-2 py-1 w-full" />
                </div>

                <div class="col-span-2">
                    <label class="text-xs font-medium">Tomador</label>
                    <input v-model="form.customerName" class="border rounded px-2 py-1 w-full" />
                </div>

                <div class="col-span-2">
                    <label class="text-xs font-medium">Valor Total</label>
                    <input v-model="form.totalAmount" class="border rounded px-2 py-1 w-full" />
                </div>

            </div>

            <div class="mt-6 flex justify-end gap-2">
                <button @click="$emit('close')" class="border px-4 py-2 rounded">Cancelar</button>
                <button @click="save" class="bg-primary text-white px-4 py-2 rounded">
                    Salvar
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive } from "vue"
import { useAwardsStore } from "@/stores/Comercial/Awards/awardStore"

const props = defineProps({ award: Object })
const emit = defineEmits(["close"])

const awardsStore = useAwardsStore()

const form = reactive({ ...props.award })

const save = async () => {
    await awardsStore.updateAward(form)
    emit("close")
}
</script>
