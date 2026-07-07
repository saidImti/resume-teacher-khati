import { redirect, notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getLogoUrl } from '@/lib/branding'
import { PrintInvoiceClient } from '@/components/finances/PrintInvoiceClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrintInvoicePage({ params }: PageProps) {
  const { id } = await params

  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminSupabaseClient()

  const [{ data: invoice, error }, logoUrl] = await Promise.all([
    admin
      .from('invoices')
      .select(`
        *,
        family:families(
          id, parent1_first, parent1_last, parent1_email,
          parent2_first, parent2_last,
          address, city, postal_code
        ),
        site:sites(id, name),
        payments(id, amount, method, payment_date, reference, notes)
      `)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single(),
    getLogoUrl(admin, ctx.organizationId).catch(() => null),
  ])

  if (error || !invoice) notFound()

  return <PrintInvoiceClient invoice={invoice as never} logoUrl={logoUrl} />
}
