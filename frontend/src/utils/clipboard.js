/**
 * Copies text to clipboard with fallback for non-secure contexts (HTTP).
 * navigator.clipboard requires HTTPS or localhost; uses execCommand as fallback.
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    textArea.remove()
    if (!success) throw new Error('Copy failed')
  }
}
