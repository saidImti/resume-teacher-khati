import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/supabase/env'

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  '/inscription', // formulaire public d'inscription (QR code parents)
]

// Routes API publiques (pas d'auth requise)
const PUBLIC_API_ROUTES = [
  '/api/whatsapp/webhook',
]

// Header interne (jamais exposé au client) portant l'id utilisateur déjà
// vérifié par ce middleware pour CETTE requête. getOrgContext()/withApiAuth()
// le lisent au lieu de rappeler auth.getUser() une 2e fois en aval : appeler
// getUser() plusieurs fois pour la même requête (middleware + Server
// Component + fetch client quasi simultané) fait courir plusieurs tentatives
// de rafraîchissement du même refresh token Supabase (à usage unique) en
// concurrence — la perdante échoue avec 401, ce qui déclenchait une boucle
// de redirection /dashboard <-> /auth/login infinie en prod pour les
// sessions dont le token venait d'expirer. Voir ERRORS/008.
const VERIFIED_USER_HEADER = 'x-mw-verified-user-id'

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getPublicSupabaseEnv()

  // Ne jamais faire confiance à ce header s'il vient du client — on le
  // supprime systématiquement avant de le repositionner nous-mêmes ci-dessous
  // si auth.getUser() confirme réellement la session.
  const headers = new Headers(request.headers)
  headers.delete(VERIFIED_USER_HEADER)

  let supabaseResponse = NextResponse.next({ request: { headers } })

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const cookiesFromRefresh = supabaseResponse.cookies.getAll()
    headers.set(VERIFIED_USER_HEADER, user.id)
    supabaseResponse = NextResponse.next({ request: { headers } })
    cookiesFromRefresh.forEach((c) => supabaseResponse.cookies.set(c))
  }

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
