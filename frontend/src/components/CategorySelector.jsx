import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../utils/api'
import toast from 'react-hot-toast'

export default function CategorySelector({ value, onChange }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [newColor, setNewColor] = useState('#007AFF')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 200, maxHeight: 360, openUpward: false })
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const { data } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const categories = data?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      onChange(cat.name)
      setNewCat('')
      toast.success(`Category "${cat.name}" created`)
    },
    onError: (e) => toast.error(e.message),
  })

  const updatePos = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const minWidth = 280
      const margin = 12
      const estimatedHeight = 420
      const width = Math.min(Math.max(rect.width, minWidth), viewportW - margin * 2)
      const scrollX = window.scrollX
      const scrollY = window.scrollY
      let left = rect.left + scrollX
      const maxLeft = scrollX + viewportW - width - margin
      const minLeft = scrollX + margin
      if (left > maxLeft) left = maxLeft
      if (left < minLeft) left = minLeft

      const spaceBelow = viewportH - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow
      const maxHeight = Math.max(220, Math.min(estimatedHeight, (openUpward ? spaceAbove : spaceBelow) - 6))
      const top = openUpward
        ? rect.top + scrollY - maxHeight - 6
        : rect.bottom + scrollY + 6

      setDropdownPos({ top, left, width, maxHeight, openUpward })
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById('cat-selector-portal')?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const reposition = () => updatePos()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  const selectedCat = categories.find(c => c.name === value)

  const handleOpen = () => {
    updatePos()
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const QUICK_COLORS = ['#007AFF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5AC8FA']

  return (
    <>
      <div ref={triggerRef} onClick={handleOpen} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-secondary)', border: `1px solid ${open ? 'rgba(0,122,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer',
        boxShadow: open ? '0 0 0 3px rgba(0,122,255,0.12)' : 'none', minHeight: 42, userSelect: 'none',
      }}>
        {selectedCat && <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedCat.color, flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 14, color: value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }}>
          {value || 'Select category…'}
        </span>
        <ChevronDown size={14} color="rgba(255,255,255,0.35)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>

      {open && createPortal(
        <div id="cat-selector-portal" style={{
          position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width,
          zIndex: 99999, background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14,
          boxShadow: '0 24px 70px rgba(0,0,0,0.7)', overflow: 'hidden',
          maxHeight: dropdownPos.maxHeight,
          display: 'flex',
          flexDirection: 'column',
          transformOrigin: dropdownPos.openUpward ? 'bottom left' : 'top left',
        }}>
          {/* Existing categories */}
          <div style={{ flex: 1, minHeight: 120, overflowY: 'auto', padding: '6px 0' }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => { onChange(cat.name); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer',
                background: value === cat.name ? 'rgba(0,122,255,0.15)' : 'transparent',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => { if (value !== cat.name) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (value !== cat.name) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: value === cat.name ? '#409CFF' : 'rgba(255,255,255,0.9)', flex: 1 }}>{cat.name}</span>
                {value === cat.name && <Check size={12} color="#409CFF" />}
              </div>
            ))}
          </div>

          {/* Create new category */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              New Category
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                ref={inputRef}
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Category name…"
                onKeyDown={e => { if (e.key === 'Enter' && newCat.trim()) createMutation.mutate({ name: newCat.trim(), color: newColor }) }}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 10px', color: 'rgba(255,255,255,0.9)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                  {QUICK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: c,
                        border: newColor === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: newColor === c ? '0 0 0 1px rgba(0,0,0,0.4)' : 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  <label style={{ position: 'relative', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>+</span>
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </label>
                </div>
                <button
                  onClick={() => newCat.trim() && createMutation.mutate({ name: newCat.trim(), color: newColor })}
                  disabled={!newCat.trim()}
                  style={{
                    background: newCat.trim() ? 'rgba(0,122,255,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${newCat.trim() ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 8,
                    padding: '6px 10px',
                    color: newCat.trim() ? '#409CFF' : 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    cursor: newCat.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <Plus size={11} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
