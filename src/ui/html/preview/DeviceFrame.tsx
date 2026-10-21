import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { Device } from './devices'

/** Largest scale (up to 1) at which `w`×`h` fits the element, kept in step with its size. */
function useFit(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setScale(
        Math.min(
          1,
          Math.max(0.1, (el.clientWidth - 32) / w),
          Math.max(0.1, (el.clientHeight - 32) / h),
        ),
      )
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h])
  return { ref, scale }
}

interface Props {
  device: Device
  landscape: boolean
  children: ReactNode
}

/** A device-sized viewport, scaled down to fit the pane. */
export function DeviceFrame({ device, landscape, children }: Props) {
  const [w, h] = landscape ? [device.height, device.width] : [device.width, device.height]
  const { ref, scale } = useFit(w, h)
  const radius = device.kind === 'phone' ? 36 : device.kind === 'tablet' ? 24 : 8
  const bezel = device.kind === 'desktop' ? 6 : 10
  return (
    <div
      ref={ref}
      className="flex h-full w-full justify-center overflow-auto bg-[var(--panel)] p-4"
    >
      <div
        style={{ width: (w + bezel * 2) * scale, height: (h + bezel * 2) * scale, flex: 'none' }}
      >
        <div
          data-testid="device-frame"
          style={{
            width: w,
            height: h,
            padding: bezel,
            boxSizing: 'content-box',
            borderRadius: radius,
            background: '#111',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className="flex flex-col overflow-hidden bg-white"
            style={{ width: w, height: h, borderRadius: Math.max(radius - bezel, 2) }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
