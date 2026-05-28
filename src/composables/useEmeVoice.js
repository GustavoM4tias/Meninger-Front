// Voz da Eme (Web Speech API) — singleton compartilhado.
//
// Use:
//   - initEmeVoice({ onCapture, ttsEnabled }) — chamar UMA vez no root.
//   - useEmeVoice() — em qualquer componente para acessar state/actions.
//
// State machine:
//   OFF        → mic desligado
//   ARMED      → mic ligado, aguardando "Olá Eme" (modo hands-free)
//   LISTENING  → captando pergunta em tempo real
//   PROCESSING → pergunta enviada, aguardando Eme responder
//   SPEAKING   → TTS reproduzindo resposta (mic em pausa)
//
// Anti-falso-positivo:
//   1. Wake phrase composta + variantes fonéticas
//   2. Match no INÍCIO da fala
//   3. Reset do buffer após disparar
//   4. Cooldown de 1.5s após envio
//   5. Mic pausa durante TTS
//   6. Confidence mínima (quando o browser reporta)

import { ref, computed } from 'vue'
import { synthesizeSpeech } from '@/utils/OfficeAI/apiOfficeChat'

// ── Frases ────────────────────────────────────────────────────────────────────
// "Eme" é falado como letra "M". Mantemos apenas saudação + M / Eme.
// SEM "online", "emily", "eminem" — palavras comuns demais (falsos positivos).
const WAKE_PHRASES = [
  // Saudação + M (forma curta, o STT acerta mais)
  'ola m', 'oi m', 'ei m', 'eae m', 'eai m', 'e ai m', 'hey m',
  // Saudação + Eme (forma explícita)
  'ola eme', 'oi eme', 'ei eme', 'eae eme', 'eai eme',
  'ola êmi', 'oi êmi', 'ola emi', 'oi emi',
  'ola em', 'oi em', 'ei em',
]

const END_PHRASES = [
  'tchau eme', 'tchau êmi', 'tchau emi',
  'eme tchau', 'êmi tchau',
  'eme desliga', 'êmi desliga',
  'desliga eme', 'desliga êmi',
  'eme sai', 'sai eme',
  'até logo eme', 'ate logo eme',
]

// SLEEP_PHRASES: desliga + desativa alwaysOn (não reativa automaticamente).
// Pra reativar, é preciso clicar no mic ou usar atalho.
const SLEEP_PHRASES = [
  'eme dorme', 'eme dorma', 'dorme eme', 'dorma eme',
  'eme silêncio', 'eme silencio', 'silêncio eme', 'silencio eme',
  'eme cala', 'cala eme', 'eme cala a boca',
  'eme pausa', 'pausa eme', 'eme pausar',
]

// THANKS_PHRASES: agradecimento/encerramento natural de conversa.
// Detecta em LISTENING e cancela a captura SEM enviar pra Eme (economiza tokens).
// O alwaysOn fica intacto — a Eme volta a ouvir na próxima sessão/clique.
// Só dispara se a frase TODA for um agradecimento curto.
const THANKS_PHRASES = [
  // Agradecimento
  'obrigado', 'obrigada', 'obrigadão', 'obrigadao',
  'obrigado eme', 'obrigada eme', 'obrigado emi',
  'brigado', 'brigada', 'brigado eme',
  'muito obrigado', 'muito obrigada', 'muito obrigado eme',
  'valeu', 'valeu eme', 'valeu mesmo', 'valeu mano',
  // Despedida
  'tchau', 'tchau eme', 'tchauzinho',
  'falou', 'falou eme',
  // Confirmação
  'ok', 'ok eme', 'okay eme', 'okey eme',
  'tá bom', 'ta bom', 'tá bom eme', 'ta bom eme',
  'tá certo', 'ta certo', 'tá ok', 'ta ok',
  'beleza', 'beleza eme', 'belê eme', 'bele eme',
  'fechado', 'fechado eme',
  'perfeito', 'perfeito eme',
  'ótimo', 'otimo', 'ótimo eme', 'otimo eme',
  'show', 'show eme', 'show de bola', 'demais eme',
  // Comandos diretos de encerramento
  'pare', 'pare eme', 'para', 'para eme',
  'pode parar', 'pode parar eme', 'para por aí', 'para ai',
  'chega', 'chega eme', 'chega por aqui',
  'encerra', 'encerra eme', 'encerrar',
  'finaliza', 'finaliza eme', 'finalizar',
  'termina', 'termina eme',
  // "É isso" e variações
  'é isso', 'e isso', 'é isso eme', 'é isso aí', 'e isso ai',
  'é só', 'e so', 'é só isso', 'e so isso',
  'só isso', 'so isso',
  'é tudo', 'e tudo', 'isso é tudo', 'isso e tudo',
]

