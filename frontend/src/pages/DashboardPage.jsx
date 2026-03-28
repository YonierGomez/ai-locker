import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { settingsApi, promptsApi, commandsApi, notesApi, skillsApi, steeringApi, mcpApi, snippetsApi, agentsApi } from '../utils/api'
import {
  MessageSquare, Zap, Navigation, TrendingUp, TerminalSquare,
  StickyNote, Calendar, FileText, Bot, Code2, Star, BarChart2,
  ArrowUp, ArrowDown, Minus, Flame,
} from 'lucide-react'
import { getTokenColor } from '../utils/tokens'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark')
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark')
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

function McpIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none" style={{ color }}>
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}

// ── Chart tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip" style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Build activity data ──────────────────────────────────────
function buildActivityData(rawActivity, series, days = 30) {
  const base = Object.fromEntries((series || []).map(s => [s.key, 0]))
  const map = {}
  rawActivity?.forEach(r => {
    map[r.day] = Object.fromEntries((series || []).map(s => [s.key, r[s.key] || 0]))
  })
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    return { day: label, ...(map[iso] || base) }
  })
}

function getActivitySeries(stats) {
  if (!Array.isArray(stats?.library_types)) return []
  return stats.library_types.map(t => ({
    key: t.activity_key,
    label: t.label,
    color: t.color,
  }))
}
const TYPE_ICON_MAP = {
  prompts: MessageSquare,
  skills: Zap,
  steering: Navigation,
  mcp_configs: McpIcon,
  agents: Bot,
  commands: TerminalSquare,
  snippets: Code2,
  notes: StickyNote,
}

