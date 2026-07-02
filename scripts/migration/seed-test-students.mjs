// ============================================================
// seed-test-students.mjs — Génération de données de TEST
// 10 élèves par (site canonique × niveau), cours Mercredi + Samedi.
//
// Portée : les 3 sites canoniques établis pendant la fusion
// (Maison-Alfort, Champigny Taxi Phone, Maison Pour Tous Bois l'Abbé).
// Les sites "Champigny"/"Taxi Phone" (doublons ambigus, cf. audit §11)
// ne sont volontairement PAS touchés.
//
// Toutes les données créées portent un tag explicite dans `notes`
// ("TEST — génération en masse <date>") pour purge facile avant la
// vraie rentrée. N'écrase ni ne modifie aucune donnée existante —
// additif uniquement (groupes/schedules manquants ajoutés à côté des
// existants, jamais en remplacement).
//
// Usage :
//   node scripts/migration/seed-test-students.mjs           (dry-run)
//   node scripts/migration/seed-test-students.mjs --commit   (écriture)
// ============================================================
import { getAdminClient } from './lib/env.mjs'

const TAG = `TEST — génération en masse ${new Date().toISOString().slice(0, 10)}`
const CANONICAL_SITE_NAMES = ['Maison-Alfort', 'Champigny Taxi Phone', "Maison Pour Tous Bois l'Abbé"]
const STUDENTS_PER_GROUP = 10
const WED = 2 // day_of_week : 0=Lundi … 2=Mercredi
const SAT = 5 // … 5=Samedi

const commit = process.argv.includes('--commit')

const PRENOMS_G = ['Léo', 'Adam', 'Nathan', 'Lucas', 'Gabriel', 'Malo', 'Ethan', 'Sacha', 'Younes', 'Elias']
const PRENOMS_F = ['Léa', 'Nina', 'Inaya', 'Camille', 'Zoé', 'Manon', 'Yasmine', 'Chloé', 'Alice', 'Rania']
const NOMS = ['Dubois', 'Faye', 'Nguyen', 'Kaci', 'Moreau', 'Diarra', 'Petit', 'Haddad', 'Rousseau', 'Cissé']

function pick(arr, i) { return arr[i % arr.length] }