// Detecta se a fala é APENAS um agradecimento curto (até 5 palavras).
// Evita disparar com "obrigado pela explicação sobre os leads" (frase longa).
function isThanksPhrase(normalizedText) {
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length
  if (wordCount > 5) return false

  for (const phrase of THANKS_PHRASES) {
    if (normalizedText === phrase) return true
    // Match no final: "muito obrigado eme" cobre "obrigado eme"
    if (normalizedText.endsWith(' ' + phrase)) return true
  }
  return false
}

const CANCEL_PHRASES = [
  'cancela eme', 'cancela êmi', 'esquece eme', 'esquece êmi',
  'para eme', 'pera eme', 'pera lá',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Heurística cold (1ª invocação): exige saudação + Eme
// Pré-normalização: substitui frases que o STT pt-BR retorna por algo +
// próximo a "ola eme" quando o usuário fala "Olá Eme".
function preNormalizeForWake(normalized) {
  return normalized
    // "online" / "on line" SÓ no início vira "ola eme" — o STT confunde "Olá Eme" com "online".
    // ^ é âncora de início: no meio da frase, "online" passa intocado (palavra normal).
    .replace(/^on\s?line\s+(.+)$/, 'ola eme $1')  // "online quantos leads" → "ola eme quantos leads"
    .replace(/^on\s?line$/, 'ola eme')            // "online" sozinho
    .replace(/^e l[aá]\b/, 'ola')                 // "é lá" → "ola"
    .replace(/^[aàá] l[aá]\b/, 'ola')             // "a la"/"á lá" → "ola"
    .replace(/^all?[oóô]\b/, 'ola')               // "alô" / "allo"
    .replace(/^h[ae]ll?o\b/, 'ola')               // "hello", "halo"
}

function findWakeCold(normalizedText) {
  const text = preNormalizeForWake(normalizedText)

  // 1. Lista exata (com tolerância de até 30 chars de hesitação antes)
  for (const phrase of WAKE_PHRASES) {
    if (text === phrase) return { idx: 0, length: phrase.split(/\s+/).length }
    if (text.startsWith(phrase + ' ')) return { idx: 0, length: phrase.split(/\s+/).length }
    const m = text.match(new RegExp(`^[a-z\\s]{0,30}\\b${phrase}\\b`))
    if (m) return { idx: m.index, length: phrase.split(/\s+/).length }
  }

  // 2. Heurística RESTRITA: saudação + (m|eme|emi|em) APENAS.
  // Sem "emily", "eminem", "amelia" etc. — esses são nomes reais e davam falso positivo.
  const heuristic = text.match(
    /^[\w\s]{0,30}?\b(ola|oi|ei|eae|eai|e ai|hey)\s+(m|eme|emi|emy|em|êm|êmi)\b/i
  )
  if (heuristic) {
    return { idx: heuristic.index, length: 2 }
  }
  return null
}

// Verifica se o texto contém uma wake phrase EXATA no início (sem heurística).
// Usado pra disparar wake em INTERIM (mais agressivo, só pra phrases certinhas).
function findWakeExactInInterim(normalizedText) {
  for (const phrase of WAKE_PHRASES) {
    if (normalizedText === phrase) return { idx: 0, length: phrase.split(/\s+/).length }
    if (normalizedText.startsWith(phrase + ' ')) return { idx: 0, length: phrase.split(/\s+/).length }
  }
  return null
}

// Heurística conversation (já em chat ativo): só "M"/"Eme" basta no início.
// Mais permissivo — em conversa o usuário sabe que tá falando com a Eme.
function findWakeConversation(normalizedText) {
  // Tokens curtos que o STT retorna no lugar de "Eme":
  const EME_TOKEN = '(m|eme|êmi|emi|emy|em|êm)'

  // Caso 1: "M [pergunta]" / "Eme [pergunta]"
  const withQuestion = normalizedText.match(
    new RegExp(`^[\\w\\s]{0,15}?\\b${EME_TOKEN}\\b\\s+(\\S{2,})`, 'i')
  )
  if (withQuestion) return { idx: withQuestion.index, length: 1 }

  // Caso 2: "M" sozinho (user vai falar a pergunta na sequência)
  const alone = normalizedText.match(
    new RegExp(`^[\\w\\s]{0,15}?\\b${EME_TOKEN}\\b\\s*$`, 'i')
  )
  if (alone) return { idx: alone.index, length: 1 }

  return null
}

function findWakePhrase(normalizedText, inConversation) {
  return inConversation
    ? (findWakeConversation(normalizedText) || findWakeCold(normalizedText))
    : findWakeCold(normalizedText)
}

function containsAny(normalizedText, phrases) {
  return phrases.some(p => normalizedText.includes(p))
}

// Remove a wake phrase do começo do texto, retornando só a pergunta.
function stripWakeFromText(normalizedText, original, match) {
  if (!match) return original
  const wordsBefore = normalizedText.slice(0, match.idx).split(/\s+/).filter(Boolean).length
  const originalWords = original.split(/\s+/)
  return originalWords.slice(wordsBefore + match.length).join(' ').trim()
}

function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.lang = 'pt-BR'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1
  return rec
}

