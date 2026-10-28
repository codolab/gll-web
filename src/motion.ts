import { useSyncExternalStore } from 'react'

const query = window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribe = (onChange: () => void) => {
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** True when the visitor asked for less motion: decorative motion stops (design/motion-spec.md M-G2). */
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => query.matches)
