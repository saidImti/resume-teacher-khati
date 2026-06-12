import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://teacher-khati.vercel.app'
  const now = new Date()

  // Pour une app privée on n'expose que la page de login
  return [
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
