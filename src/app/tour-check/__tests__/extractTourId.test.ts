import { extractTourId } from '@/lib/komoot'

describe('extractTourId', () => {
  it('extracts ID from simple URL', () => {
    expect(extractTourId('https://www.komoot.com/tour/123456789')).toBe('123456789')
  })
  it('extracts ID from locale URL', () => {
    expect(extractTourId('https://www.komoot.com/de-at/tour/123456789/details')).toBe('123456789')
  })
  it('extracts ID from komoot.de URL', () => {
    expect(extractTourId('https://www.komoot.de/tour/987654321')).toBe('987654321')
  })
  it('extracts ID from smarttour URL', () => {
    expect(extractTourId('https://www.komoot.com/smarttour/1942539?ref=wdd')).toBe('1942539')
  })
  it('returns null for invalid URL', () => {
    expect(extractTourId('https://www.komoot.com/collection/12345')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(extractTourId('')).toBeNull()
  })
})
