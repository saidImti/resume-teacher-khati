'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ArchiveGroupButtonProps {
  groupId: string
  groupName: string
}

export function ArchiveGroupButton({ groupId, groupName }: ArchiveGroupButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const router = useRouter()

  async function handleArchive() {
    if (!confirm(`Archiver le groupe "${groupName}" ?\n\nIl n'apparaîtra plus dans la liste.`)) return

    setIsArchiving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Erreur lors de l\'archivage')
        return
      }
      toast.success(`Groupe "${groupName}" archivé`)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <button
      onClick={handleArchive}
      disabled={isArchiving}
      title={`Archiver "${groupName}"`}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10
        transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isArchiving ? '⏳' : '🗃️'}
    </button>
  )
}
