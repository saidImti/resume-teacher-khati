'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, Users, Clock, MapPin, Plus, Pencil, Trash2, X, Save, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { upsertSchedule, deleteSchedule } from '@/lib/supabase/queries'
import { DAY_LABELS } from '@/types'
import type { Group, Level, Site, Schedule, Student, DayOfWeek } from '@/types'
import { FadeIn } from '@/components/ui/FadeIn'

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
  const [filterSite, setFilterSite] = useState('all')
  const [localSchedules, setLocalSchedules] = useState(schedulesByDay)
  const [modal, setModal] = useState<{ open: boolean; form: SlotForm }>({ open: false, form: EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const studentCountBySite = useMemo(() => {
    const map: Record<string, number> = {}
    students.forEach(s => {
      if (s.site_id) map[s.site_id] = (map[s.site_id] ?? 0) + 1
    })
    return map
  }, [students])

  const filtered = useMemo(() => {
    const result: Record<number, Schedule[]> = {}
    DAYS.forEach(d => {
      result[d] = (localSchedules[d] ?? []).filter(s =>
        filterSite === 'all' || s.site_id === filterSite
      )
    })
    return result
  }, [localSchedules, filterSite])

  const totalSlots = Object.values(filtered).flat().length

  function openNew(day: number) {
    const firstGroup = groups[0]
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

  const inputCls = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text)]">Planning</h1>
              <p className="text-sm text-[var(--color-text-muted)]">{totalSlots} créneau{totalSlots > 1 ? 'x' : ''} · semaine type</p>
            </div>
          </div>
          <select
            value={filterSite}
            onChange={e => setFilterSite(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">Tous les sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-auto max-w-7xl w-full px-6 py-6">
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">Semaine type</p>
              <h2 className="mt-1 text-lg font-semibold text-blue-950">Organiser les cours sans identifiants techniques</h2>
              <p className="mt-1 text-sm text-blue-800/80">
                Choisissez un jour, selectionnez un groupe, puis le site se synchronise automatiquement.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/settings/groups/new"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nouveau groupe
              </Link>
              <Link
                href="/settings/sites"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <MapPin className="h-4 w-4" />
                Sites
              </Link>
            </div>
          </div>
          {groups.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Creez au moins un groupe pour pouvoir ajouter des creneaux au planning.
            </div>
          )}
        </div>

        {/* KPIs par site */}
        <FadeIn>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {sites.map((site, siteI) => {
              const slotsCount = Object.values(localSchedules).flat().filter(s => s.site_id === site.id).length
              const stuCount = studentCountBySite[site.id] ?? 0
              const colors = siteColor(siteI).split(' ')
              return (
                <div key={site.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${colors[0]} ${colors[2]}`}>
                    {site.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-lg font-bold text-[var(--color-text)]">{slotsCount}</p>
                  <p className="text-sm font-medium text-[var(--color-text)]">{site.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{stuCount} élève{stuCount > 1 ? 's' : ''} actifs</p>
                </div>
              )
            })}
          </div>
        </FadeIn>

        {/* Grille semaine */}
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            {DAYS.map(day => {
              const slots = filtered[day] ?? []
              return (
                <div key={day} className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{DAY_LABELS[day]}</span>
                    <button
                      onClick={() => openNew(day)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Ajouter un créneau"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 p-2 min-h-[120px]">
                    {slots.length === 0 ? (
                      <button
                        onClick={() => openNew(day)}
                        className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-6 text-xs text-[var(--color-text-muted)] hover:border-blue-300 hover:text-blue-500 transition-colors"
                      >
                        + Ajouter
                      </button>
                    ) : (
                      slots.map(slot => {
                        const slotSiteIdx = sites.findIndex(sx => sx.id === slot.site_id)
                        const colorCls = siteColor(slotSiteIdx)
                        return (
                          <div key={slot.id} className={`group relative rounded-xl border p-2.5 ${colorCls}`}>
                            <div className="absolute right-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
                              <button
                                onClick={() => openEdit(slot)}
                                className="rounded p-1 hover:bg-white/60 transition-colors"
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
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="text-xs font-semibold">
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </span>
                            </div>
                            {slot.group && (
                              <p className="text-xs font-medium leading-tight">
                                {slot.group.level?.emoji} {slot.group.name}
                              </p>
                            )}
                            {slot.room && (
                              <p className="mt-1 flex items-center gap-1 text-xs opacity-75">
                                <MapPin className="h-2.5 w-2.5" />{slot.room}
                              </p>
                            )}
                            <p className="mt-1 flex items-center gap-1 text-xs opacity-75">
                              <Users className="h-2.5 w-2.5" />max {slot.max_students}
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
        </FadeIn>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                {modal.form.id ? 'Modifier le créneau' : 'Nouveau créneau'}
              </h2>
              <button
                onClick={() => setModal({ open: false, form: EMPTY_FORM })}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
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
                    onChange={e => setModal(m => ({ ...m, form: { ...m.form, site_id: e.target.value } }))}
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
                  <option value="">Choisir un groupe</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.level?.emoji ? `${group.level.emoji} ` : ''}{group.name}
                      {group.site?.name ? ` - ${group.site.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Le site se synchronise automatiquement avec le groupe choisi.
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
