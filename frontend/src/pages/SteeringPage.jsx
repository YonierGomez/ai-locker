import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { steeringApi, categoriesApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { Navigation, Plus, Search, Star } from 'lucide-react'
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
  const [viewItem, setViewItem] = useState(null)

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
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Steering</button>
      </div>

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
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {items.map(item => (
            <ItemCard key={item.id} item={item} onView={setViewItem} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)}
              onToggleFavorite={(id) => favMutation.mutate(id)} onToggleActive={(id) => toggleMutation.mutate(id)}
              showStatus showPriority />
          ))}
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
