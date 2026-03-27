import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { promptsApi, skillsApi, steeringApi, commandsApi } from '../utils/api'
import { MessageSquare, Zap, Navigation, Settings, LayoutDashboard, TerminalSquare, Search, ArrowRight, Hash, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

function McpIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none">
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'nav-dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, color: '#007AFF', type: 'page' },
  { id: 'nav-prompts', label: 'Prompts', path: '/prompts', icon: MessageSquare, color: '#007AFF', type: 'page' },
  { id: 'nav-skills', label: 'Skills', path: '/skills', icon: Zap, color: '#FF9500', type: 'page' },
  { id: 'nav-steering', label: 'Steering', path: '/steering', icon: Navigation, color: '#BF5AF2', type: 'page' },
  { id: 'nav-commands', label: 'Commands', path: '/commands', icon: TerminalSquare, color: '#5AC8FA', type: 'page' },
  { id: 'nav-settings', label: 'Settings', path: '/settings', icon: Settings, color: '#8E8E93', type: 'page' },
  { id: 'nav-ai', label: 'AI Session', path: '/ai', icon: Hash, color: '#30D158', type: 'page' },
]

function highlight(text, query) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'color-mix(in srgb, var(--blue) 30%, transparent)', color: 'var(--blue-light)', borderRadius: 3 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// Items that can be copied directly (have copyable content)
function getCopyContent(item) {
  if (item.type === 'prompt') return item.item?.content
  if (item.type === 'skill') return item.item?.content
  if (item.type === 'command') return item.item?.command
  if (item.type === 'steering') return item.item?.content
  return null
}

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [copiedId, setCopiedId] = useState(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { data: prompts } = useQuery({
    queryKey: ['prompts', { limit: 200 }],
    queryFn: () => promptsApi.list({ limit: 200 }),
    enabled: isOpen,
    staleTime: 30000,
  })
  const { data: skills } = useQuery({
    queryKey: ['skills', { limit: 100 }],
    queryFn: () => skillsApi.list({ limit: 100 }),
    enabled: isOpen,
    staleTime: 30000,
  })
  const { data: commands } = useQuery({
    queryKey: ['commands', { limit: 100 }],
    queryFn: () => commandsApi.list({ limit: 100 }),
    enabled: isOpen,
    staleTime: 30000,
  })
  const { data: steering } = useQuery({
    queryKey: ['steering', { limit: 100 }],
    queryFn: () => steeringApi.list({ limit: 100 }),
    enabled: isOpen,
    staleTime: 30000,
  })

  // Build combined searchable list
  const allItems = [
    ...NAV_ITEMS,
    ...(prompts?.data || []).map(p => ({ id: p.id, label: p.title, description: p.description || p.content?.slice(0, 60), path: '/prompts', icon: MessageSquare, color: '#007AFF', type: 'prompt', item: p })),
    ...(skills?.data || []).map(s => ({ id: s.id, label: s.title, description: s.description, path: '/skills', icon: Zap, color: '#FF9500', type: 'skill', item: s })),
    ...(commands?.data || []).map(c => ({ id: c.id, label: c.title, description: c.command?.slice(0, 60), path: '/commands', icon: TerminalSquare, color: '#5AC8FA', type: 'command', item: c, mono: true })),
    ...(steering?.data || []).map(s => ({ id: s.id, label: s.title, description: s.description, path: '/steering', icon: Navigation, color: '#BF5AF2', type: 'steering', item: s })),
  ]

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label?.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : NAV_ITEMS.slice(0, 8)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIdx(0)
      setCopiedId(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => { setActiveIdx(0) }, [query])

  // Navigate to page
  const handleNavigate = useCallback((item) => {
    navigate(item.path)
    onClose()
  }, [navigate, onClose])

  // Copy content directly
  const handleCopy = useCallback(async (item) => {
    const content = getCopyContent(item)
    if (!content) {
      handleNavigate(item)
      return
    }
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(item.id)
      toast.success(`"${item.label}" copied!`)
      setTimeout(() => {
        setCopiedId(null)
        onClose()
      }, 800)
    } catch {
      toast.error('Failed to copy')
    }
  }, [handleNavigate, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIdx]) handleCopy(filtered[activeIdx])
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        if (filtered[activeIdx]) handleNavigate(filtered[activeIdx])
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, filtered, activeIdx, handleCopy, handleNavigate, onClose])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const typeLabel = { page: 'Page', prompt: 'Prompt', skill: 'Skill', command: 'Command', steering: 'Steering' }
  const typeColors = { page: '#8E8E93', prompt: '#007AFF', skill: '#FF9500', command: '#5AC8FA', steering: '#BF5AF2' }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 720,
          background: 'rgba(22,22,26,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'paletteIn 0.15s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search prompts, commands, pages…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 6px' }}>esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}

          {!query && (
            <div style={{ padding: '6px 18px 2px', fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Navigation
            </div>
          )}

          {filtered.map((item, idx) => {
            const Icon = item.icon
            const isActive = idx === activeIdx
            const copyable = !!getCopyContent(item)
            const isCopied = copiedId === item.id
            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item)}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 18px', cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: isCopied ? 'rgba(48,209,88,0.15)' : `${item.color}18`,
                  border: `1px solid ${isCopied ? 'rgba(48,209,88,0.3)' : item.color + '30'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCopied ? '#30D158' : item.color,
                  transition: 'all 0.2s',
                }}>
                  {isCopied ? <Check size={14} /> : <Icon size={14} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isCopied ? '#30D158' : 'var(--text-primary)', transition: 'color 0.2s' }}>
                    {highlight(item.label, query)}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, fontFamily: item.mono ? 'var(--font-mono)' : undefined }}>
                      {highlight(item.description, query)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: typeColors[item.type], background: `${typeColors[item.type]}18`, border: `1px solid ${typeColors[item.type]}30`, borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                    {typeLabel[item.type]}
                  </span>
                  {isActive && copyable && (
                    <Copy size={11} color="rgba(255,255,255,0.3)" />
                  )}
                  {isActive && !copyable && (
                    <ArrowRight size={12} color="rgba(255,255,255,0.3)" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
        }}>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>↵</kbd> copy</span>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>tab</kbd> go to page</span>
          <span><kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>esc</kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
