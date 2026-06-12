import type { Metadata } from 'next'
import { ApiKeysManager } from './ApiKeysManager'

export const metadata: Metadata = { title: 'Clés API — Paramètres' }

export default function ApiKeysPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Clés API</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecte ton dashboard à n8n, Make, Zapier ou toute application externe.
        </p>
      </div>
      <div className="max-w-3xl">
        <ApiKeysManager />
      </div>
    </div>
  )
}
