// src/utils/apiBuilding.js
import { fetchCarregamento } from '@/utils/Config/fetchCarregamento';
import API_URL from '@/config/apiUrl'; // Define a URL base da sua API

export const getAddress = async (cep) => {
    const response = await fetchCarregamento(`https://viacep.com.br/ws/${cep}/json/`, {
        method: 'GET'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
    }
    return response.json();
};

// Função para obter o clima com base na latitude e longitude
export const getWeather = async (lat, lon) => {
    try {
        // Requisição para Open-Meteo para obter o clima com a latitude e longitude
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&current_weather=true`,
            {
                method: 'GET',
            }
        );

        if (!weatherResponse.ok) {
            const errorData = await weatherResponse.json();
            throw new Error(`Erro ao buscar o clima: ${errorData.message}`);
        }

        // Pega as informações do clima
        const weatherData = await weatherResponse.json();
        return weatherData.current_weather;
    } catch (error) {
        console.error('Erro:', error.message);
        throw error; // Re-throw the error to handle it in the calling function
    }
};

// Função para obter o clima de uma cidade
export const getWeatherByCity = async (city) => {
    try {
        // 1. Requisição para OpenStreetMap para obter a latitude e longitude
        const addressResponse = await fetch(`https://nominatim.openstreetmap.org/search?city=${city}&format=json`, {
            method: 'GET',
        });

        if (!addressResponse.ok) {
            const errorData = await addressResponse.json();
            throw new Error(`Erro ao buscar as coordenadas: ${errorData.message}`);
        }

        const addressData = await addressResponse.json();
        if (!addressData.length) {
            throw new Error('Cidade não encontrada.');
        }

        // 2. Pegar latitude e longitude
        const { lat, lon } = addressData[0];

        // 3. Requisição para Open-Meteo para obter o clima com a latitude e longitude
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&current_weather=true`, {
            method: 'GET',
        });

        if (!weatherResponse.ok) {
            const errorData = await weatherResponse.json();
            throw new Error(`Erro ao buscar o clima: ${errorData.message}`);
        }

        // 4. Pega as informações do clima
        const weatherData = await weatherResponse.json();
        // console.log('Dados do clima:', weatherData.current_weather);

        return weatherData.current_weather;
    } catch (error) {
        console.error('Erro:', error.message);
    }
};

export const getBuildings = async () => {
    const response = await fetch(`${API_URL}/cv/empreendimentos`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao obter empreendimentos');
    }

    const data = await response.json();
    return data; // Return the parsed data directly
};

// Sincroniza as tabelas de preço do CV para o banco (usadas nas fichas comerciais)
export const syncPriceTables = async (id) => {
    const response = await fetch(`${API_URL}/cv/price-tables/sync/${id}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao sincronizar tabelas de preço');
    }

    return response.json(); // { ok: true, synced: n }
};

export const getBuildingById = async (id) => {
    const response = await fetchCarregamento(`${API_URL}/cv/empreendimento/${id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao obter empreendimento');
    }

    return response.json();
};

// ── Tabelas de preço (histórico espelhado do CV) ────────────────────────────
const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

// Por padrão o back devolve o preço já com a adimplência premiada (Desconto
// Construtora) descontada; `descontar: false` pede o preço cheio do CV.
const qsDescontar = (descontar) => (descontar === false ? '?descontar=0' : '');

// Todas as tabelas que já passaram pelo CV para o empreendimento (sem unidades)
export const getPriceTables = async (idempreendimento, { descontar = true } = {}) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/tabelas${qsDescontar(descontar)}`, {
        method: 'GET', headers: authHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao listar tabelas de preço');
    }
    return response.json();
};

// Uma tabela com as unidades e as séries de pagamento
export const getPriceTable = async (idtabela, { descontar = true } = {}) => {
    const response = await fetch(`${API_URL}/cv/price-tables/${idtabela}${qsDescontar(descontar)}`, {
        method: 'GET', headers: authHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao buscar tabela de preço');
    }
    return response.json();
};

// ── Adimplência premiada (Desconto Construtora) por unidade ─────────────────
// O CV guarda na unidade e não expõe por API: o cadastro é do Office, com
// vigência (trocar o valor encerra o período anterior).
export const getAdimplencia = async (idempreendimento) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/adimplencia`, {
        method: 'GET', headers: authHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao listar a adimplência premiada');
    }
    return response.json();
};

// payload: { vigencia_de?: 'YYYY-MM-DD', observacao?, unidades: [{ idunidade, tipo: 'valor'|'percentual', valor }] }
export const saveAdimplencia = async (idempreendimento, payload) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/adimplencia`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gravar a adimplência premiada');
    }
    return response.json();
};

// Importa a exportação de unidades do painel Gestor do CV (CSV com a coluna
// "Adimplência Premiada"): é o único caminho que o CV dá para esse campo.
export const importAdimplencia = async (idempreendimento, { csv, vigencia_de, observacao } = {}) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/adimplencia/importar`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ csv, vigencia_de, observacao }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao importar a exportação do CV');
    }
    return response.json();
};

// ── Espelho de vendas (torres x andares x finais) ───────────────────────────
export const getMirror = async (idempreendimento) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/espelho`, {
        method: 'GET', headers: authHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao montar o espelho');
    }
    return response.json();
};

// Grava a configuração do espelho (faces, dormitórios, dígitos, R$/m² por andar)
export const saveMirrorSettings = async (idempreendimento, settings) => {
    const response = await fetch(`${API_URL}/cv/empreendimento/${idempreendimento}/espelho/config`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ settings }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar a configuração do espelho');
    }
    return response.json(); // espelho remontado
};
