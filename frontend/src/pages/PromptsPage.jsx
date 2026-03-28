import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, categoriesApi, settingsApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { MessageSquare, Plus, Search, Star, LayoutGrid, List, AlignJustify, Trash2, Check, MousePointer, BookOpen, Layers, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import ModelSelector from '../components/ModelSelector'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import TagsSelector from '../components/TagsSelector'
import { copyToClipboard } from '../utils/clipboard'

const baseDefaultForm = {
  title: '', content: '', description: '', category: 'general',
  model: '', temperature: 0.7, max_tokens: '', tags: []
}

// ── Cheatsheet View ───────────────────────────────────────────
// Grouped by category, shows full prompt content — like a reference sheet
function CheatsheetView({ prompts, onView, onCopy, isSelectMode, selectedIds, onSelect }) {
  const grouped = prompts.reduce((acc, p) => {
    const cat = p.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})
  const CAT_COLORS = ['#007AFF','#BF5AF2','#FF9500','#30D158','#FF375F','#5AC8FA','#FFD60A']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {Object.entries(grouped).map(([cat, items], ci) => {
        const color = CAT_COLORS[ci % CAT_COLORS.length]
        return (
          <div key={cat}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{cat}</span>
              <span style={{ fontSize: 11, color: `${color}70`, background: `${color}15`, padding: '1px 8px', borderRadius: 10 }}>{items.length}</span>
              <div style={{ flex: 1, height: 1, background: `${color}20` }} />
            </div>
            {/* Prompt blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(480px,100%), 1fr))', gap: 12 }}>
              {items.map(p => {
                const sel = selectedIds?.has(p.id)
                return (
                <div key={p.id} data-item-id={p.id} className="glass-card"
                  style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${sel ? 'var(--blue)' : color}`, outline: sel ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: sel ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined, cursor: isSelectMode ? 'pointer' : 'default' }}
                  onClick={() => isSelectMode && onSelect?.(p.id)}>
                  {/* Header */}
                  <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--c-divider)', background: sel ? 'rgba(0,122,255,0.06)' : `${color}08` }}>
                    {isSelectMode && (
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: sel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.title}</span>
                    {p.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
                    {p.use_count > 0 && <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>{p.use_count}×</span>}
                    {!isSelectMode && (
                      <>
                        <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={e => { e.stopPropagation(); onCopy(p) }} title="Copy prompt">
                          <Copy size={11} color="rgba(255,255,255,0.4)" />
                        </button>
                        <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={e => { e.stopPropagation(); onView(p) }} title="Open detail">
                          <MessageSquare size={11} color="rgba(255,255,255,0.4)" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ padding: '10px 14px' }}>
                    {p.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 8px', fontStyle: 'italic' }}>{p.description}</p>}
                    <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto' }}>
                      {p.content}
                    </pre>
                  </div>
                  {/* Model badge if set */}
                  {p.model && (
                    <div style={{ padding: '5px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>Model: {p.model}</span>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Flashcard View ────────────────────────────────────────────
// One prompt at a time — front shows title/description, back shows full content
function FlashcardView({ prompts, onView, onFavorite }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  const current = prompts[idx]
  if (!current) return null

  const prev = () => { setIdx(i => Math.max(0, i - 1)); setFlipped(false) }
  const next = () => { setIdx(i => Math.min(prompts.length - 1, i + 1)); setFlipped(false) }

  const handleCopy = async () => {
    await copyToClipboard(current.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // Keyboard navigation
  const handleKey = (e) => {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
  }

  return (
    <div tabIndex={0} onKeyDown={handleKey} style={{ outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{idx + 1} / {prompts.length}</span>
        <div style={{ width: 200, height: 3, background: 'var(--c-border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((idx + 1) / prompts.length) * 100}%`, background: '#007AFF', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{current.category}</span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%', maxWidth: 640, minHeight: 320,
          cursor: 'pointer', perspective: 1000,
          position: 'relative',
        }}
      >
        <div style={{
          width: '100%', minHeight: 320,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}>
          {/* Front — title + description */}
          <div className="glass-card" style={{
            padding: '40px 36px', minHeight: 320,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', gap: 16,
            borderTop: '3px solid #007AFF',
            position: 'absolute', width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#007AFF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{current.category}</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: 0, lineHeight: 1.3 }}>{current.title}</h2>
            {current.description && <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6, maxWidth: 400 }}>{current.description}</p>}
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8 }}>Click or press Space to reveal</div>
          </div>

          {/* Back — full content */}
          <div className="glass-card" style={{
            padding: '28px 32px', minHeight: 320,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            display: 'flex', flexDirection: 'column', gap: 12,
            borderTop: '3px solid #30D158',
            position: 'absolute', width: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{current.title}</span>
              {current.is_favorite && <Star size={12} color="var(--yellow)" fill="var(--yellow)" />}
              <button className="btn btn-glass btn-sm" onClick={e => { e.stopPropagation(); handleCopy() }} style={{ gap: 5 }}>
                {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, overflowY: 'auto', maxHeight: 240 }}>
              {current.content}
            </pre>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" onClick={prev} disabled={idx === 0} style={{ gap: 6 }}>← Prev</button>
        <button className="btn btn-glass btn-sm" onClick={() => onFavorite(current.id)} style={{ gap: 5 }}>
          <Star size={12} color={current.is_favorite ? 'var(--yellow)' : undefined} fill={current.is_favorite ? 'var(--yellow)' : 'none'} />
        </button>
        <button className="btn btn-glass btn-sm" onClick={() => onView(current)} style={{ gap: 5 }}>
          <MessageSquare size={12} /> Open
        </button>
        <button className="btn btn-glass" onClick={next} disabled={idx === prompts.length - 1} style={{ gap: 6 }}>Next →</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>← → navigate · Space flip</div>
    </div>
  )
}

export default function PromptsPage() {
  const qc = useQueryClient()
  const gridMounted = useRef(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editFullscreen, setEditFullscreen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(baseDefaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('prompts_view') || 'cards')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60000,
  })

  const setView = (mode) => { setViewMode(mode); localStorage.setItem('prompts_view', mode); setSelectedIds(new Set()); setSelectMode(false) }
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = (prompts) => setSelectedIds(new Set(prompts?.map(p => p.id) || []))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => promptsApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} prompt${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => promptsApi.toggleFavorite(id)))
      qc.invalidateQueries({ queryKey: ['prompts'] })
      toast.success(`Updated ${selectedIds.size} prompt${selectedIds.size !== 1 ? 's' : ''}`)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err.message)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['prompts', { search, category, favorite: showFavorites }],
    queryFn: () => promptsApi.list({
      search: search || undefined,
      category: category || undefined,
      favorite: showFavorites ? 'true' : undefined,
      limit: 100,
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => promptsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trash'] })
      toast.success('Prompt created!')
      closeModal()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => promptsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt updated!')
      closeModal()
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => promptsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success('Prompt deleted')
      setDeleteConfirm(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => promptsApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['prompts'] })
      const prev = qc.getQueriesData({ queryKey: ['prompts'] })
      qc.setQueriesData({ queryKey: ['prompts'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(p => p.id === id ? { ...p, is_favorite: !p.is_favorite } : p) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })

  const openCreate = () => {
    setEditItem(null)
    setForm({ ...baseDefaultForm, model: settings?.default_model || '' })
    setModalOpen(true)
  }

  const openEdit = (item, fullscreen = false) => {
    setEditItem(item)
    setEditFullscreen(fullscreen)
    setForm({
      title: item.title || '',
      content: item.content || '',
      description: item.description || '',
      category: item.category || 'general',
      model: item.model || '',
      temperature: item.temperature ?? 0.7,
      max_tokens: item.max_tokens || '',
      tags: item.tags?.map(t => t.id) || [],
      is_favorite: item.is_favorite || false,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditItem(null)
    setEditFullscreen(false)
    setForm(baseDefaultForm)
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    const payload = {
      ...form,
      temperature: parseFloat(form.temperature) || 0.7,
      max_tokens: form.max_tokens ? parseInt(form.max_tokens) : null,
    }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const categories = catsData?.data || []

  const prompts = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const selectionActive = selectedIds.size > 0
  const isSelectMode = selectMode || selectionActive

  return (
    <div className="page-content">
      {/* ── Toolbar (single row, like Skills) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 160 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search prompts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <div style={{ display: 'flex', background: 'var(--c-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { id: 'cards', icon: <LayoutGrid size={14} />, title: 'Card view' },
            { id: 'table', icon: <List size={14} />, title: 'Table view' },
            { id: 'compact', icon: <AlignJustify size={14} />, title: 'Compact view' },
            { id: 'cheatsheet', icon: <BookOpen size={14} />, title: 'Cheatsheet' },
            { id: 'flashcard', icon: <Layers size={14} />, title: 'Flashcard' },
          ].map(({ id, icon, title }) => (
            <button key={id} onClick={() => setView(id)} title={title}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              {icon}
            </button>
          ))}
        </div>
        <button
          className={`btn btn-glass btn-sm ${isSelectMode ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectMode) clearSelection() }}
          style={isSelectMode ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)', gap: 5 } : { gap: 5 }}
        >
          <MousePointer size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={openCreate} style={{ gap: 6 }}>
          <Plus size={15} /> New Prompt
        </button>
      </div>

      {/* Category filters */}
      <div className="filter-bar" style={{ marginBottom: selectionActive ? 10 : 20 }}>
        <button className={`filter-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
        {categories.map(cat => (
          <button key={cat.id} className={`filter-chip ${category === cat.name ? 'active' : ''}`}
            onClick={() => setCategory(category === cat.name ? '' : cat.name)}
            style={category === cat.name ? { background: `${cat.color}20`, borderColor: `${cat.color}50`, color: cat.color } : {}}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectionActive && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', marginBottom: 14,
          background: 'color-mix(in srgb, var(--blue) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)',
          borderRadius: 12, flexWrap: 'wrap',
        }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>
            {selectedIds.size} selected
          </span>
          <button className="btn btn-glass btn-sm" onClick={() => selectAll(prompts)} style={{ gap: 5 }}>Select all {prompts.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-glass btn-sm" onClick={handleBulkFavorite} style={{ gap: 5 }}>
            <Star size={12} /> Toggle favorite
          </button>
          <button
            className="btn btn-sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}
          >
            <Trash2 size={12} /> Delete selected
          </button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto', gap: 5 }}>
            Cancel
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={28} /></div>
          <div className="empty-state-title">
            {search || category || showFavorites ? 'No prompts found' : 'No prompts yet'}
          </div>
          <div className="empty-state-desc">
            {search || category || showFavorites ? 'Try adjusting your filters' : 'Create your first AI prompt to get started'}
          </div>
          {!search && !category && !showFavorites && (
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}>
              <Plus size={15} /> Create Prompt
            </button>
          )}
        </div>
      ) : (
      <div style={{ position: 'relative' }}>
      {viewMode === 'table' ? (
        /* ── Table view ── */
        <div className="glass-card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, width: 36 }}>
                  {isSelectMode && (
                  <div
                    style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.size === prompts.length && prompts.length > 0 ? 'var(--blue)' : 'transparent' }}
                    onClick={() => selectedIds.size === prompts.length ? clearSelection() : selectAll(prompts)}
                  >
                    {selectedIds.size === prompts.length && prompts.length > 0 && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                  )}
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Uses</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Updated</th>
                <th style={{ padding: '10px 14px', width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {prompts.map(prompt => {
                const sel = selectedIds.has(prompt.id)
                return (
                  <tr
                    key={prompt.id}
                    data-item-id={prompt.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: sel ? 'color-mix(in srgb, var(--blue) 6%, transparent)' : 'transparent',
                      transition: 'background 0.1s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                    onClick={() => isSelectMode ? toggleSelect(prompt.id) : setViewItem(prompt)}
                  >
                    <td style={{ padding: '10px 14px', width: isSelectMode ? 36 : 0, overflow: 'hidden' }} onClick={e => { e.stopPropagation(); if (isSelectMode) toggleSelect(prompt.id) }}>
                      {isSelectMode && (
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? 'var(--blue)' : 'transparent' }}>
                          {sel && <Check size={10} color="white" strokeWidth={3} />}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{prompt.title}</div>
                      {prompt.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{prompt.description}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`category-badge ${prompt.category}`}>{prompt.category}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-tertiary)' }}>{prompt.use_count || 0}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontSize: 11 }}>
                      {prompt.updated_at ? new Date(prompt.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" onClick={() => openEdit(prompt)} title="Edit" style={{ padding: 5 }}>
                          <MessageSquare size={12} />
                        </button>
                        <button className="btn-icon" onClick={() => setDeleteConfirm(prompt.id)} title="Delete" style={{ padding: 5, color: 'var(--pink)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'compact' ? (
        /* ── Compact view ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 8 }}>
          {prompts.map(prompt => (
            <div key={prompt.id} data-item-id={prompt.id} className="glass-card"
              style={{ padding: '10px 12px', cursor: 'pointer', borderTop: '2px solid #007AFF', transition: 'box-shadow 0.15s', outline: selectedIds.has(prompt.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: selectedIds.has(prompt.id) ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}
              onMouseEnter={e => { if (!selectedIds.has(prompt.id)) e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,122,255,0.3)' }}
              onMouseLeave={e => { if (!selectedIds.has(prompt.id)) e.currentTarget.style.boxShadow = 'none' }}
              onClick={() => isSelectMode ? (toggleSelect(prompt.id), setSelectMode(true)) : setViewItem(prompt)}>
              {isSelectMode && (
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selectedIds.has(prompt.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(prompt.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}>
                  {selectedIds.has(prompt.id) && <Check size={9} color="white" strokeWidth={3} />}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.title}</span>
                {prompt.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
              </div>
              {prompt.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.description}</p>}
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#007AFF', background: 'rgba(0,122,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>{prompt.category}</span>
                {prompt.use_count > 0 && <span style={{ fontSize: 9, color: 'var(--text-quaternary)' }}>{prompt.use_count}×</span>}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'cheatsheet' ? (
        /* ── Cheatsheet view — grouped by category, full content visible ── */
        <CheatsheetView
          prompts={prompts}
          onView={setViewItem}
          onCopy={async (p) => { await copyToClipboard(p.content); toast.success('Copied!') }}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          onSelect={(id) => { toggleSelect(id); setSelectMode(true) }}
        />
      ) : viewMode === 'flashcard' ? (
        /* ── Flashcard view — select mode not applicable, show cards instead ── */
        isSelectMode ? (
          <div className="cards-grid">
            {prompts.map(prompt => (
              <div key={prompt.id} data-item-id={prompt.id} className="glass-card"
                style={{ padding: '14px 16px', cursor: 'pointer', borderTop: '2px solid #007AFF', outline: selectedIds.has(prompt.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: selectedIds.has(prompt.id) ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selectedIds.has(prompt.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(prompt.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selectedIds.has(prompt.id) && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{prompt.title}</span>
                  {prompt.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
                </div>
                {prompt.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0 24px' }}>{prompt.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <FlashcardView prompts={prompts} onView={setViewItem} onFavorite={(id) => favMutation.mutate(id)} />
        )
      ) : (
        /* ── Cards view ── */
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {prompts.map(prompt => (
            <ItemCard
              key={prompt.id}
              item={prompt}
              onView={setViewItem}
              onEdit={openEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onToggleFavorite={(id) => favMutation.mutate(id)}
              selectable={isSelectMode}
              selected={selectedIds.has(prompt.id)}
              onSelect={(id) => { toggleSelect(id); setSelectMode(true) }}
            />
          ))}
        </div>
      )}
      </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Edit Prompt' : 'New Prompt'}
        fullscreen={editFullscreen}
        footer={
          <>
            <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {editItem ? 'Save Changes' : 'Create Prompt'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="form-input"
            placeholder="e.g. Code Review Assistant"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            placeholder="Brief description of what this prompt does"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <MarkdownEditor
            label="Prompt Content *"
            value={form.content}
            onChange={(v) => setForm(f => ({ ...f, content: v }))}
            placeholder="Enter your prompt here… supports Markdown and {{variables}}"
            minHeight={220}
            itemId={editItem?.id}
            itemType="prompt"
          />
        </div>

        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <CategorySelector
              value={form.category}
              onChange={(v) => setForm(f => ({ ...f, category: v }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Model</label>
            <ModelSelector
              value={form.model}
              onChange={(v) => setForm(f => ({ ...f, model: v }))}
              placeholder="Any model"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <TagsSelector
            value={form.tags}
            onChange={(v) => setForm(f => ({ ...f, tags: v }))}
          />
        </div>

        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Temperature ({form.temperature})</label>
            <input
              type="range" min="0" max="2" step="0.1"
              value={form.temperature}
              onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
              style={{ width: '100%', accentColor: 'var(--blue)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Max Tokens</label>
            <input
              className="form-input"
              type="number"
              placeholder="e.g. 2048"
              value={form.max_tokens}
              onChange={e => setForm(f => ({ ...f, max_tokens: e.target.value }))}
            />
          </div>
        </div>

      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Prompt"
        size="sm"
        footer={
          <>
            <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={() => deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Are you sure you want to delete this prompt? This action cannot be undone.
        </p>
      </Modal>

      {viewItem && (
        <DetailModal
          item={viewItem}
          typeLabel="Prompt"
          typeColor="#007AFF"
          typeIcon={MessageSquare}
          onClose={() => setViewItem(null)}
          onEdit={(item, fullscreen) => { setViewItem(null); openEdit(item, fullscreen) }}
          onDelete={(id) => { setViewItem(null); setDeleteConfirm(id) }}
          onToggleFavorite={(id) => { favMutation.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
