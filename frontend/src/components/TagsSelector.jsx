import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Check, Tag } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '../utils/api'
import toast from 'react-hot-toast'

const QUICK_COLORS = ['#007AFF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5AC8FA', '#5E5CE6', '#FFD60A']

export default function TagsSelector({ value = [], onChange }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newColor, setNewColor] = useState('#007AFF')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 300 })
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const { data } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })
  const allTags = data?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => tagsApi.create(data),
    onSuccess: (tag) => {
      qc.invalidateQueries({ queryKey: ['tags'] })
      onChange([...value, tag.id])
      setNewTag('')
      toast.success(`Tag "${tag.name}" created`)
    },
    onError: (e) => toast.error(e.message),
  })

  const updatePos = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: Math.max(rect.width, 280) })
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById('tags-selector-portal')?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleTag = (tagId) => {
    if (value.includes(tagId)) {
      onChange(value.filter(id => id !== tagId))
    } else {
      onChange([...value, tagId])
    }
  }

  const selectedTags = allTags.filter(t => value.includes(t.id))

  return (
    <>
      <div ref={triggerRef} onClick={() => { updatePos(); setOpen(o => !o) }} style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(0,122,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer',
        boxShadow: open ? '0 0 0 3px rgba(0,122,255,0.12)' : 'none', minHeight: 42,
      }}>
        {selectedTags.length === 0 ? (
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag size={13} /> Add tags…
          </span>
        ) : (
          selectedTags.map(tag => (
            <span key={tag.id} onClick={e => { e.stopPropagation(); toggleTag(tag.id) }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: `${tag.color}20`, border: `1px solid ${tag.color}50`,
              borderRadius: 20, padding: '2px 8px 2px 6px',
              fontSize: 11, color: tag.color, fontWeight: 500, cursor: 'pointer',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color }} />
              {tag.name}
              <X size={9} style={{ opacity: 0.7 }} />
            </span>
          ))
        )}
        {selectedTags.length > 0 && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
            {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {open && createPortal(
        <div id="tags-selector-portal" style={{
          position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width,
          zIndex: 99999, background: 'rgba(10,10,18,0.98)', backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)', overflow: 'hidden',
        }}>
          {/* Existing tags */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '6px 0' }}>
            {allTags.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                No tags yet — create one below
              </div>
            ) : (
              allTags.map(tag => (
                <div key={tag.id} onClick={() => toggleTag(tag.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                  background: value.includes(tag.id) ? `${tag.color}18` : 'transparent',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { if (!value.includes(tag.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!value.includes(tag.id)) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: value.includes(tag.id) ? tag.color : 'rgba(255,255,255,0.85)', flex: 1, fontWeight: value.includes(tag.id) ? 500 : 400 }}>
                    {tag.name}
                  </span>
                  {value.includes(tag.id) && <Check size={12} color={tag.color} />}
                </div>
              ))
            )}
          </div>

          {/* Create new tag */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              New Tag
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Tag name…"
                onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) createMutation.mutate({ name: newTag.trim(), color: newColor }) }}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.9)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {QUICK_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                ))}
                <label style={{ position: 'relative', width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>+</span>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
              </div>
              <button onClick={() => newTag.trim() && createMutation.mutate({ name: newTag.trim(), color: newColor })} disabled={!newTag.trim()} style={{ background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.3)', borderRadius: 8, padding: '5px 10px', color: '#409CFF', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