// ── State global (singleton) ──────────────────────────────────────────────────
const isSupported = !!(typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition))

const state = ref('OFF')        // OFF | ARMED | LISTENING | PROCESSING | SPEAKING
const interimText = ref('')
const lastError = ref(null)

let recognition = null
let captureBuffer = ''
let silenceTimer = null
let cooldownUntil = 0
let restartTimer = null
let manuallyStopped = false
let oneShotMode = false         // true = volta pra OFF após enviar (sem re-armar)
let pendingWillSpeak = false    // se a resposta vai ser falada (TTS)
let processingTimeout = null    // safety timeout p/ não travar em PROCESSING/SPEAKING
let conversationActiveUntil = 0  // até quando aceitamos só "Eme" como wake
let listeningStartedAtIndex = 0  // descarta resultados anteriores ao start de LISTENING
let listeningIdleTimer = null   // se ficar em LISTENING sem falar nada, volta pra ARMED
let inFollowUp = false          // true = entrou em LISTENING direto após resposta (sem wake)
let recentWakeAt = 0            // timestamp do último wake detectado — pra "lembrar" se voltar pra ARMED rápido

const PROCESSING_TIMEOUT_MS = 60_000

// Callbacks/config (setados via initEmeVoice)
let onCaptureFn = null
let ttsEnabledRef = ref(false)
let alwaysOnRef = ref(false)    // se true, push-to-talk vira hands-free após responder
let initialized = false

const SILENCE_MS = 1500       // pausa após falar antes de mandar — dá margem pra completar a frase
const COOLDOWN_MS = 1000
const LISTENING_IDLE_MS = 45_000  // tempo pra começar a falar em LISTENING (follow-up ou wake sozinho)
const RECENT_WAKE_TTL_MS = 10_000 // se voltou pra ARMED dentro disso, próximo final é tratado como pergunta
const CONVERSATION_TTL_MS = 5 * 60 * 1000  // após 5min sem interação, volta pro modo "cold"

// ── Inicialização (chamada uma vez no root) ───────────────────────────────────
export function initEmeVoice({ onCapture, ttsEnabled, alwaysOn } = {}) {
  onCaptureFn = onCapture
  if (ttsEnabled) ttsEnabledRef = ttsEnabled
  if (alwaysOn) alwaysOnRef = alwaysOn
  initialized = true
}

