# 005 — Supabase rejette les domaines email inventés/réservés au signup

**Date** : 2026-07-08
**Sévérité** : Mineure (gêne de test, pas un bug applicatif)
**Statut** : ✅ Contournement connu
**Tags** : `supabase auth`, `email_address_invalid`, `signUp`, `comptes de test`, `MX record`, `example.com`

## Symptôme

`supabase.auth.signUp({ email: 'xxx@example.com', ... })` ou tout domaine inventé
(`xxx@teacherkhati-e2e-test.com`) échoue avec :
```
AuthApiError: Email address "xxx@..." is invalid
status: 400, code: 'email_address_invalid'
```

## Contexte

Tentative de créer des comptes de test jetables pour la vérification E2E du chantier
multi-tenant.

## Cause racine

Supabase Auth valide (au moins) l'existence d'enregistrements MX pour le domaine de
l'email au moment du signup, pour réduire les faux comptes. `example.com` (domaine
réservé RFC 2606) et tout domaine inventé sans DNS réel échouent cette validation.

## Solution

Utiliser un domaine réel avec MX valides (ex. `gmail.com`) pour la partie locale
inventée : `e2e-teacherkhati-orga@gmail.com`. Aucun email n'est réellement envoyé si on
utilise `supabase.auth.admin.createUser({ email_confirm: true, ... })` (API admin,
service role) — le compte est créé déjà confirmé, sans envoi de mail, donc pas de risque
de spam ni de dépendre d'une vraie boîte mail accessible.

**Attention corollaire** : `supabase.auth.signUp()` (le VRAI flux self-service, pas
l'API admin) envoie un email de confirmation réel — Supabase applique un rate limit
strict sur l'envoi d'emails (plan gratuit : quelques envois/heure). Multiplier les tests
via `signUp()` direct épuise vite ce quota et peut bloquer temporairement les VRAIS
signups des utilisateurs. Préférer `admin.createUser({ email_confirm: true })` pour les
comptes de test — zéro email envoyé.

## Fichiers concernés

Aucun (méthodologie de test, pas de code applicatif à changer).

## Comment éviter à l'avenir / signal d'alerte

Pour tout script de test créant des comptes Supabase :
- Ne jamais utiliser `@example.com` ou un domaine inventé.
- Préférer `admin.createUser({ email_confirm: true })` à `signUp()` pour les comptes
  jetables (zéro email envoyé, zéro risque de rate limit).
- Toujours nettoyer les comptes de test après usage (`admin.deleteUser` + suppression
  de l'organisation associée) pour ne pas polluer les données réelles.
