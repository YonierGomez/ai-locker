import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, categoriesApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { MessageSquare, Plus, Search, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import ModelSelector from '../components/ModelSelector'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import TagsSelector from '../components/TagsSelector'

const defaultForm = {
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
  const [form, setForm] = useState(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewItem, setViewItem] = useState(null)

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
    setForm(defaultForm)
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
    setForm(defaultForm)
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

        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} />
          New Prompt
        </button>
      </div>

      {/* Category filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
        {categories.map(cat => (
          <button key={cat.id} className={`filter-chip ${category === cat.name ? 'active' : ''}`}
            onClick={() => setCategory(category === cat.name ? '' : cat.name)}
            style={category === cat.name ? { background: `${cat.color}20`, borderColor: `${cat.color}50`, color: cat.color } : {}}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={28} />
          </div>
          <div className="empty-state-title">
            {search || category || showFavorites ? 'No prompts found' : 'No prompts yet'}
          </div>
          <div className="empty-state-desc">
            {search || category || showFavorites
              ? 'Try adjusting your filters'
              : 'Create your first AI prompt to get started'}
          </div>
          {!search && !category && !showFavorites && (
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}>
              <Plus size={15} /> Create Prompt
            </button>
          )}
        </div>
      ) : (
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
            placeholder="Enter your prompt here… (supports Markdown)"
            minHeight={220}
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
