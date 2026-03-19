import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, ChevronDown, X, Check } from 'lucide-react'
import { ALL_MODELS } from '../utils/models'

export default function ModelSelector({ value, onChange, placeholder = 'Any model' }) {
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

  const filtered = query.trim()
    ? ALL_MODELS.filter(m =>
        m.label.toLowerCase().includes(query.toLowerCase()) ||
        m.id.toLowerCase().includes(query.toLowerCase()) ||
        m.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_MODELS

  // Group filtered results
  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = []
    acc[m.group].push(m)
    return acc
  }, {})

  const selectedModel = ALL_MODELS.find(m => m.id === value)
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
        {query.trim() && Object.keys(grouped).length > 0 && !ALL_MODELS.find(m => m.id === query.trim()) && (
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
