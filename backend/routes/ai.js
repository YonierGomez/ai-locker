const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { getDb } = require('../config/database')

// ── AI Config ────────────────────────────────────────────────
// Priority: env vars > DB values > defaults
// If an env var is set, it always wins over what's stored in the DB.
async function getAIConfig() {
  const db = getDb()
  const rows = await db('settings').select('*')
  const s = {}
  rows.forEach(r => { s[r.key] = r.value })

  // Env var helpers — return undefined if not set so we can fall through to DB
  const env = {
    provider:    process.env.AI_PROVIDER,
    apiKey:      process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY,
    baseUrl:     process.env.AI_BASE_URL,
    model:       process.env.AI_MODEL,
    awsRegion:   process.env.AI_AWS_REGION || process.env.AWS_REGION,
    awsKeyId:    process.env.AI_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    awsSecret:   process.env.AI_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  }

  return {
    provider:           env.provider    || s.ai_provider           || 'openrouter',
    apiKey:             env.apiKey      || s.ai_api_key             || '',
    baseUrl:            env.baseUrl     || s.ai_base_url            || 'https://openrouter.ai/api/v1',
    model:              env.model       || s.ai_model               || s.default_model || 'openai/gpt-4o-mini',
    awsRegion:          env.awsRegion   || s.ai_aws_region          || 'us-east-1',
    awsAccessKeyId:     env.awsKeyId    || s.ai_aws_access_key_id   || '',
    awsSecretAccessKey: env.awsSecret   || s.ai_aws_secret_access_key || '',
  }
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Promptly Assistant, an AI integrated into Promptly — an app for managing AI prompts, skills, steering configs, MCP server configs, and shell commands.

Your job:
1. When the user wants to CREATE something, extract structured data and respond with JSON.
2. When the user wants to IMPROVE content, rewrite it and respond with JSON.
3. For everything else (questions, chat), respond with a friendly JSON message.

ALWAYS respond with ONLY valid JSON — no markdown fences, no extra text. Just raw JSON.

═══ CREATE responses ═══
{
  "action": "create",
  "type": "prompt" | "skill" | "steering" | "mcp" | "command",
  "item": { ...fields... },
  "message": "Brief friendly confirmation"
}

Schemas:
- prompt:   { title, content, description?, category?, model?, temperature? }
- skill:    { title, content, description?, category?, trigger_phrase? }
- steering: { title, content, description?, scope?: "global"|"project"|"session", priority?: 0-10 }
- mcp:      { title, server_name, config_json (valid JSON string), description?, transport?: "stdio"|"sse" }
- command:  { title, command, description?, shell?: "bash"|"zsh"|"sh"|"fish"|"powershell"|"cmd", platform?: "all"|"linux"|"macos"|"windows", category? }

═══ IMPROVE responses ═══
{
  "action": "improve",
  "content": "Improved content",
  "changes": ["bullet list of what changed"],
  "message": "Brief explanation"
}

═══ TEST responses (when testing a prompt) ═══
{
  "action": "test",
  "response": "AI response to the prompt",
  "message": "Tested successfully"
}

═══ CHAT responses ═══
{
  "action": "chat",
  "message": "Your response"
}

Rules:
- category must be one of: general, coding, writing, analysis, creative, system, research
- For commands, infer shell/platform from context (e.g. "powershell Get-ChildItem" → shell: powershell, platform: windows)
- For prompts and skills, write professional, detailed content (don't be lazy — flesh it out)
- Be friendly and concise in messages
- If unclear what the user wants, ask for clarification with action:"chat"

Examples:
User: "save tree command" →
{ "action":"create","type":"command","item":{"title":"tree","command":"tree","description":"Display directory/file structure as a tree","shell":"bash","platform":"all","category":"system"},"message":"Saved! The \`tree\` command shows your directory structure as a tree." }

User: "create a React code review prompt" →
{ "action":"create","type":"prompt","item":{"title":"React Code Review","content":"You are an expert React developer. Review the following React code and provide detailed feedback on: ...", "description":"Comprehensive React code review prompt","category":"coding"},"message":"Created a detailed React code review prompt!" }`

// ── Provider adapters ────────────────────────────────────────

async function callOpenRouter(cfg, messages) {
  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
      'HTTP-Referer': 'https://promptly.app',
      'X-Title': 'Promptly',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter/OpenAI API error ${response.status}: ${err}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || '{}'
}

async function callAnthropic(cfg, messages) {
  const system = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2000,
      system,
      messages: chatMessages,
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }
  const data = await response.json()
  return data.content?.[0]?.text || '{}'
}

async function callGemini(cfg, messages) {
  const system = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages.filter(m => m.role !== 'system')

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const modelId = cfg.model.replace(/^models\//, '')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${cfg.apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${err}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
}

async function callBedrock(cfg, messages) {
  const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')

  if (!cfg.awsAccessKeyId || !cfg.awsSecretAccessKey) {
    throw new Error('AWS credentials not configured. Add Access Key ID and Secret in Settings → AI Integration.')
  }

  const client = new BedrockRuntimeClient({
    region: cfg.awsRegion,
    credentials: {
      accessKeyId: cfg.awsAccessKeyId,
      secretAccessKey: cfg.awsSecretAccessKey,
    },
  })

  const system = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages.filter(m => m.role !== 'system')
  const isClaudeModel = cfg.model.startsWith('anthropic.')

  let requestBody
  if (isClaudeModel) {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      system,
      messages: chatMessages,
    }
  } else {
    // Amazon Nova / Titan format
    requestBody = {
      messages: chatMessages.map(m => ({
        role: m.role,
        content: [{ text: m.content }],
      })),
      system: [{ text: system }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.3 },
    }
  }

  const command = new InvokeModelCommand({
    modelId: cfg.model,
    body: JSON.stringify(requestBody),
    contentType: 'application/json',
    accept: 'application/json',
  })

  const response = await client.send(command)
  const body = JSON.parse(new TextDecoder().decode(response.body))

  if (isClaudeModel) {
    return body.content?.[0]?.text || '{}'
  }
  return body.output?.message?.content?.[0]?.text || '{}'
}

// ── Route AI call to the correct provider ────────────────────
async function callAI(cfg, messages) {
  switch (cfg.provider) {
    case 'anthropic': return callAnthropic(cfg, messages)
    case 'gemini':    return callGemini(cfg, messages)
    case 'bedrock':   return callBedrock(cfg, messages)
    case 'openai':    return callOpenRouter({ ...cfg, baseUrl: 'https://api.openai.com/v1' }, messages)
    default:          return callOpenRouter(cfg, messages) // openrouter + custom
  }
}

// ── POST /api/ai/generate ────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { message, history = [] } = req.body
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' })

    const cfg = await getAIConfig()
    if (!cfg.apiKey && cfg.provider !== 'bedrock') {
      return res.status(422).json({
        error: 'AI API key not configured',
        hint: 'Add your API key in Settings → AI Integration',
      })
    }
    if (cfg.provider === 'bedrock' && (!cfg.awsAccessKeyId || !cfg.awsSecretAccessKey)) {
      return res.status(422).json({
        error: 'AWS credentials not configured',
        hint: 'Add AWS Access Key ID and Secret in Settings → AI Integration',
      })
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    const rawContent = await callAI(cfg, messages)

    let parsed
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      parsed = { action: 'chat', message: rawContent }
    }

    res.json({ ...parsed, raw: rawContent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/ai/save ────────────────────────────────────────
router.post('/save', async (req, res) => {
  try {
    const db = getDb()
    const { type, item } = req.body
    if (!type || !item) return res.status(400).json({ error: 'type and item are required' })

    const id = uuidv4()
    const now = new Date().toISOString()

    if (type === 'command') {
      await db('commands').insert({ id, title: item.title, command: item.command, description: item.description || null, shell: item.shell || 'bash', platform: item.platform || 'all', category: item.category || 'general', is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
      return res.status(201).json({ saved: await db('commands').where({ id }).first(), type })
    }
    if (type === 'prompt') {
      await db('prompts').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', model: item.model || null, temperature: item.temperature ?? 0.7, is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
      return res.status(201).json({ saved: await db('prompts').where({ id }).first(), type })
    }
    if (type === 'skill') {
      await db('skills').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', trigger_phrase: item.trigger_phrase || null, is_active: 1, is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
      return res.status(201).json({ saved: await db('skills').where({ id }).first(), type })
    }
    if (type === 'steering') {
      await db('steering').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', scope: item.scope || 'global', priority: item.priority || 0, is_active: 1, is_favorite: 0, created_at: now, updated_at: now })
      return res.status(201).json({ saved: await db('steering').where({ id }).first(), type })
    }
    if (type === 'mcp') {
      await db('mcp_configs').insert({ id, title: item.title, server_name: item.server_name, description: item.description || null, config_json: typeof item.config_json === 'string' ? item.config_json : JSON.stringify(item.config_json), transport: item.transport || 'stdio', is_active: 1, is_favorite: 0, created_at: now, updated_at: now })
      return res.status(201).json({ saved: await db('mcp_configs').where({ id }).first(), type })
    }

    res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/ai/bulk-save ───────────────────────────────────
router.post('/bulk-save', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' })

    const results = []
    for (const { type, item } of items) {
      try {
        const db = getDb()
        const id = uuidv4()
        const now = new Date().toISOString()
        if (type === 'command')  await db('commands').insert({ id, title: item.title, command: item.command, description: item.description || null, shell: item.shell || 'bash', platform: item.platform || 'all', category: item.category || 'general', is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
        else if (type === 'prompt')   await db('prompts').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', model: item.model || null, temperature: item.temperature ?? 0.7, is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
        else if (type === 'skill')    await db('skills').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', trigger_phrase: item.trigger_phrase || null, is_active: 1, is_favorite: 0, use_count: 0, created_at: now, updated_at: now })
        else if (type === 'steering') await db('steering').insert({ id, title: item.title, content: item.content, description: item.description || null, category: item.category || 'general', scope: item.scope || 'global', priority: item.priority || 0, is_active: 1, is_favorite: 0, created_at: now, updated_at: now })
        else if (type === 'mcp')      await db('mcp_configs').insert({ id, title: item.title, server_name: item.server_name, description: item.description || null, config_json: typeof item.config_json === 'string' ? item.config_json : JSON.stringify(item.config_json), transport: item.transport || 'stdio', is_active: 1, is_favorite: 0, created_at: now, updated_at: now })
        results.push({ id, type, title: item.title, ok: true })
      } catch (e) {
        results.push({ type, title: item?.title, ok: false, error: e.message })
      }
    }
    res.json({ results, saved: results.filter(r => r.ok).length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ai/config ───────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const cfg = await getAIConfig()
    const isConfigured = cfg.provider === 'bedrock'
      ? !!(cfg.awsAccessKeyId && cfg.awsSecretAccessKey)
      : !!cfg.apiKey
    res.json({
      configured: isConfigured,
      provider: cfg.provider,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
