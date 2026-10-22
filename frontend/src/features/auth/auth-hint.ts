import { useSyncExternalStore } from 'react'

const AUTH_HINT_COOKIE = 'sw_authenticated'
const listeners = new Set<() => void>()

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`))

  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function hasAuthHint(): boolean {
  return readCookie(AUTH_HINT_COOKIE) === '1'
}

export function useAuthHint(): boolean {
  return useSyncExternalStore(subscribe, hasAuthHint, () => false)
}

export function refreshAuthHint(): void {
  emitChange()
}

export function clearAuthHint(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_HINT_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`
  }

  emitChange()
}
