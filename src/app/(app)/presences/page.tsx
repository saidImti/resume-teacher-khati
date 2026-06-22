import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AttendanceClient } from '@/components/presences/AttendanceClient'
import type { Group, Site } from '@/types'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface GroupWithRelations extends Omit<Group, 'site' | 'level'> {
  level: { id: string; name: string; emoji: string; color: string }
  site:  { id: string; name: string }
}

// ─── Page serveur ─────────────────────────────────────────────────────────────

export default async function PresencesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Groupes actifs avec niveau + site
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, is_active, level:levels(id, name, emoji, color), site:sites(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name')

  // Sites actifs
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, slug, color, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Présences"
        subtitle="Faire l'appel · Marquer absents · Notifier les parents"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <AttendanceClient
          groups={(groups ?? []) as unknown as GroupWithRelations[]}
          sites={(sites ?? []) as unknown as Site