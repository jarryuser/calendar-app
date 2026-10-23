export const entities = ['events', 'calendars', 'tasks', 'deletedInstances'] as const
export type Entity = typeof entities[number]
export type RecordData = Record<string, unknown> & { id: string }

export interface Mutation {
  mutationId: string
  entity: Entity
  id: string
  baseRevision: number
  deleted: boolean
  data?: RecordData
}

export interface RemoteRecord {
  entity: Entity
  id: string
  revision: number
  deleted: boolean
  data: RecordData | null
}

export interface SyncRequest {
  protocol: 2
  cursor: number
  mutations: Mutation[]
}

export interface SyncResponse {
  protocol: 2
  records: RemoteRecord[]
  accepted: RemoteRecord[]
  conflicts: { mutationId: string; remote: RemoteRecord }[]
  cursor: number
  hasMore: boolean
  serverTime: string
}
