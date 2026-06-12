'use client'

import { useState } from 'react'
import {
  FileText, BookOpen, ExternalLink, Download, Printer,
  RotateCcw, Star, Volume2, Pen, BookMarked, MessageSquare,
  Lightbulb, Trophy, Globe, ArrowRight, Save, Clock, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FicheSeanceForm } from './FicheSeanceForm'
import { BilanAnnuelForm } from './BilanAnnuelForm'
import { TabHistory } from './TabHistory'
import type { FicheResult } from './FicheSeanceForm'
import type { BilanResult } from './BilanAnnuelForm'
import type { Level } from '@/types'
import { generateFicheHtml } from './fiche-html'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TabFichesProps { levels: Level[] }

// ─── Helpers UI ──────────────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('h-3.5 w-3.5', i < n ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')} />
      ))}
    </div>
  )
}

function MasteryBadge({ m }: { m?: string }) {
  if (m === 'mastered')  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Maitrise</span>
  if (m === 'practiced') return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">En cours</span>
  return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Introduit</span>
}

function SectionCard({ icon, title, className, children }: {
  icon: React.ReactNode; title: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-2xl border bg-background/60 backdrop-blur-sm', className)}>
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── SaveButton ───────────────────────────────────────────────────────────────

function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleSave() {
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('idle')
    }
  }

  return (
    <Button
      variant="outline" size="sm"
      onClick={() => void handleSave()}
      disabled={state === 'saving'}
      className={cn('gap-1.5', state === 'saved' && 'border-emerald-400 text-emerald-600')}>
      {state === 'saved'
        ? <><Check className="h-3.5 w-3.5" /> Sauvegarde</>
        : state === 'saving'
        ? <><Save className="h-3.5 w-3.5 animate-pulse" /> Sauvegarde...</>
        : <><Save className="h-3.5 w-3.5" /> Sauvegarder</>
      }
    </Button>
  )
}

// ─── FicheResultView ─────────────────────────────────────────────────────────

