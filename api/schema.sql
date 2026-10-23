CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  uid TEXT,
  title TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  allDay INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  color TEXT DEFAULT 'blue',
  calendarId TEXT NOT NULL,
  reminders TEXT DEFAULT '[]',
  recurrence TEXT,
  recurringEventId TEXT,
  exceptionDate TEXT,
  isException INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_updatedAt ON events(updatedAt);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_calendarId ON events(calendarId);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON events(end);
CREATE INDEX IF NOT EXISTS idx_events_uid ON events(uid);

CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  isVisible INTEGER NOT NULL DEFAULT 1,
  isDefault INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  subscriptionUrl TEXT,
  lastRefreshed TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendars_updatedAt ON calendars(updatedAt);
CREATE INDEX IF NOT EXISTS idx_calendars_deleted_at ON calendars(deleted_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  dueDate TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  completedAt TEXT,
  calendarId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt ON tasks(updatedAt);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_calendarId ON tasks(calendarId);

CREATE TABLE IF NOT EXISTS deleted_instances (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_deleted_instances_eventId ON deleted_instances(eventId);
CREATE INDEX IF NOT EXISTS idx_deleted_instances_deleted_at ON deleted_instances(deleted_at);

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
