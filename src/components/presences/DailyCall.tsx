'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Loader2, MapPin, Save, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/FadeIn'

// ─── Types ────────────────────────────────────────────────────────────────────

type CallStatus = 'present' | 'absent' | 'late' | 'excused' | 'unmarked'

interface DayStudent {
  id: string
  first_name: string
  last_name: string
  status: CallStatus
}

interface DayGroup {
  groupId: string
  sessionId: string
  name: string
  level: { id: string; name: string; emoji: string; color: string } | null
  site: { id: string; name: string } | null
  startTime: string
  endTime: string
  room: string | null
  students: DayStudent[]
}

const STATUS_STYLE: Record<CallStatus, { label: string; cls: string }> = {
  present:  { label: 'Présent', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  absent:   { label: 'Absent',  cls: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300' },
  late:     { label: 'Retard',  cls: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  excused:  { label: 'Excusé',  cls: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  unmarked: { label: '—',       cls: 'border-border bg-background text-muted-foreground' },
}

const CYCLE: CallStatus[] = ['present', 'absent', 'late', 'excused']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DailyCall() {
  const [date, setDate] = useState(todayISO())
  const [groups, setGroups] = useState<DayGroup[]>([])
  const [marks, setMarks] = useState<Map<string, CallStatus>>(new Map()) // clé sessionId|studentId
  const [dirty, setDirty] = useState<Set<string>>(new Set())             // sessionIds modifiés
  const [savedSessions, setSavedSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null); setSavedSessions(new Set()); setDirty(new Set())
    try {
      const res = await fetch('/api/attendance/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json() as { groups?: DayGroup[]; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur de chargement'); return }
      const loaded = data.groups ?? []
      setGroups(loaded)
      const map = new Map<string, CallStatus>()
      for (const g of loaded) for (const s of g.students) map.set(`${g.sessionId}|${s.id}`, s.status)
      setMarks(map)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { void load() }, [load])

  function setStatus(sessionId: string, studentId: string, status: CallStatus) {
    setMarks(prev => new Map(prev).set(`${sessionId}|${studentId}`, status))
    setDirty(prev => new Set(prev).add(sessionId))
    setSavedSessions(prev => { const next = new Set(prev); next.delete(sessionId); return next })
  }

  function cycle(sessionId: string, studentId: string) {
    const current = marks.get(`${sessionId}|${studentId}`) ?? 'unmarked'
    const idx = CYCLE.indexOf(current as typeof CYCLE[number])
    setStatus(sessionId, studentId, CYCLE[(idx + 1) % CYCLE.length]!)
  }

  function markGroupPresent(group: DayGroup) {
    setMarks(prev => {
      const next = new Map(prev)
      for (const s of group.students) next.set(`${group.sessionId}|${s.id}`, 'present')
      return next
    })
    setDirty(prev => new Set(prev).add(group.sessionId))
    setSavedSessions(prev => { const next = new Set(prev); next.delete(group.sessionId); return next })
  }

  function groupStats(group: DayGroup) {
    let present = 0, absent = 0, late = 0, excused = 0, unmarked = 0
    for (const s of group.students) {
      const st = marks.get(`${group.sessionId}|${s.id}`) ?? 'unmarked'
      if (st === 'present') present++
      else if (st === 'absent') absent++
      else if (st === 'late') late++
      else if (st === 'excused') excused++
      else unmarked++
    }
    return { present, absent, late, excused, unmarked }
  }

  const globalStats = useMemo(() => {
    let expected = 0, present = 0, absent = 0, marked = 0
    for (const g of groups) {
      expected += g.students.length
      const s = groupStats(g)
      present += s.present + s.late
      absent += s.absent
      marked += g.students.length - s.unmarked
    }
    return { expected, present, absent, marked }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, marks])

  async function saveAll() {
    const toSave = groups.filter(g => dirty.has(g.sessionId))
    if (toSave.length === 0) return
    setSaving(true); setError(null)
    try {
      const results = await Promise.all(toSave.map(async group => {
        const records = group.students
          .map(s => ({ studentId: s.id, status: marks.get(`${group.sessionId}|${s.id}`) ?? 'unmarked' }))
          .filter(r => r.status !== 'unmarked')
        if (records.length === 0) return { sessionId: group.sessionId, ok: true }
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: group.sessionId, records }),
        })
        return { sessionId: group.sessionId, ok: res.ok }
      }))
      const okIds = results.filter(r => r.ok).map(r => r.sessionId)
      const failed = results.length - okIds.length
      setSavedSessions(prev => new Set([...prev, ...okIds]))
      setDirty(prev => { const next = new Set(prev); for (const id of okIds) next.delete(id); return next })
      if (failed > 0) setError(`${failed} groupe(s) n'ont pas pu être enregistrés — réessaie.`)
    } catch {
      setError('Erreur réseau pendant l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  // Groupes rangés par site
  const bySite = useMemo(() => {
    const map = new Map<string, { site: string; groups: DayGroup[] }>()
    for (const g of groups) {
      const key = g.site?.id ?? 'sans-site'
      if (!map.has(key)) map.set(key, { site: g.site?.name ?? 'Sans site', groups: [] })
      map.get(key)!.groups.push(g)
    }
    return [...map.values()]
  }, [groups])

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4">

      {/* ─── Navigation de jour + compteurs globaux ──────────── */}
      <FadeIn from="bottom">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(d => shiftDate(d, -1))}
                aria-label="Jour précédent"
                className="btn-press rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={e => setDate(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setDate(d => shiftDate(d, 1))}
                disabled={date >= todayISO()}
                aria-label="Jour suivant"
                className="btn-press rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {date !== todayISO() && (
                <button
                  type="button"
                  onClick={() => setDate(todayISO())}
                  className="btn-press rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Aujourd&apos;hui
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {globalStats.expected} attendu{globalStats.expected > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                {globalStats.present} présent{globalStats.present > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {globalStats.absent} absent{globalStats.absent > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm capitalize text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {dateLabel} · {groups.length} groupe{groups.length > 1 ? 's' : ''} au programme
          </p>
        </section>
      </FadeIn>

      {/* ─── États ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement des groupes du jour…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
      )}
      {!loading && groups.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Aucun cours prévu ce jour</p>
          <p className="mt-1 text-sm text-muted-foreground">Les groupes apparaissent selon les créneaux du Planning.</p>
        </div>
      )}

      {/* ─── Sites → groupes ─────────────────────────────────── */}
      {!loading && bySite.map((siteBlock, siteIndex) => (
        <FadeIn key={siteBlock.site} delay={siteIndex * 60} from="bottom">
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {siteBlock.site}
            </h2>
            {siteBlock.groups.map(group => {
              const stats = groupStats(group)
              const isSaved = savedSessions.has(group.sessionId)
              const isDirty = dirty.has(group.sessionId)
              return (
                <article key={group.groupId} className={cn(
                  'rounded-xl border bg-card transition',
                  isSaved ? 'border-emerald-300 dark:border-emerald-800' : isDirty ? 'border-primary/40' : 'border-border'
                )}>
                  {/* En-tête groupe */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-3">
                    <span className="text-lg">{group.level?.emoji ?? '📋'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{group.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {group.startTime} – {group.endTime}{group.room ? ` · ${group.room}` : ''}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {isSaved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900">
                          <Check className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-muted-foreground">
                        <span className="font-semibold text-emerald-600">{stats.present + stats.late}</span>
                        {' / '}
                        <span className="font-semibold text-red-500">{stats.absent}</span>
                        {' / '}
                        {group.students.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => markGroupPresent(group)}
                        className="btn-press inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Tous présents
                      </button>
                    </div>
                  </div>

                  {/* Élèves */}
                  {group.students.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">Aucun élève inscrit dans ce groupe.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-4">
                      {group.students.map(student => {
                        const status = marks.get(`${group.sessionId}|${student.id}`) ?? 'unmarked'
                        const style = STATUS_STYLE[status]
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => cycle(group.sessionId, student.id)}
                            title={`${student.first_name} ${student.last_name} — cliquer pour changer`}
                            className={cn(
                              'btn-press flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition active:scale-95',
                              style.cls
                            )}
                          >
                            <span className="min-w-0 truncate font-medium">
                              {student.first_name} <span className="opacity-70">{student.last_name}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-bold uppercase">{style.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        </FadeIn>
      ))}

      {/* ─── Enregistrer tout (sticky) ───────────────────────── */}
      {!loading && groups.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || dirty.size === 0}
            className={cn(
              'btn-press flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition',
              dirty.size === 0 && savedSessions.size > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              (saving || dirty.size === 0) && savedSessions.size === 0 && 'opacity-60'
            )}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
            ) : dirty.size === 0 && savedSessions.size > 0 ? (
              <><Check className="h-4 w-4" /> Appel du jour enregistré ✓</>
            ) : (
              <><Save className="h-4 w-4" /> Enregistrer l&apos;appel du jour {dirty.size > 0 ? `(${dirty.size} groupe${dirty.size > 1 ? 's' : ''})` : ''}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
