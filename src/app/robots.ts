import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://teacher-khati.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        // App privée — on ne veut pas d'indexation
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
