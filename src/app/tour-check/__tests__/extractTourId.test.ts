import { extractTourRef } from '@/lib/komoot'

describe('extractTourRef', () => {
  it('extracts ID and type from simple tour URL', () => {
    expect(extractTourRef('https://www.komoot.com/tour/123456789')).toEqual({ id: '123456789', type: 'tour' })
  })
  it('extracts ID from locale tour URL', () => {
    expect(extractTourRef('https://www.komoot.com/de-at/tour/123456789/details')).toEqual({ id: '123456789', type: 'tour' })
  })
  it('extracts ID from komoot.de URL', () => {
    expect(extractTourRef('https://www.komoot.de/tour/987654321')).toEqual({ id: '987654321', type: 'tour' })
  })
  it('extracts ID and type from smarttour URL', () => {
    expect(extractTourRef('https://www.komoot.com/smarttour/1942539?ref=wdd')).toEqual({ id: '1942539', type: 'smarttour' })
  })
  it('returns null for invalid URL', () => {
    expect(extractTourRef('https://www.komoot.com/collection/12345')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(extractTourRef('')).toBeNull()
  })
})
