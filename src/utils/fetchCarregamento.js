import { useCarregamentoStore } from '../stores/carregamento';
 
export async function fetchCarregamento(url, options = {}) {
  const carregamentoStore = useCarregamentoStore();

  try {
    carregamentoStore.iniciarCarregamento();

    const response = await fetch(url, options);

    return response; 
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error; 
  } finally {
    carregamentoStore.finalizarCarregamento();
  }
}