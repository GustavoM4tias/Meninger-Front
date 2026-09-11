/** Nome legível de uma rota do Office, a partir do navRegistry (fonte única). */
import { navRegistry } from '@/config/navRegistry';

let mapa = null;
function montar() {
  mapa = new Map();
  for (const cat of navRegistry) {
    for (const p of cat.pages || []) mapa.set(p.route.toLowerCase(), p.name);
    for (const s of cat.subcategories || []) for (const p of s.pages || []) mapa.set(p.route.toLowerCase(), p.name);
  }
}
export function screenLabel(route) {
  if (!mapa) montar();
  const path = String(route || '').split('?')[0].toLowerCase();
  return mapa.get(path) || 'tela';
}
