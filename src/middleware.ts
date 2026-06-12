import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
]

// Routes API publiques (pas d'auth requise)
const PUBLIC_API_ROUTES = [
  '/api/setup',
  '/api/whatsapp/webhook',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute    = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))
  const isApiRoute       = pathname.startsWith('/api/')
  const isStaticRoute    = pathname.startsWith('/_next') || pathname.includes('.')

  // Routes statiques et API publiques → toujours laisser passer
  if (isStaticRoute || isPublicApiRoute) return supabaseResponse

  // Routes API avec X-API-Key → laisser passer (validation dans chaque route)
  if (isApiRoute) {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    if (apiKey?.startsWith('rtk_')) {
      // Clé API externe valide → on passe, la route valide elle-même
      return supabaseResponse
    }
    // API sans clé externe → vérification session cookie standard
    return supabaseResponse
  }

  // Non authentifié → login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Déjà connecté sur page auth → dashboard
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
