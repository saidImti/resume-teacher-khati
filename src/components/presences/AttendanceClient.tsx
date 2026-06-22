'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Users, CalendarDays, CheckCircle2, XCircle, Clock,
  AlertCircle, Send, RotateCcw, ChevronDown, Loader2,
  MessageSquare, Check, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'unmarked'

interface StudentRecord {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
  photo_consent?: boolean | null
  family?: {
    id: string
    parent1_first: string
    parent1_last: string
    parent1_whatsapp: string | null
    parent1_phone: string | null
  } | null
}

interface SessionInfo {
  id: string
  session_date: string
  title: string | null
  group: {
    id: string
    name: string
    level: { id: string; name: string; emoji: string; color: string }
    site:  { id: string; name: string }
  } | null
}

interface GroupOption {
  id: string
  name: string
  level: { id: string; name: string; emoji: string; color: string }
  site:  { id: string; name: string }
}

interface AttendanceClientProps {
  groups: GroupOption[]
  sites:  Site[]
}

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  present:  { label: 'Présent',  icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-200' },
  absent:   { label: 'Absent',   icon: XCircle,      color: 'bg-red-50 text-red-700 border-red-300 ring-red-200'                 },
  late:     { label: 'Retard',   icon: Clock,        color: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-200'         },
  excused:  { label: 'Excusé',   icon: Info,         color: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-200'             },
  unmarked: { label: '—',        icon: AlertCircle,  color: 'bg-muted text-muted-foreground border-border ring-transparent'      },
} as const

const STATUS_CYCLE: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AttendanceClient({ groups }: AttendanceClientProps) {
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedDate, setSelectedDate]       = useState(todayISO())
  const [session, setSession]                 = useState<SessionInfo | null>(null)
  const [students, setStudents]               = useState<StudentRecord[]>([])
  const [attendance, setAttendance]           = useState<Map<string, AttendanceStatus>>(new Map())
  const [notes, setNotes]                     = useState<Map<string, string>>(new Map())

  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isSaving, setIsSaving]               = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [siteFilter, setSiteFilter]           = useState('')

  // Groupes filtrés par site
  const filteredGroups = siteFilter
    ? groups.filter((g) => g.site.id === siteFilter)
    : groups

  // Sites uniques (depuis les groupes)
  const sites = Array.from(new Map(groups.map((g) => [g.site.id, g.site])).values())

  // Chargement session + élèves quand groupe ou date change
  const loadSession = useCallback(async () => {
    if (!selectedGroupId || !selectedDate) return
    setIsLoadingSession(true); setError(null); setSaved(false)

    try {
      // 1. Trouver ou créer la session
      const sessionRes = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId, date: selectedDate }),
      })
      const sessionData = await sessionRes.json() as { session?: SessionInfo; error?: string }
      if (!sessionRes.ok || !sessionData.session) {
        setError(sessionData.error ?? 'Erreur lors de la création de la séance'); return
      }

      // 2. Charger élèves + présences existantes
      const attRes = await fetch(`/api/attendance?sessionId=${sessionData.session.id}`)
      const attData = await attRes.json() as {
        session?: SessionInfo
        students?: StudentRecord[]
        attendance?: Array<{ student_id: string; status: string }>
        error?: string
      }

      if (!attRes.ok) { setError(attData.error ?? 'Erreur de chargement'); return }

      setSession(attData.session ?? null)
      setStudents(attData.students ?? [])

      // Initialise le statut : si déjà enregistré → reprend, sinon "unmarked"
      const map = new Map<string, AttendanceStatus>()
      for (const s of (attData.students ?? [])) {
        const existing = (attData.attendance ?? []).find((a) => a.student_id === s.id)
        map.set(s.id, (existing?.status as AttendanceStatus | undefined) ?? 'unmarked')
      }
      setAttendance(map)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setIsLoadingSession(false)
    }
  }, [selectedGroupId, selectedDate])

  useEffect(() => { void loadSession() }, [loadSession])

  // Cycle de statut au clic
  function toggleStatus(studentId: string) {
    setAttendance((prev) => {
      const current = prev.get(studentId) ?? 'unmarked'
      const idx  = STATUS_CYCLE.indexOf(current as typeof STATUS_CYCLE[number])
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!
      return new Map(prev).set(studentId, next)
    })
    setSaved(false)
  }

  // Tout présent en 1 clic
  function markAllPresent() {
    setAttendance((prev) => {
      const map = new Map(prev)
      students.forEach((s) => map.set(s.id, 'present'))
      return map
    })
    setSaved(false)
  }

  // Reset
  function resetAll() {
    setAttendance((prev) => {
      const map = new Map(prev)
      students.forEach((s) => map.set(s.id, 'unmarked'))
      return map
    })
    setSaved(false)
  }

  // Stats temps réel
  const stats = {
    present:  [...attendance.values()].filter((v) => v === 'present').length,
    absent:   [...attendance.values()].filter((v) => v === 'absent').length,
    late:     [...attendance.values()].filter((v) => v === 'late').length,
    excused:  [...attendance.values()].filter((v) => v === 'excused').length,
    unmarked: [...attendance.values()].filter((v) => v === 'unmarked').length,
  }

  // Enregistrer l'appel
  async function saveAttendance() {
    if (!session) return
    setIsSaving(true); setError(null)

    const records = students.map((s) => ({
      studentId: s.id,
      status:    attendance.get(s.id) ?? 'unmarked',
      notes:     notes.get(s.id) ?? undefined,
    })).filter((r) => r.status !== 'unmarked')

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, records }),
      })
      const data = await res.json() as { saved?: number; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur lors de l\'enregistrement'); return }
      setSaved(true)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Sélecteur Groupe + Date ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sélectionner le cours
        </h2>

        {/* Filtre site */}
        {sites.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSiteFilter('')}
              className={cn('rounded-full px-3 py-1 text-xs font-medium border transition-all',
                !siteFilter ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-transparent hover:border-border')}>
              Tous les sites
            </button>
            {sites.map((site) => (
              <button key={site.id} onClick={() => setSiteFilter(site.id)}
                className={cn('rounded-full px-3 py-1 text-xs font-medium border transition-all',
                  siteFilter === site.id ? 'bg-primary text-primary-foreground border-primary'
                                         : 'bg-muted text-muted-foreground border-transparent hover:border-border')}>
                📍 {site.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Groupe */}
          <div className="relative">
            <select
              value={selectedGroupId}
              onChange={(e) => { setSelectedGroupId(e.target.value); setSaved(false) }}
              className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— Choisir un groupe —</option>
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.level.emoji} {g.name} · {g.site.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Date */}
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => { setSelectedDate(e.target.value); setSaved(false) }}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Info groupe sélectionné */}
        {selectedGroup && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">{selectedGroup.level.emoji}</span>
            <span className="font-medium text-foreground">{selectedGroup.name}</span>
            <span>·</span>
            <span>{selectedGroup.site.name}</span>
            {selectedDate && (
              <>
                <span>·</span>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{formatDate(selectedDate)}</span>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Zone d'appel ────────────────────────────────────────────────── */}
      {isLoadingSession && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement du groupe…</span>
        </div>
      )}

      {!isLoadingSession && selectedGroupId && students.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">Aucun élève dans ce groupe</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez des élèves depuis la section <strong>Élèves</strong>.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!isLoadingSession && students.length > 0 && (
        <>
          {/* ── Barre d'actions rapides ─────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Stats live */}
              <StatChip label="Présents"  count={stats.present}  color="text-emerald-700" bg="bg-emerald-50 border-emerald-200" />
              <StatChip label="Absents"   count={stats.absent}   color="text-red-700"     bg="bg-red-50 border-red-200"         />
              {stats.late > 0    && <StatChip label="Retards" count={stats.late}    color="text-amber-700" bg="bg-amber-50 border-amber-200" />}
              {stats.unmarked > 0 && <StatChip label="Non marqués" count={stats.unmarked} color="text-slate-600" bg="bg-slate-50 border-slate-200" />}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={markAllPresent}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tous présents
              </button>
              <button onClick={resetAll}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* ── Grille élèves ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                status={attendance.get(student.id) ?? 'unmarked'}
                note={notes.get(student.id) ?? ''}
                onToggle={() => toggleStatus(student.id)}
                onNoteChange={(n) => setNotes((prev) => new Map(prev).set(student.id, n))}
              />
            ))}
          </div>

          {/* ── Bouton Enregistrer ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => void saveAttendance()}
              disabled={isSaving || stats.unmarked === students.length}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
                (isSaving || stats.unmarked === students.length) && 'opacity-50 cursor-not-allowed'
              )}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              ) : saved ? (
                <><Check className="h-4 w-4" /> Appel enregistré ✓</>
              ) : (
                <><Send className="h-4 w-4" /> Enregistrer l&apos;appel</>
              )}
            </button>
          </div>

          {/* ── Panel après sauvegarde ──────────────────────────────────── */}
          {saved && stats.absent > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">
                  {stats.absent} élève{stats.absent > 1 ? 's' : ''} absent{stats.absent > 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-sm text-amber-800">
                Voulez-vous notifier les parents et envoyer un rattrapage automatique via WhatsApp ?
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 rounded-xl bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Notifier les parents absents
                </button>
                <button className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white text-amber-800 px-4 py-2 text-sm font-medium hover:bg-amber-50 transition-colors">
                  Ignorer
                </button>
              </div>
            </div>
          )}

          {saved && stats.absent === 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800">
                Excellent ! Tout le groupe était présent aujourd&apos;hui.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Carte élève ─────────────────────────────────────────────────────────────

function StudentCard({
  student, status, note, onToggle, onNoteChange,
}: {
  student:       StudentRecord
  status:        AttendanceStatus
  note:          string
  onToggle:      () => void
  onNoteChange:  (n: string) => void
}) {
  const cfg     = STATUS_CONFIG[status]
  const Icon    = cfg.icon
  const initials = getInitials(student.first_name, student.last_name)

  return (
    <div className={cn(
      'relative rounded-2xl border-2 p-4 cursor-pointer select-none transition-all duration-150 active:scale-95',
      'ring-2 ring-offset-2',
      cfg.color,
    )}
      onClick={onToggle}
      title={`Clic pour changer le statut de ${student.first_name}`}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        {student.photo_url && student.photo_consent ? (
          <img src={student.photo_url} alt={initials}
            className="h-10 w-10 rounded-full object-cover shrink-0 border-2 border-white/60" />
        ) : (
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 border-white/60',
            status === 'present' ? 'bg-emerald-200 text-emerald-800'
            : status === 'absent'  ? 'bg-red-200 text-red-800'
            : status === 'late'    ? 'bg-amber-200 text-amber-800'
            : status === 'excused' ? 'bg-blue-200 text-blue-800'
            : 'bg-slate-200 text-slate-600'
          )}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">{student.first_name}</p>
          <p className="text-xs opacity-70 truncate">{student.last_name}</p>
        </div>
      </div>

      {/* Statut */}
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {cfg.label}
      </div>

      {/* Note (visible si absent) */}
      {(status === 'absent' || status === 'excused') && (
        <input
          value={note}
          onChange={(e) => { e.stopPropagation(); onNoteChange(e.target.value) }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Note…"
          className="mt-2 w-full rounded-lg border border-white/50 bg-white/40 px-2 py-1 text-xs placeholder:text-inherit/50 focus:outline-none focus:bg-white/60"
        />
      )}
    </div>
  )
}

// ─── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({ label, count, color, bg }: {
  label: string; count: number; color: string; bg: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', bg, color)}>
      <span className="font-bold">{count}</span>
      <span className="opacity-80">{label}</span>
    </div>
  )
}
