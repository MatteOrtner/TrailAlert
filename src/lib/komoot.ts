export type KomootTourType = 'tour' | 'smarttour'

export interface KomootTourRef {
  id:   string
  type: KomootTourType
}

/**
 * Extracts the tour ID and type from any Komoot URL variant.
 * Handles: komoot.com/tour/123, komoot.com/de-at/tour/123/details, komoot.de/tour/123,
 *          komoot.com/smarttour/123 (Komoot suggested tours)
 * Returns null if the URL does not contain a valid tour path.
 */
export function extractTourRef(url: string): KomootTourRef | null {
  const match = url.match(/\/(smart)?tour\/(\d+)/)
  if (!match) return null
  return {
    type: match[1] === 'smart' ? 'smarttour' : 'tour',
    id:   match[2],
  }
}
