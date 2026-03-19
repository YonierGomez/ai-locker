// ── Token estimation utility ──────────────────────────────────
// Uses gpt-tokenizer for accurate GPT-family token counts.
// Falls back to character-based estimation for other models.

let encoder = null

async function getEncoder() {
  if (!encoder) {
    try {
      const { encode } = await import('gpt-tokenizer')
      encoder = encode
    } catch {
      encoder = null
    }
  }
  return encoder
}

/**
 * Count tokens accurately using gpt-tokenizer (cl100k_base = GPT-4/3.5)
 * Falls back to ~4 chars/token estimate
 */
export async function countTokens(text) {
  if (!text) return 0
  try {
    const encode = await getEncoder()
    if (encode) {
      return encode(text).length
    }
  } catch {}
  // Fallback: ~4 chars per token (rough estimate)
  return Math.ceil(text.length / 4)
}

/**
 * Synchronous fast estimate: ~4 chars/token
 */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Format token count with cost estimate
 */
export function formatTokens(count) {
  if (count < 1000) return `~${count} tokens`
  return `~${(count / 1000).toFixed(1)}k tokens`
}

/**
 * Get token color based on count
 */
export function getTokenColor(count) {
  if (count < 500) return 'var(--green)'
  if (count < 2000) return 'var(--teal)'
  if (count < 8000) return 'var(--orange)'
  return 'var(--pink)'
}

/**
 * Estimate cost for common models (per 1M input tokens, USD)
 */
const MODEL_COSTS = {
  'gpt-4o': 2.50,
  'gpt-4o-mini': 0.15,
  'gpt-4.1': 2.00,
  'gpt-4.1-mini': 0.40,
  'gpt-4.1-nano': 0.10,
  'gpt-5.4': 5.00,
  'gpt-5.4-mini': 1.00,
  'claude-opus-4-6': 15.00,
  'claude-sonnet-4-6': 3.00,
  'claude-haiku-4-5': 0.80,
  'claude-3-7-sonnet-20250219': 3.00,
  'claude-3-5-sonnet-20241022': 3.00,
  'claude-3-5-haiku-20241022': 0.80,
  'gemini-3.1-pro': 3.50,
  'gemini-3-flash': 0.075,
  'gemini-2.5-pro': 1.25,
  'gemini-2.0-flash': 0.075,
  'gemini-1.5-pro': 1.25,
  'gemini-1.5-flash': 0.075,
}

export function estimateCost(tokenCount, modelId) {
  const costPer1M = MODEL_COSTS[modelId]
  if (!costPer1M || !tokenCount) return null
  const cost = (tokenCount / 1_000_000) * costPer1M
  if (cost < 0.001) return '<$0.001'
  return `$${cost.toFixed(4)}`
}
