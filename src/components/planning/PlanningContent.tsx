'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Clock, MapPin, Plus, Pencil, Trash2, X, Save, Loader2, Copy } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { upsertSchedule, deleteSchedule } from '@/lib/supabase/queries'
import { buildCapacitySummary } from '@/lib/planning-capacity'
import { DAY_LABELS } from '@/types'
import type { Group, Level, Site, Schedule, Student, DayOfWeek } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'
import { useOrgRole } from '@/contexts/OrgRoleContext'

interface Props {
  sites: Site[]
  schedulesByDay: Record<number, Schedule[]>
  students: Student[]
  groups: GroupWithRelations[]
}

interface GroupWithRelations extends Group {
  site?: Site
  level?: Level
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const
const VISIBLE_LEVELS = ['Preschoolers', 'Kids', 'Juniors', 'Tweens', 'Teenagers']

interface SlotForm {
  id?: string
  site_id: string
  group_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string
  max_students: number
  notes: string
}

const EMPTY_FORM: SlotForm = {
  site_id: '', group_id: '', day_of_week: 1,
  start_time: '14:00', end_time: '15:00',
  room: '', max_students: 15, notes: '',
}

const SLOT_COLORS = [
  'bg-violet-100 border-violet-300 text-violet-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-emerald-100 border-emerald-300 text-emerald-800',
  'bg-amber-100 border-amber-300 text-amber-800',
  'bg-rose-100 border-rose-300 text-rose-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
]

function siteColor(idx: number) {
  return SLOT_COLORS[idx % SLOT_COLORS.length]!
}

export function PlanningContent({ sites, schedulesByDay, students, groups }: Props) {
  const { canWrite } = useOrgRole()
  const [filterSite, setFilterSite] = useState('all')
  const [localSchedules, setLocalSchedules] = useState(schedulesByDay)
  const [modal, setModal] = useState<{ open: boolean; form: SlotForm }>({ open: false, form: EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const result: Record<number, Schedule[]> = {}
    DAYS.forEach(d => {
      result[d] = (localSchedules[d] ?? []).filter(s =>
        filterSite === 'all' || s.site_id === filterSite
      )
    })
    return result
  }, [localSchedules, filterSite])

  const allCapacity = useMemo(
    () => buildCapacitySummary(Object.values(localSchedules).flat(), students, groups),
    [localSchedules, students, groups]
  )
  const visibleCapacity = useMemo(
    () => buildCapacitySummary(Object.values(filtered).flat(), students, groups),
    [filtered, students, groups]
  )
  const capacityByGroup = useMemo(
    () => new Map(allCapacity.groups.map(group => [group.groupId, group])),
    [allCapacity.groups]
  )
  const capacityBySite = useMemo(() => new Map(sites.map(site => {
    const siteGroups = allCapacity.groups.filter(group => group.siteId === site.id)
    const capacity = siteGroups.reduce((sum, group) => sum + group.capacity, 0)
    const occupied = siteGroups.reduce((sum, group) => sum + group.occupied, 0)
    return [site.id, {
      occupied,
      capacity,
      available: Math.max(capacity - occupied, 0),
      fullGroups: siteGroups.filter(group => group.isFull).length,
    }]
  })), [allCapacity.groups, sites])
  const capacityByLevel = useMemo(() => {
    const levels = new Map<string, {
      key: string
      label: string
      emoji: string
      occupied: number
      capacity: number
      fullGroups: number
    }>()

    visibleCapacity.groups.forEach(group => {
      const key = `${group.siteId}:${group.levelId || group.levelName}`
      const current = levels.get(key) ?? {
        key,
        label: group.levelName,
        emoji: group.levelEmoji,
        occupied: 0,
        capacity: 0,
        fullGroups: 0,
      }
      current.occupied += group.occupied
      current.capacity += group.capacity
      current.fullGroups += group.isFull ? 1 : 0
      levels.set(key, current)
    })

    return Array.from(levels.values())
  }, [visibleCapacity.groups])

  const totalSlots = Object.values(filtered).flat().length
  const activeDays = DAYS.filter(day => (filtered[day] ?? []).length > 0).length
  const groupsForSelectedSite = groups.filter((group) => {
    const levelName = group.level?.name ?? group.name
    return (!modal.form.site_id || group.site_id === modal.form.site_id) && VISIBLE_LEVELS.includes(levelName)
  })

  function openNew(day: number) {
    const preferredSiteId = filterSite !== 'all' ? filterSite : sites[0]?.id ?? ''
    const firstGroup = groups.find((group) => {
      const levelName = group.level?.name ?? group.name
      return group.site_id === preferredSiteId && VISIBLE_LEVELS.includes(levelName)
    }) ?? groups[0]
    setModal({
      open: true,
      form: {
        ...EMPTY_FORM,
        day_of_week: day,
        site_id: firstGroup?.site_id ?? sites[0]?.id ?? '',
        group_id: firstGroup?.id ?? '',
      },
    })
  }

  function openEdit(s: Schedule) {
    setModal({
      open: true,
      form: {
        id: s.id,
        site_id: s.site_id,
        group_id: s.group_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room ?? '',
        max_students: s.max_students,
        notes: s.notes ?? '',
      },
    })
  }

  function openDuplicate(s: Schedule) {
    setModal({
      open: true,
      form: {
        site_id: s.site_id,
        group_id: s.group_id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room ?? '',
        max_students: s.max_students,
        notes: s.notes ?? '',
      },
    })
  }

  async function handleSave() {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !modal.form.site_id || !modal.form.group_id) return
    setSaving(true)
    try {
      const saved = await upsertSchedule(supabase, {
        ...(modal.form.id ? { id: modal.form.id } : {}),
        user_id: user.id,
        site_id: modal.form.site_id,
        group_id: modal.form.group_id,
        day_of_week: modal.form.day_of_week as DayOfWeek,
        start_time: modal.form.start_time,
        end_time: modal.form.end_time,
        room: modal.form.room || null,
        max_students: modal.form.max_students,
        notes: modal.form.notes || null,
        is_active: true,
      })
      const selectedGroup = groups.find((g) => g.id === modal.form.group_id)
      const selectedSite = sites.find((s) => s.id === modal.form.site_id)
      const hydratedSaved = {
        ...saved,
        group: selectedGroup ?? saved.group,
        site: selectedSite ?? saved.site,
      } as Schedule

      setLocalSchedules(prev => {
        const day = hydratedSaved.day_of_week
        const existing = prev[day] ?? []
        const updated = modal.form.id
          ? existing.map(x => x.id === hydratedSaved.id ? hydratedSaved : x)
          : [...existing, hydratedSaved]
        updated.sort((a, b) => a.start_time.localeCompare(b.start_time))
        return { ...prev, [day]: updated }
      })
      setModal({ open: false, form: EMPTY_FORM })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, day: number) {
    if (!confirm('Supprimer ce créneau ?')) return
    const supabase = getSupabaseBrowserClient()
    setDeleting(id)
    try {
      await deleteSchedule(supabase, id)
      setLocalSchedules(prev => ({
        ...prev,
        [day]: (prev[day] ?? []).filter(s => s.id !== id),
      }))
    } finally {
      setDeleting(null)
    }
  }

  const inputCls = 'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-colors'

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <FadeIn>
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid lg:grid-cols-[1fr_340px]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-500">Organisation pédagogique</p>
                    <h1 className="mt-2 text-2xl font-semibold text-foreground">Cockpit de la semaine</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Visualisez la charge, les lieux et les niveaux avant d’ajouter ou de déplacer un créneau.
                    </p>
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => openNew(new Date().getDay())}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Nouveau créneau
                    </button>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <PlanningMetric label="Inscrits" value={visibleCapacity.occupied} helper={`${visibleCapacity.occupancyRate}% d'occupation`} />
                  <PlanningMetric label="Capacité réelle" value={visibleCapacity.capacity} helper={`${visibleCapacity.groups.length} groupes uniques`} />
                  <PlanningMetric label="Places disponibles" value={visibleCapacity.available} helper={`${totalSlots} créneaux · ${activeDays} jours`} />
                  <PlanningMetric label="Groupes complets" value={visibleCapacity.fullGroups} helper={visibleCapacity.fullGroups > 0 ? 'à surveiller' : 'aucun groupe saturé'} />
                </div>
              </div>
              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Filtrer le planning</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Concentrez la semaine sur un lieu d’enseignement.</p>
                    <select
                      value={filterSite}
                      onChange={e => setFilterSite(e.target.value)}
                      className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                    >
                      <option value="all">Tous les sites</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/settings/groups/new" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                      <Users className="h-3.5 w-3.5" /> Groupes
                    </Link>
                    <Link href="/settings/sites" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
                      <MapPin className="h-3.5 w-3.5" /> Sites
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Charge par site</h2>
              <p className="mt-1 text-xs text-muted-foreground">Élèves réellement inscrits et capacité des groupes, sans compter deux fois leurs créneaux.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sites.map((site, siteI) => {
                const siteCapacity = capacityBySite.get(site.id)
                const occupied = siteCapacity?.occupied ?? 0
                const capacity = siteCapacity?.capacity ?? 0
                const available = siteCapacity?.available ?? 0
                return (
                  <button key={site.id} type="button" onClick={() => setFilterSite(filterSite === site.id ? 'all' : site.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      filterSite === site.id ? siteColor(siteI) : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}>
                    <span>{site.name}</span>
                    <span className="font-bold">{occupied}/{capacity}</span>
                    <span className="opacity-60">
                      · {siteCapacity?.fullGroups ? `${siteCapacity.fullGroups} complet${siteCapacity.fullGroups > 1 ? 's' : ''}` : `${available} places`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {groups.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Creez au moins un groupe pour pouvoir ajouter des creneaux au planning.
            </div>
          )}
          {allCapacity.studentsWithoutEnrollment > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {allCapacity.studentsWithoutEnrollment} élève{allCapacity.studentsWithoutEnrollment > 1 ? 's actifs ou en essai ne sont' : ' actif ou en essai n’est'} rattaché{allCapacity.studentsWithoutEnrollment > 1 ? 's' : ''} à aucun groupe en cours.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Capacité par niveau</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filterSite === 'all' ? 'Tous les sites' : sites.find(site => site.id === filterSite)?.name}
            </p>
          </div>
          {capacityByLevel.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Aucun groupe planifié pour ce filtre.</p>
          ) : (
            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {capacityByLevel.map(level => {
                const available = Math.max(level.capacity - level.occupied, 0)
                const rate = level.capacity > 0 ? Math.round((level.occupied / level.capacity) * 100) : 0
                return (
                  <div key={level.key} className="bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{level.emoji} {level.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{level.occupied}/{level.capacity} inscrits · {rate}%</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        level.fullGroups > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {level.fullGroups > 0 ? `${level.fullGroups} complet${level.fullGroups > 1 ? 's' : ''}` : `${available} places`}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${rate >= 100 ? 'bg-rose-500' : rate >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Grille semaine */}
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1120px] grid-cols-7 gap-3">
            {DAYS.map(day => {
              const slots = filtered[day] ?? []
              return (
                <div key={day} className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{DAY_LABELS[day]}</span>
                    {canWrite && (
                      <button
                        onClick={() => openNew(day)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        title="Ajouter un créneau"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 p-2 min-h-[120px]">
                    {slots.length === 0 ? (
                      canWrite ? (
                        <button
                          onClick={() => openNew(day)}
                          className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-6 text-xs text-[var(--color-text-muted)] hover:border-blue-300 hover:text-blue-500 transition-colors"
                        >
                          + Ajouter
                        </button>
                      ) : (
                        <p className="flex flex-1 items-center justify-center py-6 text-xs text-[var(--color-text-muted)]">Aucun créneau</p>
                      )
                    ) : (
                      slots.map(slot => {
                        const slotSiteIdx = sites.findIndex(sx => sx.id === slot.site_id)
                        const colorCls = siteColor(slotSiteIdx)
                        const groupCapacity = capacityByGroup.get(slot.group_id)
                        return (
                          <div key={slot.id} className={`group relative rounded-xl border p-2.5 ${colorCls}`}>
                            {canWrite && (
                            <div className="absolute right-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
                              <button
                                onClick={() => openDuplicate(slot)}
                                className="rounded p-1 hover:bg-white/60 transition-colors"
                                title="Dupliquer"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => openEdit(slot)}
                                className="rounded p-1 hover:bg-white/60 transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(slot.id, day)}
                                disabled={deleting === slot.id}
                                className="rounded p-1 hover:bg-white/60 transition-colors"
                              >
                                {deleting === slot.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                            )}
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="text-xs font-semibold">
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </span>
                            </div>
                            {slot.group && (
                              <p className="text-xs font-medium leading-tight">
                                {slot.group.level?.emoji} {slot.group.level?.name ?? slot.group.name}
                              </p>
                            )}
                            {slot.room && (
                              <p className="mt-1 flex items-center gap-1 text-xs opacity-75">
                                <MapPin className="h-2.5 w-2.5" />{slot.room}
                              </p>
                            )}
                            <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${groupCapacity?.isFull ? 'text-rose-700' : 'opacity-75'}`}>
                              <Users className="h-2.5 w-2.5" />
                              {groupCapacity
                                ? groupCapacity.isFull
                                  ? `${groupCapacity.occupied}/${groupCapacity.capacity} · Complet`
                                  : `${groupCapacity.occupied}/${groupCapacity.capacity} · ${groupCapacity.available} places`
                                : `max ${slot.max_students}`}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </FadeIn>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ring-1 ring-white/10">
            <div className="flex items-start justify-between border-b border-border bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-5 text-white">
              <h2 className="text-lg font-bold text-white">
                {modal.form.id ? 'Modifier le créneau' : 'Nouveau créneau'}
              </h2>
              <button
                onClick={() => setModal({ open: false, form: EMPTY_FORM })}
                className="rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Jour</label>
                  <select
                    value={modal.form.day_of_week}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, day_of_week: Number(e.target.value) } }))}
                    className={inputCls}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Site</label>
                  <select
                    value={modal.form.site_id}
                    onChange={e => {
                      const nextSiteId = e.target.value
                      const nextGroup = groups.find((group) => {
                        const levelName = group.level?.name ?? group.name
                        return group.site_id === nextSiteId && VISIBLE_LEVELS.includes(levelName)
                      })
                      setModal(m => ({
                        ...m,
                        form: {
                          ...m.form,
                          site_id: nextSiteId,
                          group_id: nextGroup?.id ?? '',
                        },
                      }))
                    }}
                    className={inputCls}
                  >
                    <option value="">— Site —</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Groupe</label>
                <select
                  value={modal.form.group_id}
                  onChange={e => {
                    const group = groups.find((g) => g.id === e.target.value)
                    setModal(m => ({
                      ...m,
                      form: {
                        ...m.form,
                        group_id: e.target.value,
                        site_id: group?.site_id ?? m.form.site_id,
                      },
                    }))
                  }}
                  className={inputCls}
                >
                  <option value="">Choisir un niveau</option>
                  {groupsForSelectedSite.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.level?.emoji ? `${group.level.emoji} ` : ''}{group.level?.name ?? group.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Le site choisi filtre les niveaux disponibles.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Début</label>
                  <input type="time" value={modal.form.start_time}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, start_time: e.target.value } }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Fin</label>
                  <input type="time" value={modal.form.end_time}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, end_time: e.target.value } }))}
                    className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Salle</label>
                  <input value={modal.form.room}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, room: e.target.value } }))}
                    placeholder="ex. Salle A" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Max élèves</label>
                  <input type="number" min={1} max={50} value={modal.form.max_students}
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, max_students: Number(e.target.value) } }))}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Notes</label>
                <textarea value={modal.form.notes} rows={2}
                  onChange={e => setModal(m => ({ ...m, form: { ...m.form, notes: e.target.value } }))}
                  placeholder="Informations complémentaires…" className={inputCls} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
              <button
                onClick={() => setModal({ open: false, form: EMPTY_FORM })}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !modal.form.site_id || !modal.form.group_id}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanningMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: number | string
  helper: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="truncate text-xl font-bold leading-none text-foreground">{value}</p>
        <p className="pb-0.5 text-right text-[11px] text-muted-foreground">{helper}</p>
      </div>
    </div>
  )
}
