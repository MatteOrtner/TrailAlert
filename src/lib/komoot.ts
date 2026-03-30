/**
 * Extracts the numeric tour ID from any Komoot tour URL variant.
 * Handles: komoot.com/tour/123, komoot.com/de-at/tour/123/details, komoot.de/tour/123
 * Returns null if the URL does not contain a valid tour path.
 */
export function extractTourId(url: string): string | null {
  const match = url.match(/\/tour\/(\d+)/)
  return match ? match[1] : null
}
