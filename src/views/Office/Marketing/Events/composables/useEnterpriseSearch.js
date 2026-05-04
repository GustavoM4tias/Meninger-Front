// Composable: busca/seleção de empreendimento + helpers para mapear endereço.

import { ref, computed, onMounted } from 'vue';
import { getSelectableEnterprises } from '@/utils/Event/apiEvents';

const stateMap = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG',
  para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP',
  sergipe: 'SE', tocantins: 'TO',
};

const normalizeText = (v) =>
  String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function normalizeState(enterprise) {
  const sigla = String(enterprise?.sigla || '').trim();
  if (sigla) return sigla.toUpperCase();
  const estado = normalizeText(enterprise?.estado || '');
  return stateMap[estado] || String(enterprise?.estado || '').toUpperCase();
}

export function mapEnterpriseAddress(enterprise) {
  return {
    street: enterprise?.endereco_emp || enterprise?.logradouro || enterprise?.endereco || '',
    number: enterprise?.numero || '',
    neighborhood: enterprise?.bairro || '',
    city: enterprise?.cidade || '',
    state: normalizeState(enterprise),
    zip_code: String(enterprise?.cep || '').replace(/\D/g, '').slice(0, 8),
  };
}

export function useEnterpriseSearch() {
  const enterprises = ref([]);
  const loading = ref(false);
  const search = ref('');
  const showResults = ref(false);

  const filtered = computed(() => {
    const q = normalizeText(search.value);
    if (!q) return enterprises.value.slice(0, 8);
    return enterprises.value.filter((e) => {
      const haystack = normalizeText([
        e.nome, e.cidade, e.estado, e.bairro, e.idempreendimento_int, e.endereco, e.endereco_emp,
      ].filter(Boolean).join(' '));
      return haystack.includes(q);
    }).slice(0, 8);
  });

  function findById(id) {
    return enterprises.value.find(e => String(e.idempreendimento) === String(id)) || null;
  }

  async function load() {
    loading.value = true;
    try {
      const result = await getSelectableEnterprises();
      enterprises.value = Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Erro ao carregar empreendimentos:', err);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => { if (!enterprises.value.length) load(); });

  return { enterprises, loading, search, showResults, filtered, findById, load };
}