function FicheResultView({ fiche, onReset }: { fiche: FicheResult; onReset: () => void }) {
  const [printing, setPrinting] = useState(false)

  function openPrint() {
    setPrinting(true)
    const html = generateFicheHtml(fiche)
    const win = window.open('', '_blank')
    if (win) {
      win.document.open()
      win.document.write(html)
      win.document.close()
    }
    setPrinting(false)
  }

  function verbDisplay(inf: string): string {
    return inf.startsWith('to ') ? inf : 'to ' + inf
  }

  async function saveFiche() {
    const res = await fetch('/api/fiches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'seance',
        data: fiche,
        level: fiche.level,
        theme: fiche.theme,
        session_date: fiche.date,
      }),
    })
    if (!res.ok) throw new Error('save failed')
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between rounded-2xl border bg-gradient-to-br from-primary/5 to-violet-50 p-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-4xl">{fiche.emoji}</span>
            <div>
              <h2 className="text-xl font-extrabold">{fiche.theme}</h2>
              <p className="text-sm text-muted-foreground">{fiche.level} &middot; {fiche.date}</p>
            </div>
          </div>
          {fiche.whatWeDidToday && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">{fiche.whatWeDidToday}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <SaveButton onSave={saveFiche} />
          <Button onClick={openPrint} disabled={printing} size="sm" className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            {printing ? 'Ouverture...' : 'PDF / Imprimer'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Nouvelle fiche
          </Button>
        </div>
      </div>

      {/* Vocabulaire */}
      {fiche.vocabulary.length > 0 && (
        <SectionCard icon={<BookOpen className="h-4 w-4" />} title="Vocabulaire">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left text-sm font-semibold text-muted-foreground">Anglais</th>
                  <th className="pb-2 text-left text-sm font-semibold text-muted-foreground">Phonetique</th>
                  <th className="pb-2 text-left text-sm font-semibold text-muted-foreground">Francais</th>
                  <th className="pb-2 text-left text-sm font-semibold text-muted-foreground">Exemple</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {fiche.vocabulary.map((w, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-bold text-primary">{w.emoji} {w.en}</td>
                    <td className="py-2 pr-3 font-mono text-sm text-violet-600">/{w.phonetic}/</td>
                    <td className="py-2 pr-3 text-muted-foreground">{w.fr}</td>
                    <td className="py-2 text-sm italic text-muted-foreground">{w.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Grammaire + Verbes */}
      <div className="grid md:grid-cols-2 gap-4">
        {fiche.grammar.length > 0 && (
          <SectionCard icon={<Pen className="h-4 w-4" />} title="Grammaire">
            <div className="space-y-3">
              {fiche.grammar.map((g, i) => (
                <div key={i} className="rounded-xl border bg-muted/20 p-3.5">
                  <p className="text-sm font-bold text-primary mb-1">{g.rule}</p>
                  {g.formula && (
                    <code className="block rounded-lg bg-primary/5 px-3 py-1.5 text-sm text-primary font-mono mb-1.5">{g.formula}</code>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {g.examples.map((ex, j) => (
                      <span key={j} className="rounded-lg bg-background px-2.5 py-1 text-sm italic border">{ex}</span>
                    ))}
                  </div>
                  {g.tip && <p className="mt-1.5 text-sm text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">{g.tip}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {fiche.verbs.length > 0 && (
          <SectionCard icon={<Volume2 className="h-4 w-4" />} title="Verbes">
            <div className="space-y-2">
              {fiche.verbs.map((v, i) => (
                <div key={i} className="flex flex-col gap-0.5 rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">{verbDisplay(v.infinitive)}</span>
                    <span className="text-muted-foreground text-sm">= {v.french}</span>
                  </div>
                  {(v.presentSimple || v.pastSimple) && (
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      {v.presentSimple && <span>Present : <em>{v.presentSimple}</em></span>}
                      {v.pastSimple && <span>Passe : <em>{v.pastSimple}</em></span>}
                    </div>
                  )}
                  {v.tip && <p className="text-xs text-violet-700">{v.tip}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Expressions + Spelling */}
      <div className="grid md:grid-cols-2 gap-4">
        {fiche.expressions.length > 0 && (
          <SectionCard icon={<MessageSquare className="h-4 w-4" />} title="Expressions cles">
            <div className="space-y-2">
              {fiche.expressions.map((e, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
                  <span className="text-sm font-semibold text-primary flex-1">{e.en}</span>
                  <span className="text-xs text-muted-foreground">{e.fr}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {fiche.spelling.length > 0 && (
          <SectionCard icon={<BookMarked className="h-4 w-4" />} title="Orthographe et astuces">
            <div className="space-y-2">
              {fiche.spelling.map((s, i) => (
                <div key={i} className="flex gap-2 rounded-xl border bg-amber-50/50 p-3">
                  <code className="font-mono font-bold text-sm text-amber-800 shrink-0">{s.word}</code>
                  <span className="text-xs text-amber-700">{s.trick}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Phonics */}
      {fiche.phonics && fiche.phonics.length > 0 && (
        <SectionCard icon={<Volume2 className="h-4 w-4" />} title="Phonetique (Phonics)">
          <div className="flex flex-wrap gap-3">
            {fiche.phonics.map((p, i) => (
              <div key={i} className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-3 text-center min-w-20">
                <p className="text-xl font-black text-violet-700">{p.sound}</p>
                {p.letter && <p className="text-xs text-violet-500 font-mono">{p.letter}</p>}
                <div className="mt-1 flex flex-wrap gap-1 justify-center">
                  {p.examples.map((ex, j) => (
                    <span key={j} className="text-xs rounded-lg bg-violet-100 px-1.5 py-0.5">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Fun Fact + Homework */}
      <div className="grid md:grid-cols-2 gap-4">
        {fiche.funFact && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <span className="text-2xl shrink-0">&#127757;</span>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">Le savais-tu ?</p>
              <p className="text-sm text-amber-900">{fiche.funFact}</p>
            </div>
          </div>
        )}
        {fiche.homeworkSuggestion && (
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="text-2xl shrink-0">&#128218;</span>
            <div>
              <p className="text-xs font-bold text-emerald-800 mb-1">Activite a la maison</p>
              <p className="text-sm text-emerald-900">{fiche.homeworkSuggestion}</p>
            </div>
          </div>
        )}
      </div>

      {/* Note WhatsApp parent */}
      {fiche.parentNote && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">&#128172;</span>
            <p className="text-xs font-bold text-green-800">Note WhatsApp pour les parents</p>
          </div>
          <p className="text-sm text-green-900 whitespace-pre-line leading-relaxed">{fiche.parentNote}</p>
        </div>
      )}

      {/* Export bas de page */}
      <div className="flex justify-center gap-3 pt-2">
        <SaveButton onSave={saveFiche} />
        <Button onClick={openPrint} disabled={printing} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" /> Imprimer / Telecharger PDF
        </Button>
      </div>

    </div>
  )
}

// ─── BilanStats ──────────────────────────────────────────────────────────────

function BilanStats({ stats }: { stats: BilanResult['stats'] }) {
  if (!stats) return null
  const items: Array<{ label: string; value: number }> = [
    { label: 'Mots',        value: stats.totalWords        },
    { label: 'Themes',      value: stats.totalThemes       },
    { label: 'Regles',      value: stats.totalGrammarRules },
    { label: 'Expressions', value: stats.totalExpressions  },
  ]
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border bg-muted/20 p-3 text-center">
          <p className="text-xl font-black text-primary">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── BilanResultView ─────────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  speaking:   'Speaking',
  listening:  'Listening',
  reading:    'Reading',
  writing:    'Writing',
  vocabulary: 'Vocabulary',
  phonics:    'Phonics',
}

function BilanResultView({ bilan, onReset }: { bilan: BilanResult; onReset: () => void }) {
  const [exporting, setExporting] = useState(false)

  async function doExport(format: 'word' | 'pdf') {
    setExporting(true)
    try {
      const res = await fetch('/api/fiches/export-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bilan, format }),
      })
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.open()
        win.document.write(html)
        win.document.close()
        if (format === 'pdf') { setTimeout(() => { win.print() }, 800) }
      }
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }

  async function saveBilan() {
    const res = await fetch('/api/fiches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bilan',
        data: bilan,
        level: bilan.level,
        academic_year: bilan.academicYear,
      }),
    })
    if (!res.ok) throw new Error('save failed')
  }

  return (
    <div className="space-y-4">

      {/* Header gradient */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Bilan Annuel</p>
            <h2 className="text-2xl font-extrabold">{bilan.level}</h2>
            <p className="text-white/80">{bilan.academicYear}</p>
            {bilan.sessionCount > 0 && (
              <p className="text-white/60 text-sm mt-1">{bilan.sessionCount} seances analysees</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}
            className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Nouveau bilan
          </Button>
        </div>
        {bilan.headline && (
          <p className="mt-3 text-lg font-light text-white/90 italic">{bilan.headline}</p>
        )}
        {bilan.yearSummary && (
          <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-2xl">{bilan.yearSummary}</p>
        )}
      </div>

      {/* Boutons export + sauvegarder */}
      <div className="flex gap-3 flex-wrap">
        <SaveButton onSave={saveBilan} />
        <Button onClick={() => void doExport('word')} disabled={exporting} className="gap-2 flex-1">
          <Download className="h-4 w-4" />
          {exporting ? 'Generation...' : 'Telecharger Word'}
        </Button>
        <Button onClick={() => void doExport('pdf')} disabled={exporting} variant="outline" className="gap-2 flex-1">
          <ExternalLink className="h-4 w-4" />
          {exporting ? 'Generation...' : 'Ouvrir PDF'}
        </Button>
      </div>

      {bilan.stats && <BilanStats stats={bilan.stats} />}

      {bilan.progressionBySkill && Object.keys(bilan.progressionBySkill).length > 0 && (
        <SectionCard icon={<Lightbulb className="h-4 w-4" />} title="Progression par competence">
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(bilan.progressionBySkill).map(([skill, data]) => (
              <div key={skill} className="rounded-xl border bg-muted/20 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold">{SKILL_LABELS[skill] ?? skill}</span>
                  <Stars n={data.level} />
                </div>
                <p className="text-xs text-muted-foreground italic mb-1.5">{data.improvement}</p>
                <div className="flex flex-wrap gap-1">
                  {data.highlights?.slice(0, 2).map((h, i) => (
                    <span key={i} className="text-xs bg-background rounded-lg border px-2 py-0.5">{h}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {bilan.themes.length > 0 && (
        <SectionCard icon={<Globe className="h-4 w-4" />} title={bilan.themes.length + ' Themes de l annee'}>
          <div className="grid sm:grid-cols-2 gap-3">
            {bilan.themes.map((t, i) => (
              <div key={i} className="rounded-xl border bg-muted/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    {t.sessionsCount && <p className="text-sm text-muted-foreground">{t.sessionsCount} seances</p>}
                  </div>
                </div>
                {t.keyLearnings?.slice(0, 3).map((kl, j) => (
                  <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    {kl}
                  </div>
                ))}
                {t.vocabulary && t.vocabulary.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.vocabulary.slice(0, 5).map((w, j) => (
                      <span key={j} className="rounded-lg bg-primary/5 border border-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {w.emoji ?? ''} {w.en}
                      </span>
                    ))}
                    {t.vocabulary.length > 5 && (
                      <span className="text-xs text-muted-foreground self-center">+{t.vocabulary.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {bilan.grammarAcquired.length > 0 && (
        <SectionCard icon={<Pen className="h-4 w-4" />} title="Grammaire de l annee">
          <div className="grid sm:grid-cols-2 gap-2">
            {bilan.grammarAcquired.map((g, i) => (
              <div key={i} className="rounded-xl border bg-muted/10 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-primary">{g.rule}</p>
                  <MasteryBadge m={g.mastery} />
                </div>
                {g.formula && (
                  <code className="block text-xs bg-primary/5 rounded px-2 py-0.5 font-mono text-primary mb-1.5">{g.formula}</code>
                )}
                <div className="flex flex-wrap gap-1">
                  {g.examples.slice(0, 2).map((ex, j) => (
                    <span key={j} className="text-xs italic text-muted-foreground">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {bilan.masterVocabulary.length > 0 && (
        <SectionCard icon={<BookOpen className="h-4 w-4" />} title="Vocabulaire de l annee">
          <div className="space-y-4">
            {bilan.masterVocabulary.map((cat, i) => (
              <div key={i}>
                <p className="text-xs font-extrabold text-violet-700 uppercase tracking-wider mb-2">{cat.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.words.map((w, j) => (
                    <span key={j} className="rounded-lg border bg-background px-2.5 py-1 text-xs">
                      {w.emoji ?? ''} <strong className="text-primary">{w.en}</strong> = {w.fr}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {bilan.achievements.length > 0 && (
        <SectionCard icon={<Trophy className="h-4 w-4" />} title="Realisations de l annee">
          <div className="grid sm:grid-cols-2 gap-3">
            {bilan.achievements.map((a, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <span className="text-2xl shrink-0">{a.icon}</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">{a.title}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {bilan.culturalDiscoveries.length > 0 && (
        <div className="rounded-2xl border p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Decouvertes culturelles</p>
          <div className="flex flex-wrap gap-2">
            {bilan.culturalDiscoveries.map((d, i) => (
              <span key={i} className="rounded-xl border bg-emerald-50 border-emerald-200 px-3 py-1.5 text-xs text-emerald-800">{d}</span>
            ))}
          </div>
        </div>
      )}

      {bilan.nextYearPreview && (
        <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <span className="text-2xl shrink-0">&#128640;</span>
          <div>
            <p className="text-xs font-bold text-blue-800 mb-1">L an prochain...</p>
            <p className="text-sm text-blue-900">{bilan.nextYearPreview}</p>
          </div>
        </div>
      )}

      {bilan.teacherNote && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-bold text-emerald-800 mb-2">Message de Teacher Khati</p>
          <p className="text-sm italic text-emerald-900 leading-relaxed">{bilan.teacherNote}</p>
        </div>
      )}

      {bilan.parentCertificate && (
        <div className="rounded-2xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 text-center">
          <p className="text-4xl mb-3">&#127942;</p>
          <h3 className="text-lg font-extrabold text-amber-800 mb-2">{bilan.parentCertificate.title}</h3>
          <p className="text-sm text-amber-900 max-w-md mx-auto leading-relaxed mb-3">{bilan.parentCertificate.body}</p>
          <p className="text-sm font-bold text-amber-800 border-t border-amber-300 pt-3 inline-block">
            {bilan.parentCertificate.signature}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2 flex-wrap">
        <SaveButton onSave={saveBilan} />
        <Button onClick={() => void doExport('word')} disabled={exporting} className="gap-2 flex-1">
          <Download className="h-4 w-4" />
          {exporting ? 'Generation...' : 'Exporter en Word'}
        </Button>
        <Button onClick={() => void doExport('pdf')} disabled={exporting} variant="outline" className="gap-2 flex-1">
          <Printer className="h-4 w-4" />
          {exporting ? 'Generation...' : 'Exporter en PDF'}
        </Button>
      </div>

    </div>
  )
}

// ─── TabFiches — orchestrateur ────────────────────────────────────────────────

type SubTab = 'seance' | 'bilan' | 'history'

export function TabFiches({ levels }: TabFichesProps) {
  const [subTab,      setSubTab]      = useState<SubTab>('seance')
  const [ficheResult, setFicheResult] = useState<FicheResult | null>(null)
  const [bilanResult, setBilanResult] = useState<BilanResult | null>(null)

  const tabs: Array<{ id: SubTab; label: string; icon: React.ReactNode; description: string; badge?: string }> = [
    {
      id: 'seance',
      label: 'Fiche de seance',
      icon: <FileText className="h-4 w-4" />,
      description: 'Genere une fiche de revision complete apres chaque cours',
      badge: 'IA',
    },
    {
      id: 'bilan',
      label: 'Bilan annuel',
      icon: <BookOpen className="h-4 w-4" />,
      description: "Cree un bilan ultra-premium de toute l annee scolaire",
      badge: 'Premium',
    },
    {
      id: 'history',
      label: 'Historique',
      icon: <Clock className="h-4 w-4" />,
      description: 'Retrouvez, re-exportez ou envoyez vos fiches sauvegardees',
    },
  ]

  return (
    <div className="space-y-5">

      {/* Sous-onglets */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map((t) => (
          <button key={t.id} type="button"
            onClick={() => { setSubTab(t.id); setFicheResult(null); setBilanResult(null) }}
            className={cn(
              'flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all',
              subTab === t.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20'
            )}>
            <div className={cn('mt-0.5 rounded-xl p-2 shrink-0', subTab === t.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold">{t.label}</p>
                {t.badge && (
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    t.badge === 'Premium'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                      : 'bg-primary/10 text-primary'
                  )}>{t.badge}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug hidden sm:block">{t.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Contenu */}
      {subTab === 'seance' && (
        ficheResult
          ? <FicheResultView fiche={ficheResult} onReset={() => setFicheResult(null)} />
          : <FicheSeanceForm levels={levels} onResult={(r) => setFicheResult(r)} />
      )}

      {subTab === 'bilan' && (
        bilanResult
          ? <BilanResultView bilan={bilanResult} onReset={() => setBilanResult(null)} />
          : <BilanAnnuelForm levels={levels} onResult={(r) => setBilanResult(r)} />
      )}

      {subTab === 'history' && (
        <TabHistory
          onRestoreFiche={(fiche) => { setFicheResult(fiche); setSubTab('seance') }}
          onRestoreBilan={(bilan) => { setBilanResult(bilan); setSubTab('bilan') }}
        />
      )}

    </div>
  )
}
