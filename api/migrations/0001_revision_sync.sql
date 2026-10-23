CREATE TABLE IF NOT EXISTS sync_records (
  owner TEXT NOT NULL,
  entity TEXT NOT NULL,
  id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0,
  payload TEXT,
  mutationId TEXT NOT NULL,
  PRIMARY KEY (owner, entity, id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  entity TEXT NOT NULL,
  id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  deleted INTEGER NOT NULL,
  payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_log_owner_seq ON sync_log(owner, seq);

CREATE TRIGGER IF NOT EXISTS sync_insert AFTER INSERT ON sync_records BEGIN
  INSERT INTO sync_log(owner, entity, id, revision, deleted, payload)
  VALUES (NEW.owner, NEW.entity, NEW.id, NEW.revision, NEW.deleted, NEW.payload);
END;
CREATE TRIGGER IF NOT EXISTS sync_update AFTER UPDATE ON sync_records BEGIN
  INSERT INTO sync_log(owner, entity, id, revision, deleted, payload)
  VALUES (NEW.owner, NEW.entity, NEW.id, NEW.revision, NEW.deleted, NEW.payload);
END;

CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  resetAt INTEGER NOT NULL
);

INSERT OR IGNORE INTO sync_records(owner, entity, id, revision, deleted, payload, mutationId)
SELECT 'personal', 'events', id, 1, deleted_at IS NOT NULL,
  json_object('id', id, 'uid', uid, 'title', title, 'start', start, 'end', end, 'allDay', json(CASE WHEN allDay THEN 'true' ELSE 'false' END), 'description', description, 'location', location, 'color', color, 'calendarId', calendarId, 'reminders', json(reminders), 'recurrence', json(recurrence), 'recurringEventId', recurringEventId, 'exceptionDate', exceptionDate, 'isException', json(CASE WHEN isException THEN 'true' ELSE 'false' END), 'createdAt', createdAt, 'updatedAt', updatedAt), 'migration' FROM events;

INSERT OR IGNORE INTO sync_records(owner, entity, id, revision, deleted, payload, mutationId)
SELECT 'personal', 'calendars', id, 1, deleted_at IS NOT NULL,
  json_object('id', id, 'name', name, 'color', color, 'isVisible', json(CASE WHEN isVisible THEN 'true' ELSE 'false' END), 'isDefault', json(CASE WHEN isDefault THEN 'true' ELSE 'false' END), 'description', description, 'subscriptionUrl', subscriptionUrl, 'lastRefreshed', lastRefreshed, 'createdAt', createdAt, 'updatedAt', updatedAt), 'migration' FROM calendars;

INSERT OR IGNORE INTO sync_records(owner, entity, id, revision, deleted, payload, mutationId)
SELECT 'personal', 'tasks', id, 1, deleted_at IS NOT NULL,
  json_object('id', id, 'title', title, 'notes', notes, 'dueDate', dueDate, 'completed', json(CASE WHEN completed THEN 'true' ELSE 'false' END), 'completedAt', completedAt, 'calendarId', calendarId, 'createdAt', createdAt, 'updatedAt', updatedAt), 'migration' FROM tasks;

INSERT OR IGNORE INTO sync_records(owner, entity, id, revision, deleted, payload, mutationId)
SELECT 'personal', 'deletedInstances', id, 1, deleted_at IS NOT NULL,
  json_object('id', id, 'eventId', eventId, 'date', date, 'createdAt', createdAt), 'migration' FROM deleted_instances;
