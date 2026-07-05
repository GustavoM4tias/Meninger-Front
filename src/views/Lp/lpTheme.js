// Mapas de estilo do page_config compartilhados entre a LP pública (Page.vue)
// e a pré-visualização do editor (LeadFormEditModal). Chave ausente = default.

export const CARD_WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
export const CARD_JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end' };

export function cardWidthClass(cfg) {
  return CARD_WIDTHS[cfg?.card_width] || CARD_WIDTHS.md;
}

export function cardJustifyClass(cfg) {
  return CARD_JUSTIFY[cfg?.card_position] || CARD_JUSTIFY.center;
}

export function backgroundStyle(cfg) {
  const c = cfg || {};
  if (c.background_image_url) {
    const raw = parseInt(c.overlay_opacity, 10);
    const op = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 95) / 100 : 0.55;
    return {
      backgroundImage: `linear-gradient(rgba(15,23,42,${op}),rgba(15,23,42,${op})), url(${c.background_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (c.background_color) return { backgroundColor: c.background_color };
  return {};
}
