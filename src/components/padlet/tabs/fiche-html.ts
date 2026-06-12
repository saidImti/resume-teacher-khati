import type { FicheResult } from './FicheSeanceForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
}

function safeVerb(inf: string): string {
  return inf.startsWith('to ') ? inf : 'to ' + inf
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildVocabRows(fiche: FicheResult): string {
  return fiche.vocabulary.map(w => [
    '<tr>',
    '<td><span class="word-en">' + esc(w.emoji ?? '') + ' ' + esc(w.en) + '</span></td>',
    '<td><span class="phonetic">/' + esc(w.phonetic ?? '') + '/</span></td>',
    '<td class="fr">' + esc(w.fr) + '</td>',
    '<td class="example">' + esc(w.example ?? '') + '</td>',
    '</tr>',
  ].join('')).join('')
}

function buildGrammarCards(fiche: FicheResult): string {
  return fiche.grammar.map(g => {
    const formula = g.formula
      ? '<div class="formula">' + esc(g.formula) + '</div>'
      : ''
    const chips = g.examples.map(e =>
      '<span class="chip">&ldquo;' + esc(e) + '&rdquo;</span>'
    ).join('')
    const tip = g.tip
      ? '<div class="tip">&#128161; ' + esc(g.tip) + '</div>'
      : ''
    return [
      '<div class="card grammar-card">',
      '<div class="rule">' + esc(g.rule) + '</div>',
      formula,
      '<div class="chips">' + chips + '</div>',
      tip,
      '</div>',
    ].join('')
  }).join('')
}

function buildVerbCards(fiche: FicheResult): string {
  return fiche.verbs.map(v => {
    let forms = ''
    if (v.presentSimple || v.pastSimple) {
      const pres = v.presentSimple ? 'Pr&eacute;sent : <em>' + esc(v.presentSimple) + '</em>' : ''
      const past = v.pastSimple ? '&nbsp;&middot;&nbsp; Pass&eacute; : <em>' + esc(v.pastSimple) + '</em>' : ''
      forms = '<div class="verb-forms">' + pres + ' ' + past + '</div>'
    }
    const tip = v.tip ? '<div class="verb-tip">&rarr; ' + esc(v.tip) + '</div>' : ''
    return [
      '<div class="card verb-card">',
      '<div class="verb-inf">' + esc(safeVerb(v.infinitive)) + '</div>',
      '<div class="verb-fr">= ' + esc(v.french) + '</div>',
      forms,
      tip,
      '</div>',
    ].join('')
  }).join('')
}

function buildExprRows(fiche: FicheResult): string {
  return fiche.expressions.map(e => {
    const ctx = e.context ? '<span class="expr-ctx">(' + esc(e.context) + ')</span>' : ''
    return [
      '<div class="expr-row">',
      '<span class="expr-en">&ldquo;' + esc(e.en) + '&rdquo;</span>',
      '<span class="expr-arrow">&rarr;</span>',
      '<span class="expr-fr">' + esc(e.fr) + '</span>',
      ctx,
      '</div>',
    ].join('')
  }).join('')
}

function buildSpellingCards(fiche: FicheResult): string {
  return fiche.spelling.map(s => [
    '<div class="card spell-card">',
    '<span class="spell-word">' + esc(s.word) + '</span>',
    '<span class="spell-trick">&rarr; ' + esc(s.trick) + '</span>',
    '</div>',
  ].join('')).join('')
}

function buildPhonicsCards(fiche: FicheResult): string {
  return (fiche.phonics ?? []).map(p => {
    const letter = p.letter ? '<div class="phonics-letter">' + esc(p.letter) + '</div>' : ''
    const chips = p.examples.map(e =>
      '<span class="chip">' + esc(e) + '</span>'
    ).join('')
    return [
      '<div class="card phonics-card">',
      '<div class="phonics-sound">' + esc(p.sound) + '</div>',
      letter,
      '<div class="chips">' + chips + '</div>',
      '</div>',
    ].join('')
  }).join('')
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Fira+Mono:wght@400;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#f4f4fb;color:#1a1a2e;font-size:13px;line-height:1.55}
@page{size:A4;margin:14mm 15mm 16mm 15mm}
@media print{
  body{background:white!important}
  .no-print{display:none!important}
  .avoid-break{break-inside:avoid}
}
.container{max-width:794px;margin:0 auto;padding:24px 20px}
.print-bar{display:flex;gap:12px;justify-content:center;margin-bottom:24px}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:10px;padding:11px 26px;font-weight:700;font-size:14px;cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}
.btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white}
.btn-outline{background:white;color:#6366f1;border:2px solid #6366f1}
.btn:hover{opacity:.85}
.header{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 55%,#a855f7 100%);border-radius:20px;padding:36px 40px 30px;color:white;margin-bottom:24px}
.header-top{display:flex;align-items:flex-start;gap:20px}
.header-emoji{font-size:60px;line-height:1;flex-shrink:0}
.header-title{font-size:30px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px}
.header-meta{font-size:13px;opacity:.75;margin-bottom:12px}
.header-summary{font-size:13px;opacity:.85;line-height:1.7;border-top:1px solid rgba(255,255,255,.25);padding-top:14px;margin-top:14px}
.section{margin-bottom:22px}
.section-title{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:800;color:#6366f1;border-bottom:2.5px solid #e8e8ff;padding-bottom:9px;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th{padding:9px 12px;text-align:left;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6366f1;background:#f1f0ff}
td{padding:9px 12px;border-bottom:1px solid #f0f0f4;vertical-align:top}
.word-en{font-weight:700;color:#4f46e5}
.phonetic{font-family:'Fira Mono',monospace;font-size:11px;color:#7c3aed}
.fr{color:#475569}
.example{font-style:italic;color:#94a3b8;font-size:12px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.card{border:1.5px solid #e8e8ff;border-radius:14px;padding:16px;background:#fafafe;break-inside:avoid}
.grammar-card .rule{font-weight:700;color:#4f46e5;font-size:13px;margin-bottom:8px}
.formula{background:#ede9fe;border-radius:8px;padding:8px 12px;font-family:'Fira Mono',monospace;font-size:12px;color:#5b21b6;margin-bottom:10px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:white;border:1px solid #ddd;border-radius:7px;padding:4px 10px;font-size:12px;font-style:italic}
.tip{background:#fef9c3;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;margin-top:10px}
.verb-card .verb-inf{font-weight:800;color:#4f46e5;font-size:14px}
.verb-fr{font-size:12px;color:#64748b;margin-top:2px}
.verb-forms{font-size:11px;color:#94a3b8;margin-top:6px}
.verb-tip{font-size:11px;color:#7c3aed;margin-top:5px}
.expr-row{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid #f0f0f0;padding:9px 0}
.expr-en{font-weight:700;color:#1a1a2e;flex:1;font-size:14px}
.expr-arrow{color:#a5b4fc;font-weight:700}
.expr-fr{color:#475569}
.expr-ctx{color:#94a3b8;font-size:11px}
.spell-card{display:flex;gap:12px;background:#fffbeb;border-color:#fde68a}
.spell-word{font-family:'Fira Mono',monospace;font-weight:700;color:#92400e;font-size:15px;flex-shrink:0}
.spell-trick{font-size:12px;color:#b45309}
.phonics-grid{display:flex;flex-wrap:wrap;gap:12px}
.phonics-card{text-align:center;min-width:90px;background:#f5f3ff;border-color:#ddd6fe}
.phonics-sound{font-size:26px;font-weight:900;color:#7c3aed}
.phonics-letter{font-family:'Fira Mono',monospace;font-size:11px;color:#a78bfa;margin-top:2px}
.phonics-card .chips{margin-top:8px;justify-content:center}
.phonics-card .chip{background:#ede9fe;border:none;color:#5b21b6;font-style:normal;font-size:11px}
.info-box{border-radius:14px;padding:18px 20px;display:flex;gap:16px;margin-bottom:14px;break-inside:avoid}
.info-box.fun{background:#fef9c3;border:1.5px solid #fde68a}
.info-box.hw{background:#f0fdf4;border:1.5px solid #bbf7d0}
.info-box.wa{background:#dcfce7;border:1.5px solid #86efac}
.info-icon{font-size:28px;line-height:1;flex-shrink:0}
.info-label{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.fun .info-label{color:#92400e}.hw .info-label{color:#166534}.wa .info-label{color:#15803d}
.info-text{font-size:13px;line-height:1.65}
.fun .info-text{color:#78350f}.hw .info-text{color:#14532d}.wa .info-text{color:#166534;white-space:pre-line}
.footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0}
`

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateFicheHtml(fiche: FicheResult): string {
  const vocabSection = fiche.vocabulary.length > 0
    ? '<div class="section avoid-break">'
      + '<div class="section-title">&#128216; Vocabulaire du cours</div>'
      + '<table><thead><tr><th>Anglais</th><th>Phon&eacute;tique</th><th>Fran&ccedil;ais</th><th>Exemple</th></tr></thead>'
      + '<tbody>' + buildVocabRows(fiche) + '</tbody></table></div>'
    : ''

  const grammarVerbs = (fiche.grammar.length > 0 || fiche.verbs.length > 0)
    ? '<div class="two-col">'
      + (fiche.grammar.length > 0
        ? '<div class="section"><div class="section-title">&#9999;&#65039; Grammaire</div>' + buildGrammarCards(fiche) + '</div>'
        : '')
      + (fiche.verbs.length > 0
        ? '<div class="section"><div class="section-title">&#128290; Verbes</div>' + buildVerbCards(fiche) + '</div>'
        : '')
      + '</div>'
    : ''

  const exprSpelling = (fiche.expressions.length > 0 || fiche.spelling.length > 0)
    ? '<div class="two-col">'
      + (fiche.expressions.length > 0
        ? '<div class="section avoid-break"><div class="section-title">&#128172; Expressions cl&eacute;s</div>' + buildExprRows(fiche) + '</div>'
        : '')
      + (fiche.spelling.length > 0
        ? '<div class="section avoid-break"><div class="section-title">&#128221; Orthographe &amp; astuces</div><div class="two-col">' + buildSpellingCards(fiche) + '</div></div>'
        : '')
      + '</div>'
    : ''

  const phonicsSection = (fiche.phonics ?? []).length > 0
    ? '<div class="section avoid-break"><div class="section-title">&#128266; Phon&eacute;tique (Phonics)</div>'
      + '<div class="phonics-grid">' + buildPhonicsCards(fiche) + '</div></div>'
    : ''

  const funFact = fiche.funFact
    ? '<div class="info-box fun avoid-break"><div class="info-icon">&#127757;</div>'
      + '<div><div class="info-label">Le savais-tu ?</div>'
      + '<div class="info-text">' + esc(fiche.funFact) + '</div></div></div>'
    : ''

  const homework = fiche.homeworkSuggestion
    ? '<div class="info-box hw avoid-break"><div class="info-icon">&#128218;</div>'
      + '<div><div class="info-label">Activit&eacute; &agrave; la maison</div>'
      + '<div class="info-text">' + esc(fiche.homeworkSuggestion) + '</div></div></div>'
    : ''

  const parentNote = fiche.parentNote
    ? '<div class="info-box wa avoid-break"><div class="info-icon">&#128172;</div>'
      + '<div><div class="info-label">Note WhatsApp pour les parents</div>'
      + '<div class="info-text">' + esc(fiche.parentNote) + '</div></div></div>'
    : ''

  const summary = fiche.whatWeDidToday
    ? '<div class="header-summary">' + esc(fiche.whatWeDidToday) + '</div>'
    : ''

  return '<!DOCTYPE html>'
    + '<html lang="fr"><head>'
    + '<meta charset="UTF-8">'
    + '<title>Fiche – ' + esc(fiche.theme) + '</title>'
    + '<style>' + CSS + '</style>'
    + '</head><body><div class="container">'
    + '<div class="print-bar no-print">'
    + '<button class="btn btn-primary" onclick="window.print()">&#128424;&#65039; Imprimer / Enregistrer PDF</button>'
    + '<button class="btn btn-outline" onclick="window.close()">&times; Fermer</button>'
    + '</div>'
    + '<div class="header avoid-break">'
    + '<div class="header-top">'
    + '<div class="header-emoji">' + esc(fiche.emoji) + '</div>'
    + '<div>'
    + '<div class="header-title">' + esc(fiche.theme) + '</div>'
    + '<div class="header-meta">' + esc(fiche.level) + ' &nbsp;&middot;&nbsp; ' + esc(fiche.date) + '</div>'
    + '</div></div>'
    + summary
    + '</div>'
    + vocabSection
    + grammarVerbs
    + exprSpelling
    + phonicsSection
    + funFact
    + homework
    + parentNote
    + '<div class="footer">Teacher Khati &nbsp;&middot;&nbsp; Fiche générée par IA &nbsp;&middot;&nbsp; ' + esc(fiche.date) + '</div>'
    + '</div></body></html>'
}
