import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hooksApi } from '../utils/api'
import Modal from '../components/Modal'
import { Webhook, Plus, Search, Star, ToggleLeft, ToggleRight, Trash2, Edit2, MousePointer, Check, Zap, Terminal, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const EVENT_TYPES = [
  { value: 'fileEdited',        label: 'File Edited',         group: 'File' },
  { value: 'fileCreated',       label: 'File Created',        group: 'File' },
  { value: 'fileDeleted',       label: 'File Deleted',        group: 'File' },
  { value: 'promptSubmit',      label: 'Prompt Submit',       group: 'Agent' },
  { value: 'agentStop',         label: 'Agent Stop',          group: 'Agent' },
  { value: 'preToolUse',        label: 'Pre Tool Use',        group: 'Tool' },
  { value: 'postToolUse',       label: 'Post Tool Use',       group: 'Tool' },
  { value: 'preTaskExecution',  label: 'Pre Task',            group: 'Task' },
  { value: 'postTaskExecution', label: 'Post Task',           group: 'Task' },
  { value: 'userTriggered',     label: 'User Triggered',      group: 'Manual' },
]

const EVENT_COLORS = {
  fileEdited: '#FF9F0A', fileCreated: '#30D158', fileDeleted: '#FF375F',
  promptSubmit: '#007AFF', agentStop: '#5AC8FA',
  preToolUse: '#BF5AF2', postToolUse: '#5E5CE6',
  preTaskExecution: '#FFD60A', postTaskExecution: '#FF9F0A',
  userTriggered: '#8E8E93',
}

const FILE_EVENT_TYPES = ['fileEdited', 'fileCreated', 'fileDeleted']
const TOOL_EVENT_TYPES = ['preToolUse', 'postToolUse']

const defaultForm = {
  title: '', description: '', event_type: 'fileEdited',
  file_patterns: '', tool_types: '',
  action_type: 'askAgent', action_prompt: '', action_command: '', action_timeout: 60,
}

function EventBadge({ type }) {
  const color = EVENT_COLORS[type] || '#8E8E93'
  const label = EVENT_TYPES.find(e => e.value === type)?.label || type
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '2px 8px', fontSize: 11, color, fontWeight: 500,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

function ActionBadge({ type }) {
  const isAsk = type === 'askAgent'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: isAsk ? 'rgba(0,122,255,0.12)' : 'rgba(48,209,88,0.12)',
      border: `1px solid ${isAsk ? 'rgba(0,122,255,0.3)' : 'rgba(48,209,88,0.3)'}`,
      borderRadius: 20, padding: '2px 8px', fontSize: 11,
      color: isAsk ? '#409CFF' : '#30D158', fontWeight: 500,
    }}>
      {isAsk ? <MessageSquare size={9} /> : <Terminal size={9} />}
      {isAsk ? 'Ask Agent' : 'Run Command'}
    </span>
  )
}

