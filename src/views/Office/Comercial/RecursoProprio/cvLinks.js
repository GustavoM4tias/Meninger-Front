// Links do CV para a reserva. O âncora `#index_condicao_pagamento` abre a tela
// direto no financeiro (condição de pagamento) - o mesmo que a Cobrança do Ato usa.
import { CV_ORIGIN } from '@/utils/cvLinks';

export const cvReservaUrl = (id) => `${CV_ORIGIN}/gestor/comercial/reservas/${id}/administrar`;
export const cvReservaFinanceiroUrl = (id) => `${cvReservaUrl(id)}#index_condicao_pagamento`;
