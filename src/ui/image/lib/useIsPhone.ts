import { useSyncExternalStore } from 'react'

/** Below Tailwind's `md` breakpoint. */
const QUERY = '(max-width: 767.98px)'

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** True on phone-sized screens, where the image tools switch to their touch layout. */
export const useIsPhone = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
