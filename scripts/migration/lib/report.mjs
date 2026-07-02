// ============================================================
// lib/report.mjs — Rapport de migration (dry-run et commit)
// Sortie lisible en console + collecte structurée des actions,
// warnings et conflits pour relecture avant/après écriture.
// ============================================================

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
}

export function createReport(moduleName, { commit }) {
  const actions = []   // { type: 'create'|'reuse'|'update', entity, detail }
  const warnings = []
  const conflicts = []

  return {
    action(type, entity, detail) { actions.push({ type, entity, detail }) },
    warn(msg) { warnings.push(msg) },
    conflict(msg) { conflicts.push(msg) },

    print() {
      const mode = commit
        ? `${C.red}${C.bold}COMMIT (écriture réelle)${C.reset}`
        : `${C.green}${C.bold}DRY-RUN (aucune écriture)${C.reset}`
      console.log(`\n${C.cyan}${C.bold}━━━ Module ${moduleName} — ${mode}${C.reset}\n`)

      const created = actions.filter(a => a.type === 'create')
      const reused = actions.filter(a => a.type === 'reuse')
      const updated = actions.filter(a => a.type === 'update')

      const section = (label, list, color) => {
        if (!list.length) return
        console.log(`${color}${C.bold}${label} (${list.length})${C.reset}`)
        for (const a of list) console.log(`  ${color}•${C.reset} ${a.entity} — ${a.detail}`)
        console.log('')
      }
      section('À CRÉER', created, C.green)
      section('RÉUTILISÉS (déjà présents)', reused, C.dim)
      section('MIS À JOUR', updated, C.yellow)

      if (conflicts.length) {
        console.log(`${C.red}${C.bold}CONFLITS (${conflicts.length})${C.reset}`)
        for (const m of conflicts) console.log(`  ${C.red}✗${C.reset} ${m}`)
        console.log('')
      }
      if (warnings.length) {
        console.log(`${C.yellow}${C.bold}AVERTISSEMENTS (${warnings.length})${C.reset}`)
        for (const m of warnings) console.log(`  ${C.yellow}⚠${C.reset} ${m}`)
        console.log('')
      }

      console.log(`${C.bold}Résumé :${C.reset} ${created.length} création(s), ${reused.length} réutilisation(s), ` +
        `${updated.length} mise(s) à jour, ${conflicts.length} conflit(s), ${warnings.length} avertissement(s).`)
      if (!commit) {
        console.log(`${C.dim}Relance avec --commit pour écrire réellement en base.${C.reset}\n`)
      } else {
        console.log('')
      }
    },

    hasBlockingConflicts() { return conflicts.length > 0 },
  }
}
