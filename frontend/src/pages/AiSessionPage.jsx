import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { aiApi, settingsApi } from '../utils/api'
import {
  Send, MessageSquare, Zap, Navigation, TerminalSquare,
  Check, Settings, ExternalLink, RefreshCw, Bot, User,
  Trash2, History,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CHAT_STORAGE_KEY = 'ai-chat-history'
const MAX_STORED_MESSAGES = 200

function loadHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(messages) {
  try {
    const toStore = messages
      .filter(m => !m.typing)
      .slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // storage quota exceeded — ignore silently
  }
}

function McpIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none">
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}

const TYPE_META = {
  prompt:   { icon: MessageSquare, color: '#007AFF', label: 'Prompt', path: '/prompts' },
  skill:    { icon: Zap,           color: '#FF9500', label: 'Skill',   path: '/skills' },
  steering: { icon: Navigation,    color: '#BF5AF2', label: 'Steering', path: '/steering' },
  mcp:      { icon: McpIcon,       color: '#30D158', label: 'MCP',    path: '/mcp' },
  command:  { icon: TerminalSquare, color: '#5AC8FA', label: 'Command', path: '/commands' },
}

const SUGGESTIONS = [
  'Save the "tree" command to list directory structure',
  'Create a code review prompt for TypeScript',
  'Add a "Be concise and direct" global steering rule',
  'Create a Git workflow skill that explains branching',
  'Add a "grep -r" command to search file contents recursively',
  'Generate a prompt to explain complex topics simply',
  'Create a debugging skill for Node.js errors',
  'Add a "docker ps" command to list running containers',
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--text-tertiary)',
          animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function ItemPreviewCard({ type, item, onSave, saved }) {
  const meta = TYPE_META[type]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <div style={{
      marginTop: 10,
      background: `${meta.color}0D`,
      border: `1px solid ${meta.color}30`,
      borderRadius: 12,
      padding: '14px 16px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
          <Icon size={13} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{meta.label}</span>
        {saved && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={11} /> Saved
          </span>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
      {item.description && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{item.description}</div>
      )}

      {/* Content preview */}
      {(item.content || item.command) && (
        <div style={{
          fontSize: 12, fontFamily: item.command ? 'var(--font-mono)' : undefined,
          color: 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 8, padding: '8px 10px',
          maxHeight: 120, overflowY: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          marginBottom: 10,
          lineHeight: 1.6,
        }}>
          {(item.content || item.command || '').slice(0, 400)}
          {(item.content || item.command || '').length > 400 ? '…' : ''}
        </div>
      )}

      {/* Meta badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {item.category && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '1px 6px' }}>{item.category}</span>}
        {item.shell && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>{item.shell}</span>}
        {item.platform && item.platform !== 'all' && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '1px 6px' }}>{item.platform}</span>}
        {item.scope && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '1px 6px' }}>{item.scope}</span>}
        {item.trigger_phrase && <span style={{ fontSize: 10, color: 'var(--orange)', background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 4, padding: '1px 6px' }}>trigger: {item.trigger_phrase}</span>}
      </div>

      {!saved && (
        <button
          onClick={onSave}
          className="btn btn-primary btn-sm"
          style={{ gap: 6 }}
        >
          <Check size={13} /> Save to library
        </button>
      )}
    </div>
  )
}

function ChatMessage({ msg, onSave, navigate }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      alignItems: 'flex-start',
      padding: '4px 0',
    }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'color-mix(in srgb, var(--blue) 20%, transparent)' : 'rgba(48,209,88,0.15)',
        border: `1px solid ${isUser ? 'color-mix(in srgb, var(--blue) 30%, transparent)' : 'rgba(48,209,88,0.25)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isUser ? 'var(--blue-light)' : '#30D158',
      }}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '80%', minWidth: 0 }}>
        {msg.typing ? (
          <div style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            padding: '10px 16px',
          }}>
            <TypingDots />
          </div>
        ) : (
          <div style={{
            background: isUser ? 'color-mix(in srgb, var(--blue) 18%, transparent)' : 'var(--glass-bg)',
            border: `1px solid ${isUser ? 'color-mix(in srgb, var(--blue) 28%, transparent)' : 'var(--glass-border)'}`,
            borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            padding: '10px 16px',
          }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </div>

            {/* Item preview */}
            {msg.generatedItem && (
              <ItemPreviewCard
                type={msg.generatedItem.type}
                item={msg.generatedItem.item}
                onSave={() => onSave(msg.id, msg.generatedItem)}
                saved={msg.saved}
              />
            )}

            {/* Navigate after save */}
            {msg.saved && msg.generatedItem && (
              <button
                onClick={() => navigate(TYPE_META[msg.generatedItem.type]?.path)}
                style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--blue-light)' }}
              >
                View in library <ExternalLink size={11} />
              </button>
            )}
          </div>
        )}

        {msg.timestamp && !msg.typing && (
          <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AiSessionPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [messages, setMessages] = useState(() => loadHistory())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const confirmTimerRef = useRef(null)

  const { data: aiConfig } = useQuery({
    queryKey: ['ai-config'],
    queryFn: () => aiApi.config(),
    staleTime: 30000,
    retry: false,
  })

  // Persist history whenever messages change
  useEffect(() => {
    saveHistory(messages)
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsgId = Date.now() + '-user'
    const assistantMsgId = Date.now() + '-assistant'

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: msg, timestamp: new Date().toISOString() },
      { id: assistantMsgId, role: 'assistant', typing: true },
    ])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const result = await aiApi.generate(msg, history)

      setMessages(prev => prev.map(m => {
        if (m.id !== assistantMsgId) return m
        const base = {
          id: assistantMsgId,
          role: 'assistant',
          content: result.message || 'Done!',
          timestamp: new Date().toISOString(),
          typing: false,
          saved: false,
        }
        if (result.action === 'create' && result.type && result.item) {
          base.generatedItem = { type: result.type, item: result.item }
        }
        return base
      }))
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, typing: false, content: `Error: ${err.message}`, timestamp: new Date().toISOString() }
          : m
      ))
      toast.error(err.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSaveItem = async (msgId, { type, item }) => {
    try {
      await aiApi.save(type, item)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, saved: true } : m))
      qc.invalidateQueries({ queryKey: [type + 's'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`${TYPE_META[type]?.label || type} saved to library!`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const clearChat = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTimeout(confirmTimerRef.current)
    setConfirmClear(false)
    setMessages([])
    localStorage.removeItem(CHAT_STORAGE_KEY)
    toast.success('Chat history cleared')
    inputRef.current?.focus()
  }, [confirmClear])

  // Cancel confirm on outside click
  useEffect(() => {
    if (!confirmClear) return
    const handler = () => {
      setConfirmClear(false)
      clearTimeout(confirmTimerRef.current)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [confirmClear])

  useEffect(() => () => clearTimeout(confirmTimerRef.current), [])

  const storedCount = messages.filter(m => !m.typing).length
  const isEmpty = messages.length === 0

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--topbar-height))', padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(145deg, rgba(94,92,230,0.20), rgba(0,122,255,0.12))',
              border: '1px solid rgba(94,92,230,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} color="#5E5CE6" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>AI Chat</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {aiConfig?.configured
                  ? `${aiConfig.model}`
                  : 'Configure AI key in Settings'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {storedCount > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-quaternary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <History size={10} /> {storedCount}
              </span>
            )}
            {messages.length > 0 && (
              <button
                className="btn btn-glass btn-sm"
                onClick={e => { e.stopPropagation(); clearChat() }}
                style={{
                  gap: 5, fontSize: 11, padding: '4px 10px',
                  color: confirmClear ? 'var(--pink)' : undefined,
                  borderColor: confirmClear ? 'rgba(255,55,95,0.4)' : undefined,
                  background: confirmClear ? 'rgba(255,55,95,0.08)' : undefined,
                  transition: 'all 0.15s',
                }}
              >
                <Trash2 size={11} />
                {confirmClear ? 'Confirm?' : 'Clear'}
              </button>
            )}
            <button className="btn btn-glass btn-sm" onClick={() => navigate('/settings')} style={{ gap: 5, fontSize: 11, padding: '4px 10px' }}>
              <Settings size={11} />
              <span style={{ display: 'none' }} className="ai-settings-label">AI Settings</span>
            </button>
          </div>
        </div>

        {/* AI not configured warning */}
        {aiConfig && !aiConfig.configured && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', marginBottom: 16,
            background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)',
            borderRadius: 12, fontSize: 13, color: 'var(--orange)',
          }}>
            <span style={{ flex: 1 }}>No AI API key configured. Choose a provider and add your key in Settings → AI Integration.</span>
            <button className="btn btn-glass btn-sm" onClick={() => navigate('/settings')} style={{ gap: 5, color: 'var(--orange)', borderColor: 'rgba(255,159,10,0.3)' }}>
              Configure <ExternalLink size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Empty state */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24, paddingTop: 40,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(94,92,230,0.15), rgba(0,122,255,0.08))',
              border: '1px solid rgba(94,92,230,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={28} color="#5E5CE6" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Ask me anything</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 340, lineHeight: 1.6 }}>
                I can create prompts, skills, steering rules, MCP configs, and commands from natural language. Just tell me what you need.
              </div>
            </div>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 'min(580px, 92vw)' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={!aiConfig?.configured}
                  style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    cursor: aiConfig?.configured ? 'pointer' : 'not-allowed',
                    fontSize: 12, color: 'var(--text-secondary)',
                    transition: 'all 0.15s',
                    opacity: aiConfig?.configured ? 1 : 0.5,
                  }}
                  onMouseEnter={e => { if (aiConfig?.configured) { e.currentTarget.style.background = 'var(--glass-bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            onSave={handleSaveItem}
            navigate={navigate}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        flexShrink: 0,
        borderTop: '1px solid var(--glass-border)',
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14, padding: '8px 12px',
          transition: 'border-color 0.2s',
        }}
          onFocus={e => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--blue) 40%, transparent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
        >
          <textarea
            className="ai-chat-input"
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={aiConfig?.configured ? 'Ask AI to create a prompt, command, skill…' : 'Configure AI key in Settings first…'}
            disabled={loading || !aiConfig?.configured}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', overflow: 'hidden',
              fontSize: 13, color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)', lineHeight: 1.5,
              minHeight: 22,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || !aiConfig?.configured}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: input.trim() && !loading && aiConfig?.configured ? 'var(--blue)' : 'var(--glass-bg-active)',
              border: 'none', cursor: input.trim() && !loading && aiConfig?.configured ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              color: input.trim() && !loading && aiConfig?.configured ? 'white' : 'var(--text-tertiary)',
            }}
          >
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textAlign: 'center', marginTop: 6 }}>
          AI can make mistakes. Always review before saving.
        </div>
      </div>
    </div>
  )
}