// ── Activity Heatmap ─────────────────────────────────────────
function ActivityHeatmap({ heatmap }) {
  const theme = useTheme()
  const isLight = theme === 'light'
  const WEEKS = 52
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDay = new Date(today)
  startDay.setDate(startDay.getDate() - (WEEKS * 7 - 1))
  const dow = (startDay.getDay() + 6) % 7
  startDay.setDate(startDay.getDate() - dow)
  const weeks = []
  for (let w = 0; w < WEEKS; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + w * 7 + d)
      const iso = date.toISOString().split('T')[0]
      days.push({ iso, count: heatmap[iso] || 0, future: date > today })
    }
    weeks.push(days)
  }
  const maxCount = Math.max(...Object.values(heatmap), 1)
  const getColor = count => {
    if (count === 0) return isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity < 0.25) return 'rgba(0,122,255,0.25)'
    if (intensity < 0.5) return 'rgba(0,122,255,0.50)'
    if (intensity < 0.75) return 'rgba(0,122,255,0.75)'
    return '#007AFF'
  }
  const DAY_LABELS = ['L', '', 'X', '', 'V', '', '']
  const totalItems = Object.values(heatmap).reduce((s, v) => s + v, 0)
  const activeDays = Object.keys(heatmap).length
  return (
    <div className="glass-card dashboard-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} color="#007AFF" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Activity — last year</span>
        </div>
        <span style={{ fontSize: 11, color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.30)' }}>{totalItems} items across {activeDays} day{activeDays !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, flexShrink: 0 }}>
          {DAY_LABELS.map((l, i) => <div key={i} style={{ width: 10, height: 10, fontSize: 8, color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map(day => (
              <div key={day.iso} title={day.future ? '' : `${day.iso}: ${day.count}`}
                style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: day.future ? 'transparent' : getColor(day.count), transition: 'background 0.2s' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', marginRight: 4 }}>Less</span>
        {[isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)', 'rgba(0,122,255,0.25)', 'rgba(0,122,255,0.5)', 'rgba(0,122,255,0.75)', '#007AFF'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.30)', marginLeft: 4 }}>More</span>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => settingsApi.stats(),
    staleTime: 30000,
    placeholderData: (prev) => prev,
  })

  const { data: recentPrompts } = useQuery({ queryKey: ['prompts', { limit: 4, sort: 'updated_at' }], queryFn: () => promptsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), placeholderData: (prev) => prev })
  const { data: recentSkills } = useQuery({ queryKey: ['skills', { limit: 4, sort: 'updated_at' }], queryFn: () => skillsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentSteering } = useQuery({ queryKey: ['steering', { limit: 4, sort: 'updated_at' }], queryFn: () => steeringApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentMcp } = useQuery({ queryKey: ['mcp', { limit: 4, sort: 'updated_at' }], queryFn: () => mcpApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentCommands } = useQuery({ queryKey: ['commands', { limit: 4, sort: 'updated_at' }], queryFn: () => commandsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentNotes } = useQuery({ queryKey: ['notes', { limit: 4, sort: 'updated_at' }], queryFn: () => notesApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentSnippets } = useQuery({ queryKey: ['snippets', { limit: 4, sort: 'updated_at' }], queryFn: () => snippetsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })
  const { data: recentAgents } = useQuery({ queryKey: ['agents', { limit: 4, sort: 'updated_at' }], queryFn: () => agentsApi.list({ limit: 4, sort: 'updated_at', order: 'desc' }), staleTime: 30000, placeholderData: (prev) => prev })

  const { data: favPrompts }  = useQuery({ queryKey: ['prompts',  { favorite: true }], queryFn: () => promptsApi.list({ favorite: 'true', limit: 8 }),  staleTime: 30000, placeholderData: prev => prev })
  const { data: favSkills }   = useQuery({ queryKey: ['skills',   { favorite: true }], queryFn: () => skillsApi.list({ favorite: 'true', limit: 8 }),   staleTime: 30000, placeholderData: prev => prev })
  const { data: favSteering } = useQuery({ queryKey: ['steering',  { favorite: true }], queryFn: () => steeringApi.list({ favorite: 'true', limit: 8 }), staleTime: 30000, placeholderData: prev => prev })
  const { data: favMcp }      = useQuery({ queryKey: ['mcp',       { favorite: true }], queryFn: () => mcpApi.list({ favorite: 'true', limit: 8 }),      staleTime: 30000, placeholderData: prev => prev })
  const { data: favCommands } = useQuery({ queryKey: ['commands',  { favorite: true }], queryFn: () => commandsApi.list({ favorite: 'true', limit: 8 }), staleTime: 30000, placeholderData: prev => prev })
  const { data: favNotes }    = useQuery({ queryKey: ['notes',     { favorite: true }], queryFn: () => notesApi.list({ favorite: 'true', limit: 8 }),    staleTime: 30000, placeholderData: prev => prev })
  const { data: favSnippets } = useQuery({ queryKey: ['snippets',  { favorite: true }], queryFn: () => snippetsApi.list({ favorite: 'true', limit: 8 }), staleTime: 30000, placeholderData: prev => prev })
  const { data: favAgents }   = useQuery({ queryKey: ['agents',    { favorite: true }], queryFn: () => agentsApi.list({ favorite: 'true', limit: 8 }),   staleTime: 30000, placeholderData: prev => prev })


  const libraryTypes = Array.isArray(stats?.library_types) ? stats.library_types : []
  const total = libraryTypes.reduce((sum, t) => sum + (stats?.[t.key] ?? 0), 0)
  const hasEnoughForCharts = total >= 5

  const statCards = libraryTypes.map(t => ({
    label: t.label,
    value: stats?.[t.key] ?? 0,
    icon: TYPE_ICON_MAP[t.key] || FileText,
    color: t.color,
    path: t.path,
  }))

  const quickActions = libraryTypes.map(t => ({
    label: t.label,
    icon: TYPE_ICON_MAP[t.key] || FileText,
    path: t.path,
    color: t.color,
  }))

  // Merged recent items
  const recentItems = [
    ...(recentPrompts?.data || []).map(p => ({ ...p, _type: 'prompt' })),
    ...(recentSkills?.data || []).map(s => ({ ...s, _type: 'skill' })),
    ...(recentSteering?.data || []).map(s => ({ ...s, _type: 'steering' })),
    ...(recentMcp?.data || []).map(m => ({ ...m, _type: 'mcp' })),
    ...(recentCommands?.data || []).map(c => ({ ...c, _type: 'command' })),
    ...(recentAgents?.data || []).map(a => ({ ...a, _type: 'agent' })),
    ...(recentSnippets?.data || []).map(s => ({ ...s, _type: 'snippet' })),
    ...(recentNotes?.data || []).map(n => ({ ...n, _type: 'note' })),
  ].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 6)

  const favoriteItems = [
    ...(favPrompts?.data  || []).map(p => ({ ...p, _type: 'prompt' })),
    ...(favSkills?.data   || []).map(s => ({ ...s, _type: 'skill' })),
    ...(favSteering?.data || []).map(s => ({ ...s, _type: 'steering' })),
    ...(favMcp?.data      || []).map(m => ({ ...m, _type: 'mcp' })),
    ...(favCommands?.data || []).map(c => ({ ...c, _type: 'command' })),
    ...(favAgents?.data   || []).map(a => ({ ...a, _type: 'agent' })),
    ...(favSnippets?.data || []).map(s => ({ ...s, _type: 'snippet' })),
    ...(favNotes?.data    || []).map(n => ({ ...n, _type: 'note' })),
  ].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))


  const renderRecentItem = (item) => {
    const configs = {
      prompt:   { icon: <MessageSquare size={11} color="#007AFF" />, label: 'Prompt',   labelColor: 'rgba(0,122,255,0.5)',   labelBg: 'rgba(0,122,255,0.08)',   path: '/prompts',  preview: item.content },
      skill:    { icon: <Zap size={11} color="#FF9500" />,           label: 'Skill',    labelColor: 'rgba(255,149,0,0.5)',   labelBg: 'rgba(255,149,0,0.08)',   path: '/skills',   preview: item.content },
      steering: { icon: <Navigation size={11} color="#BF5AF2" />,    label: 'Steering', labelColor: 'rgba(191,90,242,0.5)',  labelBg: 'rgba(191,90,242,0.08)',  path: '/steering', preview: item.content },
      mcp:      { icon: <McpIcon size={11} color="#30D158" />,       label: 'MCP',      labelColor: 'rgba(48,209,88,0.5)',   labelBg: 'rgba(48,209,88,0.08)',   path: '/mcp',      preview: null },
      agent:    { icon: <Bot size={11} color="#5E5CE6" />,           label: 'Agent',    labelColor: 'rgba(94,92,230,0.5)',   labelBg: 'rgba(94,92,230,0.08)',   path: '/agents',   preview: item.description || item.system_prompt || '' },
      command:  { icon: <TerminalSquare size={11} color="#5AC8FA" />,label: 'Command',  labelColor: 'rgba(91,200,250,0.5)',  labelBg: 'rgba(91,200,250,0.08)',  path: '/commands', preview: item.command },
      snippet:  { icon: <Code2 size={11} color="#FF6B35" />,         label: 'Snippet',  labelColor: 'rgba(255,107,53,0.55)',  labelBg: 'rgba(255,107,53,0.10)',  path: '/snippets', preview: item.code },
      note:     { icon: <StickyNote size={11} color="#FFD60A" />,    label: 'Note',     labelColor: 'rgba(255,214,10,0.5)', labelBg: 'rgba(255,214,10,0.08)', path: '/notes',    preview: item.content },
    }
    const cfg = configs[item._type]
    if (!cfg) return null
    return (
      <div key={item.id} className="dash-list-row" style={{ padding: '9px 20px', cursor: 'pointer', transition: 'background var(--duration-fast)', borderBottom: '1px solid var(--c-surface)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => navigate(cfg.path)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {cfg.icon}
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.name}</span>
          <span style={{ fontSize: 10, color: cfg.labelColor, background: cfg.labelBg, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{cfg.label}</span>
        </div>
        {cfg.preview && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cfg.preview.slice(0, 55)}{cfg.preview.length > 55 ? '…' : ''}
          </div>
        )}
        {item._type === 'prompt' && item.use_count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, paddingLeft: 17 }}>{item.use_count} uses</div>
        )}
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Welcome banner */}
      <div style={{ marginBottom: 20 }} className="animate-fade-in-up">
        <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #0f0f12 0%, #0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--radius-2xl)', padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div className="welcome-banner-line" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div className="welcome-banner-icon" style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0f12 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <img src="/icon.svg" alt="AI Locker" style={{ width: 24, height: 24 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.45, marginBottom: 2, lineHeight: 1.15 }}>Welcome to AI Locker</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>Your AI prompts, skills, and configurations — all in one place.</p>
              </div>
            </div>
            <div className="quick-actions">
              {quickActions.map(({ label, icon: Icon, path, color }) => (
                <button key={label} className="btn btn-glass btn-sm" onClick={() => navigate(path)} style={{ gap: 6, padding: '4px 10px', minHeight: 34 }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: 12 }}>+ {label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid stagger-children" style={{ opacity: statsLoading ? 0.4 : 1, transition: 'opacity 0.3s' }}>
        {statCards.map(({ label, value, icon: Icon, color, path }) => (
          <div key={label} className="stat-card" style={{ cursor: 'pointer', '--card-color': color }} onClick={() => navigate(path)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
            <div className="stat-card-main">
              <div className="stat-copy">
                <div className="stat-value" style={{ color }}>{value}</div>
                <div className="stat-label">{label}</div>
              </div>
              <div className="stat-icon-wrap" style={{ background: `${color}12`, borderColor: `${color}24` }}>
                <div className="stat-icon"><Icon size={16} color={color} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Activity — last 30 days ── */}
      {!statsLoading && hasEnoughForCharts && (() => {
        const activitySeries = getActivitySeries(stats)
        const activityData = buildActivityData(stats?.activity, activitySeries)
        const hasActivity = activityData.some(d => activitySeries.some(s => (d[s.key] || 0) > 0))
        if (!hasActivity) return null
        const mutedText = 'rgba(255,255,255,0.45)'
        const tickFormatter = (val, idx) => idx % 5 === 0 ? val : ''
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TrendingUp size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Activity — last 30 days</span>
            </div>
            <div className="glass-card dashboard-card" style={{ padding: 20 }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    {activitySeries.map(({ key, color }) => (
                      <linearGradient key={key} id={`top-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-grid)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--c-tick)' }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--c-tick)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.10)', strokeWidth: 1 }} animationDuration={0} isAnimationActive={false} />
                  {activitySeries.map(({ key, color }) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} fill={`url(#top-grad-${key})`} dot={false} activeDot={{ r: 3, fill: color }} isAnimationActive={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {activitySeries.map(({ key, label, color }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 11, color: mutedText }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Dashboard 3: Weekly Summary ── */}
      {!statsLoading && stats?.weekly_summary && (() => {
        const ws = stats.weekly_summary
        if (ws.this_week === 0 && ws.prev_week === 0 && ws.streak_days === 0) return null
        const changePct = ws.change_pct
        const changeColor = changePct > 0 ? '#30D158' : changePct < 0 ? '#FF375F' : '#8E8E93'
        const ChangeIcon = changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : Minus
        const chartData = ws.by_type?.length > 0
          ? ws.by_type.map(t => ({ name: t.type, 'This week': t.this_week, 'Last week': t.prev_week, color: t.color }))
          : []
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Weekly Summary</span>
            </div>
            <div className="glass-card dashboard-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 140 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>This week</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: '#007AFF', letterSpacing: -2, lineHeight: 1 }}>{ws.this_week}</span>
                      {changePct !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${changeColor}15`, border: `1px solid ${changeColor}25`, borderRadius: 6, padding: '3px 7px' }}>
                          <ChangeIcon size={10} color={changeColor} />
                          <span style={{ fontSize: 11, color: changeColor, fontWeight: 700 }}>{Math.abs(changePct)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Last week</div>
                    <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--text-quaternary)', letterSpacing: -2, lineHeight: 1 }}>{ws.prev_week}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Streak</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: ws.streak_days > 0 ? '#FF9500' : 'rgba(255,255,255,0.2)', letterSpacing: -2, lineHeight: 1 }}>{ws.streak_days}</span>
                      <Flame size={18} color={ws.streak_days > 0 ? '#FF9500' : 'rgba(255,255,255,0.15)'} fill={ws.streak_days > 0 ? '#FF9500' : 'none'} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2 }}>
                      {ws.streak_days === 0 ? 'no streak' : `day${ws.streak_days !== 1 ? 's' : ''} in a row`}
                    </div>
                  </div>
                </div>
                {chartData.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>By type</div>
                    <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 32)}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-grid)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-tick-alt)' }} tickLine={false} axisLine={false} width={86} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--c-cursor)' }} animationDuration={0} isAnimationActive={false} />
                        <Bar dataKey="This week" radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive={false}
                          label={{ position: 'right', fontSize: 10, fill: 'rgba(255,255,255,0.4)', formatter: v => v > 0 ? v : '' }}>
                          {chartData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Bar>
                        <Bar dataKey="Last week" radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive={false}>
                          {chartData.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.25} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.5)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>this week</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 12, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>last week</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Starred items */}
      {favoriteItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Star size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Starred</span>
            <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 2 }}>{favoriteItems.length}</span>
          </div>
          <div className="glass-card dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
            {favoriteItems.slice(0, 10).map(renderRecentItem)}
          </div>
        </div>
      )}

      {/* Library composition */}
      {!statsLoading && total > 0 && (() => {
        const types = (stats?.library_types || []).map(t => ({ ...t, count: stats?.[t.key] ?? 0 })).filter(t => t.count > 0)
        if (types.length === 0) return null
        const max = Math.max(...types.map(t => t.count))
        return (
          <div style={{ marginTop: 20 }}>
            <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BarChart2 size={14} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Library</span>
            </div>
            <div className="glass-card dashboard-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {types.map(t => {
                  const pct = Math.round((t.count / total) * 100)
                  const barW = Math.round((t.count / max) * 100)
                  const Icon = TYPE_ICON_MAP[t.key] || FileText
                  return (
                    <div key={t.key} onClick={() => navigate(t.path)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Icon size={12} color={t.color} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 68 }}>{t.label}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--c-surface)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: t.color, borderRadius: 99, opacity: 0.85 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: t.color, minWidth: 28, textAlign: 'right' }}>{t.count}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Activity heatmap — last year */}
      {!statsLoading && stats?.activity_heatmap && Object.keys(stats.activity_heatmap).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <ActivityHeatmap heatmap={stats.activity_heatmap} />
        </div>
      )}

      {/* Recent changes */}
      {!statsLoading && recentItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="dash-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Recent changes</span>
          </div>
          <div className="glass-card dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
            {recentItems.slice(0, 8).map(renderRecentItem)}
          </div>
        </div>
      )}

    </div>
  )
}
