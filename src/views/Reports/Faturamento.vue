<!-- src/components/Faturamento.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { useContratosStore } from '@/stores/Reports/Contracts/contractStore';
import dayjs from 'dayjs';

const store = useContratosStore();

const filtros = ref({
    companyId: '',
    enterpriseId: '',
    enterpriseName: '',
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    linkedEnterprises: []  // ex: ['10101:18004']
});

const aplicar = () => store.fetchContratos(filtros.value);
onMounted(aplicar);
</script>

<template>
    <div class="container">

    <form @submit.prevent="aplicar" class="flex gap-2">
        <input v-model="filtros.companyId" placeholder="Empresa" class="input" />
        <input v-model="filtros.enterpriseId" placeholder="Empreendimento" class="input" />
        <input v-model="filtros.enterpriseName" placeholder="Nome Empreendimento" class="input" />
        <input v-model="filtros.startDate" type="date" class="input" />
        <input v-model="filtros.endDate" type="date" class="input" />
        <input v-model="filtros.linkedEnterprises" placeholder="Vincular (ex: 10101:18004,78001:17004)" class="input" />
        <button type="submit" class="btn">Buscar</button>
    </form>

    <div v-if="store.error" class="text-red-600">{{ store.error }}</div>
    <div v-else>
        <p>Total de grupos: {{ store.count }}</p>
        <ul>
            <li v-for="grp in store.contratos" :key="grp.customerId + '-' + grp.groupEnterprise">
                <strong>{{ grp.customerName }}</strong>
                (grc: {{ grp.groupEnterprise }} | contratos: {{ grp.contracts.length }})
                <ul>
                    <li v-for="c in grp.contracts" :key="c.id">
                        #{{ c.enterpriseId }} – {{ c.financialInstitutionDate }} – {{ c.enterpriseName }} - {{ c.totalSellingValue}}
                    </li>
                </ul>
            </li>
        </ul>
    </div>
    </div>
</template> 