export default function HooksPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const { data, isLoading } = useQuery({
    queryKey: ['hooks', search, filterEvent, showFavorites],
    queryFn: () => hooksApi.list({ search: search || undefined, event_type: filterEvent || undefined, favorite: showFavorites ? 'true' : undefined }),
    staleTime: 0,
  })
  const hooks = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d) => hooksApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hooks'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Hook created'); closeModal() },
    onError: (e) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => hooksApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hooks'] }); toast.success('Hook updated'); closeModal() },
    onError: (e) => toast.error(e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => hooksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hooks'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Hook deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })
  const toggleFavMutation = useMutation({
    mutationFn: (id) => hooksApi.toggleFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hooks'] }),
  })
  const toggleActiveMutation = useMutation({
    mutationFn: (id) => hooksApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hooks'] }),
  })

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => hooksApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['hooks'] }); qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`${selectedIds.size} hook${selectedIds.size !== 1 ? 's' : ''} deleted`)
      clearSelection()
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (h) => {
    setEditItem(h)
    setForm({
      title: h.title, description: h.description || '',
      event_type: h.event_type, action_type: h.action_type,
      file_patterns: Array.isArray(h.file_patterns) ? h.file_patterns.join(', ') : '',
      tool_types: Array.isArray(h.tool_types) ? h.tool_types.join(', ') : '',
      action_prompt: h.action_prompt || '', action_command: h.action_command || '',
      action_timeout: h.action_timeout || 60,
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm) }

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Title is required')
    const payload = {
      title: form.title.trim(), description: form.description.trim(),
      event_type: form.event_type, action_type: form.action_type,
      file_patterns: form.file_patterns ? form.file_patterns.split(',').map(s => s.trim()).filter(Boolean) : [],
      tool_types: form.tool_types ? form.tool_types.split(',').map(s => s.trim()).filter(Boolean) : [],
      action_prompt: form.action_prompt.trim(), action_command: form.action_command.trim(),
      action_timeout: parseInt(form.action_timeout) || 60,
    }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload })
    else createMutation.mutate(payload)
  }

  const isFileEvent = FILE_EVENT_TYPES.includes(form.event_type)
  const isToolEvent = TOOL_EVENT_TYPES.includes(form.event_type)
  const isBusy = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search hooks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(v => !v)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <button
          className={`btn btn-glass btn-sm ${(selectMode || selectedIds.size > 0) ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (selectMode || selectedIds.size > 0) clearSelection() }}
          style={(selectMode || selectedIds.size > 0) ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)' } : {}}
        >
          <MousePointer size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Hook</button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={() => setSelectedIds(new Set(hooks.map(h => h.id)))}>Select all {hooks.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}>
            <Trash2 size={12} /> Delete selected
          </button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto' }}>Cancel</button>
        </div>
      )}

      {/* Event filter chips */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${!filterEvent ? 'active' : ''}`} onClick={() => setFilterEvent('')}>All</button>
        {EVENT_TYPES.map(e => (
          <button key={e.value} className={`filter-chip ${filterEvent === e.value ? 'active' : ''}`}
            onClick={() => setFilterEvent(filterEvent === e.value ? '' : e.value)}
            style={filterEvent === e.value ? { background: `${EVENT_COLORS[e.value]}20`, borderColor: `${EVENT_COLORS[e.value]}50`, color: EVENT_COLORS[e.value] } : {}}>
            {e.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : hooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Webhook size={28} /></div>
          <div className="empty-state-title">{search || filterEvent ? 'No hooks found' : 'No hooks yet'}</div>
          <div className="empty-state-desc">{search || filterEvent ? 'Try adjusting your filters' : 'Automate actions based on IDE events'}</div>
          {!search && !filterEvent && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Hook</button>}
        </div>
      ) : (
        <div className="cards-grid">
          {hooks.map(hook => {
            const isSelected = selectedIds.has(hook.id)
            const color = EVENT_COLORS[hook.event_type] || '#8E8E93'
            return (
              <div
                key={hook.id}
                className="glass-card"
                onClick={() => (selectMode || selectedIds.size > 0) && toggleSelect(hook.id)}
                style={{
                  padding: '14px 16px', cursor: (selectMode || selectedIds.size > 0) ? 'pointer' : 'default',
                  opacity: hook.is_active ? 1 : 0.55,
                  borderLeft: `3px solid ${color}60`,
                  outline: isSelected ? '2px solid var(--blue)' : 'none', outlineOffset: -2,
                  background: isSelected ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : undefined,
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  {(selectMode || selectedIds.size > 0) && (
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2, background: isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.1)', border: `2px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <Check size={10} color="white" />}
                    </div>
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={14} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hook.title}</div>
                    {hook.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hook.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); toggleFavMutation.mutate(hook.id) }}>
                      <Star size={13} fill={hook.is_favorite ? 'currentColor' : 'none'} style={{ color: hook.is_favorite ? '#FFD60A' : undefined }} />
                    </button>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(hook) }}><Edit2 size={13} /></button>
                    <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(hook) }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <EventBadge type={hook.event_type} />
                  <ActionBadge type={hook.action_type} />
                </div>

                {/* Patterns / tool types */}
                {((hook.file_patterns?.length > 0) || (hook.tool_types?.length > 0)) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {(hook.file_patterns || []).map(p => (
                      <span key={p} style={{ fontSize: 10, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 4, padding: '1px 6px', color: '#FF9F0A', fontFamily: 'monospace' }}>{p}</span>
                    ))}
                    {(hook.tool_types || []).map(t => (
                      <span key={t} style={{ fontSize: 10, background: 'rgba(191,90,242,0.1)', border: '1px solid rgba(191,90,242,0.2)', borderRadius: 4, padding: '1px 6px', color: '#BF5AF2', fontFamily: 'monospace' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
                    {hook.updated_at ? formatDistanceToNow(new Date(hook.updated_at), { addSuffix: true }) : ''}
                  </span>
                  <button
                    className="btn-icon"
                    onClick={e => { e.stopPropagation(); toggleActiveMutation.mutate(hook.id) }}
                    title={hook.is_active ? 'Disable' : 'Enable'}
                    style={{ color: hook.is_active ? '#30D158' : 'rgba(255,255,255,0.25)' }}
                  >
                    {hook.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Hook' : 'New Hook'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Lint on save" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="What does this hook do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Event *</label>
              <select className="form-input" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Action *</label>
              <select className="form-input" value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}>
                <option value="askAgent">Ask Agent</option>
                <option value="runCommand">Run Command</option>
              </select>
            </div>
          </div>
          {isFileEvent && (
            <div className="form-group">
              <label className="form-label">File Patterns <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(comma-separated)</span></label>
              <input className="form-input" placeholder="*.ts, src/**/*.js" value={form.file_patterns} onChange={e => setForm(f => ({ ...f, file_patterns: e.target.value }))} />
            </div>
          )}
          {isToolEvent && (
            <div className="form-group">
              <label className="form-label">Tool Types <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(read, write, shell, web, * or regex)</span></label>
              <input className="form-input" placeholder="write, shell" value={form.tool_types} onChange={e => setForm(f => ({ ...f, tool_types: e.target.value }))} />
            </div>
          )}
          {form.action_type === 'askAgent' ? (
            <div className="form-group">
              <label className="form-label">Prompt *</label>
              <textarea className="form-input" placeholder="What should the agent do?" value={form.action_prompt} onChange={e => setForm(f => ({ ...f, action_prompt: e.target.value }))} rows={4} style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Command *</label>
                <input className="form-input" placeholder="npm run lint" value={form.action_command} onChange={e => setForm(f => ({ ...f, action_command: e.target.value }))} style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Timeout (s)</label>
                <input className="form-input" type="number" min={0} value={form.action_timeout} onChange={e => setForm(f => ({ ...f, action_timeout: e.target.value }))} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
              {isBusy ? 'Saving…' : editItem ? 'Save Changes' : 'Create Hook'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Hook" size="sm">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.title}</strong>? This can't be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
