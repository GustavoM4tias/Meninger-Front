import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref([]);
  const erro = ref(null);
  const total = ref(0);

  const headers = {
    'Accept': 'application/json',
    'email': 'gustavo.diniz@menin.com.br',
    'token': 'e857a8b83b6c7172c224babdb75175b3b8ecd565'
  };

  const buscarLeadsDiario = async () => {
    erro.value = null;
    try {
      const hoje = new Date();
      const dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 2);  // Data de 1 dia atrás

      const response = await fetch(`https://menin.cvcrm.com.br/api/cvio/lead?limit=120&offset=0&`, {
        method: 'GET',
        headers: headers
      });

      const data = await response.json();
      console.log("Leads diários recebidos:", data);

      if (data.leads) {
        const leadsFiltrados = data.leads.filter((lead) => {
          const dataCad = new Date(lead.data_cad);
          return dataCad >= dataInicio && dataCad <= hoje;
        });

        // Em vez de substituir diretamente, você pode usar uma mutação reativa
        leads.value.splice(0, leads.value.length, ...leadsFiltrados); // Atualiza reativamente
        total.value = data.total; // Atualize o total
        console.log("Leads filtrados diários:", leadsFiltrados);
      }
    } catch (e) {
      erro.value = 'Erro ao buscar dados dos leads';
      console.error(erro.value, e);
    }
  };

  const buscarLeadsSemanal = async () => {
    erro.value = null;
    try {
      const hoje = new Date();
      const dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 14); // Data de 14 dias atrás

      // Primeira requisição com offset 0
      const response1 = await fetch(`https://menin.cvcrm.com.br/api/cvio/lead?limit=300&offset=0`, {
        method: 'GET',
        headers: headers
      });

      const data1 = await response1.json();
      console.log("Leads semanais recebidos - Parte 1:", data1);

      // Segunda requisição com offset 300
      const response2 = await fetch(`https://menin.cvcrm.com.br/api/cvio/lead?limit=200&offset=300`, {
        method: 'GET',
        headers: headers
      });

      const data2 = await response2.json();
      console.log("Leads semanais recebidos - Parte 2:", data2);

      if (data1.leads && data2.leads) {
        // Junta os leads das duas requisições
        const leadsCompletos = [...data1.leads, ...data2.leads];

        // Filtra os leads pelas últimas 2 semanas
        const leadsFiltrados = leadsCompletos.filter((lead) => {
          const dataCad = new Date(lead.data_cad);
          return dataCad >= dataInicio && dataCad <= hoje;
        });

        // Atualiza os leads na store
        leads.value.splice(0, leads.value.length, ...leadsFiltrados);
        total.value = data1.total; // Atualiza o total
        console.log("Leads filtrados semanais:", leadsFiltrados);
      }
    } catch (e) {
      erro.value = 'Erro ao buscar dados dos leads';
      console.error(erro.value, e);
    }
  };


  return {
    leads,
    erro,
    total,
    buscarLeadsDiario,
    buscarLeadsSemanal,
  };
});