// ── Processamento de resultado ────────────────────────────────────────────────
function handleResult(event) {
  if (state.value === 'OFF' || state.value === 'SPEAKING' || state.value === 'PROCESSING') return

  let interim = ''
  let finalText = ''
  let lastConfidence = 1

  // Em LISTENING: ignora resultados ANTES do start (que continham a wake phrase).
  // Em ARMED: começa do resultIndex normal.
  const startIdx = state.value === 'LISTENING'
    ? Math.max(event.resultIndex, listeningStartedAtIndex)
    : event.resultIndex

  for (let i = startIdx; i < event.results.length; i++) {
    const res = event.results[i]
    const alt = res[0]
    if (res.isFinal) finalText += alt.transcript + ' '
    else interim += alt.transcript + ' '
    if (typeof alt.confidence === 'number' && alt.confidence > 0) {
      lastConfidence = alt.confidence
    }
  }

  const combined = (finalText + interim).trim()
  const normalized = normalize(combined)

  // Comandos globais — checa SLEEP antes de END (sleep também é tipo de "fim")
  if (containsAny(normalized, SLEEP_PHRASES)) {
    console.log('[Eme Voice] 💤 comando de dormir detectado — desativando alwaysOn')
    sleepUntilWoken()
    return
  }
  if (containsAny(normalized, END_PHRASES)) {
    stop()
    return
  }

  // Agradecimento em LISTENING → encerra captura sem enviar pra Eme (economiza tokens).
  // alwaysOn fica intacto — próxima ativação manual volta a ouvir.
  if (state.value === 'LISTENING' && finalText.trim() && isThanksPhrase(normalized)) {
    console.log('[Eme Voice] 🙏 agradecimento detectado — encerrando escuta sem chamar API')
    stop()
    return
  }
  if (state.value === 'LISTENING' && containsAny(normalized, CANCEL_PHRASES)) {
    captureBuffer = ''
    interimText.value = ''
    clearTimeout(silenceTimer)
    if (oneShotMode) {
      stop()
    } else {
      transitionTo('ARMED')
    }
    return
  }

  // ARMED: aguarda wake phrase
  if (state.value === 'ARMED') {
    // LOG: sempre mostra o que está sendo recebido em ARMED
    if (combined) {
      const tipo = finalText.trim() ? 'FINAL' : 'interim'
      console.log(`[Eme Voice] ARMED [${tipo}]`, JSON.stringify(combined),
                  '→ norm:', JSON.stringify(normalized))
    }

    if (Date.now() < cooldownUntil) {
      if (combined) console.log('[Eme Voice] ↳ ignorado (cooldown)')
      return
    }

    const inConv = Date.now() < conversationActiveUntil
    let match = null
    let usedSource = ''

    // 1ª tentativa: FINAL — dispara com qualquer heurística (incl. permissiva)
    if (finalText.trim()) {
      match = findWakePhrase(normalized, inConv)
      usedSource = 'FINAL'
    } else {
      // 2ª tentativa: INTERIM — só dispara se for MATCH EXATO de uma das WAKE_PHRASES.
      // Necessário porque o STT pt-BR às vezes mostra "olá m" no interim mas
      // descarta o "m" no final, transcrevendo só "olá".
      match = findWakeExactInInterim(normalized)
      if (match) usedSource = 'INTERIM-exato'
    }

    // 3ª tentativa: se vi wake recentemente (dentro de RECENT_WAKE_TTL_MS) e agora
    // chegou um FINAL sem wake → o STT segmentou em 2 frases: "Olá M" + "[pergunta]".
    // Trato o final inteiro como a pergunta.
    if (!match && finalText.trim() && (Date.now() - recentWakeAt) < RECENT_WAKE_TTL_MS) {
      console.log('[Eme Voice] FINAL sem wake, mas vi wake recente — tratando como pergunta direta')
      recentWakeAt = 0  // consumido
      captureBuffer = finalText.trim()
      interimText.value = captureBuffer
      listeningStartedAtIndex = event.results.length
      transitionTo('LISTENING')
      playChime('start')
      scheduleSend()
      return
    }

    if (!match) {
      if (finalText.trim()) {
        console.log('[Eme Voice] ↳ sem wake (modo:', inConv ? 'conversation' : 'cold', ')')
      }
      return
    }
    console.log(`[Eme Voice] match em ${usedSource}`)
    recentWakeAt = Date.now()  // marca pra cobrir caso de "volta pra ARMED" sem perder o contexto

    const question = stripWakeFromText(normalized, combined, match)

    // Sanity check: se o "que sobrou" é apenas outra wake repetida (STT capturou
    // "Olá Eme Olá Eme") ou texto bobo curto, tratamos como wake sem pergunta —
    // entramos em LISTENING idle aguardando a pergunta REAL.
    const normalizedQuestion = normalize(question)
    const isJustWakeRepeated = !!findWakePhrase(normalizedQuestion, inConv)
    const looksLikePerguntaReal = question.trim().length >= 3 && !isJustWakeRepeated

    console.log('[Eme Voice] ✓ Wake detectada',
                looksLikePerguntaReal ? `→ pergunta: "${question}"` : '→ aguardando pergunta real')

    captureBuffer = looksLikePerguntaReal ? question : ''
    interimText.value = captureBuffer
    transitionTo('LISTENING')
    playChime('start')

    // Marca onde a wake terminou. handleResult em LISTENING vai ignorar
    // resultados anteriores (sem precisar reiniciar o reconhecedor — sem perda de áudio).
    listeningStartedAtIndex = event.results.length

    if (looksLikePerguntaReal) scheduleSend()
    else armListeningIdle()
    return
  }

  // LISTENING: acumula. Qualquer texto (interim ou final) cancela o idle timer.
  if (state.value === 'LISTENING') {
    if (interim.trim() || finalText.trim()) clearTimeout(listeningIdleTimer)
    if (finalText.trim()) {
      captureBuffer = (captureBuffer + ' ' + finalText).trim()
    }
    const visible = (captureBuffer + ' ' + interim).trim()
    interimText.value = visible
    if (visible) scheduleSend()
  }
}

