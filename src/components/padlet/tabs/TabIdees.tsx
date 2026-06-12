'use client'

import { useState } from 'react'
import {
  Sparkles, Loader2, Music, Gamepad2, Video, Users,
  Palette, Search, Clock, Target, Pin, ExternalLink,
  ChevronDown, ChevronUp, Shuffle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Level } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IdeaResult {
  theme: string; emoji: string; tagline: string
  objectives: string[]
  timeline: Array<{ minutes: number; phase: string; activity: string; tip: string }>
  songs: Array<{ title: string; artist: string; why: string; youtubeSearch: string; level: string }>
  games: Array<{ name: string; duration: string; description: string; materials: string; tip: string }>
  videos: Array<{ title: string; channel: string; youtubeSearch: string; duration: string; useCase: string }>
  roleplays: Array<{ scenario: string; context: string; keyPhrases: string[] }>
  crafts: Array<{ name: string; description: string; link: string }>
  pinterest: Array<{ query: string; description: string }>
  padletStructure: { title: string; sections: Array<{ name: string; emoji: string; content: string }> }
  vocabulary: string[]
  differentiation: { easier: string; harder: string }
  parentNote: string
}

interface TabIdeesProps { levels: Level[] }

// ─── Config niveaux ───────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { emoji: string; label: string; age: string; color: string }> = {
  preschoolers: { emoji: '🌟', label: 'Preschoolers', age: '3-5 ans',  color: 'from-yellow-400 to-orange-400'  },
  kids:         { emoji: '🚀', label: 'Kids',         age: '6-8 ans',  color: 'from-blue-400 to-cyan-400'      },
  juniors:      { emoji: '📖', label: 'Juniors',      age: '9-11 ans', color: 'from-green-400 to-emerald-400'  },
  tweens:       { emoji: '⚡', label: 'Tweens',       age: '12-14 ans',color: 'from-violet-400 to-purple-400'  },
  teenagers:    { emoji: '🎓', label: 'Teenagers',    age: '15-18 ans',color: 'from-rose-400 to-pink-400'      },
}

const SKILL_OPTIONS = [
  { value: 'all',      label: '🎯 Toutes',    desc: 'Équilibré'          },
  { value: 'speaking', label: '🗣️ Speaking',  desc: 'Expression orale'   },
  { value: 'listening',label: '👂 Listening', desc: 'Compréhension orale' },
  { value: 'reading',  label: '📚 Reading',   desc: 'Compréhension écrite'},
  { value: 'writing',  label: '✍️ Writing',   desc: 'Production écrite'   },
]

