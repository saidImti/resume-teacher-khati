'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Edit, Phone, Mail, MessageCircle, MapPin,
  Calendar, Shield, Users, AlertCircle, Wallet, BookOpen, Receipt,
} from 'lucide-react'
import type { Student, Enrollment, Payment, Invoice } from '@/types'

interface Props {
  student: Student
  enrollments: Enrollment[]
  payments: Payment[]
  invoices: Invoice[]
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


export function StudentProfile({ student, enrollments, payments, invoices }: Props) {
  const router = useRouter()
  const st = STATUS_CONFIG[student.status] ?? STATUS_CONFIG.active
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
              <Section icon={<Users className="h-4 w-4 text-violet-500" />} title="Famille">
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
            <Section icon={<BookOpen className="h-4 w-4 text-violet-500" />} title="Historique des groupes">
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        {icon}{title}
      </h3>
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
