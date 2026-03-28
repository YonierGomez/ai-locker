import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { snippetsApi, categoriesApi } from '../utils/api'
import Modal from '../components/Modal'
import DetailModal from '../components/DetailModal'
import { Code2, Plus, Search, Star, Copy, Check, Trash2, Edit2, LayoutGrid, AlignJustify, List, MousePointer } from 'lucide-react'
import toast from 'react-hot-toast'
import CategorySelector from '../components/CategorySelector'
import { formatDistanceToNow } from 'date-fns'
import hljs from 'highlight.js/lib/core'
// Register languages
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml' // html
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import hcl from 'highlight.js/lib/languages/hcl'
import nginx from 'highlight.js/lib/languages/nginx'
import toml from 'highlight.js/lib/languages/ini' // toml uses ini highlighter
import powershell from 'highlight.js/lib/languages/powershell'
import csharp from 'highlight.js/lib/languages/csharp'
import scala from 'highlight.js/lib/languages/scala'
import r from 'highlight.js/lib/languages/r'
import lua from 'highlight.js/lib/languages/lua'
import perl from 'highlight.js/lib/languages/perl'
import graphql from 'highlight.js/lib/languages/graphql'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('hcl', hcl)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('toml', toml)
hljs.registerLanguage('powershell', powershell)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('r', r)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('perl', perl)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('plaintext', plaintext)

// ── Syntax highlighted code block ──────────────────────────
function CodeBlock({ code, language, maxLines = 8 }) {
  const ref = useRef(null)
  const lines = code.split('\n').slice(0, maxLines)
  const truncated = code.split('\n').length > maxLines
  const preview = lines.join('\n') + (truncated ? '\n…' : '')

  useEffect(() => {
    if (ref.current) {
      ref.current.removeAttribute('data-highlighted')
      hljs.highlightElement(ref.current)
    }
  }, [code, language])

  const hlLang = language === 'html' ? 'xml' : language === 'toml' ? 'ini' : language

  return (
    <pre style={{ margin: 0, padding: 0, background: 'transparent', overflow: 'hidden' }}>
      <code
        ref={ref}
        className={`language-${hlLang}`}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.6, background: 'transparent', padding: 0 }}
      >
        {preview}
      </code>
    </pre>
  )
}

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'bash', 'sql',
  'html', 'css', 'json', 'yaml', 'markdown',
  'rust', 'go', 'java', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin',
  'dockerfile', 'hcl', 'nginx', 'toml', 'powershell',
  'scala', 'r', 'lua', 'perl', 'graphql', 'plaintext', 'other',
]

const LANG_COLORS = {
  javascript: '#FFD60A', typescript: '#007AFF', python: '#30D158',
  bash: '#30D158', sql: '#5AC8FA', html: '#FF9500', css: '#BF5AF2',
  json: '#FF9500', yaml: '#5AC8FA', markdown: '#8E8E93',
  rust: '#FF375F', go: '#5AC8FA', java: '#FF9500', cpp: '#007AFF',
  csharp: '#BF5AF2', php: '#BF5AF2', ruby: '#FF375F', swift: '#FF9500', kotlin: '#BF5AF2',
  dockerfile: '#2496ED', hcl: '#7B42BC', nginx: '#30D158', toml: '#FF9500',
  powershell: '#007AFF', scala: '#FF375F', r: '#5AC8FA', lua: '#007AFF',
  perl: '#FF9500', graphql: '#FF375F', plaintext: '#8E8E93', other: '#8E8E93',
}

const defaultForm = { title: '', code: '', description: '', language: 'javascript', category: 'general' }

