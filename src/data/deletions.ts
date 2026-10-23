import { db } from '@/db'
import type { SyncQueueEntry } from '@/db'

export async function trackDeletion(entityType: SyncQueueEntry['entityType'], entityId: string) {
  await db.syncQueue.add({ id: crypto.randomUUID(), entityType, entityId, action: 'delete', createdAt: new Date().toISOString() })
}
