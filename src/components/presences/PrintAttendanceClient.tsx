'use client'

import { useMemo } from 'react'
import type { AttendanceReport, AttendanceReportRow } from '@/lib/attendance-report'
import type { Signatory } from '@/lib/branding'

interface Props {
  report: AttendanceReport
  siteName: string | null
  groupName: string | null
  logoUrl?: string | null
  signatories?: Signatory[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function rateTone(rate: number) {
  if (rate >= 90) return { text: '#047857', bg: '#ecfdf5', bar: '#10b981' }   // emerald
  if (rate >= 75) return { text: '#b45309', bg: '#fffbeb', bar: '#f59e0b' }   // amber
  return { text: '#b91c1c', bg: '#fef2f2', bar: '#ef4444' }                   // red
}

// Référence de document lisible, dérivée de la période — pas un ID aléatoire,
// pour rester stable si le même rapport est réimprimé.
function docReference(from: string, to: string) {
  return `RP-${from.replace(/-/g, '')}-${to.replace(/-/g, '')}`
}

export function PrintAttendanceClient({ report, siteName, groupName, logoUrl, signatories = [] }: Props) {
  const teacherSignatory = signatories[0]
  const directionSignatory = signatories[1]
  const globalRate = report.totals.total > 0
    ? Math.round(((report.totals.present + report.totals.late) / report.totals.total) * 100)
    : 0
  const generatedAt = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const generatedTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // ─── Regroupement site → groupe, chaque groupe = un tableau avec son propre
  // <thead> (répété nativement par le navigateur à chaque saut de page). ───
  const sections = useMemo(() => {
    const bySite = new Map<string, Map<string, { group: AttendanceReportRow['group']; rows: AttendanceReportRow[] }>>()
    for (const row of report.rows) {
      const siteKey = row.group?.site ?? 'Sans site'
      const groupKey = row.group?.id ?? 'sans-groupe'
      if (!bySite.has(siteKey)) bySite.set(siteKey, new Map())
      const groups = bySite.get(siteKey)!
      if (!groups.has(groupKey)) groups.set(groupKey, { group: row.group, rows: [] })
      groups.get(groupKey)!.rows.push(row)
    }
    return [...bySite.entries()]
      .map(([site, groupMap]) => ({
        site,
        groups: [...groupMap.values()]
          .map(({ group, rows }) => {
            const sorted = [...rows].sort((a, b) =>
              `${a.student.last_name} ${a.student.first_name}`.localeCompare(`${b.student.last_name} ${b.student.first_name}`, 'fr')
            )
            const totals = rows.reduce((acc, r) => ({
              present: acc.present + r.present, late: acc.late + r.late,
              excused: acc.excused + r.excused, absent: acc.absent + r.absent, total: acc.total + r.total,
            }), { present: 0, late: 0, excused: 0, absent: 0, total: 0 })
            const rate = totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0
            return { group, rows: sorted, totals, rate }
          })
          .sort((a, b) => (a.group?.name ?? '').localeCompare(b.group?.name ?? '', 'fr')),
      }))
      .sort((a, b) => a.site.localeCompare(b.site, 'fr'))
  }, [report.rows])

  const scopeLabel = [
    siteName ? `Site : ${siteName}` : 'Tous les sites',
    groupName ? `Groupe : ${groupName}` : 'Tous les groupes',
  ].join('  ·  ')

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 12mm 14mm 18mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
          .doc { box-shadow: none !important; margin: 0 !important; width: auto; min-height: 0; padding: 0 !important; }
          .group-break { break-before: page; }
          .group-block { break-inside: avoid; }
          .print-footer { position: fixed; bottom: 0; left: 0; right: 0; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        @media screen {
          body { background: #e2e2e7; }
        }
      `}</style>

      {/* Toolbar — masquée à l'impression */}
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
            Registre de présence · {fmtDate(report.from)} → {fmtDate(report.to)}
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

      <div className="no-print mt-14" />

      {/* ── Document (A4 Paysage) ── */}
      <div className="doc mx-auto bg-white shadow-lg" style={{ width: '297mm', minHeight: '210mm', padding: '0' }}>

        {/* ── MASTHEAD ── */}
        <header className="pb-4" style={{ borderBottom: '3px solid #4338ca' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-xl font-bold text-white">K</span>
                )}
              </div>
              <div>
                <div className="text-2xl leading-none text-indigo-700" style={{ fontFamily: 'var(--font-handwriting, cursive)' }}>
                  Teacher Khati
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">Cours d&apos;anglais pour enfants</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold uppercase tracking-wide text-indigo-700">Registre de présence</div>
              <div className="mt-0.5 text-xs text-gray-500">Réf. {docReference(report.from, report.to)}</div>
              <div className="text-xs text-gray-500">Édité le {generatedAt} à {generatedTime}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
            <div className="text-sm font-semibold text-gray-800">
              Période du {fmtDate(report.from)} au {fmtDate(report.to)}
            </div>
            <div className="text-xs text-gray-500">{scopeLabel}</div>
          </div>
        </header>

        {/* ── SYNTHÈSE ── */}
        <section className="my-5 flex items-stretch gap-2">
          <StatCell label="Élèves" value={report.students} color="#111827" />
          <StatCell label="Présents" value={report.totals.present} color="#047857" />
          <StatCell label="Retards" value={report.totals.late} color="#b45309" />
          <StatCell label="Excusés" value={report.totals.excused} color="#1d4ed8" />
          <StatCell label="Absents" value={report.totals.absent} color="#b91c1c" />
          <div className="flex flex-1 flex-col justify-center rounded-xl px-4 py-2" style={{ background: rateTone(globalRate).bg }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: rateTone(globalRate).text }}>Assiduité globale</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold tabular-nums" style={{ color: rateTone(globalRate).text }}>{globalRate}%</div>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full" style={{ width: `${Math.max(globalRate, 3)}%`, background: rateTone(globalRate).bar }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── LÉGENDE ── */}
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 px-3 py-2 text-[11px] text-gray-600">
          <span className="font-semibold uppercase tracking-wide text-gray-500">Légende</span>
          <LegendDot color="#10b981" label="P — Présent" />
          <LegendDot color="#f59e0b" label="R — Retard" />
          <LegendDot color="#3b82f6" label="E — Excusé" />
          <LegendDot color="#ef4444" label="A — Absent" />
          <span className="ml-auto italic text-gray-400">Assiduité = (présent + retard) / total des appels</span>
        </div>

        {/* ── SECTIONS SITE → GROUPE ── */}
        {sections.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-500">Aucun appel enregistré sur cette période.</p>
        )}

        {(() => {
          // Une page par groupe (répartition demandée) : compteur global à
          // travers les sites, pour ne sauter de page qu'entre deux groupes
          // — jamais avant le tout premier groupe du document.
          let globalGroupIndex = -1
          return sections.map((siteSection) => (
            <div key={siteSection.site}>
              {sections.length > 1 && (
                <div className="mb-2 mt-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                  {siteSection.site}
                </div>
              )}

              {siteSection.groups.map(({ group, rows, totals, rate }) => {
                globalGroupIndex += 1
                const pageBreakClass = globalGroupIndex > 0 ? 'group-break' : undefined
                return (
              <div key={group?.id ?? 'sans-groupe'} className={`group-block mb-5 ${pageBreakClass ?? ''}`}>
                {/* Bandeau de groupe */}
                <div
                  className="flex items-center justify-between rounded-t-lg px-3 py-1.5"
                  style={{ background: `${group?.color ?? '#8b5cf6'}14`, borderLeft: `4px solid ${group?.color ?? '#8b5cf6'}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{group?.emoji ?? '📋'}</span>
                    <span className="text-sm font-bold text-gray-800">{group?.name ?? 'Sans groupe'}</span>
                    <span className="text-xs text-gray-500">
                      {sections.length <= 1 ? `· ${group?.site ?? ''}` : ''} · {rows.length} élève{rows.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: rateTone(rate).text }}>{rate}% d&apos;assiduité</span>
                </div>

                <table className="w-full border-collapse text-[12.5px]" style={{ borderBottom: '2px solid #1f2937' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #d1d5db' }}>
                      <th className="py-1.5 pl-2 pr-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500">Élève</th>
                      <th className="w-10 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: '#047857' }}>P</th>
                      <th className="w-10 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b45309' }}>R</th>
                      <th className="w-10 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1d4ed8' }}>E</th>
                      <th className="w-10 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b91c1c' }}>A</th>
                      <th className="w-12 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-gray-500">Total</th>
                      <th className="w-28 py-1.5 pr-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500">Assiduité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const tone = rateTone(row.rate)
                      return (
                        <tr key={row.student.id} style={{ background: i % 2 === 1 ? '#fafafa' : 'transparent', borderBottom: '1px solid #f0f0f0' }}>
                          <td className="py-1 pl-2 pr-2 font-medium text-gray-900">{row.student.last_name} {row.student.first_name}</td>
                          <td className="py-1 text-center tabular-nums font-semibold" style={{ color: '#047857' }}>{row.present || '·'}</td>
                          <td className="py-1 text-center tabular-nums" style={{ color: '#b45309' }}>{row.late || '·'}</td>
                          <td className="py-1 text-center tabular-nums" style={{ color: '#1d4ed8' }}>{row.excused || '·'}</td>
                          <td className="py-1 text-center tabular-nums font-semibold" style={{ color: '#b91c1c' }}>{row.absent || '·'}</td>
                          <td className="py-1 text-center tabular-nums text-gray-600">{row.total}</td>
                          <td className="py-1 pr-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="h-1 w-10 overflow-hidden rounded-full bg-gray-200">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(row.rate, 4)}%`, background: tone.bar }} />
                              </div>
                              <span className="w-8 text-right font-bold tabular-nums" style={{ color: tone.text }}>{row.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1.5px solid #9ca3af', background: '#f9fafb' }}>
                      <td className="py-1.5 pl-2 pr-2 text-xs font-bold text-gray-700">Sous-total ({rows.length})</td>
                      <td className="py-1.5 text-center tabular-nums text-xs font-bold" style={{ color: '#047857' }}>{totals.present}</td>
                      <td className="py-1.5 text-center tabular-nums text-xs font-bold" style={{ color: '#b45309' }}>{totals.late}</td>
                      <td className="py-1.5 text-center tabular-nums text-xs font-bold" style={{ color: '#1d4ed8' }}>{totals.excused}</td>
                      <td className="py-1.5 text-center tabular-nums text-xs font-bold" style={{ color: '#b91c1c' }}>{totals.absent}</td>
                      <td className="py-1.5 text-center tabular-nums text-xs font-bold text-gray-700">{totals.total}</td>
                      <td className="py-1.5 pr-2 text-right text-xs font-bold" style={{ color: rateTone(rate).text }}>{rate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
                )
              })}
            </div>
          ))
        })()}

        {/* ── TOTAL GÉNÉRAL (si plusieurs sections) ── */}
        {sections.length > 1 && (
          <div className="group-block mt-2 flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <span className="text-sm font-bold text-indigo-900">Total général · {report.students} élève{report.students > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span style={{ color: '#047857' }}>{report.totals.present} P</span>
              <span style={{ color: '#b45309' }}>{report.totals.late} R</span>
              <span style={{ color: '#1d4ed8' }}>{report.totals.excused} E</span>
              <span style={{ color: '#b91c1c' }}>{report.totals.absent} A</span>
              <span className="text-indigo-900">{globalRate}% d&apos;assiduité</span>
            </div>
          </div>
        )}

        {/* ── SIGNATURES ── */}
        <div className="group-block mt-10 grid grid-cols-2 gap-10">
          <SignatureBlock label={teacherSignatory?.label ?? "L'enseignant(e)"} signatureUrl={teacherSignatory?.signatureUrl} />
          <SignatureBlock label={directionSignatory?.label ?? 'Direction'} signatureUrl={directionSignatory?.signatureUrl} stamp />
        </div>

        {/* ── PIED DE PAGE (répété sur chaque page imprimée) ── */}
        <div className="print-footer flex items-center justify-between border-t border-gray-200 bg-white px-1 pt-1.5 text-[9px] text-gray-400">
          <span>Résumé Teacher Khati · Registre de présence officiel</span>
          <span>Réf. {docReference(report.from, report.to)} · Généré le {generatedAt}</span>
        </div>
      </div>
    </>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center rounded-xl bg-gray-50 px-3 py-2 text-center">
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function SignatureBlock({ label, signatureUrl, stamp = false }: { label: string; signatureUrl?: string | null; stamp?: boolean }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mb-1 flex h-14 items-end justify-center">
        {signatureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureUrl} alt={`Signature — ${label}`} className="max-h-14 max-w-[170px] object-contain" />
        )}
      </div>
      <div className="flex items-end justify-between">
        <div className="w-40 border-t border-gray-400 pt-1 text-[10px] text-gray-400">Signature</div>
        {stamp && (
          <div className="flex h-16 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[9px] italic text-gray-400">
            Cachet
          </div>
        )}
      </div>
    </div>
  )
}