const THEME_SUGGESTIONS: Record<string, string[]> = {
  preschoolers: ['My Body', 'Farm Animals', 'Colors & Shapes', 'My Family', 'The Weather'],
  kids:         ['Space Adventure', 'Superheroes', 'Under the Sea', 'The Four Seasons', 'Food & Drinks'],
  juniors:      ['Traditional Tales', 'Sports & Hobbies', 'Around the World', 'The Environment', 'Technology'],
  tweens:       ['Social Media', 'Climate Change', 'Music & Culture', 'Jobs of the Future', 'Travelling'],
  teenagers:    ['Global Issues', 'Career Planning', 'Ethics & AI', 'British Culture', 'Literature'],
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function TabIdees({ levels }: TabIdeesProps) {
  const [levelSlug, setLevelSlug] = useState('kids')
  const [theme, setTheme]         = useState('')
  const [skill, setSkill]         = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult]       = useState<IdeaResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['timeline', 'songs', 'games']))

  // Niveaux depuis Supabase, avec fallback sur config statique
  const levelOrder = ['preschoolers', 'kids', 'juniors', 'tweens', 'teenagers']
  const levelList = levelOrder.map((slug) => {
    const cfg = LEVEL_CONFIG[slug]!
    const dbLevel = levels.find((l) => l.slug === slug)
    return { slug, ...cfg, id: dbLevel?.id ?? slug }
  })

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function randomTheme() {
    const pool = THEME_SUGGESTIONS[levelSlug] ?? []
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? ''
    setTheme(pick)
  }

  async function generate() {
    setIsLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/padlet/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelSlug, theme: theme || undefined, skill }),
      })
      const data = await res.json() as { ideas?: IdeaResult; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur lors de la génération.'); return }
      setResult(data.ideas ?? null)
      setOpenSections(new Set(['timeline', 'songs', 'games', 'videos', 'roleplays', 'padlet']))
    } catch { setError('Erreur réseau.') }
    finally  { setIsLoading(false) }
  }

  // ── Rendu section repliable ──────────────────────────────────────────────
  function Section({ id, icon: Icon, title, count, children }: {
    id: string; icon: React.ElementType; title: string; count?: number; children: React.ReactNode
  }) {
    const open = openSections.has(id)
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <button type="button" onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold flex-1">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {open && <div className="p-5">{children}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl shrink-0">
          💡
        </div>
        <div>
          <h2 className="text-base font-bold">Générateur d&apos;idées de cours</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choisissez un niveau, un thème (optionnel) et laissez l&apos;IA créer un plan de cours complet —
            activités, chansons, jeux, vidéos, structure Padlet et plus encore.
          </p>
        </div>
      </div>

      {/* ── Formulaire ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">

        {/* Niveau */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">1. Choisissez le niveau</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {levelList.map((lvl) => (
              <button key={lvl.slug} type="button" onClick={() => setLevelSlug(lvl.slug)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all',
                  levelSlug === lvl.slug
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}>
                <span className="text-2xl">{lvl.emoji}</span>
                <span className="text-xs font-semibold">{lvl.label}</span>
                <span className="text-xs text-muted-foreground">{lvl.age}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Thème */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">
            2. Thème du cours
            <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel — laissez vide pour une suggestion IA)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex : Space Adventure, Traditional Tales, My Body…"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button type="button" onClick={randomTheme}
              title="Suggestion aléatoire"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs
                text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
              <Shuffle className="h-3.5 w-3.5" />
              Surprends-moi
            </button>
          </div>
          {/* Suggestions rapides */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(THEME_SUGGESTIONS[levelSlug] ?? []).map((s) => (
              <button key={s} type="button" onClick={() => setTheme(s)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                  theme === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Compétence */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">3. Focus compétence</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setSkill(opt.value)}
                className={cn(
                  'rounded-xl border px-3.5 py-2 text-xs font-medium transition-all',
                  skill === opt.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}>
                {opt.label}
                <span className="block text-xs font-normal opacity-70 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bouton */}
        <Button onClick={() => void generate()} disabled={isLoading} size="lg" className="w-full gap-2 text-base">
          {isLoading
            ? <><Loader2 className="h-5 w-5 animate-spin" />Génération en cours…</>
            : <><Sparkles className="h-5 w-5" />Générer mon plan de cours</>}
        </Button>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Résultat ────────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4">

          {/* Hero résultat */}
          <div className={cn(
            'rounded-2xl bg-gradient-to-br p-6 text-white',
            LEVEL_CONFIG[levelSlug]?.color ?? 'from-blue-400 to-violet-500'
          )}>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{result.emoji}</span>
              <div>
                <h2 className="text-xl font-bold">{result.theme}</h2>
                <p className="text-white/80 text-sm mt-0.5">{result.tagline}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2.5 py-1">
                    <Clock className="h-3 w-3" />60 min
                  </span>
                  <span className="text-xs bg-white/20 rounded-full px-2.5 py-1">
                    {LEVEL_CONFIG[levelSlug]?.emoji} {LEVEL_CONFIG[levelSlug]?.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Objectifs */}
          {result.objectives?.length > 0 && (
            <div className="rounded-xl border border-border p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Objectifs du cours</span>
              </div>
              <ul className="space-y-1.5">
                {result.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          {result.timeline?.length > 0 && (
            <Section id="timeline" icon={Clock} title="Déroulé du cours (60 min)" count={result.timeline.length}>
              <div className="space-y-3">
                {result.timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {t.minutes}′
                      </div>
                      {i < result.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <p className="text-sm font-semibold">{t.phase}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.activity}</p>
                      {t.tip && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-1.5">
                          💡 {t.tip}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Chansons */}
          {result.songs?.length > 0 && (
            <Section id="songs" icon={Music} title="Chansons & Comptines" count={result.songs.length}>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.songs.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{s.title}</p>
                        {s.artist && <p className="text-sm text-muted-foreground">{s.artist}</p>}
                      </div>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.youtubeSearch)}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-lg bg-red-50 text-red-600 border border-red-200
                          px-2 py-1 text-xs font-medium hover:bg-red-100 transition-colors shrink-0">
                        <ExternalLink className="h-3 w-3" />YouTube
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.why}</p>
                    <span className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded-full',
                      s.level === 'easy'   ? 'bg-green-50 text-green-700'
                      : s.level === 'medium' ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                    )}>
                      {s.level === 'easy' ? '✅ Facile' : s.level === 'medium' ? '⚡ Moyen' : '🔥 Difficile'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Jeux */}
          {result.games?.length > 0 && (
            <Section id="games" icon={Gamepad2} title="Jeux & Activités" count={result.games.length}>
              <div className="space-y-3">
                {result.games.map((g, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{g.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{g.duration}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{g.description}</p>
                    {g.materials && <p className="text-sm text-blue-700 bg-blue-50 rounded px-2 py-1">🎒 {g.materials}</p>}
                    {g.tip && <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1">💡 {g.tip}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Vidéos */}
          {result.videos?.length > 0 && (
            <Section id="videos" icon={Video} title="Vidéos recommandées" count={result.videos.length}>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.videos.map((v, i) => (
                  <div key={i} className="rounded-lg border border-border p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{v.title}</p>
                        <p className="text-sm text-muted-foreground">{v.channel} · {v.duration}</p>
                      </div>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.youtubeSearch)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-red-50 text-red-600 border border-red-200
                          px-2 py-1 text-xs font-medium hover:bg-red-100 transition-colors shrink-0">
                        <ExternalLink className="h-3 w-3" />YouTube
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">{v.useCase}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Jeux de rôle */}
          {result.roleplays?.length > 0 && (
            <Section id="roleplays" icon={Users} title="Jeux de rôle" count={result.roleplays.length}>
              <div className="space-y-3">
                {result.roleplays.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-sm font-semibold">{r.scenario}</p>
                    <p className="text-sm text-muted-foreground">{r.context}</p>
                    {r.keyPhrases?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.keyPhrases.map((p, j) => (
                          <span key={j} className="text-xs bg-primary/8 text-primary rounded-full px-2.5 py-1 font-medium border border-primary/15">
                            &quot;{p}&quot;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Activités créatives */}
          {result.crafts?.length > 0 && (
            <Section id="crafts" icon={Palette} title="Activités créatives" count={result.crafts.length}>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.crafts.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border p-3.5 space-y-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Pinterest */}
          {result.pinterest?.length > 0 && (
            <Section id="pinterest" icon={Search} title="Ressources Pinterest" count={result.pinterest.length}>
              <div className="grid sm:grid-cols-2 gap-2">
                {result.pinterest.map((p, i) => (
                  <a key={i}
                    href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(p.query)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-lg border border-border p-3 hover:border-rose-300
                      hover:bg-rose-50/50 transition-all group">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.query}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Structure Padlet suggérée */}
          {result.padletStructure && (
            <Section id="padlet" icon={Pin} title="Structure Padlet suggérée">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">📌 {result.padletStructure.title}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {result.padletStructure.sections?.map((s, i) => (
                    <div key={i} className="rounded-lg border border-primary/20 bg-primary/3 p-3 space-y-1">
                      <p className="text-sm font-semibold">{s.emoji} {s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Vocabulaire */}
          {result.vocabulary?.length > 0 && (
            <Section id="vocab" icon={Target} title="Vocabulaire clé">
              <div className="flex flex-wrap gap-2">
                {result.vocabulary.map((w, i) => (
                  <span key={i} className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Différenciation + Note parents */}
          {result.differentiation && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800 mb-1">✅ Pour les plus lents</p>
                <p className="text-sm text-green-900">{result.differentiation.easier}</p>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-semibold text-orange-800 mb-1">🔥 Pour les plus avancés</p>
                <p className="text-sm text-orange-900">{result.differentiation.harder}</p>
              </div>
            </div>
          )}

          {/* Note WhatsApp parents */}
          {result.parentNote && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-1.5">💬 Note suggérée pour les parents (WhatsApp)</p>
              <p className="text-sm text-emerald-900 italic">&quot;{result.parentNote}&quot;</p>
            </div>
          )}

          {/* Bouton regénérer */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => void generate()} disabled={isLoading} className="gap-2">
              <Sparkles className="h-4 w-4" />Regénérer
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setTheme('') }} className="gap-2">
              Nouvelle idée
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
