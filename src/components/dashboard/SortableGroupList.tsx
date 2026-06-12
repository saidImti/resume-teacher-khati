'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'
import type { Group, Level } from '@/types'
import { GroupCard } from './GroupCard'

// ─── Item sortable ────────────────────────────────────────────────────────────

function SortableGroupItem({
  group,
  level,
}: {
  group: Group
  level?: Level
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Poignée de drag — coin supérieur gauche */}
      <button
        className="absolute top-2 right-2 z-10 p-1 rounded text-muted-foreground/40
          hover:text-muted-foreground hover:bg-accent/60 cursor-grab active:cursor-grabbing
          transition opacity-0 group-hover/card:opacity-100"
        {...attributes}
        {...listeners}
        aria-label="Déplacer le groupe"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="group/card">
        <GroupCard group={group} level={level} />
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SortableGroupListProps {
  groups: Group[]
  levels: Level[]
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SortableGroupList({ groups: initialGroups, levels }: SortableGroupListProps) {
  const [groups, setGroups] = useState<Group[]>(
    [...initialGroups].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const saveOrder = useCallback(async (reordered: Group[]) => {
    try {
      const payload = reordered.map((g, i) => ({ id: g.id, sort_order: i }))
      const res = await fetch('/api/groups/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: payload }),
      })
      if (!res.ok) toast.error('Erreur lors de la sauvegarde de l\'ordre')
    } catch {
      toast.error('Erreur réseau')
    }
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setGroups((prev) => {
      const oldIndex = prev.findIndex((g) => g.id === active.id)
      const newIndex = prev.findIndex((g) => g.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      saveOrder(reordered)
      return reordered
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={groups.map((g) => g.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {groups.map((group) => {
            const level = levels.find((l) => l.id === group.level_id)
            return (
              <SortableGroupItem key={group.id} group={group} level={level} />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
