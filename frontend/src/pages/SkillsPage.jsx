import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skillsApi, categoriesApi } from '../utils/api'
import ItemCard from '../components/ItemCard'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { Zap, Plus, Search, Star, ToggleLeft, ToggleRight, LayoutGrid, AlignJustify, List } from 'lucide-react'
import toast from 'react-hot-toast'
import MarkdownEditor from '../components/MarkdownEditor'
import CategorySelector from '../components/CategorySelector'
import TagsSelector from '../components/TagsSelector'

const defaultForm = {
  title: '', content: '', description: '', category: 'general', trigger_phrase: '', tags: []
}

export default function SkillsPage() {
  const qc = useQueryClient()
  const gridMounted = useRef(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [showActive, setShowActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editFullscreen, setEditFullscreen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [viewItem, setViewItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('skills_view') || 'cards')
  const setView = (m) => { setViewMode(m); localStorage.setItem('skills_view', m) }

  const { data, isLoading } = useQuery({
    queryKey: ['skills', { search, category, favorite: showFavorites, active: showActive }],
    queryFn: () => skillsApi.list({
      search: search || undefined,
      category: category || undefined,
      favorite: showFavorites ? 'true' : undefined,
      active: showActive ? 'true' : undefined,
      limit: 100,
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => skillsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); toast.success('Skill created!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => skillsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Skill updated!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => skillsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); qc.invalidateQueries({ queryKey: ['trash-count'] }); toast.success('Skill deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => skillsApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['skills'] })
      const prev = qc.getQueriesData({ queryKey: ['skills'] })
      qc.setQueriesData({ queryKey: ['skills'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => skillsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (item, fullscreen = false) => {
    setEditItem(item)
    setEditFullscreen(fullscreen)
    setForm({ title: item.title || '', content: item.content || '', description: item.description || '', category: item.category || 'general', trigger_phrase: item.trigger_phrase || '', tags: item.tags?.map(t => t.id) || [] })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm); setEditFullscreen(false) }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return }
    if (editItem) { updateMutation.mutate({ id: editItem.id, data: form }) }
    else { createMutation.mutate(form) }
  }

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const categories = catsData?.data || []

  const skills = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search skills…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <button className={`filter-chip ${showActive ? 'active' : ''}`} onClick={() => setShowActive(!showActive)}>
          Active only
        </button>
        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['cards', LayoutGrid], ['list', List], ['compact', AlignJustify]].map(([id, Icon]) => (
            <button key={id} onClick={() => setView(id)} title={`${id} view`}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Skill</button>
      </div>

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

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={28} /></div>
          <div className="empty-state-title">{search || category ? 'No skills found' : 'No skills yet'}</div>
          <div className="empty-state-desc">{search || category ? 'Try adjusting your filters' : 'Create reusable AI skill definitions'}</div>
          {!search && !category && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Skill</button>}
        </div>
      ) : viewMode === 'list' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {skills.map((skill, idx) => (
            <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < skills.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => setViewItem(skill)}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: skill.is_active ? '#30D158' : '#8E8E93', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.title}</span>
              {skill.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 4 }}>{skill.category}</span>
              <span style={{ fontSize: 10, color: skill.is_active ? '#30D158' : 'var(--text-quaternary)', background: skill.is_active ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.04)', padding: '1px 7px', borderRadius: 4 }}>{skill.is_active ? 'active' : 'inactive'}</span>
            </div>
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 8 }}>
          {skills.map(skill => (
            <div key={skill.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderTop: `2px solid ${skill.is_active ? '#FF9500' : '#8E8E93'}`, transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,149,0,0.3)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              onClick={() => setViewItem(skill)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.title}</span>
                {skill.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
              </div>
              {skill.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.description}</p>}
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 9, color: 'var(--text-quaternary)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3 }}>{skill.category}</span>
                <span style={{ fontSize: 9, color: skill.is_active ? '#30D158' : 'var(--text-quaternary)', background: skill.is_active ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 3 }}>{skill.is_active ? 'active' : 'inactive'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {skills.map(skill => (
            <ItemCard key={skill.id} item={skill} onView={setViewItem} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)}
              onToggleFavorite={(id) => favMutation.mutate(id)} onToggleActive={(id) => toggleMutation.mutate(id)} showStatus />
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Skill' : 'New Skill'} fullscreen={editFullscreen}
        footer={<>
          <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {editItem ? 'Save Changes' : 'Create Skill'}
          </button>
        </>}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" placeholder="e.g. Python Expert" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="What does this skill do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Trigger Phrase</label>
          <input className="form-input" placeholder="e.g. /python or @code-review" value={form.trigger_phrase} onChange={e => setForm(f => ({ ...f, trigger_phrase: e.target.value }))} />
        </div>
        <div className="form-group">
          <MarkdownEditor
            label="Skill Content *"
            value={form.content}
            onChange={(v) => setForm(f => ({ ...f, content: v }))}
            placeholder="Define the skill behavior and instructions… (supports Markdown)"
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
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Skill" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>Delete</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this skill?</p>
      </Modal>

      {viewItem && (
        <DetailModal
          item={viewItem}
          typeLabel="Skill"
          typeColor="#FF9500"
          typeIcon={Zap}
          onClose={() => setViewItem(null)}
          onEdit={(item, fullscreen) => { setViewItem(null); openEdit(item, fullscreen) }}
          onDelete={(id) => { setViewItem(null); setDeleteConfirm(id) }}
          onToggleFavorite={(id) => { favMutation.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
