import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, mcpApi, skillsApi, steeringApi } from '../utils/api'
import Modal from '../components/Modal'
import { Bot, Plus, Search, Star, Trash2, Edit2, Check, MousePointer, Zap, Navigation, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import ModelSelector from '../components/ModelSelector'
import { formatDistanceToNow } from 'date-fns'

const defaultForm = {
  title: '', description: '', model: '', temperature: 0.7, max_tokens: '',
  system_prompt: '', initial_prompt: '', avatar_emoji: '🤖',
  mcp_ids: [], skill_ids: [], steering_ids: [],
}

const EMOJI_PRESETS = ['🤖', '🧠', '⚡', '🎯', '🔬', '💡', '🛠️', '🎨', '📊', '🔐', '🚀', '🌐']

export default function AgentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeTab, setActiveTab] = useState('basic') // basic | config | connections
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedIds(new Set(agents.map(a => a.id)))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }
  const isSelectActive = selectMode || selectedIds.size > 0

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => agentsApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['agents'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} agent${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }

  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => agentsApi.toggleFavorite(id)))
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success(`Updated ${selectedIds.size}`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['agents', { search, favorite: showFavorites }],
    queryFn: () => agentsApi.list({ search: search || undefined, favorite: showFavorites ? 'true' : undefined, limit: 100 }),
  })

  // Load available MCPs, Skills, Steering for the connections tab
  const { data: mcpData } = useQuery({ queryKey: ['mcp', {}], queryFn: () => mcpApi.list({ limit: 100 }), staleTime: 30000 })
  const { data: skillsData } = useQuery({ queryKey: ['skills', {}], queryFn: () => skillsApi.list({ limit: 100 }), staleTime: 30000 })
  const { data: steeringData } = useQuery({ queryKey: ['steering', {}], queryFn: () => steeringApi.list({ limit: 100 }), staleTime: 30000 })

  const allMcps = mcpData?.data || []
  const allSkills = skillsData?.data || []
  const allSteering = steeringData?.data || []

  const createMutation = useMutation({
    mutationFn: (data) => agentsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Agent created!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => agentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent updated!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => agentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] }); toast.success('Agent deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => agentsApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['agents'] })
      const prev = qc.getQueriesData({ queryKey: ['agents'] })
      qc.setQueriesData({ queryKey: ['agents'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(a => a.id === id ? { ...a, is_favorite: !a.is_favorite } : a) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val)) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => agentsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setActiveTab('basic'); setModalOpen(true) }
  const openEdit = (agent) => {
    setEditItem(agent)
    setForm({
      title: agent.title || '', description: agent.description || '',
      model: agent.model || '', temperature: agent.temperature ?? 0.7,
      max_tokens: agent.max_tokens || '',
      system_prompt: agent.system_prompt || '', initial_prompt: agent.initial_prompt || '',
      avatar_emoji: agent.avatar_emoji || '🤖',
      mcp_ids: agent.mcp_ids || [], skill_ids: agent.skill_ids || [], steering_ids: agent.steering_ids || [],
    })
    setActiveTab('basic')
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm) }

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    const payload = { ...form, temperature: parseFloat(form.temperature) || 0.7, max_tokens: form.max_tokens ? parseInt(form.max_tokens) : null }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload })
    else createMutation.mutate(payload)
  }

  const toggleId = (field, id) => {
    setForm(f => {
      const arr = f[field] || []
      return { ...f, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] }
    })
  }

  const agents = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search agents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <button className={`btn btn-glass btn-sm ${isSelectActive ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectActive) clearSelection() }}
          style={isSelectActive ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)', gap: 5 } : { gap: 5 }}>
          <MousePointer size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Agent</button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={selectAll} style={{ gap: 5 }}>Select all {agents.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-glass btn-sm" onClick={handleBulkFavorite} style={{ gap: 5 }}><Star size={12} /> Toggle favorite</button>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}><Trash2 size={12} /> Delete selected</button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto', gap: 5 }}>Cancel</button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : agents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Bot size={28} /></div>
          <div className="empty-state-title">{search || showFavorites ? 'No agents found' : 'No agents yet'}</div>
          <div className="empty-state-desc">{search || showFavorites ? 'Try adjusting your filters' : 'Create AI agent presets with model, prompts, skills and MCP connections'}</div>
          {!search && !showFavorites && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Agent</button>}
        </div>
      ) : (
        <div className="cards-grid">
          {agents.map(agent => {
            const sel = selectedIds.has(agent.id)
            const timeAgo = agent.updated_at ? formatDistanceToNow(new Date(agent.updated_at), { addSuffix: true }) : ''
            return (
              <div key={agent.id} className={`item-card${sel ? ' selected' : ''}`}
                style={{ cursor: 'pointer', opacity: agent.is_active ? 1 : 0.6 }}
                onClick={() => isSelectActive ? (toggleSelect(agent.id), setSelectMode(true)) : openEdit(agent)}>
                <div className="item-card-header">
                  {isSelectActive && (
                    <div style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.25)'}`, background: sel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 6 }}>
                      {sel && <Check size={10} color="white" strokeWidth={3} />}
                    </div>
                  )}
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(94,92,230,0.15)', border: '1px solid rgba(94,92,230,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {agent.avatar_emoji || '🤖'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                    <div className="item-card-title truncate">{agent.title}</div>
                    {agent.model && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{agent.model}</div>}
                  </div>
                  {!isSelectActive && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className={`favorite-btn ${agent.is_favorite ? 'active' : ''}`} onClick={e => { e.stopPropagation(); favMutation.mutate(agent.id) }}>
                        <Star size={14} fill={agent.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )}
                </div>

                {agent.description && <div className="item-card-description">{agent.description}</div>}

                {/* Connections summary */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {agent.skill_ids?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#FF9500', background: 'rgba(255,149,0,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      <Zap size={10} /> {agent.skill_ids.length} skill{agent.skill_ids.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {agent.steering_ids?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#BF5AF2', background: 'rgba(191,90,242,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      <Navigation size={10} /> {agent.steering_ids.length} steering
                    </div>
                  )}
                  {agent.mcp_ids?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#30D158', background: 'rgba(48,209,88,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      <Bot size={10} /> {agent.mcp_ids.length} MCP
                    </div>
                  )}
                  {agent.temperature !== undefined && (
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '3px 8px', borderRadius: 6 }}>
                      temp {agent.temperature}
                    </div>
                  )}
                </div>

                <div className="item-card-footer">
                  <div className="item-card-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: agent.is_active ? '#30D158' : '#8E8E93', boxShadow: agent.is_active ? '0 0 6px rgba(48,209,88,0.6)' : 'none' }} />
                      <span style={{ fontSize: 11, color: agent.is_active ? '#30D158' : 'var(--text-quaternary)' }}>{agent.is_active ? 'active' : 'inactive'}</span>
                    </div>
                    {timeAgo && <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{timeAgo}</span>}
                  </div>
                  {!isSelectActive && (
                    <div className="item-card-actions" style={{ opacity: 1 }}>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); toggleMutation.mutate(agent.id) }} title="Toggle active" style={{ padding: 6 }}>
                        {agent.is_active ? <ToggleRight size={14} color="#30D158" /> : <ToggleLeft size={14} color="#8E8E93" />}
                      </button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(agent) }} style={{ padding: 6 }}><Edit2 size={13} /></button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(agent.id) }} style={{ padding: 6, color: 'var(--pink)' }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Agent' : 'New Agent'} size="lg"
        footer={<>
          <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {editItem ? 'Save Changes' : 'Create Agent'}
          </button>
        </>}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--c-surface)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {[['basic', 'Basic'], ['config', 'AI Config'], ['connections', 'Connections']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ flex: 1, padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: activeTab === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Basic tab */}
        {activeTab === 'basic' && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              {/* Emoji picker */}
              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Avatar</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 160 }}>
                  {EMOJI_PRESETS.map(emoji => (
                    <button key={emoji} onClick={() => setForm(f => ({ ...f, avatar_emoji: emoji }))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.avatar_emoji === emoji ? 'var(--blue)' : 'rgba(255,255,255,0.1)'}`, background: form.avatar_emoji === emoji ? 'rgba(0,122,255,0.15)' : 'var(--c-surface)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Name *</label>
                  <input className="form-input" placeholder="e.g. Senior Code Reviewer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="What does this agent do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">System Prompt</label>
              <textarea className="form-textarea" placeholder="You are a senior software engineer with 15 years of experience…" value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} style={{ minHeight: 120 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Prompt <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(optional — shown when starting a chat)</span></label>
              <input className="form-input" placeholder="e.g. Please review this code: {{code}}" value={form.initial_prompt} onChange={e => setForm(f => ({ ...f, initial_prompt: e.target.value }))} />
            </div>
          </>
        )}

        {/* AI Config tab */}
        {activeTab === 'config' && (
          <>
            <div className="form-group">
              <label className="form-label">Model</label>
              <ModelSelector value={form.model} onChange={v => setForm(f => ({ ...f, model: v }))} placeholder="Use default model" />
            </div>
            <div className="form-grid-2col" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Temperature ({form.temperature})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>Precise</span>
                  <input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} style={{ flex: 1, accentColor: 'var(--blue)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>Creative</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {form.temperature <= 0.3 ? '🎯 Very precise — best for code, analysis, data' :
                   form.temperature <= 0.7 ? '⚖️ Balanced — good for most tasks' :
                   form.temperature <= 1.2 ? '✨ Creative — good for writing, brainstorming' :
                   '🎲 Very creative — unpredictable, experimental'}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Max Tokens</label>
                <input className="form-input" type="number" placeholder="e.g. 4096 (leave empty for default)" value={form.max_tokens} onChange={e => setForm(f => ({ ...f, max_tokens: e.target.value }))} />
              </div>
            </div>
          </>
        )}

        {/* Connections tab */}
        {activeTab === 'connections' && (
          <>
            {/* Skills */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} color="#FF9500" /> Skills ({form.skill_ids.length} selected)
              </label>
              {allSkills.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>No skills available. Create some in the Skills library.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allSkills.map(skill => {
                    const active = form.skill_ids.includes(skill.id)
                    return (
                      <button key={skill.id} onClick={() => toggleId('skill_ids', skill.id)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? 'rgba(255,149,0,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,149,0,0.15)' : 'var(--c-surface)', color: active ? '#FF9500' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {active && <Check size={10} />}
                        {skill.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Steering */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={13} color="#BF5AF2" /> Steering ({form.steering_ids.length} selected)
              </label>
              {allSteering.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>No steering configs available. Create some in the Steering library.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allSteering.map(s => {
                    const active = form.steering_ids.includes(s.id)
                    return (
                      <button key={s.id} onClick={() => toggleId('steering_ids', s.id)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? 'rgba(191,90,242,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(191,90,242,0.15)' : 'var(--c-surface)', color: active ? '#BF5AF2' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {active && <Check size={10} />}
                        {s.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* MCPs */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={13} color="#30D158" /> MCP Servers ({form.mcp_ids.length} selected)
              </label>
              {allMcps.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>No MCP configs available. Create some in the MCP library.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allMcps.map(mcp => {
                    const active = form.mcp_ids.includes(mcp.id)
                    return (
                      <button key={mcp.id} onClick={() => toggleId('mcp_ids', mcp.id)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${active ? 'rgba(48,209,88,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(48,209,88,0.15)' : 'var(--c-surface)', color: active ? '#30D158' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {active && <Check size={10} />}
                        {mcp.title}
                        <span style={{ fontSize: 10, opacity: 0.6, fontFamily: 'var(--font-mono)' }}>{mcp.transport}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Agent" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>Delete</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this agent?</p>
      </Modal>
    </div>
  )
}
