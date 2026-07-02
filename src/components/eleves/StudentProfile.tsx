'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronLeft, Edit, Phone, Mail, MessageCircle, MapPin,
  Calendar, Shield, Users, AlertCircle, Wallet, BookOpen, Receipt,
  Plus, Loader2, X, Hash, ClipboardCheck, CheckCircle2, XCircle,
  Clock, Info, ArrowRight,
} from 'lucide-react'
import type { Student, Enrollment, Payment, Invoice } from '@/types'
import { formatRegistrationNumber } from '@/lib/utils'

interface GroupOption {
  id: string
  name: string
  level: { name: string; emoji: string }
  site:  { name: string }
}

export interface AttendanceHistoryEntry {
  id: string
  status: string
  notes: string | null
  marked_at: string
  session: {
    id: string
    session_date: string
    group: { name: string; level: { name: string; emoji: string; color: string } | null } | null
  } | null
}

interface Props {
  student:     Student
  enrollments: Enrollment[]
  payments:    Payment[]
  invoices:    Invoice[]
  groups:      GroupOption[]
  attendance:  AttendanceHistoryEntry[]
}

const STATUS_CONFIG = {
  active:    { label: 'Actif',    color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  trial:     { label: 'En essai', color: 'text-amber-700',   bg: 'bg-amber-50 ring-amber-200'     },
  suspended: { label: 'Suspendu', color: 'text-orange-700',  bg: 'bg-orange-50 ring-orange-200'   },
  departed:  { label: 'Parti',    color: 'text-slate-500',   bg: 'bg-slate-100 ring-slate-200'    },
}

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte', transfer: 'Virement', check: 'Chèque', other: 'Autre',
}