export default function SnippetsPage() {
  const qc = useQueryClient()
  const gridMounted = useRef(false)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [category, setCategory] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('snippets_view') || 'cards')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const setView = (m) => { setViewMode(m); localStorage.setItem('snippets_view', m); setSelectedIds(new Set()); setSelectMode(false) }
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedIds(new Set(snippets.map(s => s.id)))
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }
  const isSelectActive = selectMode || selectedIds.size > 0

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => snippetsApi.delete(id)))
      qc.invalidateQueries({ queryKey: ['snippets'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] })
      toast.success(`${selectedIds.size} snippet${selectedIds.size !== 1 ? 's' : ''} deleted`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) } finally { setBulkDeleting(false) }
  }

  const handleBulkFavorite = async () => {
    try {
      await Promise.all([...selectedIds].map(id => snippetsApi.toggleFavorite(id)))
      qc.invalidateQueries({ queryKey: ['snippets'] })
      toast.success(`Updated ${selectedIds.size}`)
      setSelectedIds(new Set())
    } catch (err) { toast.error(err.message) }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['snippets', { search, language, category, favorite: showFavorites }],
    queryFn: () => snippetsApi.list({ search: search || undefined, language: language || undefined, category: category || undefined, favorite: showFavorites ? 'true' : undefined, limit: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data) => snippetsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snippets'] }); qc.invalidateQueries({ queryKey: ['stats'] }); toast.success('Snippet created!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => snippetsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snippets'] }); toast.success('Snippet updated!'); closeModal() },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => snippetsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snippets'] }); qc.invalidateQueries({ queryKey: ['stats'] }); qc.invalidateQueries({ queryKey: ['trash-count'] }); toast.success('Snippet deleted'); setDeleteConfirm(null) },
    onError: (e) => toast.error(e.message),
  })

  const favMutation = useMutation({
    mutationFn: (id) => snippetsApi.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['snippets'] })
      const prev = qc.getQueriesData({ queryKey: ['snippets'] })
      qc.setQueriesData({ queryKey: ['snippets'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s) }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => { if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val)) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })

  const useMutation2 = useMutation({
    mutationFn: (id) => snippetsApi.incrementUse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })

  const openCreate = () => { setEditItem(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (item, fullscreen = false) => {
    setEditItem(item)
    setForm({ title: item.title || '', code: item.code || '', description: item.description || '', language: item.language || 'javascript', category: item.category || 'general' })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditItem(null); setForm(defaultForm) }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.code.trim()) { toast.error('Title and code are required'); return }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form })
    else createMutation.mutate(form)
  }

  const handleCopy = async (snippet) => {
    await navigator.clipboard.writeText(snippet.code)
    setCopiedId(snippet.id)
    useMutation2.mutate(snippet.id)
    toast.success('Code copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const categories = catsData?.data || []

  const snippets = data?.data || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Get unique languages from current snippets
  const usedLanguages = [...new Set(snippets.map(s => s.language))].filter(Boolean)

  return (
    <div className="page-content">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Search snippets…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-chip ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(!showFavorites)}>
          <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} /> Favorites
        </button>
        <div style={{ display: 'flex', background: 'var(--c-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['cards', LayoutGrid], ['list', List], ['compact', AlignJustify]].map(([id, Icon]) => (
            <button key={id} onClick={() => setView(id)} title={`${id} view`}
              style={{ padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === id ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === id ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button className={`btn btn-glass btn-sm ${isSelectActive ? 'active' : ''}`}
          onClick={() => { setSelectMode(m => !m); if (isSelectActive) clearSelection() }}
          style={isSelectActive ? { borderColor: 'color-mix(in srgb, var(--blue) 40%, transparent)', color: 'var(--blue-light)', gap: 5 } : { gap: 5 }}>
          <MousePointer size={13} /> Select
        </button>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Snippet</button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--blue) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)', borderRadius: 12, flexWrap: 'wrap' }}>
          <Check size={14} color="var(--blue-light)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue-light)' }}>{selectedIds.size} selected</span>
          <button className="btn btn-glass btn-sm" onClick={selectAll} style={{ gap: 5 }}>Select all {snippets.length}</button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button className="btn btn-glass btn-sm" onClick={handleBulkFavorite} style={{ gap: 5 }}><Star size={12} /> Toggle favorite</button>
          <button className="btn btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting} style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}><Trash2 size={12} /> Delete selected</button>
          <button className="btn btn-glass btn-sm" onClick={clearSelection} style={{ marginLeft: 'auto', gap: 5 }}>Cancel</button>
        </div>
      )}

      {/* Language filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <button className={`filter-chip ${!language ? 'active' : ''}`} onClick={() => setLanguage('')}>All</button>
        {LANGUAGES.filter(l => usedLanguages.includes(l) || language === l).map(lang => {
          const color = LANG_COLORS[lang] || '#8E8E93'
          return (
            <button key={lang} className={`filter-chip ${language === lang ? 'active' : ''}`}
              onClick={() => setLanguage(language === lang ? '' : lang)}
              style={language === lang ? { background: `${color}18`, borderColor: `${color}50`, color } : {}}>
              {lang}
            </button>
          )
        })}
      </div>

      {/* Category filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All categories</button>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : snippets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Code2 size={28} /></div>
          <div className="empty-state-title">{search || language || category ? 'No snippets found' : 'No snippets yet'}</div>
          <div className="empty-state-desc">{search || language || category ? 'Try adjusting your filters' : 'Save reusable code snippets for any language'}</div>
          {!search && !language && !category && <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 8 }}><Plus size={15} /> Create Snippet</button>}
        </div>
      ) : viewMode === 'list' ? (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {snippets.map((snippet, idx) => {
            const color = LANG_COLORS[snippet.language] || '#8E8E93'
            const sel = selectedIds.has(snippet.id)
            return (
              <div key={snippet.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < snippets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.12s', background: sel ? 'color-mix(in srgb, var(--blue) 8%, transparent)' : 'transparent', outline: sel ? '2px solid var(--blue)' : 'none', outlineOffset: -2 }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                onClick={() => isSelectActive ? (toggleSelect(snippet.id), setSelectMode(true)) : setViewItem(snippet)}>
                {isSelectActive && (
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: sel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sel && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>{snippet.language}</span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet.title}</span>
                {snippet.is_favorite && <Star size={11} color="var(--yellow)" fill="var(--yellow)" />}
                <span style={{ fontSize: 11, color: 'var(--text-quaternary)', background: 'var(--c-surface)', padding: '1px 7px', borderRadius: 4 }}>{snippet.category}</span>
                {snippet.use_count > 0 && <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>{snippet.use_count}×</span>}
              </div>
            )
          })}
        </div>
      ) : viewMode === 'compact' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 8 }}>
          {snippets.map(snippet => {
            const color = LANG_COLORS[snippet.language] || '#8E8E93'
            const sel = selectedIds.has(snippet.id)
            return (
              <div key={snippet.id} className="glass-card" style={{ padding: '10px 12px', cursor: 'pointer', borderTop: `2px solid ${color}`, transition: 'box-shadow 0.15s', outline: sel ? '2px solid var(--blue)' : 'none', outlineOffset: 2, background: sel ? 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))' : undefined }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.boxShadow = `0 0 0 1px ${color}40` }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.boxShadow = 'none' }}
                onClick={() => isSelectActive ? (toggleSelect(snippet.id), setSelectMode(true)) : setViewItem(snippet)}>
                {isSelectActive && (
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.2)'}`, background: sel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 6 }}>
                    {sel && <Check size={9} color="white" strokeWidth={3} />}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color, background: `${color}18`, padding: '1px 5px', borderRadius: 3 }}>{snippet.language}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet.title}</span>
                  {snippet.is_favorite && <Star size={9} color="var(--yellow)" fill="var(--yellow)" />}
                </div>
                <div style={{ background: 'var(--c-code-bg)', borderRadius: 5, padding: '5px 8px' }}>
                  <code style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {snippet.code.split('\n')[0]}
                  </code>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Cards view */
        <div className={`cards-grid${!gridMounted.current ? ' stagger-children' : ''}`} ref={() => { gridMounted.current = true }}>
          {snippets.map(snippet => {
            const color = LANG_COLORS[snippet.language] || '#8E8E93'
            const sel = selectedIds.has(snippet.id)
            const timeAgo = snippet.updated_at ? formatDistanceToNow(new Date(snippet.updated_at), { addSuffix: true }) : ''
            return (
              <div key={snippet.id} className={`item-card${sel ? ' selected' : ''}`}
                style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
                onClick={() => isSelectActive ? (toggleSelect(snippet.id), setSelectMode(true)) : setViewItem(snippet)}>
                {/* Header */}
                <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px solid var(--c-divider)' }}>
                  {isSelectActive && (
                    <div style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${sel ? 'var(--blue)' : 'rgba(255,255,255,0.25)'}`, background: sel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {sel && <Check size={10} color="white" strokeWidth={3} />}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.3 }}>{snippet.language.toUpperCase()}</span>
                      {snippet.is_favorite && <Star size={10} color="var(--yellow)" fill="var(--yellow)" />}
                    </div>
                    <div className="item-card-title truncate">{snippet.title}</div>
                    {snippet.description && <div className="item-card-description">{snippet.description}</div>}
                  </div>
                  {!isSelectActive && (
                    <button className={`favorite-btn ${snippet.is_favorite ? 'active' : ''}`} onClick={e => { e.stopPropagation(); favMutation.mutate(snippet.id) }}>
                      <Star size={14} fill={snippet.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
                {/* Code preview */}
                <div style={{ background: 'var(--c-code-bg)', padding: '10px 14px', position: 'relative', maxHeight: 140, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.6, color, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {snippet.code.slice(0, 200)}{snippet.code.length > 200 ? '\n…' : ''}
                  </pre>
                  {!isSelectActive && (
                    <button onClick={e => { e.stopPropagation(); handleCopy(snippet) }}
                      style={{ position: 'absolute', right: 10, bottom: 10, background: copiedId === snippet.id ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${copiedId === snippet.id ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: copiedId === snippet.id ? '#30D158' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}>
                      {copiedId === snippet.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId === snippet.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                {/* Footer */}
                <div className="item-card-footer" style={{ padding: '8px 14px' }}>
                  <div className="item-card-meta">
                    <span className={`category-badge ${snippet.category}`}>{snippet.category}</span>
                    {snippet.use_count > 0 && <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>{snippet.use_count}×</span>}
                    {timeAgo && <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{timeAgo}</span>}
                  </div>
                  {!isSelectActive && (
                    <div className="item-card-actions" style={{ opacity: 1 }}>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(snippet) }} style={{ padding: 6 }}><Edit2 size={13} /></button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); setDeleteConfirm(snippet.id) }} style={{ padding: 6, color: 'var(--pink)' }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editItem ? 'Edit Snippet' : 'New Snippet'} size="lg"
        footer={<>
          <button className="btn btn-glass" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {editItem ? 'Save Changes' : 'Create Snippet'}
          </button>
        </>}>
        <div className="form-grid-2col" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Debounce function" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-select" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="What does this snippet do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Code *</label>
          <textarea className="form-textarea code" placeholder="// Your code here…" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={{ minHeight: 240, color: LANG_COLORS[form.language] || 'var(--text-primary)' }} spellCheck={false} />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <CategorySelector value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Snippet" size="sm"
        footer={<>
          <button className="btn btn-glass" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>Delete</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Are you sure you want to delete this snippet?</p>
      </Modal>

      {/* Detail Modal */}
      {viewItem && (
        <DetailModal
          item={{ ...viewItem, content: viewItem.code }}
          typeLabel="Snippet"
          typeColor={LANG_COLORS[viewItem.language] || '#8E8E93'}
          typeIcon={Code2}
          onClose={() => setViewItem(null)}
          onEdit={(item, fullscreen) => { setViewItem(null); openEdit(item, fullscreen) }}
          onDelete={(id) => { setViewItem(null); setDeleteConfirm(id) }}
          onToggleFavorite={(id) => { favMutation.mutate(id); setViewItem(v => v ? { ...v, is_favorite: !v.is_favorite } : v) }}
        />
      )}
    </div>
  )
}
