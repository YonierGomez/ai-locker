import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, ChevronDown, X, Check } from 'lucide-react'
import { ALL_MODELS, AI_MODELS_BY_GROUP } from '../utils/models'

// Per-provider curated model lists — March 2026 (shown when providerFilter is set)
const PROVIDER_MODEL_GROUPS = {
  openai: [
    { group: 'GPT-5 (latest)',        models: [{ id: 'gpt-5.4', label: 'GPT-5.4' }, { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' }] },
    { group: 'GPT-4.1',               models: [{ id: 'gpt-4.1', label: 'GPT-4.1' }, { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' }, { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' }] },
    { group: 'GPT-4o',                models: [{ id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o Mini' }] },
    { group: 'Reasoning (o-series)',   models: [{ id: 'o3', label: 'o3' }, { id: 'o3-mini', label: 'o3-mini' }, { id: 'o1', label: 'o1' }, { id: 'o1-mini', label: 'o1-mini' }, { id: 'o1-pro', label: 'o1-pro' }] },
  ],
  anthropic: [
    { group: 'Claude 4.6 (latest)',   models: [{ id: 'claude-opus-4-6', label: 'Claude Opus 4.6' }, { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' }] },
    { group: 'Claude 4.5',            models: [{ id: 'claude-opus-4-5', label: 'Claude Opus 4.5' }, { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }, { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }] },
    { group: 'Claude 3.7',            models: [{ id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' }, { id: 'claude-3-7-sonnet-20250219:thinking', label: 'Claude 3.7 Sonnet (Thinking)' }] },
    { group: 'Claude 3.5',            models: [{ id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }, { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }] },
    { group: 'Claude 3',              models: [{ id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }, { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }] },
  ],
  gemini: [
    { group: 'Gemini 3 (latest)',      models: [{ id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' }, { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' }, { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' }] },
    { group: 'Gemini 2.5',             models: [{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }, { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }, { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }] },
    { group: 'Gemini 2.0 (deprecated)', models: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' }] },
    { group: 'Gemini 1.5 (deprecated)', models: [{ id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }, { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }, { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' }] },
  ],
  bedrock: [
    { group: 'Anthropic Claude (latest)', models: [
      { id: 'anthropic.claude-opus-4-6-v1:0',   label: 'Claude Opus 4.6' },
      { id: 'anthropic.claude-sonnet-4-6-v1:0', label: 'Claude Sonnet 4.6' },
      { id: 'anthropic.claude-3-7-sonnet-20250219-v1:0', label: 'Claude 3.7 Sonnet' },
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet v2' },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  label: 'Claude 3.5 Haiku' },
    ]},
    { group: 'Amazon Nova 2', models: [
      { id: 'amazon.nova-2-lite-v1:0', label: 'Nova 2 Lite' },
      { id: 'amazon.nova-2-pro-v1:0',  label: 'Nova 2 Pro (Preview)' },
    ]},
    { group: 'Amazon Nova 1', models: [
      { id: 'amazon.nova-pro-v1:0',   label: 'Nova Pro' },
      { id: 'amazon.nova-lite-v1:0',  label: 'Nova Lite' },
      { id: 'amazon.nova-micro-v1:0', label: 'Nova Micro' },
    ]},
    { group: 'Meta Llama', models: [
      { id: 'meta.llama3-70b-instruct-v1:0',    label: 'Llama 3 70B' },
      { id: 'meta.llama3-8b-instruct-v1:0',     label: 'Llama 3 8B' },
      { id: 'meta.llama3-2-90b-instruct-v1:0',  label: 'Llama 3.2 90B' },
    ]},
    { group: 'Mistral', models: [
      { id: 'mistral.mistral-large-2402-v1:0',  label: 'Mistral Large' },
      { id: 'mistral.mixtral-8x7b-instruct-v0:1', label: 'Mixtral 8x7B' },
    ]},
  ],
}

export default function ModelSelector({ value, onChange, placeholder = 'Any model', providerFilter }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 300 })
  const inputRef = useRef(null)
  const triggerRef = useRef(null)

  // Calculate dropdown position
  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById('model-selector-portal')?.contains(e.target)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Update position on scroll/resize
  useEffect(() => {
    if (open) {
      window.addEventListener('scroll', updatePos, true)
      window.addEventListener('resize', updatePos)
      return () => {
        window.removeEventListener('scroll', updatePos, true)
        window.removeEventListener('resize', updatePos)
      }
    }
  }, [open, updatePos])

  // Pick the model pool based on providerFilter
  const baseGroups = (providerFilter && PROVIDER_MODEL_GROUPS[providerFilter])
    ? PROVIDER_MODEL_GROUPS[providerFilter]
    : AI_MODELS_BY_GROUP
  const baseFlat = baseGroups.flatMap(g => g.models.map(m => ({ ...m, group: g.group })))

  const filtered = query.trim()
    ? baseFlat.filter(m =>
        m.label.toLowerCase().includes(query.toLowerCase()) ||
        m.id.toLowerCase().includes(query.toLowerCase()) ||
        m.group.toLowerCase().includes(query.toLowerCase())
      )
    : baseFlat

  // Group filtered results
  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = []
    acc[m.group].push(m)
    return acc
  }, {})

  const selectedModel = baseFlat.find(m => m.id === value) || ALL_MODELS.find(m => m.id === value)
  const displayValue = selectedModel ? selectedModel.label : value || ''

  const handleSelect = (modelId) => {
    onChange(modelId)
    setOpen(false)
    setQuery('')
  }

  const handleAddCustom = () => {
    if (query.trim()) {
      onChange(query.trim())
      setOpen(false)
      setQuery('')
    }
  }

  const handleOpen = () => {
    updatePos()
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const dropdown = open ? createPortal(
    <div
      id="model-selector-portal"
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 99999,
        background: 'rgba(10, 10, 18, 0.98)',
        backdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.08) inset',
        overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <Search size={14} color="rgba(255,255,255,0.35)" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search models…"
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'rgba(255,255,255,0.9)', fontSize: 13,
            fontFamily: 'var(--font-sans)', flex: 1,
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Enter' && filtered.length === 0 && query.trim()) handleAddCustom()
            if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].id)
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Results list */}
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              No models found for "{query}"
            </div>
            <button
              onClick={handleAddCustom}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)',
                borderRadius: 10, padding: '7px 12px',
                color: '#409CFF', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Plus size={13} /> Use "{query}"
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([group, models]) => (
            <div key={group}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                padding: '10px 16px 4px',
              }}>
                {group}
              </div>
              {models.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: value === m.id ? 'rgba(0,122,255,0.15)' : 'transparent',
                    transition: 'background 0.1s',
                    gap: 8,
                  }}
                  onMouseEnter={e => { if (value !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (value !== m.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: 13,
                    color: value === m.id ? '#409CFF' : 'rgba(255,255,255,0.85)',
                    fontWeight: value === m.id ? 500 : 400,
                    flex: 1,
                  }}>
                    {m.label}
                  </span>
                  {value === m.id && <Check size={13} color="#409CFF" />}
                </div>
              ))}
            </div>
          ))
        )}

        {/* Add custom option */}
        {query.trim() && Object.keys(grouped).length > 0 && !baseFlat.find(m => m.id === query.trim()) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 16px' }}>
            <button
              onClick={handleAddCustom}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.2)',
                borderRadius: 8, padding: '5px 10px',
                color: '#409CFF', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Plus size={12} /> Use "{query.trim()}"
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* Trigger button */}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(0,122,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(0,122,255,0.12)' : 'none',
          minHeight: 42,
          userSelect: 'none',
        }}
      >
        <span style={{
          flex: 1,
          color: displayValue ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
          fontFamily: displayValue ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: displayValue ? 13 : 14,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex', flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        )}
        <ChevronDown
          size={14}
          color="rgba(255,255,255,0.35)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </div>

      {/* Portal dropdown */}
      {dropdown}
    </>
  )
}
