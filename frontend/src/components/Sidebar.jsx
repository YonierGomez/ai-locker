import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { settingsApi, trashApi } from '../utils/api'
import {
  LayoutDashboard, MessageSquare, Zap, Navigation,
  Settings, X, Bot, Trash2, TerminalSquare, StickyNote
} from 'lucide-react'

function AiNavItem({ onClose }) {
  return (
    <NavLink
      to="/ai"
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={onClose}
      style={({ isActive }) => isActive ? {} : { color: 'var(--text-tertiary)' }}
    >
      <Bot size={16} className="nav-item-icon" style={{ color: '#5E5CE6' }} />
      AI Chat
    </NavLink>
  )
}

function McpIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 195 195" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  )
}

function TrashNavItem({ onClose }) {
  const { data } = useQuery({
    queryKey: ['trash-count'],
    queryFn: () => trashApi.count(),
    staleTime: 0,
  })
  const count = data?.total || 0
  return (
    <NavLink
      to="/trash"
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={onClose}
      style={({ isActive }) => isActive ? {} : { color: 'var(--text-tertiary)' }}
    >
      <Trash2 size={16} className="nav-item-icon" />
      Trash
      {count > 0 && (
        <span className="nav-badge" style={{ background: 'rgba(255,55,95,0.15)', color: 'var(--pink)' }}>
          {count}
        </span>
      )}
    </NavLink>
  )
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

const libraryItems = [
  { path: '/prompts', icon: MessageSquare, label: 'Prompts', statsKey: 'prompts' },
  { path: '/skills', icon: Zap, label: 'Skills', statsKey: 'skills' },
  { path: '/steering', icon: Navigation, label: 'Steering', statsKey: 'steering' },
  { path: '/mcp', icon: McpIcon, label: 'MCP Configs', statsKey: 'mcp_configs' },
  { path: '/commands', icon: TerminalSquare, label: 'Commands', statsKey: 'commands' },
  { path: '/notes', icon: StickyNote, label: 'Notes', statsKey: 'notes' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => settingsApi.stats(),
    staleTime: 0,
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60000,
  })

  const appName = settings?.app_name || 'AI Locker'
  const appLogo = settings?.app_logo || ''

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={appLogo ? { background: 'none', padding: 0 } : {
          background: 'linear-gradient(145deg, #0a0a0a 0%, #0f0f12 100%)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}>
          {appLogo ? (
            <img src={appLogo} alt="logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <img src="/icon.svg" alt="AI Locker" style={{ width: 32, height: 32 }} />
          )}
        </div>
        <span className="sidebar-logo-text">{appName}</span>
        <button
          className="btn-icon sidebar-close-btn"
          onClick={onClose}
          style={{ marginLeft: 'auto', display: 'none' }}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={16} className="nav-item-icon" />
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label">Library</div>

        {libraryItems.map(({ path, icon: Icon, label, statsKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={16} className="nav-item-icon" />
            {label}
            {stats && stats[statsKey] > 0 && (
              <span className="nav-badge">{stats[statsKey]}</span>
            )}
          </NavLink>
        ))}

        <div className="divider" style={{ margin: '12px 0' }} />

        <AiNavItem onClose={onClose} />
        <TrashNavItem onClose={onClose} />

        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Settings size={16} className="nav-item-icon" />
          Settings
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'center', lineHeight: 1.5 }}>
          {appName} v1.0
          <br />
          AI Prompts Manager
        </div>
      </div>
    </aside>
  )
}
