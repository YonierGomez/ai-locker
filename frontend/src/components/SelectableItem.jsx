/**
 * SelectableItem — Universal select wrapper
 *
 * Wraps any card/row and automatically handles:
 *  - Checkbox display when select mode is active
 *  - Click interception (select vs normal action)
 *  - Visual highlight when selected
 *  - Hiding children's action buttons (via CSS pointer-events)
 *
 * Usage:
 *   <SelectableItem
 *     id={item.id}
 *     isSelectActive={isSelectActive}
 *     selected={selectedIds.has(item.id)}
 *     onSelect={toggleSelect}
 *     onNormalClick={() => setViewItem(item)}
 *     checkboxPosition="top-left" | "inline-start" | "none"
 *   >
 *     <YourCard ... />
 *   </SelectableItem>
 */

import { Check } from 'lucide-react'

export default function SelectableItem({
  id,
  isSelectActive = false,
  selected = false,
  onSelect,
  onNormalClick,
  children,
  // Where to render the checkbox overlay
  // "top-left"     → absolute positioned top-left corner
  // "inline-start" → rendered as first child in a flex row (caller must handle layout)
  // "none"         → no checkbox rendered (caller handles it)
  checkboxPosition = 'top-left',
  // Extra styles for the wrapper div
  style,
  className,
  // Whether to add the blue outline + bg tint when selected
  highlightSelected = true,
}) {
  const handleClick = (e) => {
    if (isSelectActive) {
      e.stopPropagation()
      onSelect?.(id)
    } else {
      onNormalClick?.()
    }
  }

  const selectedStyle = highlightSelected && selected ? {
    outline: '2px solid var(--blue)',
    outlineOffset: 2,
    background: 'color-mix(in srgb, var(--blue) 8%, var(--glass-bg))',
  } : {}

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        cursor: isSelectActive ? 'pointer' : undefined,
        ...selectedStyle,
        ...style,
      }}
      onClick={handleClick}
    >
      {/* Checkbox overlay — top-left corner */}
      {isSelectActive && checkboxPosition === 'top-left' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            width: 18,
            height: 18,
            borderRadius: 5,
            border: `2px solid ${selected ? 'var(--blue)' : 'rgba(255,255,255,0.3)'}`,
            background: selected ? 'var(--blue)' : 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: selected ? '0 0 0 3px rgba(0,122,255,0.2)' : 'none',
          }}
          onClick={e => { e.stopPropagation(); onSelect?.(id) }}
        >
          {selected && <Check size={11} color="white" strokeWidth={3} />}
        </div>
      )}

      {/* Inline checkbox — rendered before children in a flex row */}
      {isSelectActive && checkboxPosition === 'inline-start' && (
        <div
          style={{
            width: 17,
            height: 17,
            borderRadius: 5,
            border: `2px solid ${selected ? 'var(--blue)' : 'rgba(255,255,255,0.25)'}`,
            background: selected ? 'var(--blue)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onClick={e => { e.stopPropagation(); onSelect?.(id) }}
        >
          {selected && <Check size={10} color="white" strokeWidth={3} />}
        </div>
      )}

      {/* Transparent overlay to intercept all child clicks in select mode */}
      {isSelectActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            cursor: 'pointer',
            // Allow the checkbox (z-index 10) to be clickable above this overlay
          }}
          onClick={e => { e.stopPropagation(); onSelect?.(id) }}
        />
      )}

      {children}
    </div>
  )
}

/**
 * Inline checkbox — standalone component for use inside flex rows/headers
 * without needing the full SelectableItem wrapper.
 */
export function SelectCheckbox({ selected, onToggle, size = 'md' }) {
  const dim = size === 'sm' ? 14 : size === 'lg' ? 20 : 17
  const iconSize = size === 'sm' ? 9 : size === 'lg' ? 12 : 10

  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: Math.round(dim * 0.3),
        border: `2px solid ${selected ? 'var(--blue)' : 'rgba(255,255,255,0.25)'}`,
        background: selected ? 'var(--blue)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: selected ? '0 0 0 3px rgba(0,122,255,0.15)' : 'none',
      }}
      onClick={e => { e.stopPropagation(); onToggle?.() }}
    >
      {selected && <Check size={iconSize} color="white" strokeWidth={3} />}
    </div>
  )
}
