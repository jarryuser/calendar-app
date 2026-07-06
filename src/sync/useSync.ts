import { useEffect, useState } from 'react'
import { subscribe, syncOnce, type SyncState } from './engine'

export { syncOnce }

export function useSync(): SyncState {
  const [state, setState] = useState<SyncState>({
    syncing: false,
    lastSyncAt: null,
    lastSyncError: null,
    authenticated: false,
  })

  useEffect(() => {
    return subscribe(setState)
  }, [])

  return state
}
