import { renderHook, act } from '@testing-library/react'
import { useOnboarding } from '../useOnboarding'

const KEY = 'trailalert_onboarding_seen'

beforeEach(() => {
  localStorage.clear()
})

describe('useOnboarding', () => {
  it('hasSeen is false when key is not set', () => {
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.hasSeen).toBe(false)
  })

  it('hasSeen is true when key is already set', () => {
    localStorage.setItem(KEY, '1')
    const { result } = renderHook(() => useOnboarding())
    expect(result.current.hasSeen).toBe(true)
  })

  it('markSeen sets the key and updates hasSeen to true', () => {
    const { result } = renderHook(() => useOnboarding())
    act(() => result.current.markSeen())
    expect(localStorage.getItem(KEY)).toBe('1')
    expect(result.current.hasSeen).toBe(true)
  })
})
