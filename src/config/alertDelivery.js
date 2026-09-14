// src/config/alertDelivery.js
//
// Preferência de ENTREGA do alerta no WhatsApp, espelho de
// Meninger-Back/services/alerts/alertDelivery.js:
//   { format: 'pdf' | 'text' | 'xlsx', ask_first: boolean }
//
// Na tela, `format: ''` significa "padrão da empresa" (automação alert_generic
// no portal WhatsApp); a API recebe `null` nesse caso e a regra herda.

export const DELIVERY_OPTIONS = [
  { value: '',     label: 'Padrão' },
  { value: 'pdf',  label: 'PDF' },
  { value: 'text', label: 'Texto' },
  { value: 'xlsx', label: 'Planilha' },
];

export const DELIVERY_LABELS = {
  pdf:  'PDF em anexo',
  text: 'Só o resumo em texto',
  xlsx: 'Planilha (Excel)',
};

/** Objeto salvo (ou null) → estado do formulário. */
export function deliveryDoForm(delivery) {
  return {
    format: DELIVERY_LABELS[delivery?.format] ? delivery.format : '',
    ask_first: !!delivery?.ask_first,
  };
}

/** Estado do formulário → o que a API grava (null = herda o padrão). */
export function deliveryParaApi(form) {
  if (!form) return null;
  const out = {};
  if (form.format) out.format = form.format;
  if (form.ask_first) out.ask_first = true;
  return Object.keys(out).length ? out : null;
}

/** Rótulo curto para listagens: "PDF", "Texto", "Planilha · pergunta antes", "Padrão". */
export function deliveryResumo(delivery) {
  const f = DELIVERY_OPTIONS.find(o => o.value === (delivery?.format || ''))?.label || 'Padrão';
  return delivery?.ask_first ? `${f} · pergunta antes` : f;
}

export default { DELIVERY_OPTIONS, DELIVERY_LABELS, deliveryDoForm, deliveryParaApi, deliveryResumo };