// Quando entramos em LISTENING sem pergunta (só wake ou follow-up), damos um
// tempo razoável pra pessoa começar a falar antes de voltar pra ARMED.
function armListeningIdle() {
  clearTimeout(listeningIdleTimer)
  listeningIdleTimer = setTimeout(() => {
    if (state.value === 'LISTENING' && !captureBuffer.trim()) {
      console.log('[Eme Voice] ⏱️ LISTENING idle timeout — voltando pra ARMED (lembrando do wake recente)')
      inFollowUp = false
      // NÃO reseta recentWakeAt — se o user vier falar logo, próximo final em ARMED
      // vira pergunta direta via "wake memory" check.
      if (oneShotMode) stop()
      else transitionTo('ARMED')
    }
  }, LISTENING_IDLE_MS)
}

// ── Correção de transcrição (jargão do Meninger) ─────────────────────────────
// O Web Speech API erra termos técnicos comuns: "leads" vira "líderes"/"vídeos"/
// "dentes". Aqui aplicamos substituições com word boundaries.
const TRANSCRIPTION_FIXES = [
  // Leads (variações comuns que o STT pt-BR erra)
  { from: /\b(?:líderes|lideres|leeds|lids|links|leex|leeks)\b/gi, to: 'leads' },
  { from: /\b(?:líder|lider|link|leed)\b/gi, to: 'lead' },
  // "vídeos" e "dentes" só viram leads se contexto comercial (próximo de cidade/período/quantos)
  // Pra v1, substituímos sempre — em pedidos sobre vídeos reais (raríssimo no Meninger), edite.
  { from: /\bvídeos?\b/gi, to: 'leads' },
  { from: /\bdentes?\b/gi, to: 'leads' },

  // Empreendimentos / nomes próprios
  { from: /\b(?:spaço|espaço|espasso|esspaço)\b/gi, to: 'Spazio' },
  { from: /\bbour(?:bon|bom|bun)\b/gi, to: 'Bourbon' },

  // Sistemas
  { from: /\bsiege\b/gi, to: 'Sienge' },
  { from: /\b(?:seange|se ange|see ange)\b/gi, to: 'Sienge' },
  { from: /\bminha casa,? minha vida\b/gi, to: 'MCMV' },
  { from: /\b(?:mcm|emcemv|mcv)\b/gi, to: 'MCMV' },

  // Termos do negócio
  { from: /\bpré[\s-]?cadastros?\b/gi, to: 'pré-cadastro' },
  { from: /\b(?:cca|c c a)\b/gi, to: 'CCA' },
]

function applyTranscriptionFixes(text) {
  let corrected = text
  for (const rule of TRANSCRIPTION_FIXES) {
    corrected = corrected.replace(rule.from, rule.to)
  }
  return corrected
}

function scheduleSend() {
  clearTimeout(silenceTimer)
  silenceTimer = setTimeout(() => {
    clearTimeout(listeningIdleTimer)
    let rawText = captureBuffer.trim()
    captureBuffer = ''
    interimText.value = ''

    // Se ainda sobrou wake phrase no início do buffer (ex: chegou "olá Emily como vai"
    // todo num final só, depois do wake disparar), retira antes de mandar.
    const normalized = normalize(rawText)
    const leftover = findWakeCold(normalized) || findWakeConversation(normalized)
    if (leftover) {
      const stripped = stripWakeFromText(normalized, rawText, leftover).trim()
      if (stripped) rawText = stripped
    }

    if (!rawText || rawText.length < 2) {
      inFollowUp = false
      if (oneShotMode) stop()
      else transitionTo('ARMED')
      return
    }

    const text = applyTranscriptionFixes(rawText)
    inFollowUp = false

    cooldownUntil = Date.now() + COOLDOWN_MS
    const willSpeak = !!ttsEnabledRef.value
    pendingWillSpeak = willSpeak

    // Para o reconhecimento e entra em PROCESSING.
    // Volta para SPEAKING/ARMED/OFF via finishProcessing() quando a resposta chega.
    if (recognition) {
      try { recognition.stop() } catch { /* ignore */ }
    }
    transitionTo('PROCESSING')
    armProcessingTimeout()

    // Marca conversa ativa — próximas perguntas precisam só de "Eme"
    conversationActiveUntil = Date.now() + CONVERSATION_TTL_MS

    playChime('send')
    console.log('[Eme Voice] →', text)
    onCaptureFn?.(text, { willSpeak })
  }, SILENCE_MS)
}

