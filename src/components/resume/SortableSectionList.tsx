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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumeSection {
  id: string
  title: string
  content_text: string | null
  type: string
  sort_order: number
}

interface SortableSectionListProps {
  resumeId: string
  sections: ResumeSection[]
}

// ─── Item sortable ────────────────────────────────────────────────────────────

function SortableItem({ section }: { section: ResumeSection }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-3 rounded-xl border bg-card p-4 transition-shadow ${
        isDragging ? 'shadow-lg border-primary/40' : 'border-border shadow-sm'
      }`}
    >
      {/* Poignée drag */}
      <button
        className="flex-shrink-0 flex items-start pt-0.5 text-muted-foreground/40
          hover:text-muted-foreground cursor-grab active:cursor-grabbing transition"
        {...attributes}
        {...listeners}
        aria-label="Déplacer la section"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {SECTION_TYPE_LABELS[section.type] ?? section.type}
        </p>
        <h3 className="font-medium text-foreground text-sm leading-snug mb-1">
          {section.title}
        </h3>
        {section.content_text && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {section.content_text}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Labels par type de section ───────────────────────────────────────────────

const SECTION_TYPE_LABELS: Record<string, string> = {
  intro:      '📖 Introduction',
  activity:   '🎯 Activité',
  vocabulary: '📚 Vocabulaire',
  grammar:    '📐 Grammaire',
  song:       '🎵 Chanson',
  story:      '📜 Histoire',
  game:       '🎮 Jeu',
  outro:      '🌟 Conclusion',
  custom:     '✏️ Personnalisé',
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SortableSectionList({ resumeId, sections: initialSections }: SortableSectionListProps) {
  const [sections, setSections] = useState<ResumeSection[]>(
    [...initialSections].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const saveOrder = useCallback(
    async (reordered: ResumeSection[]) => {
      setIsSaving(true)
      try {
        const payload = reordered.map((s, i) => ({ id: s.id, sort_order: i }))
        const res = await fetch(`/api/resumes/${resumeId}/sections/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: payload }),
        })
        if (!res.ok) {
          toast.error('Erreur lors de la sauvegarde de l\'ordre')
        } else {
          toast.success('Ordre sauvegardé')
        }
      } catch {
        toast.error('Erreur réseau')
      } finally {
        setIsSaving(false)
      }
    },
    [resumeId]
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      saveOrder(reordered)
      return reordered
    })
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucune section dans ce résumé.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Indicateur de sauvegarde */}
      {isSaving && (
        <p className="text-xs text-muted-foreground animate-pulse text-right">
          Sauvegarde de l&apos;ordre...
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sections.map((section) => (
              <SortableItem key={section.id} section={section} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-muted-foreground text-center pt-1">
        💡 Glissez les sections pour les réorganiser
      </p>
    </div>
  )
}
