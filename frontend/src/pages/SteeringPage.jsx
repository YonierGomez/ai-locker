import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { steeringApi, categoriesApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { Navigation, Plus, Search, Star, LayoutGrid, AlignJustify, List, BarChart3, Columns2, MousePointer, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import TagsSelector from '../components/TagsSelector'

const SCOPES = ['global', 'project', 'session', 'task']

const defaultForm = {
  title: '', content: '', description: '', category: 'general', scope: 'global', priority: 0, tags: []
}

export default function SteeringPage() {
  const qc = useQueryClient()
  const gridMounted = useRef(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editFullscreen, setEditFullscreen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('steering_view') || 'cards')
  const setView = (m) => { setViewMode(m); localStorage.setItem('steering_view', m); setSelectedIds(new Set()); setSelectMode(false) }
  const [viewItem, setViewItem] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedIds(new Set(items.map(i => i.id)))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => steeringApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['steering'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} steering${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }
  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => steeringApi.toggleFavorite(id)))
      qc.invalidateQueries({ queryKey: ['steering'] })
      toast.success(`Updated ${selectedIds.size}`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['steering', { search, category, scope, favorite: showFavorites }],
    queryFn: () => steeringApi.list({
      search: search || undefined,
      category: category || undefined,
      scope: scope || undefined,
      favorite: showFavorites ? 'true' : undefined,
      limit: 100,
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => steeringApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['steering'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); toast.success('Steering created!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => steeringApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['steering'] }); toast.success('Steering updated!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => steeringApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['steering'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); qc.invalidateQueries({ queryKey: ['trash-count'] }); toast.success('Steering deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => steeringApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['steering'] })
      const prev = qc.getQueriesData({ queryKey: ['steering'] })
      qc.setQueriesData({ queryKey: ['steering'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['steering'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => steeringApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['steering'] }),
  })

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (item, fullscreen = false) => {
    setEditItem(item)
    setEditFullscreen(fullscreen)
    setForm({
      title: item.title || '', content: item.content || '', description: item.description || '',
      category: item.category || 'general', scope: item.scope || 'global',
      priority: item.priority || 0, tags: item.tags?.map(t => t.id) || []
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm); setEditFullscreen(false) }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return }
    const payload = { ...form, priority: parseInt(form.priority) || 0 }
    if (editItem) { updateMutation.mutate({ id: editItem.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const categories = catsData?.data || []

  const items = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search steering…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <div style={{ display: 'flex', background: 'var(--c-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['cards', LayoutGrid], ['list', List], ['compact', AlignJustify], ['priority', BarChart3], ['scope', Columns2]].map(([id, Icon]) => (
            <button key={id} onClick={() => setView(id)} title={`${id} view`}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button className={`btn btn-glass btn-sm ${(selectMode || selectedIds.size > 0) ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (selectMode || selectedIds.size > 0) clearSelection() }}
          style={(selectMode || selectedIds.size > 0) ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)' } : {}}>
          <MousePointer size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Steering</button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={selectAll} style={{ gap: 5 }}>Select all {items.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-glass btn-sm" onClick={handleBulkFavorite} style={{ gap: 5 }}><Star size={12} /> Toggle favorite</button>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}><Trash2 size={12} /> Delete selected</button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto', gap: 5 }}>Cancel</button>
        </div>
      )}

      {/* Scope filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Scope:</span>
        <button className={`filter-chip ${!scope ? 'active' : ''}`} onClick={() => setScope('')}>All</button>
        {SCOPES.map(s => (
          <button key={s} className={`filter-chip ${scope === s ? 'active' : ''}`} onClick={() => setScope(scope === s ? '' : s)}>{s}</button>
        ))}
      </div>

      {/* Category filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Category:</span>
        <button className={`filter-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
        {categories.map(cat => (
          <button key={cat.id} className={`filter-chip ${category === cat.name ? 'active' : ''}`}
            onClick={() => setCategory(category === cat.name ? '' : cat.name)}
            style={category === cat.name ? { background: `${cat.color}20`, borderColor: `${cat.color}50`, color: cat.color } : {}}>
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={28} /></div>
          <div className="empty-state-title">{search || category || scope ? 'No steering found' : 'No steering configs yet'}</div>
          <div className="empty-state-desc">{search || category || scope ? 'Try adjusting your filters' : 'Create behavioral guidance and system instructions for your AI'}</div>
          {!search && !category && !scope && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Steering</button>}
        </div>
      ) : (
      <div style={{ position: 'relative' }}>
      {viewMode === 'list' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.map((item, idx) => (
            <div key={item.id} data-item-id={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.12s', background: selectedIds.has(item.id) ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : 'transparent', outline: selectedIds.has(item.id) ? '2px solid var(--blue)' : 'none', outlineOffset: -2 }}
              onMouseEnter={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.background = 'transparent' }}
              onClick={() => (selectMode || selectedIds.size > 0) ? (toggleSelect(item.id), setSelectMode(true)) : setViewItem(item)}>
              {(selectMode || selectedIds.size > 0) && (
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selectedIds.has(item.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(item.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedIds.has(item.id) && <Check size={10} color="white" strokeWidth={3} />}
                </div>
              )}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.is_active ? '#BF5AF2' : '#8E8E93', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
              {item.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
              <span style={{ fontSize: 10, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 6px', borderRadius: 4 }}>{item.scope}</span>
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 7px', borderRadius: 4 }}>{item.category}</span>
            </div>
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} data-item-id={item.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderTop: `2px solid #BF5AF2`, transition: 'box-shadow 0.15s', outline: selectedIds.has(item.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: selectedIds.has(item.id) ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}
              onMouseEnter={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.boxShadow = '0 0 0 1px rgba(191,90,242,0.3)' }}
              onMouseLeave={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.boxShadow = 'none' }}
              onClick={() => (selectMode || selectedIds.size > 0) ? (toggleSelect(item.id), setSelectMode(true)) : setViewItem(item)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                {item.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
              </div>
              {(selectMode || selectedIds.size > 0) && (
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selectedIds.has(item.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(item.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}>
                  {selectedIds.has(item.id) && <Check size={9} color="white" strokeWidth={3} />}
                </div>
              )}
              {item.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#BF5AF2', background: 'rgba(191,90,242,0.1)', padding: '1px 5px', borderRadius: 3 }}>{item.scope}</span>
                <span style={{ fontSize: 9, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 5px', borderRadius: 3 }}>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'priority' ? (
        /* ── Priority Stack — sorted by priority with visual bar ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...items].sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(item => {
            const pct = Math.min((item.priority || 0), 100)
            const pColor = pct >= 70 ? '#FF375F' : pct >= 40 ? '#FF9500' : '#30D158'
            return (
            <div key={item.id} data-item-id={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', outline: selectedIds.has(item.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2 }}
                onClick={() => (selectMode || selectedIds.size > 0) ? (toggleSelect(item.id), setSelectMode(true)) : setViewItem(item)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* Priority bar */}
                <div style={{ width: 4, alignSelf: 'stretch', background: selectedIds.has(item.id) ? 'var(--blue)' : pColor, opacity: selectedIds.has(item.id) ? 1 : 0.8, flexShrink: 0 }} />
                {(selectMode || selectedIds.size > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selectedIds.has(item.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(item.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedIds.has(item.id) && <Check size={10} color="white" strokeWidth={3} />}
                    </div>
                  </div>
                )}
                  {/* Priority number */}
                  <div style={{ width: 52, padding: '12px 10px', textAlign: 'center', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: pColor, letterSpacing: -1, lineHeight: 1 }}>{item.priority || 0}</div>
                    <div style={{ fontSize: 8, color: 'var(--text-quaternary)', marginTop: 2 }}>priority</div>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, padding: '10px 14px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                      {item.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" />}
                      <span style={{ fontSize: 9, color: '#BF5AF2', background: 'rgba(191,90,242,0.1)', padding: '1px 5px', borderRadius: 3 }}>{item.scope}</span>
                    </div>
                    {item.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
                  </div>
                  {/* Priority bar visual */}
                  <div style={{ width: 120, padding: '0 14px', flexShrink: 0 }}>
                    <div style={{ height: 6, background: 'var(--c-surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pColor, borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'scope' ? (
        /* ── Scope Board — columns by scope ── */
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
          {SCOPES.map((scopeKey, si) => {
            const SCOPE_COLORS = { global: '#007AFF', project: '#FF9500', session: '#30D158', task: '#BF5AF2' }
            const color = SCOPE_COLORS[scopeKey] || '#8E8E93'
            const group = items.filter(i => (i.scope || 'global') === scopeKey)
            return (
              <div key={scopeKey} style={{ minWidth: 260, maxWidth: 300, flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{scopeKey}</span>
                  <span style={{ fontSize: 11, color: `${color}80`, marginLeft: 'auto', background: `${color}18`, padding: '1px 7px', borderRadius: 10 }}>{group.length}</span>
                </div>
                {group.map(item => (
                  <div key={item.id} data-item-id={item.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderLeft: `3px solid ${selectedIds.has(item.id) ? 'var(--blue)' : color}`, transition: 'transform 0.12s', outline: selectedIds.has(item.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: selectedIds.has(item.id) ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}
                    onMouseEnter={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { if (!selectedIds.has(item.id)) e.currentTarget.style.transform = 'translateY(0)' }}
                    onClick={() => (selectMode || selectedIds.size > 0) ? (toggleSelect(item.id), setSelectMode(true)) : setViewItem(item)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: item.description ? 6 : 0 }}>
                      {(selectMode || selectedIds.size > 0) && (
                        <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selectedIds.has(item.id) ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: selectedIds.has(item.id) ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {selectedIds.has(item.id) && <Check size={9} color="white" strokeWidth={3} />}
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{item.title}</span>
                      {item.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
                    </div>
                    {item.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 5px', borderRadius: 3 }}>{item.category}</span>
                      {(item.priority || 0) > 0 && <span style={{ fontSize: 9, color: color, background: `${color}15`, padding: '1px 5px', borderRadius: 3 }}>p{item.priority}</span>}
                    </div>
                  </div>
                ))}
                {group.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-quaternary)', fontSize: 12, background: 'var(--c-surface)', borderRadius: 8 }}>No {scopeKey} steering</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {items.map(item => (
            <ItemCard key={item.id} item={item}
              onView={selectMode ? undefined : setViewItem}
              onEdit={selectMode ? undefined : openEdit}
              onDelete={selectMode ? undefined : (id) => setDeleteConfirm(id)}
              onToggleFavorite={selectMode ? undefined : (id) => favMutation.mutate(id)}
              onToggleActive={selectMode ? undefined : (id) => toggleMutation.mutate(id)}
              showStatus showPriority
              selectable={selectMode || selectedIds.size > 0}
              selected={selectedIds.has(item.id)}
              onSelect={(id) => { toggleSelect(id); setSelectMode(true) }}
            />
          ))}
        </div>
      )}
      </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Steering' : 'New Steering'} fullscreen={editFullscreen}
        footer={<>
          <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {editItem ? 'Save Changes' : 'Create Steering'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" placeholder="e.g. Always respond in Spanish" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="What behavior does this steer?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <MarkdownEditor
            label="Steering Content *"
            value={form.content}
            onChange={(v) => setForm(f => ({ ...f, content: v }))}
            placeholder="Enter the steering instruction or system prompt… (supports Markdown)"
            minHeight={220}
          />
        </div>
        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <CategorySelector value={form.category} onChange={(v) => setForm(f => ({ ...f, category: v }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <TagsSelector value={form.tags} onChange={(v) => setForm(f => ({ ...f, tags: v }))} />
          </div>
        </div>
        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Scope</label>
            <select className="form-select" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}>
              {SCOPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority (0–100)</label>
            <input className="form-input" type="number" min="0" max="100" placeholder="0" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Steering" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>Delete</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this steering config?</p>
      </Modal>

      {viewItem && (
        <DetailModal
          item={viewItem}
          typeLabel="Steering"
          typeColor="#BF5AF2"
          typeIcon={Navigation}
          onClose={() => setViewItem(null)}
          onEdit={(item, fullscreen) => { setViewItem(null); openEdit(item, fullscreen) }}
          onDelete={(id) => { setViewItem(null); setDeleteConfirm(id) }}
          onToggleFavorite={(id) => { favMutation.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
