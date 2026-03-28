import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your AI library' },
  '/prompts': { title: 'Prompts', subtitle: 'Manage your AI prompt templates' },
  '/skills': { title: 'Skills', subtitle: 'Reusable AI skill definitions' },
  '/steering': { title: 'Steering', subtitle: 'Behavioral guidance & system instructions' },
  '/mcp': { title: 'MCP', subtitle: 'Model Context Protocol server configurations' },
  '/commands': { title: 'Commands', subtitle: 'Shell commands & scripts' },
  '/snippets': { title: 'Snippets', subtitle: 'Reusable code snippets for any language' },
  '/agents': { title: 'Agents', subtitle: 'AI agent presets with model, skills & MCP connections' },
  '/settings': { title: 'Settings', subtitle: 'App preferences & configuration' },
  '/trash': { title: 'Trash', subtitle: 'Deleted items — auto-purged after 5 days' },
  '/ai': { title: 'AI Chat', subtitle: 'Generate items with AI' },
}

export default function Topbar({ onMenuClick, onSearchClick }) {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  const pageInfo = pageTitles[location.pathname] || { title: 'AI Locker', subtitle: '' }

  // Always force dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('promptly_theme', 'dark')
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.querySelector('.main-content')
      if (mainContent) {
        setScrolled(mainContent.scrollTop > 10)
      } else {
        setScrolled(window.scrollY > 10)
      }
    }
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true })
      return () => mainContent.removeEventListener('scroll', handleScroll)
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <style>{`
        .topbar-subtitle-text { display: block; }
        .search-shortcut-badge { display: inline-block; }
        .search-trigger-label { display: inline; }
        @media (max-width: 600px) {
          .topbar-subtitle-text { display: none; }
          .search-shortcut-badge { display: none; }
          .search-trigger-label { display: none; }
        }
      `}</style>

      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="topbar-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pageInfo.title}
        </div>
        {pageInfo.subtitle && (
          <div className="topbar-subtitle topbar-subtitle-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageInfo.subtitle}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onSearchClick}
          title="Search (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            backdropFilter: 'blur(20px)',
            minWidth: 180,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.11)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <Search size={14} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, flex: 1, textAlign: 'left' }} className="search-trigger-label">Search…</span>
          <span className="search-shortcut-badge" style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--text-quaternary)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 5,
            padding: '2px 6px',
            letterSpacing: '0.02em',
            lineHeight: 1.3,
          }}>⌘K</span>
        </button>
      </div>
    </header>
  )
}
