import { Header } from '@/components/layout/Header'
import { SkeletonList } from '@/components/ui/skeleton-variants'

export default function PadletsLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Mes Padlets" />
      <div className="flex-1 overflow-y-auto p-6">
        <SkeletonList count={6} />
      </div>
    </div>
  )
}