// Marca conversa ativa externamente (ex: ao receber resposta da Eme)
export function markConversationActive() {
  conversationActiveUntil = Date.now() + CONVERSATION_TTL_MS
}

// Volta ao modo "cold" (exige saudação)
export function endConversation() {
  conversationActiveUntil = 0
}

// Timeout de segurança: se PROCESSING/SPEAKING ficar preso, força reset
function armProcessingTimeout() {
  clearTimeout(processingTimeout)
  processingTimeout = setTimeout(() => {
    if (state.value === 'PROCESSING' || state.value === 'SPEAKING') {
      console.warn('[Eme Voice] Timeout em', state.value, '— voltando para ARMED/OFF')
      if (oneShotMode) stop()
      else {
        transitionTo('OFF')
        arm({ silent: true })
      }
    }
  }, PROCESSING_TIMEOUT_MS)
}

function transitionTo(next) {
  if (state.value === next) return
  console.log(`[Eme Voice] state: ${state.value} → ${next}`)
  state.value = next
}

function ensureRecognition() {
  if (recognition) return recognition
  recognition = createRecognition()
  if (!recognition) return null
  recognition.onresult = handleResult
  recognition.onerror = (e) => {
    if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
      console.warn('[Eme Voice] Erro do reconhecedor:', e.error, e)
      lastError.value = e.error
    }
  }
  recognition.onend = () => {
    // Chrome dispara onend periodicamente em modo continuous (~15-30s sem fala).
    // Reinicia silenciosamente — só loga falha real.
    const needsMic = state.value === 'ARMED' || state.value === 'LISTENING'
    if (!manuallyStopped && needsMic) {
      restartTimer = setTimeout(() => {
        try {
          recognition.start()
        } catch (err) {
          console.warn('[Eme Voice] Falha ao reiniciar recognition:', err?.message)
        }
      }, 250)
    }
  }
  // Útil pra confirmar que o mic está captando fala (silenciado o ruído de
  // start/end de audio que dispara em todo restart automático)
  recognition.onspeechstart = () => {
    console.log('[Eme Voice] 🎤 voz detectada — state:', state.value)
  }
  recognition.onnomatch = () => {
    console.warn('[Eme Voice] ⚠️ nomatch — STT não entendeu o que foi dito')
  }
  return recognition
}

function restartRecognition() {
  if (!recognition) return
  try { recognition.stop() } catch { /* ignore */ }
  // onend reinicia
}

// ── Ações públicas ────────────────────────────────────────────────────────────
function arm({ silent = false } = {}) {
  if (!isSupported) {
    lastError.value = 'Reconhecimento de voz não suportado neste navegador.'
    return false
  }
  if (state.value !== 'OFF') return true
  if (!ensureRecognition()) return false

  oneShotMode = false
  inFollowUp = false
  manuallyStopped = false
  captureBuffer = ''
  interimText.value = ''
  lastError.value = null
  cooldownUntil = Date.now() + 500
  listeningStartedAtIndex = 0

  try {
    recognition.start()
    transitionTo('ARMED')
    if (!silent) playChime('arm')
    return true
  } catch (err) {
    console.warn('[Eme Voice] Falha ao iniciar reconhecimento:', err)
    lastError.value = err.message
    return false
  }
}

// Push-to-talk: ouve UMA pergunta sem precisar de wake phrase, depois desliga.
function listenOnce() {
  if (!isSupported) {
    lastError.value = 'Reconhecimento de voz não suportado neste navegador.'
    return false
  }
  if (state.value === 'LISTENING') return true
  if (state.value !== 'OFF') {
    stop()
  }
  if (!ensureRecognition()) return false

  oneShotMode = true
  manuallyStopped = false
  captureBuffer = ''
  interimText.value = ''
  lastError.value = null
  cooldownUntil = 0
  listeningStartedAtIndex = 0

  try {
    recognition.start()
    transitionTo('LISTENING')
    playChime('start')
    return true
  } catch (err) {
    lastError.value = err.message
    return false
  }
}

function stop() {
  manuallyStopped = true
  oneShotMode = false
  inFollowUp = false
  clearTimeout(silenceTimer)
  clearTimeout(restartTimer)
  clearTimeout(processingTimeout)
  clearTimeout(listeningIdleTimer)
  captureBuffer = ''
  interimText.value = ''
  if (recognition) {
    try { recognition.stop() } catch { /* ignore */ }
  }
  // OFF antes de cancelSpeech — callback (resumeAfterSpeaking) checa state e sai
  transitionTo('OFF')
  cancelSpeech()
  playChime('stop')
}

