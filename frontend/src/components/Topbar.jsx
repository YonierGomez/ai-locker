import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Search, Sun, Moon } from 'lucide-react'

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your AI library' },
  '/prompts': { title: 'Prompts', subtitle: 'Manage your AI prompt templates' },
  '/skills': { title: 'Skills', subtitle: 'Reusable AI skill definitions' },
  '/steering': { title: 'Steering', subtitle: 'Behavioral guidance & system instructions' },
  '/mcp': { title: 'MCP Configs', subtitle: 'Model Context Protocol server configurations' },
  '/commands': { title: 'Commands', subtitle: 'Shell commands & scripts' },
  '/settings': { title: 'Settings', subtitle: 'App preferences & configuration' },
  '/trash': { title: 'Trash', subtitle: 'Deleted items — auto-purged after 5 days' },
  '/ai': { title: 'AI Chat', subtitle: 'Generate items with AI' },
}

export default function Topbar({ onMenuClick, onSearchClick }) {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('promptly_theme') || 'dark')

  const pageInfo = pageTitles[location.pathname] || { title: 'AI Locker', subtitle: '' }

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('promptly_theme', theme)
  }, [theme])

  // Init theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
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

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <style>{`
        .topbar-subtitle-text { display: block; }
        .search-shortcut-badge { display: inline-block; }
        @media (max-width: 600px) {
          .topbar-subtitle-text { display: none; }
          .search-shortcut-badge { display: none; }
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Search trigger — shows ⌘K badge on desktop, just icon on mobile */}
        <button
          className="btn-icon search-trigger-btn"
          onClick={onSearchClick}
          title="Search (⌘K)"
        >
          <Search size={15} />
          <span className="search-shortcut-badge">⌘K</span>
        </button>

        {/* Theme toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ width: 34, height: 34 }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
