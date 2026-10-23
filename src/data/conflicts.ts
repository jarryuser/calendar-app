import { db, type SyncConflict } from '@/db'
import { trackDeletion } from './deletions'

export async function resolveConflict(conflict: SyncConflict, choice: 'local' | 'remote') {
  await db.transaction('rw', [db[conflict.entity], db.syncQueue, db.syncConflicts, db.syncVersions], async () => {
    if (choice === 'local') {
      if (conflict.local) await db[conflict.entity].put({ ...conflict.local, updatedAt: new Date().toISOString() } as never)
      else {
        await db[conflict.entity].delete(conflict.entityId)
        const types = { events: 'event', calendars: 'calendar', tasks: 'task', deletedInstances: 'deletedInstance' } as const
        await trackDeletion(types[conflict.entity], conflict.entityId)
      }
    } else {
      const remote = await db.syncVersions.get(`${conflict.entity}:${conflict.entityId}`) || conflict.remote
      if (remote.deleted) await db[conflict.entity].delete(conflict.entityId)
      else if (remote.data) await db[conflict.entity].put(remote.data as never)
      const types = { events: 'event', calendars: 'calendar', tasks: 'task', deletedInstances: 'deletedInstance' } as const
      const queue = await db.syncQueue.toArray()
      await db.syncQueue.bulkDelete(queue.filter(item => item.entityType === types[conflict.entity] && item.entityId === conflict.entityId).map(item => item.id))
    }
    await db.syncConflicts.delete(conflict.id)
  })
}
