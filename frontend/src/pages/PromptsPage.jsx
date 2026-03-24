import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, categoriesApi, settingsApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { MessageSquare, Plus, Search, Star, LayoutGrid, List, AlignJustify, Trash2, Check, MousePointer } from 'lucide-react'
import toast from 'react-hot-toast'
import ModelSelector from '../components/ModelSelector'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import TagsSelector from '../components/TagsSelector'

const baseDefaultForm = {
  title: '', content: '', description: '', category: 'general',
  model: '', temperature: 0.7, max_tokens: '', tags: []
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input
            placeholder="Search prompts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button
          className={`filter-chip ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} />
          Favorites
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 2 }}>
          <button onClick={() => setView('cards')} title="Card view"
            style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'cards' ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('table')} title="Table view"
            style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === 'table' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
            <List size={14} />
          </button>
          <button onClick={() => setView('compact')} title="Compact view"
            style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === 'compact' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'compact' ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
            <AlignJustify size={14} />
          </button>
        </div>

        {/* Select mode toggle */}
        <button
          className={`btn btn-glass btn-sm ${isSelectMode ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectMode) clearSelection() }}
          title="Select items"
          style={isSelectMode ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)' } : {}}
        >
          <MousePointer size={13} />
          Select
        </button>

        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} />
          New Prompt
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
      ) : viewMode === 'table' ? (
        /* ── Table view ── */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th                     style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, width: 36 }}>
                  <div
                    style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.size === prompts.length && prompts.length > 0 ? 'var(--blue)' : 'transparent' }}
                    onClick={() => selectedIds.size === prompts.length ? clearSelection() : selectAll(prompts)}
                  >
                    {selectedIds.size === prompts.length && prompts.length > 0 && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
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
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: sel ? 'color-mix(in srgb, var(--blue) 6%, transparent)' : 'transparent',
                      transition: 'background 0.1s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                    onClick={() => setViewItem(prompt)}
                  >
                    <td style={{ padding: '10px 14px' }} onClick={e => { e.stopPropagation(); toggleSelect(prompt.id) }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? 'var(--blue)' : 'transparent' }}>
                        {sel && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
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
            <div key={prompt.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderTop: '2px solid #007AFF', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,122,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              onClick={() => setViewItem(prompt)}>
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
      ) : (
        /* ── Cards view ── */
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {prompts.map(prompt => (
            <ItemCard
              key={prompt.id}
              item={prompt}
              onView={isSelectMode ? undefined : setViewItem}
              onEdit={isSelectMode ? undefined : openEdit}
              onDelete={isSelectMode ? undefined : (id) => setDeleteConfirm(id)}
              onToggleFavorite={isSelectMode ? undefined : (id) => favMutation.mutate(id)}
              selectable={isSelectMode}
              selected={selectedIds.has(prompt.id)}
              onSelect={(id) => { toggleSelect(id); setSelectMode(true) }}
            />
          ))}
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
