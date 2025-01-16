import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref([]);
  const erro = ref(null);
  const total = ref(0);
  // const filasData = ref([]);

  const headers = {
    'Accept': 'application/json',
    'email': 'gustavo.diniz@menin.com.br',
    'token': 'e857a8b83b6c7172c224babdb75175b3b8ecd565',
  };

  // const carregarFilas = async () => {
  //   try {
  //     const response = await fetch(
  //       `https://menin.cvcrm.com.br/api/cvio/filas_distribuicao_leads`,
  //       {
  //         method: 'GET',
  //         headers: headers,
  //       }
  //     );

  //     const data = await response.json(); 
  //     console.log(data)
  //     console.log(data.value)
  //     return data.filasData || []; 
  //   } catch (e) {
  //     console.error('Erro ao buscar fila de leads:', e);
  //     throw new Error('Erro ao carregar dados da fila de leads');
  //   }
  // }; // BLOCKED BY CORS 

  const carregarLeads = async (limit, offset) => {
    try {
      const response = await fetch(
        `https://menin.cvcrm.com.br/api/cvio/lead?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: headers,
        }
      );

      const data = await response.json();
      total.value = data.total;
      return data.leads || [];
    } catch (e) {
      console.error('Erro ao buscar leads:', e);
      throw new Error('Erro ao carregar dados dos leads');
    }
  };

  const buscarLeads = async () => {
    erro.value = null;
    try {
      // Carregamento em etapas
      let leadsCompletos = [];

      // Primeira etapa: Carregar 150 leads
      const leads1 = await carregarLeads(300, 0);
      leadsCompletos = [...leadsCompletos, ...leads1];
      leads.value = leadsCompletos; // Atualiza para o BarChart
      // console.log('Dados atualizados para o BarChart:', leadsCompletos);

      // Segunda etapa: Carregar mais 300 leads
      const leads2 = await carregarLeads(300, 300);
      leadsCompletos = [...leadsCompletos, ...leads2];
      leads.value = leadsCompletos; // Atualiza para o LineChart
      // console.log('Dados atualizados para o LineChart:', leadsCompletos);

      // Terceira etapa: Carregar mais 300 leads
      const leads3 = await carregarLeads(300, 600);
      leads.value = leadsCompletos; // Atualiza para o LineChart
      leadsCompletos = [...leadsCompletos, ...leads3];

      // Quarta etapa: Carregar mais 300 leads
      const leads4 = await carregarLeads(300, 900);
      leads.value = leadsCompletos; // Atualiza para o LineChart
      leadsCompletos = [...leadsCompletos, ...leads4];

      // Quarta etapa: Carregar mais 300 leads
      const leads5 = await carregarLeads(300, 1200);
      leadsCompletos = [...leadsCompletos, ...leads5];

      // Finaliza com todos os leads carregados
      leads.value = leadsCompletos;
      // console.log('Todos os leads carregados:', leadsCompletos);
    } catch (e) {
      erro.value = 'Erro ao buscar dados dos leads';
      console.error(erro.value, e);
    }
  };

  const filtrarLeadsPorData = (leadsList, periodo) => {
    const hoje = new Date();
    const hojeInicio = new Date(hoje.setHours(0, 0, 0, 0)); // Início de hoje
  
    // Copiar e ajustar a data para evitar mutações indesejadas
    const ontemInicio = new Date(hoje);
    ontemInicio.setDate(hoje.getDate() - 1); // Início de ontem
  
    // Cálculo para "semana" (últimos 7 dias, incluindo hoje)
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7); // Início dos últimos 7 dias (semana atual)
  
    // Semana anterior (últimos 7 dias antes da semana atual)
    const inicioSemanaAnterior = new Date(hoje);
    inicioSemanaAnterior.setDate(hoje.getDate() - 14); // Início dos 7 dias da semana passada
    const fimSemanaAnterior = new Date(hoje);
    fimSemanaAnterior.setDate(hoje.getDate() - 7); // Fim da semana anterior (7 dias antes de hoje)
  
    const inicioMes = new Date(hoje);
    inicioMes.setDate(1);  // 1º dia do mês atual
  
    const inicioMesAnterior = new Date(hoje);
    inicioMesAnterior.setMonth(hoje.getMonth() - 1); // Mês anterior
    inicioMesAnterior.setDate(1);  // 1º dia do mês anterior
  
    return leadsList.filter((lead) => {
      const dataCriacao = new Date(lead.data_cad); // Converte a string de data para Date
  
      switch (periodo) {
        case 'hoje':
          return dataCriacao >= hojeInicio;
        case 'ontem':
          return dataCriacao >= ontemInicio && dataCriacao < hojeInicio;
        case 'semana':
          return dataCriacao >= inicioSemana && dataCriacao < hojeInicio; // Últimos 7 dias
        case 'semanaAnterior':
          return dataCriacao >= inicioSemanaAnterior && dataCriacao < fimSemanaAnterior; // Semana anterior
        case 'mes':
          return dataCriacao >= inicioMes && dataCriacao < hojeInicio;
        case 'mesAnterior':
          return dataCriacao >= inicioMesAnterior && dataCriacao < inicioMes;
        default:
          return false;
      }
    });
  };
  
  // Função que retorna a quantidade de leads por período
  const getLeadsPorPeriodo = (periodo) => {
    return filtrarLeadsPorData(leads.value, periodo).length;
  };

  return {
    leads,
    erro,
    total,
    // filasData,
    buscarLeads,
    getLeadsPorPeriodo, // Função que retorna a quantidade de leads para o período
    // carregarFilas,
  };
});
