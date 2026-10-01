'use client'

import { useEffect, useLayoutEffect, useRef, type PointerEvent } from 'react'

type Point = { x: number; y: number }

export function ScratchCard({
  revealed,
  auto,
  onReveal,
}: {
  revealed: boolean
  auto: boolean
  onReveal: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPoint = useRef<Point | null>(null)
  const moves = useRef(0)

  useLayoutEffect(() => {
    if (revealed) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const paint = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.fillStyle = '#5b45c8'
      context.fillRect(0, 0, width, height)
      context.fillStyle = 'rgba(255, 255, 255, 0.14)'
      for (let n = 0; n < 60; n++) {
        context.beginPath()
        context.arc((n * 53) % width, (n * 97) % height, 1.6 + (n % 3), 0, Math.PI * 2)
        context.fill()
      }
      context.fillStyle = 'rgba(255, 255, 255, 0.95)'
      context.font = '700 20px "SN Pro", system-ui, sans-serif'
      context.textAlign = 'center'
      context.fillText('Scratch to see', width / 2, height / 2 - 6)
      context.fillText('your welcome gift', width / 2, height / 2 + 20)
    }

    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [revealed])

  const position = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const clearedEnough = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let cleared = 0
    let sampled = 0
    for (let i = 3; i < pixels.length; i += 160) {
      sampled++
      if (pixels[i] < 40) cleared++
    }
    return sampled > 0 && cleared / sampled > 0.5
  }

  const scratchAt = (canvas: HTMLCanvasElement, point: Point, check: boolean) => {
    const context = canvas.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'destination-out'
    context.lineWidth = 46
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    if (lastPoint.current) {
      context.moveTo(lastPoint.current.x, lastPoint.current.y)
      context.lineTo(point.x, point.y)
      context.stroke()
    } else {
      context.arc(point.x, point.y, 23, 0, Math.PI * 2)
      context.fill()
    }
    context.globalCompositeOperation = 'source-over'
    lastPoint.current = point
    moves.current++
    if (check && moves.current % 6 === 0 && clearedEnough(canvas, context)) onReveal()
  }
  const scratch = (event: PointerEvent<HTMLCanvasElement>) => {
    if (revealed || auto) return
    scratchAt(event.currentTarget, position(event), true)
  }
  const latest = useRef({ scratchAt, onReveal })
  useEffect(() => {
    latest.current = { scratchAt, onReveal }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!auto || !canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      latest.current.onReveal()
      return
    }
    const { width, height } = canvas.getBoundingClientRect()
    const gap = 30
    const rows = Math.ceil(height / gap) + 1
    const started = performance.now()
    lastPoint.current = null
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 1400)
      const at = t * rows
      const row = Math.min(rows - 1, Math.floor(at))
      const f = at - row
      latest.current.scratchAt(
        canvas,
        { x: (row % 2 === 0 ? f : 1 - f) * width, y: Math.min(height, row * gap + 12) },
        false,
      )
      if (t < 1) frame = requestAnimationFrame(step)
      else latest.current.onReveal()
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [auto])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 size-full touch-none transition-opacity duration-400 ${revealed ? 'pointer-events-none opacity-0' : 'cursor-grab'}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        lastPoint.current = null
        scratch(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) scratch(event)
      }}
      onPointerUp={(event) => {
        const canvas = event.currentTarget
        const context = canvas.getContext('2d')
        if (!auto && context && clearedEnough(canvas, context)) onReveal()
        lastPoint.current = null
      }}
      onPointerCancel={() => {
        lastPoint.current = null
      }}
    />
  )
}
