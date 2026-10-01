'use client'

import { useLayoutEffect, useRef, type PointerEvent } from 'react'

type Point = { x: number; y: number }

export function ScratchCard({ revealed, onReveal }: { revealed: boolean; onReveal: () => void }) {
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
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
          const x = ((col + 0.5 + ((row * 7 + col * 3) % 5) * 0.13) / 11) * width
          const y = ((row + 0.5 + ((row * 3 + col * 7) % 5) * 0.12) / 7) * height
          const radius = 1.5 + ((row * 5 + col * 3) % 4) * 0.55
          context.beginPath()
          context.arc(x, y, radius, 0, Math.PI * 2)
          context.fill()
        }
      }
      context.fillStyle = '#fff'
      context.font = '700 20px "SN Pro", system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText('Scratch to see', width / 2, height / 2 - 12)
      context.fillText('your welcome gift', width / 2, height / 2 + 12)
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

  const scratch = (event: PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return
    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return
    const point = position(event)
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
    if (moves.current % 6 === 0 && clearedEnough(canvas, context)) onReveal()
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 size-full touch-none transition-opacity duration-300 ${revealed ? 'pointer-events-none opacity-0' : 'cursor-crosshair'}`}
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
        if (context && clearedEnough(canvas, context)) onReveal()
        lastPoint.current = null
      }}
      onPointerCancel={() => {
        lastPoint.current = null
      }}
    />
  )
}
