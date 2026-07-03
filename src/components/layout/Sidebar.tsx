'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Archive, BookOpen,
  Settings, ChevronRight, LogOut, Menu, Pin,
  GraduationCap, Sliders,
  Users, CalendarDays, Wallet, ClipboardCheck, UsersRound,
  Wrench, FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/mes-padlets', label: 'Mes Padlets', icon: Pin             },
  { href: '/archives',    label: 'Archives',    icon: Archive         },
  { href: '/activites',   label: 'Activités',   icon: BookOpen        },
]

const NAV_SCHOOL = [
  { href: '/presences',                 label: 'Présences',          icon: ClipboardCheck },
  { href: '/eleves',                    label: 'Élèves',             icon: Users          },
  { href: '/eleves/familles-paiements', label: 'Familles & paiements', icon: UsersRound   },
  { href: '/planning',                  label: 'Planning',           icon: CalendarDays   },
  { href: '/finances',                  label: 'Finances',           icon: Wallet         },
]

const NAV_OUTILS = [
  { href: '/outils', label: 'Outils', icon: Wrench },
]

const NAV_BOTTOM = [
  { href: '/settings',                    label: 'Paramètres',       icon: Settings      },
  { href: '/settings/annees',             label: 'Années scolaires', icon: GraduationCap },
  { href: '/settings/fonctionnalites',    label: 'Fonctionnalités',  icon: Sliders       },
  { href: '/settings/mode-test',          label: 'Mode Test',        icon: FlaskConical  },
]

interface SidebarProps {
  userName?: string
  userEmail?: string
  logoUrl?: string | null
}

function NavItem({ item, pathname, sidebarOpen }: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  pathname: string
  sidebarOpen: boolean
}) {
  const Icon = item.icon
  const isStudentParent = item.href === '/eleves'
  const isStudentSubmenu = item.href.startsWith('/eleves/')
  const isHubPage = item.href === '/outils' || item.href === '/settings'
  const isActive = pathname === item.href || (!isStudentParent && !isHubPage && pathname.startsWith(item.href + '/')) || (isHubPage && pathname.startsWith(item.href))
  return (
    <div className="relative group/nav">
      <Link
        href={item.href}
        title={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors btn-press',
          sidebarOpen && isStudentSubmenu && 'ml-5 border-l border-border rounded-l-none',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {sidebarOpen && <span className="truncate">{item.label}</span>}
        {sidebarOpen && isActive && (
          <ChevronRight className="h-3 w-3 ml-auto text-primary/60" aria-hidden="true" />
        )}
      </Link>
      {!sidebarOpen && (
        <div className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
          'rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shadow-lg',
          'bg-foreground text-background',
          'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150',
          'before:absolute before:right-full before:top-1/2 before:-translate-y-1/2',
          'before:border-4 before:border-transparent before:border-r-foreground before:content-[""]'
        )}>
          {item.label}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ userName, userEmail, logoUrl }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'bg-background border-r border-border',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden lg:w-16',
          'lg:relative lg:z-auto'
        )}
        aria-label="Navigation principale"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border shrink-0">
          {sidebarOpen && (
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-base shrink-0 overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-0.5" />
                ) : (
                  '📚'
                )}
              </div>
              <span className="font-semibold text-sm text-foreground leading-tight truncate">
                Teacher Khati
              </span>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Reduire la sidebar' : 'Ouvrir la sidebar'}
            className={cn(
              'p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground',
              'transition-colors shrink-0 btn-press',
              !sidebarOpen && 'mx-auto'
            )}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Pédagogie */}
          {NAV_ITEMS.map((item) => <NavItem key={item.href} item={item} pathname={pathname} sidebarOpen={sidebarOpen} />)}

          {/* École */}
          {sidebarOpen && (
            <p className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">École</p>
          )}
          {!sidebarOpen && <div className="my-2 border-t border-border mx-2" />}
          {NAV_SCHOOL.map((item) => <NavItem key={item.href} item={item} pathname={pathname} sidebarOpen={sidebarOpen} />)}

          {/* Outils */}
          {sidebarOpen && (
            <p className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Outils</p>
          )}
          {!sidebarOpen && <div className="my-2 border-t border-border mx-2" />}
          {NAV_OUTILS.map((item) => <NavItem key={item.href} item={item} pathname={pathname} sidebarOpen={sidebarOpen} />)}

          {/* Système */}
          {sidebarOpen && (
            <p className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Système</p>
          )}
          {!sidebarOpen && <div className="my-2 border-t border-border mx-2" />}
          {NAV_BOTTOM.map((item) => <NavItem key={item.href} item={item} pathname={pathname} sidebarOpen={sidebarOpen} />)}
        </nav>

        {/* Footer utilisateur */}
        <div className="border-t border-border p-3 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {userName?.[0]?.toUpperCase() ?? 'K'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName ?? 'Teacher Khati'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{userEmail ?? ''}</p>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Se deconnecter"
                title="Se deconnecter"
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors btn-press"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              aria-label="Se deconnecter"
              title="Se deconnecter"
              className="w-full flex items-center justify-center p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors btn-press"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
