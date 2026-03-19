// ── AI Models — Updated March 2026 ──────────────────────────────
// Sources: Official provider docs + OpenRouter (March 18, 2026)

export const AI_MODELS_BY_GROUP = [
  {
    group: 'OpenAI',
    models: [
      // GPT-5 family (latest March 2026)
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
      // GPT-4.1 family
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      // GPT-4o family
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      // Reasoning models
      { id: 'o3', label: 'o3' },
      { id: 'o3-mini', label: 'o3-mini' },
      { id: 'o1', label: 'o1' },
      { id: 'o1-mini', label: 'o1-mini' },
    ],
  },
  {
    group: 'Anthropic',
    models: [
      // Claude 4.6 — latest March 2026 (official Anthropic API)
      { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      // Claude 4.5
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
      // Claude 3.7
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-7-sonnet-20250219:thinking', label: 'Claude 3.7 Sonnet (Thinking)' },
      // Claude 3.5
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      // Claude 3
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    ],
  },
  {
    group: 'Google',
    models: [
      // Gemini 3 — latest March 2026 (official Google AI API model codes)
      { id: 'gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro' },
      { id: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash' },
      { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
      // Gemini 2.5 family (stable)
      { id: 'gemini-2.5-pro',       label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash',     label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
      // Gemini 2.0 (deprecated)
      { id: 'gemini-2.0-flash',     label: 'Gemini 2.0 Flash (deprecated)' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (deprecated)' },
      // Gemini 1.5 (deprecated)
      { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro (deprecated)' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (deprecated)' },
    ],
  },
  {
    group: 'Meta / Llama',
    models: [
      // Llama 4 — latest March 2026
      { id: 'llama-4-maverick', label: 'Llama 4 Maverick' },
      { id: 'llama-4-scout', label: 'Llama 4 Scout' },
      // Llama 3.x
      { id: 'llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision' },
      { id: 'llama-3.2-11b-vision-instruct', label: 'Llama 3.2 11B Vision' },
      { id: 'llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
      { id: 'llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    ],
  },
  {
    group: 'xAI / Grok',
    models: [
      { id: 'grok-3-beta', label: 'Grok 3 Beta' },
      { id: 'grok-3-mini-beta', label: 'Grok 3 Mini Beta' },
      { id: 'grok-2-1212', label: 'Grok 2' },
      { id: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
    ],
  },
  {
    group: 'DeepSeek',
    models: [
      { id: 'deepseek-chat-v3-0324', label: 'DeepSeek V3 (Mar 2026)' },
      { id: 'deepseek-r1-0528', label: 'DeepSeek R1 (May 2025)' },
      { id: 'deepseek-r1', label: 'DeepSeek R1' },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B' },
      { id: 'deepseek-v3', label: 'DeepSeek V3' },
    ],
  },
  {
    group: 'Mistral',
    models: [
      { id: 'mistral-small-3.1-24b', label: 'Mistral Small 3.1 24B' },
      { id: 'mistral-large-2411', label: 'Mistral Large 2411' },
      { id: 'mistral-medium-3', label: 'Mistral Medium 3' },
      { id: 'codestral-2501', label: 'Codestral 2501' },
      { id: 'pixtral-large-2411', label: 'Pixtral Large' },
      { id: 'mistral-nemo', label: 'Mistral Nemo' },
    ],
  },
  {
    group: 'Qwen / Alibaba',
    models: [
      { id: 'qwen-max-2025-01-21', label: 'Qwen Max' },
      { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B' },
      { id: 'qwen2.5-vl-72b-instruct', label: 'Qwen 2.5 VL 72B' },
      { id: 'qwq-32b', label: 'QwQ 32B' },
      { id: 'qwen3.5-9b', label: 'Qwen 3.5 9B' },
    ],
  },
  {
    group: 'NVIDIA',
    models: [
      { id: 'nvidia/nemotron-3-super', label: 'Nemotron 3 Super (Mar 2026)' },
      { id: 'nvidia/llama-3.1-nemotron-ultra-253b', label: 'Nemotron Ultra 253B' },
      { id: 'nvidia/llama-3.3-nemotron-super-49b', label: 'Nemotron Super 49B' },
    ],
  },
  {
    group: 'Cohere',
    models: [
      { id: 'command-a-03-2025', label: 'Command A (Mar 2025)' },
      { id: 'command-r-plus-08-2024', label: 'Command R+' },
      { id: 'command-r-08-2024', label: 'Command R' },
    ],
  },
  {
    group: 'ByteDance',
    models: [
      { id: 'bytedance-seed/seed-2.0-lite', label: 'Seed 2.0 Lite (Mar 2026)' },
      { id: 'doubao-1-5-pro-32k', label: 'Doubao 1.5 Pro 32K' },
    ],
  },
  {
    group: 'MiniMax',
    models: [
      { id: 'minimax/minimax-m2.7', label: 'MiniMax M2.7 (Mar 2026)' },
      { id: 'minimax-01', label: 'MiniMax 01' },
    ],
  },
  {
    group: 'Amazon',
    models: [
      { id: 'amazon/nova-pro-v1', label: 'Nova Pro' },
      { id: 'amazon/nova-lite-v1', label: 'Nova Lite' },
      { id: 'amazon/nova-micro-v1', label: 'Nova Micro' },
    ],
  },
  {
    group: 'Microsoft',
    models: [
      { id: 'phi-4', label: 'Phi-4' },
      { id: 'phi-4-mini', label: 'Phi-4 Mini' },
      { id: 'phi-3.5-moe-instruct', label: 'Phi-3.5 MoE' },
    ],
  },
  {
    group: 'AI21 Labs',
    models: [
      { id: 'jamba-1.6-large', label: 'Jamba 1.6 Large' },
      { id: 'jamba-1.6-mini', label: 'Jamba 1.6 Mini' },
    ],
  },
]

// Flat list for search
export const ALL_MODELS = AI_MODELS_BY_GROUP.flatMap(g =>
  g.models.map(m => ({ ...m, group: g.group }))
)

export default AI_MODELS_BY_GROUP
