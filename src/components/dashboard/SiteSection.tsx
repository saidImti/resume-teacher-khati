'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { Group, Level, Site } from '@/types'
import { SortableGroupList } from './SortableGroupList'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SiteSectionProps {
  site: Site
  levels: Level[]
  groups: Group[]
}

export function SiteSection({ site, levels, groups }: SiteSectionProps) {
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Filtrer les niveaux qui ont au moins un groupe sur ce site
  const activeLevels = levels.filter((l) =>
    groups.some((g) => g.level_id === l.id)
  )

  const filteredGroups = selectedLevelId
    ? groups.filter((g) => g.level_id === selectedLevelId)
    : groups

  return (
    <section>
      {/* En-tête du site */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 group"
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: site.color + '20', color: site.color }}
            >
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold group-hover:text-primary transition-colors">
              {site.name}
            </h2>
            {collapsed
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronUp className="h-4 w-4 text-muted-foreground" />
            }
          </button>

          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {groups.length} groupe{groups.length > 1 ? 's' : ''}
          </span>
        </div>

        <Link href={`/settings/groups/new?siteId=${site.id}`}>
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Groupe
          </Button>
        </Link>
      </div>

      {!collapsed && (
        <>
          {/* Filtres par niveau */}
          {activeLevels.length > 1 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setSelectedLevelId(null)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  !selectedLevelId
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                Tous
              </button>
              {activeLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevelId(
                    selectedLevelId === level.id ? null : level.id
                  )}
                  className={cn(
                    'transition-opacity',
                    selectedLevelId && selectedLevelId !== level.id ? 'opacity-50' : ''
                  )}
                >
                  <LevelBadge
                    level={level}
                    size="sm"
                    className="cursor-pointer hover:opacity-90"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Grille des groupes (drag & drop) */}
          {filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aucun groupe pour ce filtre
            </div>
          ) : (
            <SortableGroupList groups={filteredGroups} levels={levels} />
          )}
        </>
      )}
    </section>
  )
}
