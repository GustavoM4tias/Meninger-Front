// Exemplos rotativos para o placeholder do input da Eme. A cada recarga da tela
// sorteia um exemplo diferente — dá "vida" sem atrapalhar. Todos genéricos o
// suficiente para qualquer perfil (a Eme responde conforme a permissão do user).
const EXAMPLES = [
  'resumo de leads deste mês',
  'quais eventos temos esta semana?',
  'como está o fluxo de pagamento?',
  'empreendimentos ativos em vendas',
  'teto do Minha Casa Minha Vida na minha cidade',
  'imobiliárias parceiras da minha região',
  'gere o relatório de eventos do mês',
  'quais boletos vencem esta semana?',
  'crie um alerta recorrente para mim',
  'quantas reservas foram feitas no mês?',
];

const PREFIX = 'Pergunte à Eme... ex.: ';

// Sorteia um placeholder completo. Chame uma vez no setup do componente para que
// fique estável durante a sessão e só troque no próximo recarregamento.
export function randomEmePlaceholder(prefix = PREFIX) {
  const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  return `${prefix}${ex}`;
}