// Após responder, abre uma janela curta em LISTENING direto — sem precisar de
// "Olá Eme" pra fazer a próxima pergunta. Se ninguém falar dentro do tempo,
// volta pra ARMED.
function startFollowUp() {
  if (!ensureRecognition()) { arm({ silent: true }); return }
  oneShotMode = false
  manuallyStopped = false
  captureBuffer = ''
  interimText.value = ''
  cooldownUntil = Date.now() + 300
  inFollowUp = true
  listeningStartedAtIndex = 0

  try {
    recognition.start()
    transitionTo('LISTENING')
    armListeningIdle()
    console.log('[Eme Voice] Follow-up: ouvindo direto por', LISTENING_IDLE_MS / 1000, 's')
  } catch (err) {
    // "InvalidStateError: already started" — recognition já está rodando.
    // Stop + aguarda onend reiniciar.
    console.warn('[Eme Voice] start() falhou no follow-up:', err?.message, '— tentando recuperar')
    try { recognition.stop() } catch { /* ignore */ }
    transitionTo('LISTENING')
    armListeningIdle()
    // onend vai reiniciar em 250ms (porque state==LISTENING e !manuallyStopped)
  }
}

function toggleArmed() {
  if (state.value === 'OFF') return arm()
  stop()
  return false
}

// Desliga e desativa alwaysOn — Eme não reativa automaticamente até o user clicar.
// O alwaysOnRef é um ref controlado pelo OfficeChatFloat (vinculado ao localStorage).
function sleepUntilWoken() {
  if (alwaysOnRef && 'value' in alwaysOnRef) {
    alwaysOnRef.value = false  // dispara watch no float, persiste em localStorage
  }
  stop()
}

// Reativa o sempre-ativo + arma.
function wakeUp() {
  if (alwaysOnRef && 'value' in alwaysOnRef) {
    alwaysOnRef.value = true
  }
  if (state.value === 'OFF') arm()
}

function resumeAfterSpeaking() {
  clearTimeout(processingTimeout)
  if (state.value !== 'SPEAKING') return
  cooldownUntil = Date.now() + 500

  // Push-to-talk puro: desliga. Hands-free (ou push-to-talk + alwaysOn):
  // entra em follow-up direto (LISTENING sem wake) por 10s.
  if (oneShotMode && !alwaysOnRef.value) {
    stop()
    return
  }
  oneShotMode = false
  transitionTo('OFF')
  startFollowUp()
}

// Chamada quando o streaming termina (resposta chegou).
// Se TTS, fica em SPEAKING aguardando resumeAfterSpeaking() do consumidor.
// Senão, entra em follow-up (LISTENING) ou OFF (push-to-talk puro).
function finishProcessing() {
  clearTimeout(processingTimeout)
  if (state.value !== 'PROCESSING') return

  if (pendingWillSpeak) {
    transitionTo('SPEAKING')
    armProcessingTimeout() // se TTS não disparar onDone, libera depois
    return
  }

  cooldownUntil = Date.now() + 500
  if (oneShotMode && !alwaysOnRef.value) {
    stop()
    return
  }
  oneShotMode = false
  transitionTo('OFF')
  startFollowUp()
}

// ── Chime ─────────────────────────────────────────────────────────────────────
let audioCtx = null
function playChime(kind) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    const freqs = { arm: 660, start: 880, send: 1040, stop: 440 }
    osc.frequency.value = freqs[kind] || 700
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + 0.2)
  } catch { /* ignore */ }
}

// ── Computed UI ───────────────────────────────────────────────────────────────
const statusLabel = computed(() => {
  if (state.value === 'LISTENING' && inFollowUp) return 'Pode falar…'
  return ({
    OFF:        'Voz desligada',
    ARMED:      'Aguardando "Olá Eme"…',
    LISTENING:  'Te ouvindo…',
    PROCESSING: 'Eme está pensando…',
    SPEAKING:   'Falando…',
  }[state.value] || 'Voz desligada')
})

const isActive = computed(() => state.value !== 'OFF')

// ── Composable ────────────────────────────────────────────────────────────────
export function useEmeVoice() {
  return {
    isSupported,
    initialized: () => initialized,
    state,
    statusLabel,
    interimText,
    lastError,
    isActive,
    arm,
    stop,
    toggleArmed,
    listenOnce,
    resumeAfterSpeaking,
    finishProcessing,
    sleepUntilWoken,
    wakeUp,
  }
}

