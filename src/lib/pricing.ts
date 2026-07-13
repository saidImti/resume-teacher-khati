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
// ============================================================

export interface PricingRuleLike {
  billing_type: 'per_session' | 'monthly_per_child' | 'monthly_family'
  price_per_session: number | null
  price_1_child: number | null
  price_2_children: number | null
  price_3_children: number | null
  price_4_children: number | null
  price_5plus: number | null
}

const TIER_LABELS = ['1 enfant', '2 enfants', '3 enfants', '4 enfants', '5 enfants et +']

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
export function monthlyForFamily(rule: PricingRuleLike, childCount: number): number {
  if (childCount <= 0) return 0
  if (rule.billing_type === 'per_session') {
    return (rule.price_per_session ?? 0) * 4 * childCount
  }
  if (rule.billing_type === 'monthly_family') {
    return rule.price_1_child ?? 0
  }
  return unitRateForFamilySize(rule, childCount).unit * childCount
}
