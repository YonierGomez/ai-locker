import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Maximize2, Minimize2 } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', fullscreen = false }) {
  const [maximized, setMaximized] = useState(fullscreen)

  useEffect(() => { setMaximized(fullscreen) }, [fullscreen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setMaximized(fullscreen)
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidths = { sm: 480, md: 680, lg: 860, xl: 1000 }

  return createPortal(
    <>
      <style>{`
        @media (max-width: 599px) {
          .modal-overlay-inner { align-items: flex-end !important; padding: 0 !important; }
          .modal-inner { border-radius: 20px 20px 0 0 !important; height: 95dvh !important; max-height: 95dvh !important; overflow: hidden !important; }
        }
      `}</style>
      <div
        className="modal-overlay modal-overlay-inner"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
        style={maximized ? { alignItems: 'stretch', padding: 0, zIndex: 9000 } : { zIndex: 9000 }}
      >
        <div
          className="modal modal-inner"
          style={maximized
            ? { maxWidth: '100%', width: '100%', maxHeight: '100%', height: '100%', borderRadius: 0, transition: 'border-radius 0.15s' }
            : { maxWidth: maxWidths[size], transition: 'border-radius 0.15s' }
          }
        >
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="btn-icon" onClick={() => setMaximized(m => !m)} aria-label={maximized ? 'Restore' : 'Maximize'} title={maximized ? 'Restore' : 'Maximize'}>
                {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button className="btn-icon" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="modal-body">
            {children}
          </div>

          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
