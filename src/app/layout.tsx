import type { Metadata, Viewport } from 'next'
import { Inter, Dancing_Script } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { CommandPalette } from '@/components/ui/CommandPalette'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-handwriting',
  display: 'swap',
  weight: ['700'],
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://teacher-khati.vercel.app'
  ),
  title: {
    default: 'Teacher Khati',
    template: '%s | Teacher Khati',
  },
  description:
    'Plateforme de generation automatique de resumes de cours pour les parents — Teacher Khati English School.',
  keywords: ["cours d'anglais", 'resumes de cours', 'parents', 'teacher khati', 'ecole anglais enfants'],
  authors: [{ name: 'Teacher Khati' }],
  creator: 'Teacher Khati',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Teacher Khati',
    title: 'Teacher Khati — Resumes de cours',
    description:
      'Generez et partagez des resumes de cours professionnels pour les parents en quelques clics.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Teacher Khati — Resumes de cours',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teacher Khati — Resumes de cours',
    description: 'Resumes de cours automatises pour les parents.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${dancingScript.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CommandPalette />
          <Toaster
            richColors
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: 'font-sans text-sm',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
