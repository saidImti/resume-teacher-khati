'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ArchiveGroupButtonProps {
  groupId: string
  groupName: string
}

export function ArchiveGroupButton({ groupId, groupName }: ArchiveGroupButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const router = useRouter()

  async function handleArchive() {
    if (!confirm(`Archiver le groupe "${groupName}" ?\n\nIl ne sera plus affiche dans la liste active.`)) return

    setIsArchiving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error("Erreur lors de l'archivage")
        return
      }
      toast.success(`Groupe "${groupName}" archive`)
      router.refresh()
    } catch {
      toast.error('Erreur reseau')
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={isArchiving}
      title={`Archiver "${groupName}"`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isArchiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
      Archiver
    </button>
  )
}
