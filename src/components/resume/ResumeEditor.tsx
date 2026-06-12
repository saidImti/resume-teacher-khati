'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Pilcrow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResumeEditorProps {
  initialContent: string
  onChange?: (html: string) => void
  className?: string
  readOnly?: boolean
}

// ─── Bouton de toolbar ────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isActive && 'bg-muted text-foreground'
      )}
    >
      {children}
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ResumeEditor({
  initialContent,
  onChange,
  className,
  readOnly = false,
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4 animate-pulse', className)}>
        <div className="h-4 bg-muted rounded w-3/4 mb-3" />
        <div className="h-4 bg-muted rounded w-1/2 mb-3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
          <ToolbarButton
            title="Annuler"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            title="Rétablir"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton
            title="Titre 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            title="Titre 3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            title="Paragraphe"
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
          >
            <Pilcrow className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton
            title="Gras"
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            title="Italique"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolbarButton
            title="Liste à puces"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            title="Liste numérotée"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Zone d'édition */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-4',
          'focus:outline-none',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]',
          '[&_h1]:[font-family:var(--font-handwriting,cursive)] [&_h1]:text-3xl [&_h1]:text-primary [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mb-1',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1',
          '[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1',
          '[&_ul]:text-sm [&_ul]:my-1 [&_ul]:pl-4',
          '[&_ol]:text-sm [&_ol]:my-1 [&_ol]:pl-4',
          '[&_li]:my-0.5',
          readOnly ? 'cursor-default' : 'cursor-text'
        )}
      />
    </div>
  )
}