export function StudentProfile({ student, enrollments, payments, invoices, groups, attendance }: Props) {
  const router = useRouter()
  const st = STATUS_CONFIG[student.status] ?? STATUS_CONFIG.active

  // ── Formulaire inscription groupe ────────────────────────────────────────────
  const [showEnroll, setShowEnroll] = useState(false)
  const [enrollGroupId, setEnrollGroupId] = useState('')
  const [enrollDate, setEnrollDate] = useState(new Date().toISOString().slice(0, 10))
  const [enrollStatus, setEnrollStatus] = useState<'active' | 'trial'>('active')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  async function submitEnrollment() {
    if (!enrollGroupId) { setEnrollError('Sélectionne un groupe'); return }
    setEnrolling(true); setEnrollError(null)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, group_id: enrollGroupId, start_date: enrollDate, status: enrollStatus }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setEnrollError(data.error ?? 'Erreur'); return }
      setShowEnroll(false)
      setEnrollGroupId('')
      router.refresh()
    } catch {
      setEnrollError('Erreur réseau')
    } finally {
      setEnrolling(false)
    }
  }
  const family = student.family

  // Calcul âge
  const age = student.date_of_birth
    ? Math.floor((Date.now() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const totalDue = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due), 0)
  const remaining = invoices.reduce(
    (sum, invoice) => sum + Math.max(Number(invoice.amount_due) - Number(invoice.amount_paid), 0),
    0
  )

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-700">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-[var(--color-text)]">
                  {student.first_name} {student.last_name}
                </h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${st.bg} ${st.color}`}>
                  {st.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                {student.level && <span>{student.level.emoji} {student.level.name}</span>}
                {student.site && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{student.site.name}</span>
                  </>
                )}
                {age && <><span>·</span><span>{age} ans</span></>}
              </div>
            </div>
          </div>
          <Link
            href={`/eleves/${student.id}/edit`}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl w-full px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Famille */}
            {family && (
              <Section
                icon={<Users className="h-4 w-4 text-violet-500" />}
                title="Famille"
                action={
                  family.registration_number ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 px-3 py-1.5 text-sm font-bold tabular-nums tracking-wide text-amber-800 shadow-sm dark:border-amber-700/40 dark:from-amber-950/40 dark:to-amber-900/30 dark:text-amber-300"
                      title="Numéro d'inscription de la famille"
                    >
                      <Hash className="h-3.5 w-3.5 opacity-70" />
                      {formatRegistrationNumber(family.registration_number)}
                    </span>
                  ) : undefined
                }
              >
                <div className="space-y-3">
                  <ContactRow
                    name={`${family.parent1_first} ${family.parent1_last}`}
                    phone={family.parent1_phone}
                    email={family.parent1_email}
                    whatsapp={family.parent1_whatsapp}
                    tag="Parent 1"
                  />
                  {family.parent2_first && (
                    <ContactRow
                      name={`${family.parent2_first} ${family.parent2_last ?? ''}`}
                      phone={family.parent2_phone}
                      email={family.parent2_email}
                      tag="Parent 2"
                    />
                  )}
                  {family.city && (
                    <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                      <MapPin className="h-4 w-4" />
                      {family.address && `${family.address}, `}{family.postal_code} {family.city}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Inscriptions */}
            <Section
              icon={<BookOpen className="h-4 w-4 text-violet-500" />}
              title="Groupes"
              action={
                <button
                  onClick={() => setShowEnroll((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Inscrire dans un groupe
                </button>
              }
            >
              {/* Formulaire d'inscription */}
              {showEnroll && (
                <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-violet-900">Nouvelle inscription</p>
                    <button onClick={() => setShowEnroll(false)} className="text-violet-400 hover:text-violet-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    value={enrollGroupId}
                    onChange={(e) => setEnrollGroupId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    <option value="">— Choisir un groupe —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.level.emoji} {g.name} · {g.site.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Date début</label>
                      <input
                        type="date"
                        value={enrollDate}
                        onChange={(e) => setEnrollDate(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Statut</label>
                      <select
                        value={enrollStatus}
                        onChange={(e) => setEnrollStatus(e.target.value as 'active' | 'trial')}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      >
                        <option value="active">Actif</option>
                        <option value="trial">Essai</option>
                      </select>
                    </div>
                  </div>
                  {enrollError && <p className="text-xs text-red-600">{enrollError}</p>}
                  <button
                    onClick={() => void submitEnrollment()}
                    disabled={enrolling || !enrollGroupId}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {enrolling ? <><Loader2 className="h-4 w-4 animate-spin" /> Inscription…</> : 'Confirmer l\'inscription'}
                  </button>
                </div>
              )}

              {enrollments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune inscription enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map(e => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {e.group?.level?.emoji} {e.group?.name ?? 'Groupe inconnu'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {new Date(e.start_date).toLocaleDateString('fr-FR')}
                          {e.end_date && ` → ${new Date(e.end_date).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ring-1 ${
                        e.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                        e.status === 'trial'  ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                        'bg-slate-100 text-slate-500 ring-slate-200'
                      }`}>
                        {e.status === 'active' ? 'Actif' : e.status === 'trial' ? 'Essai' : e.status === 'completed' ? 'Terminé' : 'Annulé'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Présences de l'année */}
            <AttendanceHistorySection attendance={attendance} />

            {/* Paiements */}
            <Section icon={<Receipt className="h-4 w-4 text-violet-500" />} title={`Factures (${invoices.length})`}>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <FinancialMetric label="Facturé" value={totalDue} />
                <FinancialMetric label="Payé" value={totalPaid} tone="success" />
                <FinancialMetric label="Reste" value={remaining} tone={remaining > 0 ? 'danger' : 'success'} />
              </div>
              {invoices.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Aucune facture enregistrée pour cette famille.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 12).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {invoice.invoice_number ?? `Facture ${invoice.period_month}/${invoice.period_year}`}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {String(invoice.period_month).padStart(2, '0')}/{invoice.period_year} · {invoice.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{Number(invoice.amount_due).toFixed(2)} €</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{Number(invoice.amount_paid).toFixed(2)} € payé</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Paiements */}
            <Section icon={<Wallet className="h-4 w-4 text-violet-500" />} title={`Paiements (${payments.length})`}>
              {payments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Aucun paiement enregistré.</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <span className="text-sm font-medium text-emerald-800">Total encaissé</span>
                    <span className="text-lg font-bold text-emerald-700">{totalPaid.toFixed(2)} €</span>
                  </div>
                  <div className="space-y-2">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{PAYMENT_METHODS[p.method] ?? p.method}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                            {p.reference && ` · Réf: ${p.reference}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-700">+{p.amount.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </div>

          {/* Sidebar droite */}
          <div className="space-y-6">

            {/* Infos scolarité */}
            <Section icon={<Calendar className="h-4 w-4 text-violet-500" />} title="Scolarité">
              <dl className="space-y-3">
                <InfoRow label="Inscrit le" value={new Date(student.enrollment_date).toLocaleDateString('fr-FR')} />
                {student.departure_date && (
                  <InfoRow label="Parti le" value={new Date(student.departure_date).toLocaleDateString('fr-FR')} />
                )}
                {student.departure_reason && (
                  <InfoRow label="Motif départ" value={student.departure_reason} />
                )}
                <InfoRow label="Photo" value={student.photo_consent ? '✅ Autorisée' : '❌ Non autorisée'} />
              </dl>
            </Section>

            {/* Urgence */}
            {(student.emergency_name || student.medical_notes) && (
              <Section icon={<Shield className="h-4 w-4 text-red-500" />} title="Urgence & santé">
                <div className="space-y-3">
                  {student.emergency_name && (
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Contact d'urgence</p>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {student.emergency_name}
                        {student.emergency_relation && <span className="text-[var(--color-text-muted)]"> ({student.emergency_relation})</span>}
                      </p>
                      {student.emergency_phone && (
                        <a href={`tel:${student.emergency_phone}`} className="text-sm text-violet-600 hover:underline flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {student.emergency_phone}
                        </a>
                      )}
                    </div>
                  )}
                  {student.medical_notes && (
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Notes médicales</p>
                      <p className="text-sm text-[var(--color-text)] mt-0.5 rounded-xl bg-red-50 border border-red-100 p-3">
                        {student.medical_notes}
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Notes internes */}
            {student.notes && (
              <Section icon={<AlertCircle className="h-4 w-4 text-amber-500" />} title="Notes internes">
                <p className="text-sm text-[var(--color-text)]">{student.notes}</p>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FinancialMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'danger'
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-base font-bold ${
        tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-[var(--color-text)]'
      }`}>
        {value.toFixed(2)} €
      </p>
    </div>
  )
}

// ─── Présences de l'année ──────────────────────────────────────────
const ATTENDANCE_CONFIG: Record<string, { label: string; icon: React.ElementType; text: string; bg: string; bar: string }> = {
  present: { label: 'Présent', icon: CheckCircle2, text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900', bar: '#10b981' },
  late:    { label: 'Retard',  icon: Clock,        text: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900',         bar: '#f59e0b' },
  excused: { label: 'Excusé',  icon: Info,         text: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-50 ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-900',             bar: '#3b82f6' },
  absent:  { label: 'Absent',  icon: XCircle,      text: 'text-red-700 dark:text-red-300',         bg: 'bg-red-50 ring-red-200 dark:bg-red-950/30 dark:ring-red-900',                 bar: '#ef4444' },
}

function AttendanceHistorySection({ attendance }: { attendance: AttendanceHistoryEntry[] }) {
  const counts = { present: 0, late: 0, excused: 0, absent: 0 }
  for (const entry of attendance) {
    if (entry.status in counts) counts[entry.status as keyof typeof counts]++
  }
  const total = attendance.length
  const attended = counts.present + counts.late
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0
  const rateTone = rate >= 90 ? 'text-emerald-600' : rate >= 75 ? 'text-amber-600' : 'text-red-600'
  const rateBar = rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <Section
      icon={<ClipboardCheck className="h-4 w-4 text-violet-500" />}
      title={`Présences (${total} appel${total > 1 ? 's' : ''})`}
      action={
        total > 0 ? (
          <span className={`text-sm font-bold tabular-nums ${rateTone}`} title="Taux d'assiduité (présent + retard)">
            {rate}% d&apos;assiduité
          </span>
        ) : undefined
      }
    >
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">Aucun appel enregistré pour cet élève</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Les présences se marquent depuis la page Présences, groupe par groupe.
          </p>
          <Link
            href="/presences"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
          >
            Faire l&apos;appel
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compteurs annuels */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(ATTENDANCE_CONFIG) as Array<keyof typeof counts>).map((key) => {
              const cfg = ATTENDANCE_CONFIG[key]!
              const Icon = cfg.icon
              return (
                <div key={key} className={`rounded-xl p-3 ring-1 ${cfg.bg}`}>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </div>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${cfg.text}`}>{counts[key]}</p>
                </div>
              )
            })}
          </div>

          {/* Barre d'assiduité */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--color-text)]">Assiduité sur l&apos;année</span>
              <span className="font-semibold tabular-nums text-[var(--color-text-muted)]">{attended}/{total} cours suivis</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg)] ring-1 ring-[var(--color-border)]">
              <div className={`h-full rounded-full transition-all duration-300 ${rateBar}`} style={{ width: `${Math.max(rate, 3)}%` }} />
            </div>
          </div>

          {/* Historique détaillé */}
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {attendance.map((entry) => {
              const cfg = ATTENDANCE_CONFIG[entry.status] ?? ATTENDANCE_CONFIG.present!
              const Icon = cfg.icon
              const date = entry.session?.session_date
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-base">{entry.session?.group?.level?.emoji ?? '📋'}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">
                        {date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {entry.session?.group?.name ?? 'Groupe'}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cfg.bg} ${cfg.text}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Section>
  )
}

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          {icon}{title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-sm font-medium text-[var(--color-text)]">{value}</dd>
    </div>
  )
}

function ContactRow({ name, phone, email, whatsapp, tag }: {
  name: string; phone?: string | null; email?: string | null; whatsapp?: string | null; tag: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-violet-600 bg-violet-50 rounded px-1.5 py-0.5">{tag}</span>
        <span className="text-sm font-medium text-[var(--color-text)]">{name}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-violet-600 transition-colors">
            <Phone className="h-3 w-3" />{phone}
          </a>
        )}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
            <MessageCircle className="h-3 w-3" />WhatsApp
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-violet-600 transition-colors">
            <Mail className="h-3 w-3" />{email}
          </a>
        )}
      </div>
    </div>
  )
}
