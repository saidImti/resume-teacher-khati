'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Music, Video, Image, File, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessedFile {
  name:         string
  type:         string
  extractedText: string
  size:         number
}

interface FileUploadZoneProps {
  onFilesProcessed: (files: ProcessedFile[]) => void
  maxFiles?: number
  label?:    string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ACCEPTED = {
  audio:  ['.mp3', '.m4a', '.wav', '.ogg', '.webm'],
  video:  ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  image:  ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  pdf:    ['.pdf'],
  text:   ['.txt', '.md', '.docx', '.doc'],
}

const ALL_ACCEPTED = Object.values(ACCEPTED).flat().join(',')

interface FileItem {
  file:     File
  status:   'pending' | 'processing' | 'done' | 'error'
  text?:    string
  error?:   string
}

function getFileCategory(name: string): keyof typeof ACCEPTED {
  const ext = '.' + name.split('.').pop()?.toLowerCase()
  for (const [cat, exts] of Object.entries(ACCEPTED)) {
    if (exts.includes(ext)) return cat as keyof typeof ACCEPTED
  }
  return 'text'
}

function CategoryIcon({ name }: { name: string }) {
  const cat = getFileCategory(name)
  const cls = 'h-4 w-4'
  if (cat === 'audio') return <Music    className={cn(cls, 'text-violet-500')} />
  if (cat === 'video') return <Video    className={cn(cls, 'text-blue-500')}   />
  if (cat === 'image') return <Image    className={cn(cls, 'text-green-500')}  />
  if (cat === 'pdf')   return <FileText className={cn(cls, 'text-red-500')}    />
  return                      <File     className={cn(cls, 'text-amber-500')}  />
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function FileUploadZone({ onFilesProcessed, maxFiles = 10, label }: FileUploadZoneProps) {
  const [items,   setItems]   = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  // ── Process file via API ──────────────────────────────────────────────────────
  async function processFile(item: FileItem, idx: number) {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, status: 'processing' } : it))
    try {
      const formData = new FormData()
      formData.append('file', item.file)

      const res  = await fetch('/api/fiches/upload', { method: 'POST', body: formData })
      const data = await res.json() as { text?: string; error?: string }

      if (!res.ok || data.error) {
        setItems((p) => p.map((it, i) => i === idx ? { ...it, status: 'error', error: data.error ?? 'Erreur de traitement.' } : it))
        return
      }

      const text = data.text ?? ''
      setItems((prev) => {
        const updated = prev.map((it, i) => i === idx ? { ...it, status: 'done' as const, text } : it)
        // Notify parent with all done files
        const processed: ProcessedFile[] = updated
          .filter((it) => it.status === 'done' && it.text)
          .map((it) => ({ name: it.file.name, type: it.file.type, extractedText: it.text!, size: it.file.size }))
        onFilesProcessed(processed)
        return updated
      })
    } catch {
      setItems((p) => p.map((it, i) => i === idx ? { ...it, status: 'error', error: 'Erreur réseau.' } : it))
    }
  }

  // ── Ajout de fichiers ─────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const toAdd = Array.from(files).slice(0, maxFiles - items.length)
    const newItems: FileItem[] = toAdd.map((f) => ({ file: f, status: 'pending' }))
    setItems((p) => {
      const updated = [...p, ...newItems]
      // auto-process each new file
      newItems.forEach((item, i) => {
        void processFile(item, p.length + i)
      })
      return updated
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, maxFiles])

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function removeItem(idx: number) {
    setItems((p) => {
      const updated = p.filter((_, i) => i !== idx)
      const processed: ProcessedFile[] = updated
        .filter((it) => it.status === 'done' && it.text)
        .map((it) => ({ name: it.file.name, type: it.file.type, extractedText: it.text!, size: it.file.size }))
      onFilesProcessed(processed)
      return updated
    })
  }

  const processingCount = items.filter((it) => it.status === 'processing').length
  const doneCount       = items.filter((it) => it.status === 'done').length

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}

      {/* Zone de dépôt */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6',
          'cursor-pointer transition-all text-center',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-muted/20',
          items.length >= maxFiles && 'pointer-events-none opacity-50'
        )}>
        <input
          ref={inputRef} type="file" multiple accept={ALL_ACCEPTED}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)} />

        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Glissez vos fichiers ou cliquez</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audio · Vidéo · PDF · Images · Documents texte
          </p>
        </div>

        {processingCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Traitement en cours… ({processingCount} fichier{processingCount > 1 ? 's' : ''})
          </div>
        )}
      </div>

      {/* Liste des fichiers */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
              item.status === 'done'       && 'border-emerald-200 bg-emerald-50',
              item.status === 'error'      && 'border-destructive/20 bg-destructive/5',
              item.status === 'processing' && 'border-primary/20 bg-primary/5',
              item.status === 'pending'    && 'border-border bg-muted/20',
            )}>
              <CategoryIcon name={item.file.name} />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatSize(item.file.size)}</span>
                  {item.status === 'processing' && (
                    <span className="text-xs text-primary flex items-center gap-0.5">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />Analyse en cours…
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="text-xs text-emerald-700 flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {item.text ? `${item.text.length.toLocaleString()} caractères extraits` : 'Traité'}
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs text-destructive flex items-center gap-0.5">
                      <AlertCircle className="h-2.5 w-2.5" />{item.error}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="rounded-lg p-1 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {doneCount > 0 && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
          ✅ {doneCount} fichier{doneCount > 1 ? 's' : ''} analysé{doneCount > 1 ? 's' : ''} — le contenu sera intégré à la génération
        </p>
      )}
    </div>
  )
}
