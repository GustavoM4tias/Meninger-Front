// Formatação de LINHA para os textos do relatório.
//
// A Eme escreve **negrito** nos números-chave e quebra linha nos textos curtos
// (subtítulo da capa, descrição de seção, insight, nota, legenda). Esses campos
// eram renderizados com interpolação pura, então o asterisco aparecia cru e a
// quebra de linha sumia — a formatação simplesmente não funcionava no modo
// relatório. Aqui o texto passa por markdown INLINE (sem virar parágrafo/lista,
// que quebrariam o layout dos blocos) e por sanitização.
//
// Texto longo continua no bloco `narrative`, que usa markdown completo.
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['strong', 'b', 'em', 'i', 'code', 'a', 'br', 'del', 's', 'span']
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel']

export function inlineMd(text) {
  const bruto = String(text ?? '')
  if (!bruto.trim()) return ''
  // Rede de segurança: a IA às vezes escapa as quebras ("\n" literal), e specs
  // antigos foram salvos assim.
  const normalizado = bruto.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
  const html = marked.parseInline(normalizado, { gfm: true, breaks: true })
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}

// Um valor "tem conteúdo"? Usado pelos blocos para decidir entre renderizar e
// mostrar o estado vazio (nunca deixar o bloco em branco).
export function preenchido(valor) {
  if (valor === null || valor === undefined) return false
  if (Array.isArray(valor)) return valor.length > 0
  if (typeof valor === 'object') return Object.keys(valor).length > 0
  return String(valor).trim() !== ''
}
