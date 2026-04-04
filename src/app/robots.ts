import type { MetadataRoute } from 'next'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://trailalert.at').replace(/\/+$/, '')
const APP_HOST = new URL(APP_URL).host

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth/', '/meine-meldungen', '/einstellungen'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_HOST,
  }
}
