import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mcpApi } from '../utils/api'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { Plus, Search, Star, Copy, Edit2, Trash2, Check, Download, LayoutGrid, AlignJustify, List, Server, FileJson, MousePointer } from 'lucide-react'

function McpIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const TRANSPORTS = ['stdio', 'sse', 'http']

const defaultForm = {
  title: '', server_name: '', description: '', transport: 'stdio',
  config: { command: '', args: [], env: {} }, tags: []
}

const defaultConfigText = JSON.stringify({
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-example'],
  env: { API_KEY: 'your-key-here' }
}, null, 2)

// ── JSON Tree Item ────────────────────────────────────────────
function JsonTreeItem({ item, onView, onCopy, copiedId, onToggle }) {
  const [expanded, setExpanded] = useState(true)
  const configStr = JSON.stringify(item.config, null, 2)

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 4, alignSelf: 'stretch', background: item.is_active ? '#30D158' : '#8E8E93', flexShrink: 0 }} />
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', userSelect: 'none' }}>{expanded ? '▼' : '▶'}</span>
          <code style={{ fontSize: 13, color: '#5AC8FA', fontFamily: 'monospace', fontWeight: 600 }}>"{item.server_name}"</code>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>:</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.title}</span>
          {item.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" />}
          <span style={{ fontSize: 9, color: item.is_active ? '#30D158' : '#8E8E93', background: item.is_active ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>{item.is_active ? 'active' : 'inactive'}</span>
          <span style={{ fontSize: 9, color: '#5AC8FA', background: 'rgba(90,200,250,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.transport}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '0 12px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onCopy(item)}>
            {copiedId === item.id ? <Check size={11} color="#30D158" /> : <Copy size={11} color="rgba(255,255,255,0.4)" />}
          </button>
          <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onView(item)}>
            <FileJson size={11} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
      </div>
      {/* JSON content */}
      {expanded && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <pre style={{ margin: 0, padding: '12px 16px 12px 28px', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, lineHeight: 1.7, color: '#5AC8FA', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {configStr.split('\n').map((line, i) => {
              // Syntax highlight keys vs values
              const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/)
              if (keyMatch) {
                return (
                  <span key={i}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{keyMatch[1]}</span>
                    <span style={{ color: '#BF5AF2' }}>"{keyMatch[2]}"</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{keyMatch[3]}</span>
                    <span style={{ color: line.includes('"') && !line.match(/:\s*"/) ? '#30D158' : '#FF9500' }}>{keyMatch[4]}</span>
                    {'\n'}
                  </span>
                )
              }
              return <span key={i} style={{ color: 'rgba(255,255,255,0.4)' }}>{line}{'\n'}</span>
            })}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function McpPage() {
  const qc = useQueryClient()
  const gridMounted = useRef(false)
  const [search, setSearch] = useState('')
  const [transport, setTransport] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editFullscreen, setEditFullscreen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [configText, setConfigText] = useState(defaultConfigText)
  const [configError, setConfigError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('mcp_view') || 'cards')
  const setView = (m) => { setViewMode(m); localStorage.setItem('mcp_view', m); setSelectedIds(new Set()); setSelectMode(false) }
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
      await Promise.all([...selectedIds].map(id => mcpApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['mcp'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} config${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }
  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => mcpApi.toggleFavorite(id)))
      qc.invalidateQueries({ queryKey: ['mcp'] })
      toast.success(`Updated ${selectedIds.size}`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['mcp', { search, transport, favorite: showFavorites }],
    queryFn: () => mcpApi.list({
      search: search || undefined,
      transport: transport || undefined,
      favorite: showFavorites ? 'true' : undefined,
      limit: 100,
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => mcpApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); toast.success('MCP config created!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => mcpApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp'] }); toast.success('MCP config updated!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => mcpApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash'] }); qc.invalidateQueries({ queryKey: ['trash-count'] }); toast.success('MCP config deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => mcpApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['mcp'] })
      const prev = qc.getQueriesData({ queryKey: ['mcp'] })
      qc.setQueriesData({ queryKey: ['mcp'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['mcp'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => mcpApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcp'] }),
  })

  const openCreate = () => {
    setEditItem(null)
    setForm(defaultForm)
    setConfigText(defaultConfigText)
    setConfigError('')
    setModalOpen(true)
  }

  const openEdit = (item, fullscreen = false) => {
    setEditItem(item)
    setEditFullscreen(fullscreen)
    setForm({ title: item.title || '', server_name: item.server_name || '', description: item.description || '', transport: item.transport || 'stdio', config: item.config || {}, tags: item.tags?.map(t => t.id) || [] })
    setConfigText(JSON.stringify(item.config || {}, null, 2))
    setConfigError('')
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm); setConfigText(defaultConfigText); setConfigError(''); setEditFullscreen(false) }

  const handleConfigChange = (text) => {
    // Try to auto-wrap if user pasted without outer braces
    let processedText = text.trim()

    // If text doesn't start with { try to wrap it
    if (!processedText.startsWith('{') && !processedText.startsWith('[')) {
      processedText = '{' + processedText + '}'
    }

    setConfigText(text)
    try {
      const parsed = JSON.parse(processedText)
      const keys = Object.keys(parsed)

      // Auto-detect full format: { "server-name": { command/type/timeout/args/env/url } }
      const MCP_KEYS = ['command', 'url', 'type', 'timeout', 'args', 'env']
      if (
        keys.length === 1 &&
        typeof parsed[keys[0]] === 'object' &&
        MCP_KEYS.some(k => k in parsed[keys[0]])
      ) {
        const innerConfig = parsed[keys[0]]
        const serverName = keys[0]
        if (!form.server_name) {
          setForm(f => ({ ...f, server_name: serverName }))
        }
        // Set transport from type field if present
        if (innerConfig.type && !form.transport) {
          setForm(f => ({ ...f, transport: innerConfig.type }))
        }
        const formatted = JSON.stringify(innerConfig, null, 2)
        setConfigText(formatted)
      }
      setConfigError('')
    } catch (e) {
      setConfigError('Invalid JSON: ' + e.message)
    }
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.server_name.trim()) { toast.error('Title and server name are required'); return }
    if (configError) { toast.error('Fix JSON errors before saving'); return }
    let config = {}
    try { config = JSON.parse(configText) } catch { toast.error('Invalid JSON config'); return }
    const payload = { ...form, config }
    if (editItem) { updateMutation.mutate({ id: editItem.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  const handleCopy = async (item) => {
    const configStr = JSON.stringify({ [item.server_name]: item.config }, null, 2)
    await navigator.clipboard.writeText(configStr)
    setCopiedId(item.id)
    toast.success('Config copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExport = async () => {
    try {
      const result = await mcpApi.exportActive()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'mcp-servers.json'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported active MCP configs')
    } catch (e) { toast.error(e.message) }
  }

  const items = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search MCP configs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <button className="btn btn-glass" onClick={handleExport}>
          <Download size={14} /> Export Active
        </button>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['cards', LayoutGrid], ['list', List], ['compact', AlignJustify], ['serverstatus', Server], ['jsontree', FileJson]].map(([id, Icon]) => (
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
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Config</button>
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

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Transport:</span>
        <button className={`filter-chip ${!transport ? 'active' : ''}`} onClick={() => setTransport('')}>All</button>
        {TRANSPORTS.map(t => (
          <button key={t} className={`filter-chip ${transport === t ? 'active' : ''}`} onClick={() => setTransport(transport === t ? '' : t)}>{t}</button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><McpIcon size={28} /></div>
          <div className="empty-state-title">{search || transport ? 'No configs found' : 'No MCP configs yet'}</div>
          <div className="empty-state-desc">{search || transport ? 'Try adjusting your filters' : 'Add Model Context Protocol server configurations'}</div>
          {!search && !transport && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Add MCP Config</button>}
        </div>
      ) : viewMode === 'list' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => setViewItem(item)}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.is_active ? '#30D158' : '#8E8E93', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)', fontFamily: 'monospace' }}>{item.server_name}</span>
              {item.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
              <span style={{ fontSize: 10, color: 'var(--teal)', background: 'rgba(90,200,250,0.1)', padding: '1px 7px', borderRadius: 4 }}>{item.transport}</span>
            </div>
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px,100%), 1fr))', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderTop: `2px solid #30D158`, transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 1px rgba(48,209,88,0.3)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              onClick={() => setViewItem(item)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.is_active ? '#30D158' : '#8E8E93', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                {item.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.server_name}</div>
              <span style={{ fontSize: 9, color: 'var(--teal)', background: 'rgba(90,200,250,0.1)', padding: '1px 5px', borderRadius: 3 }}>{item.transport}</span>
            </div>
          ))}
        </div>
      ) : viewMode === 'serverstatus' ? (
        /* ── Server Status — dashboard panel showing online/offline servers ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            {[
              { label: 'Online', count: items.filter(i => i.is_active).length, color: '#30D158' },
              { label: 'Offline', count: items.filter(i => !i.is_active).length, color: '#8E8E93' },
              { label: 'Total', count: items.length, color: '#5AC8FA' },
            ].map(({ label, count, color }) => (
              <div key={label} className="glass-card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: label === 'Online' ? `0 0 8px ${color}` : 'none' }} />
                <span style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -1 }}>{count}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
              </div>
            ))}
          </div>
          {/* Server rows */}
          {items.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setViewItem(item)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* Status indicator */}
                <div style={{ width: 4, alignSelf: 'stretch', background: item.is_active ? '#30D158' : '#8E8E93', flexShrink: 0 }} />
                {/* Status dot + server name */}
                <div style={{ width: 200, padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.is_active ? '#30D158' : '#8E8E93', boxShadow: item.is_active ? '0 0 6px #30D158' : 'none' }} />
                    <code style={{ fontSize: 12, color: item.is_active ? '#30D158' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>{item.server_name}</code>
                  </div>
                  <div style={{ fontSize: 10, color: item.is_active ? 'rgba(48,209,88,0.6)' : 'var(--text-quaternary)', paddingLeft: 16 }}>{item.is_active ? '● online' : '○ offline'}</div>
                </div>
                {/* Title + description */}
                <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                    {item.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" />}
                  </div>
                  {item.description && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
                </div>
                {/* Transport + command */}
                <div style={{ width: 160, padding: '12px 16px', borderLeft: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Transport</div>
                  <span style={{ fontSize: 11, color: '#5AC8FA', background: 'rgba(90,200,250,0.1)', padding: '2px 7px', borderRadius: 4 }}>{item.transport}</span>
                </div>
                {/* Actions */}
                <div style={{ width: 80, padding: '0 12px', display: 'flex', gap: 4, justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => toggleMutation.mutate(item.id)} title="Toggle">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.is_active ? '#30D158' : '#8E8E93', border: '2px solid currentColor' }} />
                  </button>
                  <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => handleCopy(item)}>
                    {copiedId === item.id ? <Check size={12} color="#30D158" /> : <Copy size={12} color="rgba(255,255,255,0.4)" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'jsontree' ? (
        /* ── JSON Tree — expandable config view per server ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <JsonTreeItem key={item.id} item={item} onView={setViewItem} onCopy={handleCopy} copiedId={copiedId} onToggle={() => toggleMutation.mutate(item.id)} />
          ))}
        </div>
      ) : (
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`}
          ref={() => { gridMounted.current = true }}>
          {items.map(item => (
            <div key={item.id} className={`item-card${selectedIds.has(item.id) ? ' selected' : ''}`}
              onClick={() => selectMode || selectedIds.size > 0 ? (toggleSelect(item.id), setSelectMode(true)) : setViewItem(item)}
              style={{ cursor: 'pointer', outline: selectedIds.has(item.id) ? '2px solid var(--blue)' : 'none', outlineOffset: 2 }}>
              <div className="item-card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className={`status-dot ${item.is_active ? 'active' : 'inactive'}`}
                      style={{ cursor: 'pointer' }} onClick={() => toggleMutation.mutate(item.id)}
                      title={item.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'} />
                    <div className="item-card-title truncate">{item.title}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {item.server_name}
                  </div>
                </div>
                <button className={`favorite-btn ${item.is_favorite ? 'active' : ''}`} onClick={() => favMutation.mutate(item.id)}>
                  <Star size={14} fill={item.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              {item.description && <div className="item-card-description">{item.description}</div>}

              <div className="code-block" style={{ fontSize: 11, maxHeight: 120, overflow: 'hidden' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(item.config, null, 2).slice(0, 300)}
                  {JSON.stringify(item.config, null, 2).length > 300 ? '\n…' : ''}
                </pre>
              </div>

              <div className="item-card-footer">
                <div className="item-card-meta">
                  <span className="tag" style={{ color: 'var(--teal)', borderColor: 'rgba(90,200,250,0.3)' }}>
                    {item.transport}
                  </span>
                  {item.updated_at && (
                    <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="item-card-actions" style={{ opacity: 1 }}>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleCopy(item) }} title="Copy config" style={{ padding: 6 }}>
                    {copiedId === item.id ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
                  </button>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openEdit(item) }} title="Edit" style={{ padding: 6 }}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id) }} title="Delete" style={{ padding: 6, color: 'var(--pink)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit MCP Config' : 'New MCP Config'} size="lg" fullscreen={editFullscreen}
        footer={<>
          <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting || !!configError}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {editItem ? 'Save Changes' : 'Create Config'}
          </button>
        </>}>
        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. GitHub MCP Server" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Server Name *</label>
            <input className="form-input" placeholder="e.g. github" value={form.server_name} onChange={e => setForm(f => ({ ...f, server_name: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="What does this MCP server do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Transport</label>
            <select className="form-select" value={form.transport} onChange={e => setForm(f => ({ ...f, transport: e.target.value }))}>
              {TRANSPORTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Server Configuration (JSON)</span>
            {configError && <span style={{ color: 'var(--pink)', fontSize: 11 }}>{configError}</span>}
          </label>
          <textarea
            className={`form-textarea code`}
            style={{ borderColor: configError ? 'rgba(255,55,95,0.5)' : undefined, minHeight: 220 }}
            value={configText}
            onChange={e => handleConfigChange(e.target.value)}
            spellCheck={false}
          />
          <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4 }}>
            Standard MCP server config format: command, args, env
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete MCP Config" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>Delete</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this MCP configuration?</p>
      </Modal>

      {viewItem && (
        <DetailModal
          item={viewItem}
          typeLabel="MCP Config"
          typeColor="#30D158"
          typeIcon={McpIcon}
          maxWidth={860}
          onClose={() => setViewItem(null)}
          onEdit={(item, fullscreen) => { setViewItem(null); openEdit(item, fullscreen) }}
          onDelete={(id) => { setViewItem(null); setDeleteConfirm(id) }}
          onToggleFavorite={(id) => { favMutation.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
