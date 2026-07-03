'use client'

import type { AttendanceReport } from '@/lib/attendance-report'

interface Props {
  report: AttendanceReport
  siteName: string | null
  groupName: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function PrintAttendanceClient({ report, siteName, groupName }: Props) {
  const globalRate = report.totals.total > 0
    ? Math.round(((report.totals.present + report.totals.late) / report.totals.total) * 100)
    : 0
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const scopeLine = [
    siteName ? `Site : ${siteName}` : 'Tous les sites',
    groupName ? `Groupe : ${groupName}` : 'Tous les groupes',
  ].join(' · ')

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { box-shadow: none !important; margin: 0 !important; width: 210mm; min-height: 297mm; }
          tr { break-inside: avoid; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      {/* Toolbar — masqué à l'impression */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ✕ Fermer l&apos;onglet
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">
            Fiche de présence · {fmtDate(report.from)} → {fmtDate(report.to)}
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
      <div className="page mx-auto bg-white shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '18mm 16mm' }}>

        {/* ── EN-TÊTE ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-base">K</span>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 leading-tight">Teacher Khati</div>
                <div className="text-xs text-gray-500">Cours d&apos;anglais pour enfants</div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">{scopeLine}</div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-700 mb-1">FICHE DE PRÉSENCE</div>
            <div className="text-sm font-semibold text-gray-700">
              Du {fmtDate(report.from)} au {fmtDate(report.to)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Éditée le {generatedAt}</div>
          </div>
        </div>

        {/* ── SYNTHÈSE ── */}
        <div className="grid grid-cols-6 gap-2 mb-8">
          <SummaryBox label="Élèves" value={report.students} accent="text-gray-900" />
          <SummaryBox label="Appels" value={report.totals.total} accent="text-gray-900" />
          <SummaryBox label="Présents" value={report.totals.present} accent="text-green-700" />
          <SummaryBox label="Retards" value={report.totals.late} accent="text-amber-700" />
          <SummaryBox label="Excusés" value={report.totals.excused} accent="text-blue-700" />
          <SummaryBox label="Absents" value={report.totals.absent} accent="text-red-700" />
        </div>

        {/* ── TABLEAU ── */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wide text-gray-700">Élève</th>
              <th className="py-2 pr-2 text-left text-xs font-bold uppercase tracking-wide text-gray-700">Groupe · Site</th>
              <th className="py-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-green-800">Prés.</th>
              <th className="py-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-amber-800">Ret.</th>
              <th className="py-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-blue-800">Exc.</th>
              <th className="py-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-red-800">Abs.</th>
              <th className="py-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-gray-700">Total</th>
              <th className="py-2 pl-1 text-right text-xs font-bold uppercase tracking-wide text-gray-700">Assiduité</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={row.student.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="py-1.5 pr-2 font-medium text-gray-900">
                  {row.student.last_name} {row.student.first_name}
                </td>
                <td className="py-1.5 pr-2 text-gray-600">
                  {row.group ? `${row.group.name} · ${row.group.site}` : '—'}
                </td>
                <td className="py-1.5 px-1 text-center tabular-nums text-green-700 font-semibold">{row.present}</td>
                <td className="py-1.5 px-1 text-center tabular-nums text-amber-700">{row.late || '·'}</td>
                <td className="py-1.5 px-1 text-center tabular-nums text-blue-700">{row.excused || '·'}</td>
                <td className="py-1.5 px-1 text-center tabular-nums text-red-700 font-semibold">{row.absent || '·'}</td>
                <td className="py-1.5 px-1 text-center tabular-nums text-gray-700">{row.total}</td>
                <td className="py-1.5 pl-1 text-right tabular-nums font-bold text-gray-900">{row.rate}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800 font-bold">
              <td className="py-2 pr-2 text-gray-900" colSpan={2}>Total ({report.students} élève{report.students > 1 ? 's' : ''})</td>
              <td className="py-2 px-1 text-center tabular-nums text-green-700">{report.totals.present}</td>
              <td className="py-2 px-1 text-center tabular-nums text-amber-700">{report.totals.late}</td>
              <td className="py-2 px-1 text-center tabular-nums text-blue-700">{report.totals.excused}</td>
              <td className="py-2 px-1 text-center tabular-nums text-red-700">{report.totals.absent}</td>
              <td className="py-2 px-1 text-center tabular-nums text-gray-900">{report.totals.total}</td>
              <td className="py-2 pl-1 text-right tabular-nums text-gray-900">{globalRate}%</td>
            </tr>
          </tfoot>
        </table>

        {report.rows.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-500">Aucun appel enregistré sur cette période.</p>
        )}

        {/* ── PIED ── */}
        <div className="mt-12 flex items-end justify-between">
          <div className="text-xs text-gray-400">
            Présent + retard comptés dans l&apos;assiduité · Document généré par Résumé Teacher Khati
          </div>
          <div className="text-center">
            <div className="mb-10 text-xs font-medium text-gray-600">Signature</div>
            <div className="w-44 border-t border-gray-400" />
            <div className="mt-1 text-xs text-gray-500">Teacher Khati</div>
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-center">
      <div className={`text-xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}
