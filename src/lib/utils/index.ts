import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LevelSlug } from '@/types'

// ─── Tailwind class merger ────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Couleurs par niveau ──────────────────────────────────────
export const LEVEL_COLORS: Record<LevelSlug, string> = {
  preschoolers: '#10b981',
  kids:         '#f59e0b',
  juniors:      '#3b82f6',
  tweens:       '#8b5cf6',
  teenagers:    '#ef4444',
}

export const LEVEL_EMOJIS: Record<LevelSlug, string> = {
  preschoolers: '🐣',
  kids:         '🌟',
  juniors:      '🚀',
  tweens:       '🎯',
  teenagers:    '🏆',
}

// ─── Jours de la semaine ─────────────────────────────────────
export const DAYS_OF_WEEK = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi',
  'Vendredi', 'Samedi', 'Dimanche',
]

export function getDayName(dayIndex: number | null): string {
  if (dayIndex === null) return ''
  return DAYS_OF_WEEK[dayIndex] ?? ''
}

// ─── Formatage de dates ──────────────────────────────────────
export function formatDate(dateStr: string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (format === 'relative') {
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
  }

  if (format === 'short') {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

// ─── Statuts ─────────────────────────────────────────────────
export const RESUME_STATUS_LABELS: Record<string, string> = {
  draft:    'Brouillon',
  reviewed: 'Révisé',
  approved: 'Approuvé',
  sent:     'Envoyé',
}

export const RESUME_STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  sent:     'bg-purple-100 text-purple-700',
}

// ─── Générateur de résumé WhatsApp ───────────────────────────
export function formatForWhatsApp(bodyText: string, groupName: string, date: string): string {
  const formattedDate = formatDate(date, 'long')
  return `📚 *Résumé du cours — ${groupName}*\n📅 ${formattedDate}\n\n${bodyText}\n\n_Teacher Khati_`
}

// ─── Truncate text ───────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ─── Initiales ───────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Generate slug ───────────────────────────────────────────
export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
