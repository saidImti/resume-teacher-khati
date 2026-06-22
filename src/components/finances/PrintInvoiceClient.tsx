'use client'

import { Invoice, InvoiceLineItem, Payment } from '@/types'

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const METHOD_LABELS: Record<string, string> = {
  cash:         'Espèces',
  check:        'Chèque',
  bank_transfer:'Virement',
  card:         'Carte',
  other:        'Autre',
}

const STATUS_LABELS: Record<string, string> = {
  draft:     'Brouillon',
  pending:   'En attente',
  paid:      'Payée',
  partial:   'Partielle',
  cancelled: 'Annulée',
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

interface PrintFamily {
  id: string
  parent1_first: string
  parent1_last: string
  parent1_email: string | null
  parent2_first?: string | null
  parent2_last?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
}

type InvoiceWithRelations = Omit<Invoice, 'family' | 'site' | 'payments'> & {
  family?: PrintFamily | null
  site?: { id: string; name: string } | null
  payments?: Payment[]
}

interface Props {
  invoice: InvoiceWithRelations
}

export function PrintInvoiceClient({ invoice }: Props) {
  const family   = invoice.family ?? null
  const site     = invoice.site ?? null
  const payments = invoice.payments ?? []
  const lineItems: InvoiceLineItem[] = Array.isArray(invoice.line_items) ? invoice.line_items : []
  const balance  = invoice.amount_due - invoice.amount_paid

  const periodLabel = `${MONTH_NAMES[(invoice.period_month - 1) % 12] ?? ''} ${invoice.period_year}`
  const parentName  = family
    ? `${family.parent1_first} ${family.parent1_last}`
    : '—'
  const parent2Name = family?.parent2_first
    ? `${family.parent2_first} ${family.parent2_last ?? ''}`
    : null

  const addressLine = [family?.postal_code, family?.city].filter(Boolean).join(' ')

  const invoiceDate = new Date(invoice.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { box-shadow: none !important; margin: 0 !important; width: 210mm; min-height: 297mm; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      {/* Toolbar — masqué à l'impression */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Retour
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            Facture {invoice.invoice_number ?? `#${invoice.id.slice(0, 8)}`}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* Page A4 */}
      <div className="no-print mt-14" />
      <div className="page mx-auto bg-white shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '20mm 18mm' }}>

        {/* ── EN-TÊTE ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-base">K</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 leading-tight">Teacher Khati</div>
                <div className="text-xs text-gray-500">Cours d'anglais pour enfants</div>
              </div>
            </div>
            {site && <div className="text-sm text-gray-500 mt-1">Site : {site.name}</div>}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-700 mb-1">FACTURE</div>
            <div className="text-sm font-semibold text-gray-700">
              {invoice.invoice_number ?? `Réf. ${invoice.id.slice(0, 8).toUpperCase()}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">Émise le {invoiceDate}</div>
            {dueDate && (
              <div className="text-xs text-gray-500">Échéance : {dueDate}</div>
            )}
            <div className="mt-2">
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                invoice.status === 'paid'      ? 'bg-green-100 text-green-800' :
                invoice.status === 'partial'   ? 'bg-yellow-100 text-yellow-800' :
                invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* ── PÉRIODE + CLIENT ── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Période</div>
            <div className="text-base font-bold text-gray-900">{periodLabel}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Facturé à</div>
            <div className="text-sm font-bold text-gray-900">{parentName}</div>
            {parent2Name && <div className="text-sm text-gray-600">{parent2Name}</div>}
            {family?.address && <div className="text-xs text-gray-500 mt-1">{family.address}</div>}
            {addressLine && <div className="text-xs text-gray-500">{addressLine}</div>}
            {family?.parent1_email && (
              <div className="text-xs text-gray-500 mt-1">{family.parent1_email}</div>
            )}
          </div>
        </div>

        {/* ── LIGNES ── */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Élève</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400 text-sm">Aucune ligne</td>
              </tr>
            ) : (
              lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-gray-800">{item.student_name}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{item.description}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(item.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── TOTAUX ── */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{fmt(invoice.amount_due + invoice.discount)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Remise</span>
                <span className="text-green-700 font-medium">− {fmt(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm py-1 border-t border-gray-200 mt-1 pt-2">
              <span className="font-semibold text-gray-900">Total dû</span>
              <span className="font-bold text-gray-900">{fmt(invoice.amount_due)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Déjà réglé</span>
                <span className="text-green-700 font-medium">{fmt(invoice.amount_paid)}</span>
              </div>
            )}
            <div className={`flex justify-between text-sm py-2 mt-1 rounded-lg px-3 ${
              balance <= 0 ? 'bg-green-50' : 'bg-indigo-50'
            }`}>
              <span className="font-bold text-gray-900">Reste à payer</span>
              <span className={`font-bold text-lg ${balance <= 0 ? 'text-green-700' : 'text-indigo-700'}`}>
                {balance <= 0 ? '0,00 €' : fmt(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* ── HISTORIQUE PAIEMENTS ── */}
        {payments.length > 0 && (
          <div className="mb-8">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Historique des paiements
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 text-xs text-gray-500">Date</th>
                  <th className="text-left py-1.5 text-xs text-gray-500">Moyen</th>
                  <th className="text-left py-1.5 text-xs text-gray-500">Référence</th>
                  <th className="text-right py-1.5 text-xs text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">
                      {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-1.5 text-gray-700">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="py-1.5 text-gray-500">{p.reference ?? '—'}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── NOTES ── */}
        {invoice.notes && (
          <div className="border border-gray-200 rounded-lg p-4 mb-8">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* ── PIED DE PAGE ── */}
        <div className="border-t border-gray-200 pt-4 mt-auto">
          <p className="text-xs text-center text-gray-400">
            Teacher Khati · Cours d'anglais pour enfants · Maison-Alfort &amp; Champigny-sur-Marne
          </p>
        </div>
      </div>
    </>
  )
}
