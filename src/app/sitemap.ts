import type { MetadataRoute } from 'next'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://trailalert.at').replace(/\/+$/, '')
const LEGAL_PAGES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGAL_PAGES === 'true'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${APP_URL}/tour-check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/trails-lienz`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  if (LEGAL_PAGES_ENABLED) {
    entries.push(
      {
        url: `${APP_URL}/impressum`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${APP_URL}/datenschutz`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.3,
      },
    )
  }

  return entries
}