// Diagnóstico — exposto em window pra debug. Cole no console: window.__emeVoiceDiag()
if (typeof window !== 'undefined') {
  window.__emeVoiceDiag = async () => {
    let micPermission = 'unknown'
    try {
      const r = await navigator.permissions?.query?.({ name: 'microphone' })
      micPermission = r?.state || 'unknown'
    } catch {}
    const perm = JSON.parse(localStorage.getItem('_perm') || '{}')
    const diag = {
      voice: {
        state: state.value,
        isSupported,
        initialized,
        recognitionExists: !!recognition,
        interimText: interimText.value,
        lastError: lastError.value,
        oneShotMode,
        inFollowUp,
        manuallyStopped,
        conversationActive: Date.now() < conversationActiveUntil,
      },
      preferences: {
        alwaysOn: localStorage.getItem('eme:voice:always-on'),
        ttsEnabled: localStorage.getItem('eme:voice:tts'),
      },
      user: {
        isAdmin: perm.isAdmin,
        hasToken: !!localStorage.getItem('token'),
      },
      browser: {
        micPermission,
        userAgent: navigator.userAgent.slice(0, 100),
      },
    }
    console.log('━━━ Eme Voice Diag ━━━')
    console.log(JSON.stringify(diag, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━')
    return diag
  }
}

// ── TTS via Gemini (voz natural feminina) — com fila ─────────────────────────
// Chama /api/office-chat/tts em pipeline: pré-sintetiza próxima(s) frase(s)
// enquanto a atual toca. Reduz drasticamente latência da 1ª fala.
//
// API:
//   enqueueSpeech(text, voice)  — adiciona à fila (sintetiza em paralelo, toca em ordem)
//   onAllSpeechDone(cb)         — registra callback p/ quando a fila esvaziar
//   cancelSpeech()              — cancela tudo
//   speakText(text, {onDone})   — atalho retrocompatível: cancela fila e fala 1 vez

let currentAudio = null
const speechQueue = []          // [{ text, voice, blobPromise }]
let isPlayingSpeech = false
let allDoneCallback = null
let speechSerial = 0

function cleanupAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause()
      if (currentAudio.src) URL.revokeObjectURL(currentAudio.src)
    } catch { /* ignore */ }
    currentAudio = null
  }
}

async function playNextInQueue() {
  if (speechQueue.length === 0) {
    isPlayingSpeech = false
    const cb = allDoneCallback
    allDoneCallback = null
    cb?.()
    return
  }
  isPlayingSpeech = true
  const item = speechQueue.shift()

  try {
    const blob = await item.blobPromise
    if (item.cancelled) { playNextInQueue(); return }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.playbackRate = 1.25  // 25% mais rápido — fluido e reduz latência percebida
    currentAudio = audio
    audio.onended = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      playNextInQueue()
    }
    audio.onerror = (e) => {
      console.warn('[Eme Voice] Erro reproduzindo áudio:', e)
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      playNextInQueue()
    }
    await audio.play()
  } catch (err) {
    console.warn('[Eme Voice] Falha no TTS de uma frase:', err?.message || err)
    playNextInQueue()
  }
}

export function enqueueSpeech(text, { voice } = {}) {
  const clean = String(text || '').trim()
  if (!clean) return
  const serial = ++speechSerial
  // Inicia síntese JÁ — não espera vez na fila pra rodar fetch.
  // Isso paraleliza: enquanto frase 1 toca, frase 2 já está sintetizando.
  const blobPromise = synthesizeSpeech(clean, { voice })
    .catch(err => { console.warn(`[Eme Voice] TTS #${serial} falhou:`, err?.message); throw err })
  speechQueue.push({ text: clean, voice, blobPromise, cancelled: false })
  if (!isPlayingSpeech) playNextInQueue()
}

export function onAllSpeechDone(cb) {
  if (!isPlayingSpeech && speechQueue.length === 0) {
    cb?.()
    return
  }
  allDoneCallback = cb
}

export function cancelSpeech() {
  const hadCb = !!allDoneCallback
  for (const item of speechQueue) item.cancelled = true
  speechQueue.length = 0
  isPlayingSpeech = false
  cleanupAudio()
  // Dispara callback pendente (fila acaba de esvaziar) — em microtask pra
  // permitir transitionTo() síncrono antes (ex: stop() já vai pra OFF).
  if (hadCb) {
    const cb = allDoneCallback
    allDoneCallback = null
    Promise.resolve().then(() => cb?.())
  }
}

// Atalho retrocompatível — cancela fila e fala 1x.
export async function speakText(text, { onDone, voice } = {}) {
  cancelSpeech()
  if (!text) { onDone?.(); return }
  enqueueSpeech(text, { voice })
  onAllSpeechDone(() => onDone?.())
}
