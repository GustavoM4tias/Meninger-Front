<template>
    <div v-if="showExcel" class="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50"
        @click.self="closeExcel">
        <div class="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 w-11/12 max-w-md shadow-lg">
            <header class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Exportar Reservas</h2>
                <button @click="closeExcel" class="text-gray-500 hover:text-gray-400">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </header>

            <div class="mb-4">
                <label class="block font-medium mb-1">Nome do arquivo</label>
                <input v-model="fileName" type="text" placeholder="relatorio_reservas"
                    class="w-full px-3 py-2 rounded-lg dark:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300" />
            </div>

            <div class="mb-4">
                <span class="block font-medium mb-1">Selecionar campos</span>
                <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-400 rounded-lg p-4">
                    <label v-for="field in allFields" :key="field.key" class="inline-flex items-center">
                        <input type="checkbox" v-model="selectedKeys" :value="field.key"
                            class="form-checkbox h-5 w-5 text-blue-600" />
                        <span class="ml-2">{{ field.label }}</span>
                    </label>
                </div>
            </div>

            <div class="mb-6">
                <span class="block font-medium mb-1">Formato</span>
                <div class="flex gap-4">
                    <label class="inline-flex items-center">
                        <input type="radio" value="excel" v-model="format" class="form-radio h-5 w-5 text-blue-600" />
                        <span class="ml-2">Excel (.xlsx)</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" value="csv" v-model="format" class="form-radio h-5 w-5 text-blue-600" />
                        <span class="ml-2">CSV (.csv)</span>
                    </label>
                </div>
            </div>

            <footer class="flex justify-end gap-3">
                <button @click="onExport"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Exportar
                </button>
            </footer>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const props = defineProps({
    reservas: {
        type: Array,
        required: true,
    },
    showExcel: {
        type: Boolean,
        required: true,
    },
})
const emit = defineEmits(['closeExcel'])

// Definição dos campos disponíveis
const allFields = [
    { key: 'idReserva', label: 'ID Reserva' },
    { key: 'idAnalise', label: 'ID Pré Cadastro' },
    { key: 'idlead', label: 'ID do Lead' },
    { key: 'dataVenda', label: 'Data da Venda' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'documento_tipo', label: 'Tipo de Documento' },
    { key: 'documento', label: 'Documento' },
    { key: 'cep', label: 'CEP' },
    { key: 'nacionalidade', label: 'Nacionalidade' },
    { key: 'estado', label: 'Estado' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'numero', label: 'Número' },
    { key: 'estado_civil', label: 'Estado Civil' },
    { key: 'porcentagem', label: 'Porcentagem' },
    { key: 'profissao', label: 'Profissão' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'email', label: 'E-mail' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'corretor', label: 'Corretor' },
    { key: 'imobiliaria', label: 'Imobiliária' },
    { key: 'correspondente', label: 'Correspondente' },
    { key: 'valorContrato', label: 'Valor do Contrato' },
    { key: 'valorVenda', label: 'Valor de Venda' },
    { key: 'vgvTabela', label: 'VGV Tabela' },
    { key: 'situacao', label: 'Situação' },
    { key: 'empreendimento', label: 'Empreendimento' },
    { key: 'etapa', label: 'Etapa' },
    { key: 'bloco', label: 'Bloco' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'area_terreno', label: 'Área do Terreno' },
    { key: 'area_privativa', label: 'Área Privativa' },
    { key: 'fracao_ideal', label: 'Fração Ideal' },
    { key: 'vendida', label: 'Vendida' },
];

// Estado reativo
const fileName = ref('relatorio_reservas')
const selectedKeys = ref([])
const format = ref('excel')

// Carregar preferências do storage
onMounted(() => {
    const saved = localStorage.getItem('exportPrefs')
    if (saved) {
        const { keys, fmt } = JSON.parse(saved)
        selectedKeys.value = keys
        format.value = fmt
    } else {
        // padrão: todos selecionados
        selectedKeys.value = allFields.map(f => f.key)
    }
})

// Salvar sempre que mudar
watch([selectedKeys, format], () => {
    localStorage.setItem(
        'exportPrefs',
        JSON.stringify({ keys: selectedKeys.value, fmt: format.value })
    )
})

function closeExcel() {
    emit('closeExcel')
}

function prepareSheetData() {
    const flat = props.reservas.map(r => ({
        idReserva: r.idproposta_cv || '',
        idAnalise: r.idprecadastro || '',
        idlead: r.leads_associados?.[0]?.idlead || '',
        dataVenda: r.data_venda || '',
        cliente: r.nome || r.titular?.nome || '',
        documento_tipo: r.titular?.documento_tipo || '',
        documento: r.titular?.documento || '',
        cep: r.titular?.cep || '',
        nacionalidade: r.titular?.nacionalidade || '',
        estado: r.titular?.estado || '',
        cidade: r.titular?.cidade || '',
        endereco: r.titular?.endereco || '',
        numero: r.titular?.numero || '',
        estado_civil: r.titular?.estado_civil || '',
        porcentagem: r.titular?.porcentagem || '',
        profissao: r.titular?.profissao || '',
        sexo: r.titular?.sexo || '',
        email: r.titular?.email || '',
        telefone: r.titular?.telefone || '',
        corretor: r.corretor?.corretor || '',
        imobiliaria: r.corretor?.imobiliaria || '',
        correspondente: r.empresaCorrespondente?.nome || '',
        valorContrato: r.condicoes?.valor_contrato || '',
        valorVenda: r.condicoes?.valor_venda || '',
        vgvTabela: r.condicoes?.vgv_tabela || '',
        situacao: r.situacao?.situacao || '',
        empreendimento: r.unidade?.empreendimento || '',
        etapa: r.unidade?.etapa || '',
        bloco: r.unidade?.bloco || '',
        unidade: r.unidade?.unidade || '',
        area_terreno: r.unidade?.area_terreno || '',
        area_privativa: r.unidade?.area_privativa || '',
        fracao_ideal: r.unidade?.fracao_ideal || '',
        vendida: r.vendida || '',
    }))

    if (!flat.length) return null

    // Filtrar campos
    const headers = allFields
        .filter(f => selectedKeys.value.includes(f.key))
        .map(f => f.label)
    const rows = flat.map(obj =>
        allFields
            .filter(f => selectedKeys.value.includes(f.key))
            .map(f => obj[f.key] || '')
    )

    return { headers, rows }
}

async function onExport() {
    const data = prepareSheetData()
    if (!data) {
        alert('Não há registros para exportar.')
        return
    }
    const { headers, rows } = data

    if (format.value === 'excel') {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Reservas')
        ws.addRow(headers)
        ws.addRows(rows)
        ws.columns.forEach(col => {
            col.width = Math.max(12, ...col.values.slice(1).map(v => String(v).length))
        })
        const buf = await wb.xlsx.writeBuffer()
        saveAs(
            new Blob([buf]),
            `${fileName.value.trim() || 'relatorio_reservas'}.xlsx`
        )
    } else {
        // CSV
        let csv = headers.join(',') + '\n'
        rows.forEach(r => {
            csv += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n'
        })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        saveAs(
            blob,
            `${fileName.value.trim() || 'relatorio_reservas'}.csv`
        )
    }

    closeExcel()
}
</script>

<style scoped>
/* Ajuste global de inputs */
.form-checkbox,
.form-radio {
    accent-color: #3b82f6;
}
</style>