function randomDOBInRange(ageMin, ageMax) {
  const today = new Date()
  const age = ageMin + Math.floor(Math.random() * (ageMax - ageMin + 1))
  const year = today.getFullYear() - age
  const month = 1 + Math.floor(Math.random() * 12)
  const day = 1 + Math.floor(Math.random() * 28)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function ensureGroup(supabase, { siteId, siteName, levelId, levelName, academicYearId, existingGroups }) {
  const found = existingGroups.find(g => g.site_id === siteId && g.level_id === levelId)
  if (found) return { id: found.id, created: false }
  if (!commit) return { id: `(à créer: ${siteName}/${levelName})`, created: true }
  const { data, error } = await supabase
    .from('groups')
    .insert({ site_id: siteId, level_id: levelId, academic_year_id: academicYearId, name: levelName, is_active: true })
    .select('id')
    .single()
  if (error) throw new Error(`Création groupe ${siteName}/${levelName} : ${error.message}`)
  return { id: data.id, created: true }
}

async function ensureSchedule(supabase, { groupId, siteId, siteName, levelName, day, label, startTime, endTime, existingSchedules, userId }) {
  const has = existingSchedules.some(s => s.group_id === groupId && s.day_of_week === day)
  if (has) return { created: false }
  if (!commit) return { created: true, planned: `${siteName}/${levelName} ${label} ${startTime}-${endTime}` }
  const { error } = await supabase.from('schedules').insert({
    user_id: userId, group_id: groupId, site_id: siteId, day_of_week: day,
    start_time: startTime, end_time: endTime, room: siteName, max_students: 15, is_active: true,
  })
  if (error) throw new Error(`Création créneau ${siteName}/${levelName} ${label} : ${error.message}`)
  return { created: true }
}

async function main() {
  const supabase = getAdminClient()

  const [{ data: sites }, { data: levels }, { data: years }, { data: userRow }] = await Promise.all([
    supabase.from('sites').select('id, name'),
    supabase.from('levels').select('id, name, age_min, age_max, sort_order').order('sort_order'),
    supabase.from('academic_years').select('id, name, is_active'),
    supabase.from('students').select('user_id').limit(1).single(),
  ])
  const userId = userRow.user_id
  const activeYear = years.find(y => y.is_active)
  if (!activeYear) throw new Error('Aucune année scolaire active.')

  const targetSites = sites.filter(s => CANONICAL_SITE_NAMES.includes(s.name))
  if (targetSites.length !== 3) throw new Error(`Sites canoniques attendus : 3, trouvés : ${targetSites.length}`)

  const { data: existingGroups } = await supabase.from('groups').select('id, site_id, level_id')
  const { data: existingSchedules } = await supabase.from('schedules').select('id, group_id, day_of_week')

  console.log(`\n━━━ ${commit ? 'COMMIT' : 'DRY-RUN'} — génération de test (${TAG}) ━━━\n`)
  console.log(`Année active : ${activeYear.name}`)
  console.log(`Sites ciblés : ${targetSites.map(s => s.name).join(' · ')}\n`)

  let totalFamilies = 0, totalStudents = 0, totalEnrollments = 0
  let groupsCreated = 0, groupsReused = 0, schedulesCreated = 0, schedulesReused = 0
  const summary = []

  let levelSlot = 0
  for (const site of targetSites) {
    for (const level of levels) {
      const g = await ensureGroup(supabase, {
        siteId: site.id, siteName: site.name, levelId: level.id, levelName: level.name,
        academicYearId: activeYear.id, existingGroups,
      })
      g.created ? groupsCreated++ : groupsReused++
      if (commit && g.created) existingGroups.push({ id: g.id, site_id: site.id, level_id: level.id })

      // Créneaux distincts par (site,niveau) pour éviter tout chevauchement, 45 min, à partir de 09:00.
      const baseHour = 9 + Math.floor(levelSlot / 2)
      const baseMin = (levelSlot % 2) * 45
      const start = `${String(baseHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')}:00`
      const endMin = baseMin + 45
      const end = `${String(baseHour + Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`
      levelSlot++

      const rW = await ensureSchedule(supabase, { groupId: g.id, siteId: site.id, siteName: site.name, levelName: level.name, day: WED, label: 'Mercredi', startTime: start, endTime: end, existingSchedules, userId })
      rW.created ? schedulesCreated++ : schedulesReused++
      const rS = await ensureSchedule(supabase, { groupId: g.id, siteId: site.id, siteName: site.name, levelName: level.name, day: SAT, label: 'Samedi', startTime: start, endTime: end, existingSchedules, userId })
      rS.created ? schedulesCreated++ : schedulesReused++
      if (commit) {
        existingSchedules.push({ id: 'new', group_id: g.id, day_of_week: WED })
        existingSchedules.push({ id: 'new', group_id: g.id, day_of_week: SAT })
      }

      // 10 élèves, chacun sa propre famille fictive.
      const created = []
      for (let i = 0; i < STUDENTS_PER_GROUP; i++) {
        const isGirl = i % 2 === 0
        const prenom = isGirl ? pick(PRENOMS_F, i) : pick(PRENOMS_G, i)
        const nom = pick(NOMS, i + levelSlot)
        const dob = randomDOBInRange(level.age_min, level.age_max)

        if (!commit) { created.push(`${prenom} ${nom}`); continue }

        const { data: fam, error: famErr } = await supabase.from('families').insert({
          user_id: userId,
          parent1_first: `Parent-${prenom}`,
          parent1_last: nom,
          parent1_phone: null,
          parent1_email: null,
          primary_site_id: site.id,
          notes: TAG,
        }).select('id').single()
        if (famErr) { console.log(`   ❌ famille ${prenom} ${nom} : ${famErr.message}`); continue }
        totalFamilies++

        const { data: stu, error: stuErr } = await supabase.from('students').insert({
          user_id: userId, family_id: fam.id, first_name: prenom, last_name: nom,
          date_of_birth: dob, gender: isGirl ? 'F' : 'M', site_id: site.id, level_id: level.id,
          status: 'active', enrollment_date: new Date().toISOString().split('T')[0], notes: TAG,
        }).select('id').single()
        if (stuErr) { console.log(`   ❌ élève ${prenom} ${nom} : ${stuErr.message}`); continue }
        totalStudents++

        const { error: enrErr } = await supabase.from('enrollments').insert({
          user_id: userId, student_id: stu.id, group_id: g.id, academic_year_id: activeYear.id,
          status: 'active', notes: TAG,
        })
        if (enrErr) { console.log(`   ❌ enrollment ${prenom} ${nom} : ${enrErr.message}`); continue }
        totalEnrollments++
        created.push(`${prenom} ${nom}`)
      }
      summary.push({ site: site.name, level: level.name, group: g.id, students: created })
    }
  }

  console.log('=== Récapitulatif par site × niveau ===')
  for (const row of summary) {
    console.log(`  ${row.site.padEnd(30)} ${row.level.padEnd(14)} groupe=${row.group}  ${row.students.length} élève(s)`)
  }
  console.log(`\nGroupes   : ${groupsCreated} créés, ${groupsReused} réutilisés`)
  console.log(`Créneaux  : ${schedulesCreated} créés, ${schedulesReused} déjà présents`)
  if (commit) {
    console.log(`Familles  : ${totalFamilies}`)
    console.log(`Élèves    : ${totalStudents}`)
    console.log(`Enrollments: ${totalEnrollments}`)
  } else {
    console.log(`\n(dry-run — relancer avec --commit pour écrire réellement)`)
  }
  console.log(`\nTag de purge : "${TAG}"`)
}

main().catch(err => { console.error('\nÉchec :', err.message); process.exit(1) })
