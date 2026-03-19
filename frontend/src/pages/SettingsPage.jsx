import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, tagsApi, categoriesApi, backupApi } from '../utils/api'
import Modal from '../components/Modal'
import ModelSelector from '../components/ModelSelector'
import {
  Database, Palette, Info, Save, ExternalLink, Tag, FolderOpen,
  Cloud, Upload, Download, RefreshCw, Trash2, Plus, Check, X,
  AlertCircle, Clock, Image, Cpu, Pipette, RotateCcw, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// ── Latest AI Models — March 2026 (via OpenRouter) ─────────────
const AI_MODELS = [
  // OpenAI — latest March 2026
  { group: 'OpenAI', models: [
    'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
    'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
    'gpt-4o', 'gpt-4o-mini',
    'o3', 'o3-mini', 'o1', 'o1-mini',
  ]},
  // Anthropic — latest March 2026
  { group: 'Anthropic', models: [
    'claude-3-7-sonnet-20250219',
    'claude-3-7-sonnet-20250219:thinking',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ]},
  // Google — latest March 2026
  { group: 'Google', models: [
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-pro-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ]},
  // Meta — latest March 2026
  { group: 'Meta / Llama', models: [
    'llama-4-maverick',
    'llama-4-scout',
    'llama-3.3-70b-instruct',
    'llama-3.2-90b-vision-instruct',
    'llama-3.1-405b-instruct',
  ]},
  // Mistral — latest March 2026
  { group: 'Mistral', models: [
    'mistral-small-3.1-24b',
    'mistral-large-2411',
    'mistral-medium-3',
    'codestral-2501',
    'pixtral-large-2411',
  ]},
  // xAI — latest March 2026
  { group: 'xAI / Grok', models: [
    'grok-3-beta',
    'grok-3-mini-beta',
    'grok-2-1212',
    'grok-2-vision-1212',
  ]},
  // DeepSeek — latest March 2026
  { group: 'DeepSeek', models: [
    'deepseek-chat-v3-0324',
    'deepseek-r1',
    'deepseek-r1-distill-llama-70b',
    'deepseek-v3',
  ]},
  // Qwen / Alibaba — latest March 2026
  { group: 'Qwen / Alibaba', models: [
    'qwen-max-2025-01-21',
    'qwen2.5-72b-instruct',
    'qwen2.5-vl-72b-instruct',
    'qwq-32b',
    'qwen3.5-9b',
  ]},
  // NVIDIA — latest March 2026
  { group: 'NVIDIA', models: [
    'nvidia/nemotron-3-super',
    'nvidia/llama-3.1-nemotron-ultra-253b',
    'nvidia/llama-3.3-nemotron-super-49b',
  ]},
  // Cohere — latest March 2026
  { group: 'Cohere', models: [
    'command-a-03-2025',
    'command-r-plus-08-2024',
    'command-r-08-2024',
  ]},
  // ByteDance — latest March 2026
  { group: 'ByteDance', models: [
    'bytedance-seed/seed-2.0-lite',
    'doubao-1-5-pro-32k',
  ]},
  // MiniMax — latest March 2026
  { group: 'MiniMax', models: [
    'minimax/minimax-m2.7',
    'minimax-01',
  ]},
  // Amazon
  { group: 'Amazon', models: [
    'amazon/nova-pro-v1',
    'amazon/nova-lite-v1',
    'amazon/nova-micro-v1',
  ]},
]

const ACCENT_COLORS = [
  { name: 'Blue', value: '#007AFF' },
  { name: 'Purple', value: '#BF5AF2' },
  { name: 'Pink', value: '#FF375F' },
  { name: 'Orange', value: '#FF9F0A' },
  { name: 'Green', value: '#30D158' },
  { name: 'Teal', value: '#5AC8FA' },
  { name: 'Indigo', value: '#5E5CE6' },
  { name: 'Yellow', value: '#FFD60A' },
]

const TAG_COLORS = ['#007AFF', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#5AC8FA', '#5E5CE6', '#FFD60A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

const S3_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'sa-east-1']

// ── Reusable Color Swatches Picker ──────────────────────────────
function ColorSwatches({ value, onChange, colors, size = 'md' }) {
  const pickerRef = useRef(null)
  const isPreset = colors.includes(value)
  const swatchSize = size === 'lg' ? 34 : 22
  const borderWidth = size === 'lg' ? 3 : 2

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 10 : 6, flexWrap: 'wrap' }}>
      {/* Preset swatches */}
      {colors.map(c => {
        const selected = value === c
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: swatchSize, height: swatchSize,
              borderRadius: '50%',
              background: c,
              cursor: 'pointer',
              border: selected ? `${borderWidth}px solid white` : `${borderWidth}px solid transparent`,
              boxShadow: selected
                ? `0 0 0 2px ${c}, 0 4px 12px ${c}80`
                : `0 2px 6px ${c}50`,
              transform: selected ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
              flexShrink: 0,
            }}
          />
        )
      })}

      {/* Divider */}
      <div style={{ width: 1, height: swatchSize * 0.7, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Custom color picker button */}
      <label
        title="Custom color"
        style={{
          position: 'relative',
          width: swatchSize, height: swatchSize,
          borderRadius: '50%',
          background: !isPreset && value ? value : 'rgba(255,255,255,0.07)',
          border: !isPreset && value
            ? `${borderWidth}px solid white`
            : `${borderWidth}px dashed rgba(255,255,255,0.25)`,
          boxShadow: !isPreset && value ? `0 0 0 2px ${value}, 0 4px 12px ${value}80` : 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'all 0.18s',
          transform: !isPreset && value ? 'scale(1.18)' : 'scale(1)',
        }}
      >
        {(isPreset || !value) && (
          <Pipette size={size === 'lg' ? 14 : 10} color="rgba(255,255,255,0.45)" />
        )}
        <input
          ref={pickerRef}
          type="color"
          value={value || '#007AFF'}
          onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </label>

      {/* Hex value display (only for lg size / accent color) */}
      {size === 'lg' && (
        <div style={{
          fontSize: 12, fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '4px 10px',
          letterSpacing: 1,
        }}>
          {(value || '#007AFF').toUpperCase()}
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon size={16} color={color || 'var(--text-secondary)'} />
        <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.1 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => settingsApi.stats() })
  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: s3Status } = useQuery({ queryKey: ['s3-status'], queryFn: () => backupApi.s3Status(), retry: false, staleTime: 60000 })
  const { data: s3Files, refetch: refetchS3 } = useQuery({ queryKey: ['s3-files'], queryFn: () => backupApi.s3List(), enabled: false, retry: false })

  const [localSettings, setLocalSettings] = useState({})
  const [newTag, setNewTag] = useState({ name: '', color: '#007AFF' })
  const [newCat, setNewCat] = useState({ name: '', color: '#007AFF' })
  const [s3Config, setS3Config] = useState({})
  const [testingS3, setTestingS3] = useState(false)
  const [s3TestResult, setS3TestResult] = useState(null)
  const [showS3Files, setShowS3Files] = useState(false)
  const [importMerge, setImportMerge] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const currentSettings = { ...settings, ...localSettings }

  const updateMutation = useMutation({
    mutationFn: (data) => settingsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved!') },
    onError: (e) => toast.error(e.message),
  })

  const DEFAULTS = {
    accent_color: '#007AFF',
    default_model: 'claude-sonnet-4-6',
    app_logo: '',
    s3_bucket: '', s3_region: 'us-east-1', s3_prefix: 'promptly-backups/',
    s3_access_key: '', s3_secret_key: '', s3_endpoint: '',
    auto_sync_s3: 'false',
  }

  const handleReset = async () => {
    await updateMutation.mutateAsync(DEFAULTS)
    setLocalSettings({})
    setS3Config({})
    setResetConfirm(false)
    toast.success('Settings reset to defaults')
  }

  const createTagMutation = useMutation({
    mutationFn: (data) => tagsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewTag({ name: '', color: '#007AFF' }); toast.success('Tag created!') },
    onError: (e) => toast.error(e.message),
  })

  const deleteTagMutation = useMutation({
    mutationFn: (id) => tagsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Tag deleted') },
    onError: (e) => toast.error(e.message),
  })

  const createCatMutation = useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCat({ name: '', color: '#007AFF' }); toast.success('Category created!') },
    onError: (e) => toast.error(e.message),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted') },
    onError: (e) => toast.error(e.message),
  })

  const s3UploadMutation = useMutation({
    mutationFn: () => backupApi.s3Upload(),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['s3-status'] }); toast.success(`Backed up to S3: ${r.key}`) },
    onError: (e) => toast.error(e.message),
  })

  const s3RestoreMutation = useMutation({
    mutationFn: ({ key, merge }) => backupApi.s3Restore(key, merge),
    onSuccess: (r) => { qc.invalidateQueries(); toast.success(`Restored ${Object.values(r.imported).reduce((a, b) => a + b, 0)} items from S3`) },
    onError: (e) => toast.error(e.message),
  })

  const set = (key, value) => {
    setLocalSettings(s => ({ ...s, [key]: value }))
    if (key === 'accent_color') {
      document.documentElement.style.setProperty('--blue', value)
      document.documentElement.style.setProperty('--accent', value)
    }
  }

  const hasChanges = Object.keys(localSettings).length > 0

  const handleSave = () => {
    updateMutation.mutate(localSettings)
    setLocalSettings({})
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500KB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      set('app_logo', ev.target.result)
      toast.success('Logo uploaded — save to apply')
    }
    reader.readAsDataURL(file)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const result = await backupApi.importJson(data, importMerge)
        qc.invalidateQueries()
        toast.success(`Imported: ${Object.entries(result.imported).map(([k, v]) => `${v} ${k}`).join(', ')}`)
      } catch (err) {
        toast.error('Import failed: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleTestS3 = async () => {
    setTestingS3(true)
    setS3TestResult(null)
    try {
      const cfg = {
        bucket: s3Config.bucket || currentSettings.s3_bucket,
        region: s3Config.region || currentSettings.s3_region,
        access_key: s3Config.access_key || currentSettings.s3_access_key,
        secret_key: s3Config.secret_key || currentSettings.s3_secret_key,
        endpoint: s3Config.endpoint ?? currentSettings.s3_endpoint ?? '',
      }
      await backupApi.s3Test(cfg)
      setS3TestResult({ ok: true, msg: 'Connection successful ✓' })
    } catch (err) {
      setS3TestResult({ ok: false, msg: err.message })
    } finally {
      setTestingS3(false)
    }
  }

  const handleSaveS3 = () => {
    const rawPrefix = s3Config.prefix ?? currentSettings.s3_prefix ?? 'promptly-backups/'
    const normalizedPrefix = rawPrefix && !rawPrefix.endsWith('/') ? `${rawPrefix}/` : rawPrefix
    const updates = {
      s3_bucket: s3Config.bucket ?? currentSettings.s3_bucket ?? '',
      s3_region: s3Config.region ?? currentSettings.s3_region ?? 'us-east-1',
      s3_access_key: s3Config.access_key ?? currentSettings.s3_access_key ?? '',
      s3_secret_key: s3Config.secret_key ?? currentSettings.s3_secret_key ?? '',
      s3_prefix: normalizedPrefix,
      s3_endpoint: s3Config.endpoint ?? currentSettings.s3_endpoint ?? '',
      sync_enabled: currentSettings.sync_enabled ?? 'false',
      sync_interval: currentSettings.sync_interval ?? '60',
    }
    updateMutation.mutate(updates)
    setS3Config({})
    setLocalSettings(ls => { const n = { ...ls }; delete n.sync_enabled; delete n.sync_interval; return n })
    qc.invalidateQueries({ queryKey: ['s3-status'] })
  }

  if (isLoading) return <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>

  const tags = tagsData?.data || []
  const categories = categoriesData?.data || []

  return (
    <div className="page-content" style={{ maxWidth: 780 }}>

      {/* ── Branding ── */}
      <Section icon={Image} title="Branding" color="var(--blue)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Custom Logo</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}>
              {/* Preview */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                background: currentSettings.app_logo ? 'transparent' : 'linear-gradient(145deg, #0D1117 0%, #161B22 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}>
                {currentSettings.app_logo ? (
                  <img src={currentSettings.app_logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="16" height="16" rx="4" stroke="#00D4FF" strokeWidth="1.2" strokeOpacity="0.7"/>
                    <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.85"/>
                    <rect x="11" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                    <rect x="5.5" y="11" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                    <path d="M13.5 11.5L12.5 13.5L14.5 13L13 15" stroke="#00D4FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Upload a custom logo (PNG, JPG, SVG — max 500KB). It will appear in the sidebar.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-glass btn-sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload size={12} /> Upload Logo
                  </button>
                  {currentSettings.app_logo && (
                    <button className="btn btn-danger btn-sm" onClick={() => set('app_logo', '')}>
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section icon={Palette} title="Appearance" color="var(--purple)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div style={{ marginTop: 8 }}>
              <ColorSwatches
                value={currentSettings.accent_color || '#007AFF'}
                onChange={(v) => set('accent_color', v)}
                colors={ACCENT_COLORS.map(c => c.value)}
                size="lg"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI Defaults ── */}
      <Section icon={Cpu} title="AI Defaults" color="var(--teal)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Default Model</label>
            <ModelSelector
              value={currentSettings.default_model || ''}
              onChange={(v) => set('default_model', v)}
              placeholder="Search or type a model…"
            />
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 6 }}>
              Models updated March 2026 · Type any model ID to use a custom one
            </div>
          </div>
        </div>
      </Section>

      {/* ── Categories ── */}
      <Section icon={FolderOpen} title="Categories" color="var(--orange)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${cat.color}18`, border: `1px solid ${cat.color}40`,
                borderRadius: 'var(--radius-full)', padding: '4px 10px 4px 8px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: cat.color, fontWeight: 500 }}>{cat.name}</span>
                {!cat.id.startsWith('cat-') && (
                  <button onClick={() => deleteCatMutation.mutate(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.color, opacity: 0.6, padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="New category name"
              value={newCat.name}
              onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && newCat.name && createCatMutation.mutate(newCat)}
              style={{ flex: 1 }}
            />
            <ColorSwatches
              value={newCat.color}
              onChange={(c) => setNewCat(nc => ({ ...nc, color: c }))}
              colors={TAG_COLORS.slice(0, 8)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => newCat.name && createCatMutation.mutate(newCat)} disabled={!newCat.name}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      </Section>

      {/* ── Tags ── */}
      <Section icon={Tag} title="Tags" color="var(--indigo)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {tags.map(tag => (
              <div key={tag.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${tag.color}18`, border: `1px solid ${tag.color}40`,
                borderRadius: 'var(--radius-full)', padding: '4px 10px 4px 8px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: tag.color, fontWeight: 500 }}>{tag.name}</span>
                <button onClick={() => deleteTagMutation.mutate(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tag.color, opacity: 0.6, padding: 0, display: 'flex' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
            {tags.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No tags yet</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="New tag name"
              value={newTag.name}
              onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && newTag.name && createTagMutation.mutate(newTag)}
              style={{ flex: 1 }}
            />
            <ColorSwatches
              value={newTag.color}
              onChange={(c) => setNewTag(nt => ({ ...nt, color: c }))}
              colors={TAG_COLORS.slice(0, 8)}
            />
            <button className="btn btn-primary btn-sm" onClick={() => newTag.name && createTagMutation.mutate(newTag)} disabled={!newTag.name}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      </Section>

      {/* ── Database ── */}
      <Section icon={Database} title="Database" color="var(--green)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Prompts', value: stats?.prompts ?? 0, color: 'var(--blue)' },
              { label: 'Skills', value: stats?.skills ?? 0, color: 'var(--orange)' },
              { label: 'Steering', value: stats?.steering ?? 0, color: 'var(--purple)' },
              { label: 'MCP Configs', value: stats?.mcp_configs ?? 0, color: 'var(--green)' },
              { label: 'Tags', value: stats?.tags ?? 0, color: 'var(--teal)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: -0.5 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-glass btn-sm" onClick={() => backupApi.exportJson()}>
              <Download size={13} /> Export JSON
            </button>
            <label className="btn btn-glass btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={13} />
              <span>Import JSON</span>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={importMerge} onChange={e => setImportMerge(e.target.checked)} style={{ accentColor: 'var(--blue)' }} />
              Merge (keep existing)
            </label>
          </div>
        </div>
      </Section>

      {/* ── S3-Compatible Storage ── */}
      <Section icon={Cloud} title="S3 Backup & Sync" color="var(--orange)">
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status — always visible, uses default state while loading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: s3Status?.configured ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s3Status?.configured ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 'var(--radius-md)' }}>
            <div className={`status-dot ${s3Status?.configured ? 'active' : 'inactive'}`} />
            <span style={{ fontSize: 13, color: s3Status?.configured ? 'var(--green)' : 'var(--text-tertiary)' }}>
              {s3Status ? (s3Status.configured ? `Connected · s3://${s3Status.bucket}` : 'Not configured') : 'Loading…'}
            </span>
            {s3Status?.last_sync && (
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
                Last sync: {formatDistanceToNow(new Date(s3Status.last_sync), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Provider quick-select */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'AWS S3',       endpoint: '',                                          match: null },
              { label: 'Cloudflare R2', endpoint: 'https://<account>.r2.cloudflarestorage.com', match: 'cloudflarestorage' },
              { label: 'Backblaze B2', endpoint: 'https://s3.<region>.backblazeb2.com',        match: 'backblazeb2' },
              { label: 'MinIO',        endpoint: 'http://localhost:9000',                      match: 'localhost' },
            ].map(p => {
              const current = s3Config.endpoint ?? (currentSettings.s3_endpoint || '')
              const active = p.match === null ? !current : (!!current && current.includes(p.match))
              return (
                <button key={p.label}
                  onClick={() => setS3Config(c => ({ ...c, endpoint: p.endpoint }))}
                  className={`filter-chip ${active ? 'active' : ''}`}
                  style={{ fontSize: 11 }}>
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="form-grid-2col" style={{ gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Bucket</label>
              <input className="form-input" placeholder="my-bucket" value={s3Config.bucket ?? (currentSettings.s3_bucket || '')} onChange={e => setS3Config(c => ({ ...c, bucket: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <select className="form-select" value={s3Config.region ?? (currentSettings.s3_region || 'us-east-1')} onChange={e => setS3Config(c => ({ ...c, region: e.target.value }))}>
                {S3_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Access Key ID</label>
              <input className="form-input" placeholder="AKIA..." type="password" value={s3Config.access_key ?? (currentSettings.s3_access_key || '')} onChange={e => setS3Config(c => ({ ...c, access_key: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Secret Access Key</label>
              <input className="form-input" placeholder="••••••••" type="password" value={s3Config.secret_key ?? (currentSettings.s3_secret_key || '')} onChange={e => setS3Config(c => ({ ...c, secret_key: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Prefix / Path</label>
              <input className="form-input" placeholder="promptly-backups/" value={s3Config.prefix ?? (currentSettings.s3_prefix || 'promptly-backups/')} onChange={e => setS3Config(c => ({ ...c, prefix: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Custom Endpoint <span style={{ fontWeight: 400, color: 'var(--text-quaternary)' }}>(opcional · R2, B2, MinIO…)</span></label>
              <input className="form-input" placeholder="https://… (leave empty for AWS)" value={s3Config.endpoint ?? (currentSettings.s3_endpoint || '')} onChange={e => setS3Config(c => ({ ...c, endpoint: e.target.value }))} />
            </div>
          </div>

          {s3TestResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: s3TestResult.ok ? 'rgba(48,209,88,0.1)' : 'rgba(255,55,95,0.1)', border: `1px solid ${s3TestResult.ok ? 'rgba(48,209,88,0.3)' : 'rgba(255,55,95,0.3)'}`, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
              {s3TestResult.ok ? <Check size={14} color="var(--green)" /> : <AlertCircle size={14} color="var(--pink)" />}
              <span style={{ color: s3TestResult.ok ? 'var(--green)' : 'var(--pink)' }}>{s3TestResult.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-glass btn-sm" onClick={handleTestS3} disabled={testingS3}>
              {testingS3 ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={13} />}
              Test Connection
            </button>
            <button className="btn btn-glass btn-sm" onClick={handleSaveS3}>
              <Save size={13} /> Save S3 Config
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => s3UploadMutation.mutate()} disabled={s3UploadMutation.isPending || !currentSettings.s3_bucket}>
              {s3UploadMutation.isPending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Upload size={13} />}
              Backup Now
            </button>
            <button className="btn btn-glass btn-sm" onClick={() => { setShowS3Files(true); refetchS3() }} disabled={!currentSettings.s3_bucket}>
              <Cloud size={13} /> Browse Backups
            </button>
          </div>

          {/* Auto-sync */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Auto-sync to S3</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Automatically backup to S3 on a schedule</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={currentSettings.sync_enabled === 'true'} onChange={e => {
                  const val = e.target.checked ? 'true' : 'false'
                  updateMutation.mutate({ sync_enabled: val })
                  setLocalSettings(ls => { const n = { ...ls }; delete n.sync_enabled; return n })
                }} />
                <span className="toggle-slider" />
              </label>
            </div>
            {currentSettings.sync_enabled === 'true' && (
              <div className="form-group">
                <label className="form-label">Sync Interval</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[15, 30, 60, 120, 180, 360, 540, 720, 1440, 2880].map(m => {
                    const label = m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`
                    return (
                      <button key={m} className={`filter-chip ${(currentSettings.sync_interval || '60') === String(m) ? 'active' : ''}`}
                        onClick={() => {
                          updateMutation.mutate({ sync_interval: String(m) })
                          setLocalSettings(ls => { const n = { ...ls }; delete n.sync_interval; return n })
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <ShieldAlert size={16} color="var(--pink)" />
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.1 }}>Danger Zone</h2>
        </div>
        <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(255,55,95,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Reset settings to defaults</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Restores appearance, model, and S3 config to their original values. Your library data is not affected.
              </div>
            </div>
            {!resetConfirm ? (
              <button
                className="btn btn-glass btn-sm"
                onClick={() => setResetConfirm(true)}
                style={{ gap: 6, flexShrink: 0, borderColor: 'rgba(255,55,95,0.25)', color: 'var(--pink)' }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Are you sure?</span>
                <button
                  className="btn btn-sm"
                  onClick={handleReset}
                  disabled={updateMutation.isPending}
                  style={{ gap: 5, background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', color: 'var(--pink)' }}
                >
                  <Check size={12} /> Yes, reset
                </button>
                <button className="btn btn-glass btn-sm" onClick={() => setResetConfirm(false)}>
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <Section icon={Info} title="About" color="var(--text-tertiary)">
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              background: currentSettings.app_logo ? 'none' : 'linear-gradient(145deg, #0D1117 0%, #161B22 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}>
              {currentSettings.app_logo ? (
                <img src={currentSettings.app_logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="4" stroke="#00D4FF" strokeWidth="1.2" strokeOpacity="0.7"/>
                  <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.85"/>
                  <rect x="11" y="5.5" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                  <rect x="5.5" y="11" width="3.5" height="3.5" rx="1" fill="#00D4FF" fillOpacity="0.5"/>
                  <path d="M13.5 11.5L12.5 13.5L14.5 13L13 15" stroke="#00D4FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{currentSettings.app_name || 'Promptly'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>AI Prompts Manager · v1.0.0</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── S3 Files Modal ── */}
      <Modal isOpen={showS3Files} onClose={() => setShowS3Files(false)} title="S3 Backups" size="md">
        {!s3Files ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : s3Files.data?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No backups found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s3Files.data?.map(file => (
              <div key={file.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-md)' }}>
                <Cloud size={14} color="var(--teal)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, truncate: true }}>{file.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {(file.size / 1024).toFixed(1)} KB · {formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })}
                  </div>
                </div>
                <button className="btn btn-glass btn-sm" onClick={() => { s3RestoreMutation.mutate({ key: file.key, merge: false }); setShowS3Files(false) }}>
                  <Download size={12} /> Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Floating Save ── */}
      {hasChanges && (
        <div className="settings-save-bar" style={{ animation: 'slideUp 0.2s ease-out' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Unsaved changes</span>
          <button className="btn btn-glass btn-sm" onClick={() => setLocalSettings({})}>Discard</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save size={13} /> Save
          </button>
        </div>
      )}
    </div>
  )
}
