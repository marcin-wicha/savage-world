import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { clearAuthHint, hasAuthHint, refreshAuthHint, useAuthHint } from './auth-hint'

describe('auth hint', () => {
  beforeEach(() => {
    clearAuthHint()
  })

  it('detects a signed-in hint', () => {
    document.cookie = 'sw_authenticated=1; path=/'

    expect(hasAuthHint()).toBe(true)
  })

  it('returns false without a hint', () => {
    expect(hasAuthHint()).toBe(false)
  })

  it('ignores values other than 1', () => {
    document.cookie = 'sw_authenticated=0; path=/'

    expect(hasAuthHint()).toBe(false)
  })

  it('clears the hint', () => {
    document.cookie = 'sw_authenticated=1; path=/'

    clearAuthHint()

    expect(hasAuthHint()).toBe(false)
  })

  it('notifies subscribers when the hint changes', () => {
    const { result } = renderHook(() => useAuthHint())

    expect(result.current).toBe(false)

    act(() => {
      document.cookie = 'sw_authenticated=1; path=/'
      refreshAuthHint()
    })

    expect(result.current).toBe(true)

    act(() => {
      clearAuthHint()
    })

    expect(result.current).toBe(false)
  })
})
