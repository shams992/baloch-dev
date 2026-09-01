import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/util'

const PAD = 8
const GAP = 8
const Z = 180

type Align = 'start' | 'end'

export function AnchoredOverlay({
  open,
  onClose,
  anchorRef,
  children,
  className,
  align = 'end',
  width,
  role = 'menu',
  ariaLabel,
  id,
  onKeyDown,
}: {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  className?: string
  align?: Align
  width?: number
  role?: string
  ariaLabel?: string
  id?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: width ?? 224, ready: false })

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return

    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const panelW = Math.min(width ?? Math.max(panel.scrollWidth, 180), vw - PAD * 2)
    const maxH = vh - PAD * 2
    const panelH = Math.min(panel.offsetHeight || 0, maxH)

    let left = align === 'end' ? rect.right - panelW : rect.left
    left = Math.max(PAD, Math.min(left, vw - panelW - PAD))

    let top = rect.bottom + GAP
    if (top + panelH > vh - PAD) {
      const above = rect.top - GAP - panelH
      top = above >= PAD ? above : Math.max(PAD, vh - PAD - panelH)
    }

    setCoords({ top, left, width: panelW, ready: true })
  }, [align, anchorRef, width])

  useLayoutEffect(() => {
    if (!open) {
      setCoords((c) => (c.ready ? { ...c, ready: false } : c))
      return
    }
    place()
    const panel = panelRef.current
    const ro = typeof ResizeObserver !== 'undefined' && panel ? new ResizeObserver(place) : null
    if (panel) ro?.observe(panel)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place, children])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
      anchorRef.current?.focus()
    }
    const onPointer = (e: Event) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    document.addEventListener('focusin', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('focusin', onPointer)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  const style: CSSProperties = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    width: coords.width,
    minWidth: coords.width,
    maxWidth: `min(${coords.width}px, calc(100vw - ${PAD * 2}px))`,
    maxHeight: `calc(100dvh - ${PAD * 2}px)`,
    zIndex: Z,
    visibility: coords.ready ? 'visible' : 'hidden',
    pointerEvents: coords.ready ? 'auto' : 'none',
  }

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn('overlay-panel card shadow-2xl', className)}
      style={style}
    >
      {children}
    </div>,
    document.body,
  )
}
