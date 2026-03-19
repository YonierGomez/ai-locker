import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your AI library' },
  '/prompts': { title: 'Prompts', subtitle: 'Manage your AI prompt templates' },
  '/skills': { title: 'Skills', subtitle: 'Reusable AI skill definitions' },
  '/steering': { title: 'Steering', subtitle: 'Behavioral guidance & system instructions' },
  '/mcp': { title: 'MCP Configs', subtitle: 'Model Context Protocol server configurations' },
  '/settings': { title: 'Settings', subtitle: 'App preferences & configuration' },
  '/trash': { title: 'Trash', subtitle: 'Deleted items — auto-purged after 5 days' },
}

export default function Topbar({ onMenuClick }) {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  const pageInfo = pageTitles[location.pathname] || { title: 'Promptly', subtitle: '' }

  useEffect(() => {
    const handleScroll = () => {
      // Listen to the main content scroll
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
      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div style={{ flex: 1 }}>
        <div className="topbar-title">{pageInfo.title}</div>
        {pageInfo.subtitle && (
          <div className="topbar-subtitle">{pageInfo.subtitle}</div>
        )}
      </div>
    </header>
  )
}
