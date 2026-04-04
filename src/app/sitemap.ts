import type { MetadataRoute } from 'next'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://trailalert.at').replace(/\/+$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
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
  ]
}
