'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  closePaddleCheckout,
  EXPRESS_CHECKOUT_TARGET,
  getWallet,
  subscribeWallet,
  type WalletState,
} from '@/lib/paddle'

type Box = { top: number; left: number; width: number }
const SlotContext = createContext<{
  wallet: WalletState
  height: number
  setSlot: (slot: HTMLElement | null) => void
} | null>(null)
const serverWallet: WalletState = { ready: false }

// Paddle's iframe reloads if moved in the DOM, so it lives here across steps and is laid over the slot.
export function ExpressWalletHost({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  const wallet = useSyncExternalStore(subscribeWallet, getWallet, () => serverWallet)
  const hostRef = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [height, setHeight] = useState(0)
  const [readyHeight, setReadyHeight] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const host = hostRef.current!
    const observer = new ResizeObserver(() => setHeight(host.offsetHeight))
    observer.observe(host)
    return () => {
      observer.disconnect()
      void closePaddleCheckout('express')
    }
  }, [enabled])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (wallet.ready && height > 0) setReadyHeight(height)
  }, [wallet.ready, height])

  useLayoutEffect(() => {
    const base = hostRef.current?.offsetParent
    if (!slot || !base) return setBox(null)
    // offsetTop ignores the screen's slide-in transform.
    const measure = () => {
      let top = 0
      let left = 0
      for (
        let el: Element | null = slot;
        el && el !== base;
        el = (el as HTMLElement).offsetParent
      ) {
        top += (el as HTMLElement).offsetTop
        left += (el as HTMLElement).offsetLeft
      }
      setBox({ top, left, width: slot.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(base)
    observer.observe(slot)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [slot, enabled])

  const visible = wallet.ready && box !== null
  const slotHeight = wallet.ready ? height : wallet.available ? readyHeight : 0
  return (
    <SlotContext.Provider value={{ wallet, height: slotHeight, setSlot }}>
      {children}
      {enabled && (
        <div
          ref={hostRef}
          aria-hidden={!visible}
          inert={!visible}
          className={`absolute z-10 transition-opacity duration-300 ${visible ? '' : 'pointer-events-none opacity-0'}`}
          style={box ?? { top: 0, left: 24, right: 24 }}
        >
          <div className={EXPRESS_CHECKOUT_TARGET} />
        </div>
      )}
    </SlotContext.Provider>
  )
}

// Reserves space for the Apple Pay / Google Pay button; nothing is shown until it is ready.
export function ExpressWalletSlot() {
  const { wallet, height, setSlot } = useContext(SlotContext)!
  if (wallet.available === false || height === 0) return null
  return <div ref={setSlot} style={{ height }} />
}
