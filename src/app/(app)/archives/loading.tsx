import { Header } from '@/components/layout/Header'
import { SkeletonTable } from '@/components/ui/skeleton-variants'

export default function ArchivesLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Archives" />
      <div className="flex-1 overflow-y-auto p-6">
        <SkeletonTable rows={10} cols={5} />
      </div>
    </div>
  )
}
