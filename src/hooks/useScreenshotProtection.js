import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useScreenshotProtection — Best-effort browser-level resume capture prevention.
 *
 * What it does:
 * 1. Blocks PrintScreen, Ctrl+Shift+S, Cmd+Shift+3/4 keyboard shortcuts
 * 2. Shows a black overlay when tab loses visibility (screen capture, alt-tab)
 * 3. Disables right-click context menu on the target element
 * 4. Applies CSS user-select: none via returned className
 *
 * What it cannot do:
 * - Block OS-level screenshot tools (Snipping Tool, macOS screenshot)
 * - Prevent screen recording software
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Master toggle (disable during PDF export)
 * @param {React.RefObject} options.targetRef - Ref to the element to protect
 * @returns {{ overlayVisible: boolean, protectionClass: string }}
 */
export function useScreenshotProtection({ enabled = true, targetRef } = {}) {
  const [overlayVisible, setOverlayVisible] = useState(false)

  // Track the pending "hide overlay" timer so we can cancel it on unmount, on a
  // subsequent event, or when protection is disabled — preventing a state update
  // on an unmounted component and out-of-order overlay toggling.
  const hideTimerRef = useRef(null)
  const scheduleHide = useCallback((delay) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      setOverlayVisible(false)
    }, delay)
  }, [])

  // Block screenshot keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return

    // PrintScreen key
    if (e.key === 'PrintScreen') {
      e.preventDefault()
      e.stopPropagation()
      setOverlayVisible(true)
      scheduleHide(1500)
      return
    }

    // Ctrl+Shift+S (Windows snipping shortcut)
    if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      e.stopPropagation()
      setOverlayVisible(true)
      scheduleHide(1500)
      return
    }

    // Cmd+Shift+3 or Cmd+Shift+4 (macOS screenshot)
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
      e.preventDefault()
      e.stopPropagation()
      setOverlayVisible(true)
      scheduleHide(1500)
      return
    }
  }, [enabled, scheduleHide])

  // Visibility change detection (tab switch, screen capture tools taking focus)
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return
    if (document.hidden || document.visibilityState === 'hidden') {
      setOverlayVisible(true)
    } else {
      // Small delay before removing overlay to catch quick tab-backs
      scheduleHide(300)
    }
  }, [enabled, scheduleHide])

  // Window blur (alt-tab, clicking another window)
  const handleBlur = useCallback(() => {
    if (!enabled) return
    setOverlayVisible(true)
  }, [enabled])

  const handleFocus = useCallback(() => {
    if (!enabled) return
    scheduleHide(200)
  }, [enabled, scheduleHide])

  // Right-click prevention on target
  const handleContextMenu = useCallback((e) => {
    if (!enabled) return
    if (targetRef?.current && targetRef.current.contains(e.target)) {
      e.preventDefault()
    }
  }, [enabled, targetRef])

  useEffect(() => {
    if (!enabled) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      setOverlayVisible(false)
      return
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('contextmenu', handleContextMenu)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [enabled, handleKeyDown, handleVisibilityChange, handleBlur, handleFocus, handleContextMenu])

  return {
    overlayVisible,
    // CSS class string to apply to the protected element
    protectionClass: enabled ? 'resume-capture-protected' : '',
  }
}
