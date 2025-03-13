<script setup>
import { ref, onMounted, watch } from 'vue';
import * as go from 'gojs';
import { useAuthStore } from '../stores/Auth/authStore';

const userStore = useAuthStore();
const users = ref([]);
const diagramDiv = ref(null);
let diagram = null;

const fetchUsers = async () => {
    try {
        console.log('🔄 Carregando usuários...');
        const fetchedUsers = await userStore.getAllUsers();
        users.value = fetchedUsers.data;
        console.log('✅ Usuários carregados:', users.value);
        updateDiagram();
    } catch (error) {
        console.error('❌ Erro ao carregar os usuários:', error);
    }
};

const createDiagram = () => {
    const $ = go.GraphObject.make;
    diagram = $(go.Diagram, diagramDiv.value, {
        initialAutoScale: go.Diagram.Uniform,
        layout: $(go.TreeLayout, {
            angle: 90,
            layerSpacing: 60,
            nodeSpacing: 30
        }),
        'undoManager.isEnabled': true
    });

    diagram.nodeTemplate = $(go.Node, 'Auto',
        { selectionAdorned: false, padding: 10 },
        $(go.Shape, 'RoundedRectangle', {
            fill: 'white',
            stroke: '#4285F4',
            strokeWidth: 2.5,
            width: 200,
            height: 80,
            shadowVisible: true,
            cursor: 'pointer'
        }),
        $(go.Panel, 'Vertical',
            { margin: 10, alignment: go.Spot.Center },
            $(go.TextBlock, {
                font: 'bold 16px sans-serif',
                stroke: '#333',
                wrap: go.TextBlock.WrapFit,
                textAlign: 'center'
            }, new go.Binding('text', 'name')),
            $(go.TextBlock, {
                font: '14px sans-serif',
                stroke: '#666',
                wrap: go.TextBlock.WrapFit,
                textAlign: 'center'
            }, new go.Binding('text', 'position'))
        )
    );

    diagram.linkTemplate = $(go.Link, { routing: go.Link.Orthogonal, corner: 8 },
        $(go.Shape, { strokeWidth: 2, stroke: '#4285F4' }),
        $(go.Shape, { toArrow: 'Standard', stroke: '#4285F4', fill: '#4285F4' })
    );

    // Removendo textos autorais do GoJS
    diagram.commandHandler.doKeyDown = () => { };
};

const updateDiagram = () => {
    if (!diagram) return;

    const nodeDataArray = users.value.map(user => ({
        key: user.id,
        name: user.username,
        position: user.position
    }));

    const linkDataArray = users.value
        .filter(user => user.manager !== null)
        .map(user => ({
            from: user.manager,
            to: user.id
        }));

    diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
};

onMounted(() => {
    createDiagram();
    fetchUsers();
});

watch(users, () => {
    updateDiagram();
});
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <h1 class="text-4xl font-semibold text-gray-900 mb-6 tracking-tight">
            Organograma Empresarial
        </h1>

        <div class="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
            <div ref="diagramDiv"
                class="w-full h-[600px] border border-gray-300 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
            </div>
        </div>
    </div>
</template>

<style scoped></style>
