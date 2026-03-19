import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../utils/api'
import toast from 'react-hot-toast'

export default function CategorySelector({ value, onChange }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [newColor, setNewColor] = useState('#007AFF')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 200 })
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
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
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

  const selectedCat = categories.find(c => c.name === value)

  const handleOpen = () => { updatePos(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }

  const QUICK_COLORS = ['#007AFF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5AC8FA']

  return (
    <>
      <div ref={triggerRef} onClick={handleOpen} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(0,122,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
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
          position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 240),
          zIndex: 99999, background: 'rgba(10,10,18,0.98)', backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)', overflow: 'hidden',
        }}>
          {/* Existing categories */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '6px 0' }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => { onChange(cat.name); setOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                background: value === cat.name ? 'rgba(0,122,255,0.15)' : 'transparent',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => { if (value !== cat.name) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (value !== cat.name) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: value === cat.name ? '#409CFF' : 'rgba(255,255,255,0.85)', flex: 1 }}>{cat.name}</span>
                {value === cat.name && <Check size={12} color="#409CFF" />}
              </div>
            ))}
          </div>

          {/* Create new category */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              New Category
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Category name…"
                onKeyDown={e => { if (e.key === 'Enter' && newCat.trim()) createMutation.mutate({ name: newCat.trim(), color: newColor }) }}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.9)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {QUICK_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                ))}
                <label style={{ position: 'relative', width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>+</span>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
              </div>
              <button onClick={() => newCat.trim() && createMutation.mutate({ name: newCat.trim(), color: newColor })} disabled={!newCat.trim()} style={{ background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.3)', borderRadius: 8, padding: '5px 10px', color: '#409CFF', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={11} /> Add
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
