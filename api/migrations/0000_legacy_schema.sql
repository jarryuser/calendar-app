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
