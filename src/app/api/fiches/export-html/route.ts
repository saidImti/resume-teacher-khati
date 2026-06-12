import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── POST /api/fiches/export-html ─────────────────────────────────────────────
// Reçoit un objet BilanResult et retourne un HTML premium prêt à imprimer/Word.

const SKILL_LABELS: Record<string, string> = {
  speaking: '🗣️ Speaking', listening: '👂 Listening', reading: '📚 Reading',
  writing: '✍️ Writing', vocabulary: '📝 Vocabulary', phonics: '🔤 Phonics',
}
const THEME_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  green:  { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  purple: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8' },
  orange: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
  pink:   { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
  teal:   { bg: '#f0fdfa', border: '#14b8a6', text: '#115e59' },
}

function stars(n: number): string {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < n ? '#f59e0b' : '#d1d5db'}">★</span>`
  ).join('')
}

function masteryBadge(m?: string): string {
  if (m === 'mastered')  return `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">✅ Maîtrisé</span>`
  if (m === 'practiced') return `<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">🔄 En cours</span>`
  return `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">🔵 Introduit</span>`
}

// ─── HTML Generator ───────────────────────────────────────────────────────────

function generateBilanHtml(bilan: Record<string, unknown>, exportFormat: string): string {
  const level        = String(bilan.level ?? '')
  const year         = String(bilan.academicYear ?? '')
  const headline     = String(bilan.headline ?? '')
  const yearSummary  = String(bilan.yearSummary ?? '')
  const sessionCount = Number(bilan.sessionCount ?? 0)
  const stats        = bilan.stats as Record<string, number> | undefined

  const progression  = bilan.progressionBySkill as Record<string, { level: number; highlights: string[]; improvement: string }> | undefined
  const themes       = bilan.themes as Array<Record<string, unknown>> | undefined ?? []
  const masterVocab  = bilan.masterVocabulary as Array<{ category: string; words: Array<{ en: string; fr: string; emoji?: string }> }> | undefined ?? []
  const grammar      = bilan.grammarAcquired as Array<Record<string, unknown>> | undefined ?? []
  const expressions  = bilan.expressionsLearned as Array<{ en: string; fr: string; context?: string }> | undefined ?? []
  const discoveries  = bilan.culturalDiscoveries as string[] | undefined ?? []
  const achievements = bilan.achievements as Array<{ icon: string; title: string; description: string }> | undefined ?? []
  const nextYear     = String(bilan.nextYearPreview ?? '')
  const teacherNote  = String(bilan.teacherNote ?? '')
  const cert         = bilan.parentCertificate as Record<string, string> | undefined

  const isPdf = exportFormat === 'pdf'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bilan Annuel ${level} — ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; background: white; line-height: 1.5; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 18mm 15mm; background: white; position: relative; }
  @media print {
    body { margin: 0; }
    .page { width: 100%; margin: 0; padding: 15mm 15mm 12mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { background: #f1f5f9; }
    .page { margin: 20px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  }

  /* ── Cover ── */
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 297mm; background: linear-gradient(135deg, #1e40af 0%, #6366f1 50%, #8b5cf6 100%); color: white; padding: 30mm 20mm; }
  .cover-school { font-size: 13pt; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; opacity: 0.85; margin-bottom: 10mm; }
  .cover-badge { background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); border-radius: 99px; padding: 6px 20px; font-size: 11pt; font-weight: 600; display: inline-block; margin-bottom: 8mm; }
  .cover-title { font-size: 32pt; font-weight: 900; line-height: 1.1; margin-bottom: 6mm; }
  .cover-subtitle { font-size: 16pt; font-weight: 300; opacity: 0.9; margin-bottom: 12mm; }
  .cover-divider { width: 80px; height: 3px; background: rgba(255,255,255,0.5); margin: 0 auto 12mm; border-radius: 99px; }
  .cover-stats { display: flex; gap: 10mm; justify-content: center; flex-wrap: wrap; margin-bottom: 15mm; }
  .cover-stat { text-align: center; }
  .cover-stat-num { font-size: 24pt; font-weight: 900; }
  .cover-stat-label { font-size: 9pt; opacity: 0.75; text-transform: uppercase; letter-spacing: 1px; }
  .cover-teacher { margin-top: auto; padding-top: 10mm; border-top: 1px solid rgba(255,255,255,0.3); width: 100%; font-size: 10pt; opacity: 0.8; }

  /* ── Page header ── */
  .page-header { border-bottom: 3px solid #6366f1; padding-bottom: 5mm; margin-bottom: 8mm; display: flex; align-items: flex-end; justify-content: space-between; }
  .page-header-title { font-size: 18pt; font-weight: 900; color: #1e40af; }
  .page-header-meta { font-size: 9pt; color: #64748b; text-align: right; }
  .page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3mm; }

  /* ── Section headers ── */
  .section-title { font-size: 13pt; font-weight: 800; color: #1e40af; margin: 6mm 0 3mm; display: flex; align-items: center; gap: 6px; }
  .section-title::before { content: ''; display: inline-block; width: 4px; height: 18px; background: #6366f1; border-radius: 2px; }

  /* ── Skill table ── */
  .skill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .skill-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 4mm; }
  .skill-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm; }
  .skill-card-name { font-size: 10pt; font-weight: 700; }
  .skill-card-stars { font-size: 11pt; }
  .skill-card-note { font-size: 9pt; color: #475569; font-style: italic; }

  /* ── Theme page ── */
  .theme-header { border-radius: 12px; padding: 6mm; margin-bottom: 6mm; display: flex; align-items: center; gap: 5mm; }
  .theme-emoji { font-size: 36pt; line-height: 1; }
  .theme-title { font-size: 22pt; font-weight: 900; }
  .theme-subtitle { font-size: 10pt; opacity: 0.8; margin-top: 2px; }
  .theme-summary { font-size: 10pt; color: #475569; margin-bottom: 5mm; background: #f8fafc; border-left: 3px solid #6366f1; padding: 3mm 4mm; border-radius: 0 6px 6px 0; }
  .theme-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }

  /* ── Vocab table ── */
  .vocab-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .vocab-table th { background: #f1f5f9; font-weight: 700; padding: 3mm 2mm; text-align: left; border-bottom: 2px solid #e2e8f0; }
  .vocab-table td { padding: 2.5mm 2mm; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .vocab-table tr:nth-child(even) td { background: #fafafa; }
  .vocab-en { font-weight: 700; color: #1e40af; }
  .vocab-phonetic { font-family: monospace; color: #6366f1; font-size: 8pt; display: block; }

  /* ── Grammar box ── */
  .grammar-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 3mm 4mm; margin-bottom: 2mm; }
  .grammar-rule { font-size: 10pt; font-weight: 700; color: #1e40af; }
  .grammar-formula { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 2mm 3mm; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 9pt; color: #1e40af; margin: 2mm 0; }
  .grammar-examples { font-size: 9pt; color: #475569; font-style: italic; }

  /* ── Expression pill ── */
  .expr-item { display: flex; gap: 3mm; align-items: baseline; padding: 2mm 0; border-bottom: 1px dashed #f1f5f9; }
  .expr-en { font-weight: 600; color: #1e40af; font-size: 9.5pt; }
  .expr-fr { color: #64748b; font-size: 9pt; }

  /* ── Master vocab ── */
  .cat-title { font-size: 10pt; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin: 4mm 0 2mm; }
  .word-pills { display: flex; flex-wrap: wrap; gap: 2mm; }
  .word-pill { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 7px; font-size: 9pt; }
  .word-pill strong { color: #1e40af; }

  /* ── Achievement card ── */
  .achievement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .achievement-card { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fcd34d; border-radius: 10px; padding: 4mm; display: flex; gap: 3mm; }
  .achievement-icon { font-size: 22pt; line-height: 1; shrink: 0; }
  .achievement-title { font-size: 10pt; font-weight: 700; color: #92400e; }
  .achievement-desc { font-size: 9pt; color: #78350f; margin-top: 1mm; }

  /* ── Certificate ── */
  .certificate { text-align: center; border: 4px solid #f59e0b; border-radius: 16px; padding: 15mm; margin: 5mm 0; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%); }
  .cert-trophy { font-size: 48pt; margin-bottom: 5mm; display: block; }
  .cert-title { font-size: 20pt; font-weight: 900; color: #92400e; margin-bottom: 4mm; }
  .cert-body { font-size: 11pt; color: #78350f; max-width: 130mm; margin: 0 auto 6mm; line-height: 1.6; }
  .cert-signature { font-size: 13pt; font-weight: 700; color: #92400e; border-top: 2px solid #fcd34d; padding-top: 4mm; display: inline-block; margin-top: 4mm; }

  /* ── Teacher note ── */
  .teacher-note { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 5mm 6mm; font-size: 10.5pt; font-style: italic; color: #166534; line-height: 1.7; }

  /* ── Print action bar ── */
  .action-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #1e40af; color: white; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px; }
  .action-bar button { background: white; color: #1e40af; border: none; border-radius: 8px; padding: 8px 18px; font-weight: 700; font-size: 11pt; cursor: pointer; }
  .action-bar button:hover { background: #dbeafe; }
  .action-bar .close-btn { background: transparent; color: rgba(255,255,255,0.8); font-size: 20px; padding: 0 8px; }
</style>
</head>
<body>

${!isPdf ? `<div class="action-bar no-print">
  <span>📄 Bilan ${level} — ${year}</span>
  <button onclick="window.print()">🖨️ Imprimer / PDF</button>
  <button onclick="downloadWord()">📝 Télécharger Word</button>
  <button class="close-btn" onclick="window.close()">✕</button>
</div>
<div style="height:50px" class="no-print"></div>` : ''}

<!-- ═══════════════════════════════════════════════════════ COVER PAGE ═══ -->
<div class="page" style="padding:0;">
  <div class="cover">
    <div class="cover-school">🇬🇧 Teacher Khati English School</div>
    <div class="cover-badge">${level}</div>
    <div class="cover-title">Bilan Annuel<br>d'Anglais</div>
    <div class="cover-subtitle">${year}</div>
    <div class="cover-divider"></div>
    <p style="font-size:13pt;opacity:0.9;max-width:120mm;margin-bottom:10mm;line-height:1.6">"${headline}"</p>
    ${stats || sessionCount ? `<div class="cover-stats">
      ${sessionCount ? `<div class="cover-stat"><div class="cover-stat-num">${sessionCount}</div><div class="cover-stat-label">Séances</div></div>` : ''}
      ${stats?.totalWords ? `<div class="cover-stat"><div class="cover-stat-num">${stats.totalWords}</div><div class="cover-stat-label">Mots</div></div>` : ''}
      ${stats?.totalGrammarRules ? `<div class="cover-stat"><div class="cover-stat-num">${stats.totalGrammarRules}</div><div class="cover-stat-label">Règles</div></div>` : ''}
      ${stats?.totalThemes ? `<div class="cover-stat"><div class="cover-stat-num">${stats.totalThemes}</div><div class="cover-stat-label">Thèmes</div></div>` : ''}
    </div>` : ''}
    <div class="cover-teacher">Préparé avec ❤️ par Teacher Khati · ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ OVERVIEW PAGE ═══ -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">📊 Vue d'ensemble</div>
    <div class="page-header-meta">${level} · ${year}</div>
  </div>

  <p style="font-size:11pt;line-height:1.8;color:#334155;background:#f8fafc;border-left:4px solid #6366f1;padding:5mm;border-radius:0 8px 8px 0;margin-bottom:6mm">${yearSummary}</p>

  ${progression ? `
  <div class="section-title">Progression par compétence</div>
  <div class="skill-grid">
    ${Object.entries(progression).map(([skill, data]) => `
    <div class="skill-card">
      <div class="skill-card-header">
        <span class="skill-card-name">${SKILL_LABELS[skill] ?? skill}</span>
        <span class="skill-card-stars">${stars(data.level)}</span>
      </div>
      <div class="skill-card-note">${data.improvement}</div>
      ${data.highlights?.slice(0, 2).map((h) => `<div style="font-size:8.5pt;color:#64748b;margin-top:1.5mm">✓ ${h}</div>`).join('')}
    </div>`).join('')}
  </div>` : ''}

  ${achievements.length > 0 ? `
  <div class="section-title" style="margin-top:6mm">🏆 Réalisations de l'année</div>
  <div class="achievement-grid">
    ${achievements.map((a) => `
    <div class="achievement-card">
      <div class="achievement-icon">${a.icon}</div>
      <div>
        <div class="achievement-title">${a.title}</div>
        <div class="achievement-desc">${a.description}</div>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <div class="page-footer"><span>Teacher Khati English School</span><span>${level} · ${year}</span></div>
</div>

<!-- ═══════════════════════════════════════════════════ THEME PAGES ══════ -->
${themes.map((theme, _i) => {
  const tName  = String(theme.name ?? '')
  const tEmoji = String(theme.emoji ?? '📚')
  const tColor = THEME_COLORS[String(theme.color ?? 'blue')] ?? THEME_COLORS.blue!
  const tSummary = String(theme.summary ?? '')
  const tVocab   = theme.vocabulary as Array<{ en: string; fr: string; phonetic?: string; emoji?: string; example?: string }> | undefined ?? []
  const tGrammar = theme.grammar as Array<{ rule: string; formula?: string; examples: string[] }> | undefined ?? []
  const tExpr    = theme.expressions as Array<{ en: string; fr: string }> | undefined ?? []
  const tFunFact = String(theme.funFact ?? '')
  const tLearnings = theme.keyLearnings as string[] | undefined ?? []

  return `
<div class="page">
  <div class="page-header">
    <div class="page-header-title">${tEmoji} ${tName}</div>
    <div class="page-header-meta">${level} · ${year}</div>
  </div>

  <div class="theme-header" style="background:${tColor.bg};border-left:5px solid ${tColor.border}">
    <div class="theme-emoji">${tEmoji}</div>
    <div>
      <div class="theme-title" style="color:${tColor.text}">${tName}</div>
      ${theme.sessionsCount ? `<div class="theme-subtitle" style="color:${tColor.text}">${theme.sessionsCount} séance${Number(theme.sessionsCount) > 1 ? 's' : ''}</div>` : ''}
    </div>
  </div>

  ${tSummary ? `<div class="theme-summary">${tSummary}</div>` : ''}
  ${tLearnings.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:2mm;margin-bottom:4mm">${tLearnings.map((l) => `<span style="background:${tColor.bg};color:${tColor.text};border:1px solid ${tColor.border};border-radius:99px;padding:2px 10px;font-size:9pt;font-weight:600">✓ ${l}</span>`).join('')}</div>` : ''}

  <div class="theme-cols">
    <div>
      ${tVocab.length > 0 ? `
      <div class="section-title" style="font-size:11pt">Vocabulaire</div>
      <table class="vocab-table">
        <thead><tr><th>Anglais</th><th>Français</th><th>Exemple</th></tr></thead>
        <tbody>
          ${tVocab.map((w) => `
          <tr>
            <td><span class="vocab-en">${w.emoji ?? ''} ${w.en}</span>${w.phonetic ? `<span class="vocab-phonetic">/${w.phonetic}/</span>` : ''}</td>
            <td>${w.fr}</td>
            <td style="color:#64748b;font-style:italic;font-size:8.5pt">${w.example ?? ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}
    </div>

    <div>
      ${tGrammar.length > 0 ? `
      <div class="section-title" style="font-size:11pt">Grammaire</div>
      ${tGrammar.map((g) => `
      <div class="grammar-box">
        <div class="grammar-rule">${g.rule}</div>
        ${g.formula ? `<div class="grammar-formula">${g.formula}</div>` : ''}
        <div class="grammar-examples">${g.examples?.map((e) => `"${e}"`).join(' · ')}</div>
      </div>`).join('')}` : ''}

      ${tExpr.length > 0 ? `
      <div class="section-title" style="font-size:11pt;margin-top:4mm">Expressions</div>
      ${tExpr.map((e) => `
      <div class="expr-item">
        <span class="expr-en">"${e.en}"</span>
        <span class="expr-fr">→ ${e.fr}</span>
      </div>`).join('')}` : ''}

      ${tFunFact ? `
      <div style="background:#fef9c3;border:1px solid #fcd34d;border-radius:8px;padding:3mm;margin-top:4mm;font-size:9pt;color:#713f12">
        <strong>🌍 Le savais-tu ?</strong><br>${tFunFact}
      </div>` : ''}
    </div>
  </div>

  <div class="page-footer"><span>Teacher Khati English School</span><span>${level} · ${year}</span></div>
</div>`
}).join('')}

<!-- ═════════════════════════════════════════════════ GRAMMAR REFERENCE ═ -->
${grammar.length > 0 ? `
<div class="page">
  <div class="page-header">
    <div class="page-header-title">📝 Grammaire de l'année</div>
    <div class="page-header-meta">${level} · ${year}</div>
  </div>
  <div style="columns:2;column-gap:6mm">
    ${grammar.map((g) => `
    <div class="grammar-box" style="break-inside:avoid;margin-bottom:3mm">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2mm">
        <div class="grammar-rule">${String(g.rule ?? '')}</div>
        ${masteryBadge(String(g.mastery ?? ''))}
      </div>
      ${g.formula ? `<div class="grammar-formula">${String(g.formula)}</div>` : ''}
      ${(g.examples as string[] | undefined)?.length ? `<div class="grammar-examples">${(g.examples as string[]).map((e) => `"${e}"`).join(' · ')}</div>` : ''}
    </div>`).join('')}
  </div>
  <div class="page-footer"><span>Teacher Khati English School</span><span>${level} · ${year}</span></div>
</div>` : ''}

<!-- ════════════════════════════════════════════ MASTER VOCABULARY PAGE ═ -->
${masterVocab.length > 0 ? `
<div class="page">
  <div class="page-header">
    <div class="page-header-title">📖 Vocabulaire de l'année</div>
    <div class="page-header-meta">${level} · ${year}</div>
  </div>
  ${masterVocab.map((cat) => `
  <div class="cat-title">${cat.category}</div>
  <div class="word-pills">
    ${cat.words.map((w) => `<div class="word-pill">${w.emoji ?? ''} <strong>${w.en}</strong> = ${w.fr}</div>`).join('')}
  </div>`).join('')}

  ${expressions.length > 0 ? `
  <div class="section-title" style="margin-top:6mm">💬 Expressions clés</div>
  <div style="columns:2;column-gap:6mm">
    ${expressions.map((e) => `
    <div class="expr-item" style="break-inside:avoid">
      <span class="expr-en">"${e.en}"</span><span class="expr-fr">→ ${e.fr}</span>
    </div>`).join('')}
  </div>` : ''}

  <div class="page-footer"><span>Teacher Khati English School</span><span>${level} · ${year}</span></div>
</div>` : ''}

<!-- ══════════════════════════════════════════════════════ FINAL PAGE ════ -->
<div class="page">
  <div class="page-header">
    <div class="page-header-title">🎓 Mot final & Certificat</div>
    <div class="page-header-meta">${level} · ${year}</div>
  </div>

  ${nextYear ? `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:4mm 5mm;margin-bottom:5mm">
    <div style="font-weight:700;color:#1e40af;font-size:10.5pt;margin-bottom:2mm">🚀 L'an prochain…</div>
    <p style="font-size:10pt;color:#1e3a8a">${nextYear}</p>
  </div>` : ''}

  ${discoveries.length > 0 ? `
  <div class="section-title">🌍 Découvertes culturelles</div>
  <div style="display:flex;flex-wrap:wrap;gap:2mm;margin-bottom:5mm">
    ${discoveries.map((d) => `<span style="background:#f0fdf4;border:1px solid #86efac;color:#166534;border-radius:6px;padding:3px 10px;font-size:9pt">🌍 ${d}</span>`).join('')}
  </div>` : ''}

  ${teacherNote ? `
  <div class="section-title">✉️ Message de Teacher Khati</div>
  <div class="teacher-note">"${teacherNote}"</div>` : ''}

  ${cert ? `
  <div style="margin-top:8mm">
    <div class="certificate">
      <span class="cert-trophy">🏆</span>
      <div class="cert-title">${cert.title ?? 'Certificat de Fin d\'Année'}</div>
      <div class="cert-body">${cert.body ?? ''}</div>
      <div class="cert-signature">— ${cert.signature ?? 'Teacher Khati'}</div>
    </div>
  </div>` : ''}

  <div class="page-footer"><span>Teacher Khati English School</span><span>${level} · ${year} · Tous droits réservés</span></div>
</div>

<script>
function downloadWord() {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'Bilan_${level.replace(/\s+/g, '_')}_${year}_TeacherKhati.doc';
  a.click();
  URL.revokeObjectURL(url);
}
</script>
</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { bilan: Record<string, unknown>; format?: string }
  const { bilan, format = 'word' } = body

  if (!bilan) return NextResponse.json({ error: 'Données bilan manquantes.' }, { status: 400 })

  const html  = generateBilanHtml(bilan, format)
  const level = String(bilan.level ?? 'Niveau').replace(/\s+/g, '_')
  const year  = String(bilan.academicYear ?? '').replace(/[^0-9-]/g, '')

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Bilan_${level}_${year}_TeacherKhati.html"`,
    },
  })
}
