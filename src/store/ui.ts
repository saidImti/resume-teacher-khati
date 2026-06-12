import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  sidebarOpen: boolean
  activeSiteId: string | null
  activeLevelSlug: string | null

  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveSiteId: (id: string | null) => void
  setActiveLevelSlug: (slug: string | null) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeSiteId: null,
      activeLevelSlug: null,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setActiveSiteId: (id) => set({ activeSiteId: id }),
      setActiveLevelSlug: (slug) => set({ activeLevelSlug: slug }),
    }),
    {
      name: 'rtk-ui',
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        activeSiteId: s.activeSiteId,
      }),
    }
  )
)
