// ============================================================
// Calcul de tarification — logique partagee entre la facturation
// (generate-monthly), le formulaire d'inscription (NewRegistrationForm)
// et la page de configuration (/settings/tarification).
//
// Convention actee (reprise du legacy Fiche Inscription et deja en usage
// dans generate-monthly) : le tarif degressif n'est PAS un bareme progressif
// (1er enfant a 40, 2e a 35, 3e a 30...) mais un tarif UNIQUE par enfant,
// determine par la taille totale de la fratrie. Une famille de 3 enfants
// paie 30€/enfant/mois pour CHACUN des 3, soit 90€ — pas 40+35+30=105€.
//
// Options etendues (migration 019) : frais d'inscription (par enfant ou par
// famille), nombre de mensualites par annee scolaire, nombre de seances par
// mois (mode seance), remise en % si paiement de l'annee en une fois.
// ============================================================

export interface PricingRuleLike {
  billing_type: 'per_session' | 'monthly_per_child' | 'monthly_family'
  price_per_session: number | null
  price_1_child: number | null
  price_2_children: number | null
  price_3_children: number | null
  price_4_children: number | null
  price_5plus: number | null
  // Optionnelles pour rester compatible avec les regles chargees avant la
  // migration 019 ou les objets partiels (defauts : 10 mois, 4 seances).
  registration_fee?: number | null
  registration_fee_scope?: 'per_child' | 'per_family'
  months_per_year?: number | null
  sessions_per_month?: number | null
  annual_discount_pct?: number | null
}

const TIER_LABELS = ['1 enfant', '2 enfants', '3 enfants', '4 enfants', '5 enfants et +']

export const DEFAULT_MONTHS_PER_YEAR = 10
export const DEFAULT_SESSIONS_PER_MONTH = 4

export function monthsPerYear(rule: PricingRuleLike): number {
  return rule.months_per_year && rule.months_per_year > 0 ? rule.months_per_year : DEFAULT_MONTHS_PER_YEAR
}

export function sessionsPerMonth(rule: PricingRuleLike): number {
  return rule.sessions_per_month && rule.sessions_per_month > 0 ? rule.sessions_per_month : DEFAULT_SESSIONS_PER_MONTH
}

// Tarif par enfant applicable a une fratrie de n enfants (mode degressif).
export function unitRateForFamilySize(rule: PricingRuleLike, n: number): { unit: number; tierIndex: number } {
  if (n <= 0) return { unit: 0, tierIndex: 0 }
  const tiers = [rule.price_1_child, rule.price_2_children, rule.price_3_children, rule.price_4_children, rule.price_5plus]
  const idx = Math.min(n - 1, 4)
  const unit = tiers[idx] ?? rule.price_1_child ?? 0
  return { unit, tierIndex: idx }
}

export function tierLabel(tierIndex: number): string {
  return TIER_LABELS[tierIndex] ?? TIER_LABELS[TIER_LABELS.length - 1]!
}

// Mensualite totale pour une famille de n enfants selon la regle du site,
// hors tarif special (custom_monthly_rate, verifie a part car prioritaire).
// Le nombre de seances par mois vient de la regle (sessions_per_month) ;
// le parametre sessionsInMonth ne sert que de valeur de repli explicite
// pour les appelants qui calculent un mois reel (ex. generate-monthly).
export function monthlyForFamily(rule: PricingRuleLike, childCount: number, sessionsInMonth?: number): number {
  if (childCount <= 0) return 0
  if (rule.billing_type === 'per_session') {
    return (rule.price_per_session ?? 0) * (sessionsInMonth ?? sessionsPerMonth(rule)) * childCount
  }
  if (rule.billing_type === 'monthly_family') {
    return rule.price_1_child ?? 0
  }
  return unitRateForFamilySize(rule, childCount).unit * childCount
}

// Frais d'inscription dus une seule fois a l'inscription (0 si non configures).
export function registrationFeeForFamily(rule: PricingRuleLike, newChildCount: number): number {
  const fee = rule.registration_fee ?? 0
  if (fee <= 0 || newChildCount <= 0) return 0
  return (rule.registration_fee_scope ?? 'per_child') === 'per_family' ? fee : fee * newChildCount
}

// Total annuel (mensualite x nombre de mensualites configure), hors frais
// d'inscription et hors remise paiement annuel.
export function annualForFamily(rule: PricingRuleLike, childCount: number): number {
  return monthlyForFamily(rule, childCount) * monthsPerYear(rule)
}

// Total annuel si la famille paie l'annee en une fois (remise appliquee).
export function annualUpfrontForFamily(rule: PricingRuleLike, childCount: number): number {
  const annual = annualForFamily(rule, childCount)
  const pct = rule.annual_discount_pct ?? 0
  return pct > 0 ? annual * (1 - pct / 100) : annual
}
